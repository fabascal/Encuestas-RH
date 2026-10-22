import type { ReportQuery, ReportSource } from '@portal/shared';
import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { NotFoundError } from '../../utils/httpErrors.js';
import { calculateStationBonusForPeriod } from '../bonusEngine/bonusEngineService.js';
import { paidRatio, roundMoney } from './metrics.js';
import { listScopedStations, type ScopedStation } from './scope.js';

export interface BonusLineView {
  kpiCategoryId: string;
  kpiCode: string;
  kpiName: string;
  weight: number | null;
  base: number;
  actualValue: number;
  targetValue: number;
  progressPct: number | null;
  eligible: boolean;
  payout: number;
  higherIsBetter: boolean;
}

export interface StationBonusView {
  station: ScopedStation;
  configured: boolean;
  source: ReportSource;
  poolAmount: number;
  totalPayout: number;
  paidPct: number | null;
  lines: BonusLineView[];
}

export interface BonusLoad {
  periodStatus: 'open' | 'closed';
  rows: StationBonusView[];
}

function toNumber(value: string | number | null): number | null {
  if (value === null) return null;
  return typeof value === 'number' ? value : Number(value);
}

async function categoryFlags(): Promise<Map<string, boolean>> {
  const rows = await db.selectFrom('kpi_categories').select(['id', 'higher_is_better']).execute();
  return new Map(rows.map((row) => [row.id, row.higher_is_better]));
}

function blank(station: ScopedStation, source: ReportSource): StationBonusView {
  return { station, configured: false, source, poolAmount: 0, totalPayout: 0, paidPct: null, lines: [] };
}

async function liveBonus(
  station: ScopedStation,
  period: string,
  higherIsBetter: Map<string, boolean>,
): Promise<StationBonusView> {
  try {
    const { result } = await calculateStationBonusForPeriod(station.stationId, period);
    const lines: BonusLineView[] = result.lines.map((line) => ({
      kpiCategoryId: line.kpiCategoryId,
      kpiCode: line.kpiCode,
      kpiName: line.kpiName,
      weight: line.weight,
      base: line.base,
      actualValue: line.actualValue,
      targetValue: line.targetValue,
      progressPct: line.progressPct,
      eligible: line.eligible,
      payout: line.payout,
      higherIsBetter: higherIsBetter.get(line.kpiCategoryId) ?? true,
    }));
    return {
      station,
      configured: true,
      source: 'estimado',
      poolAmount: result.poolAmount,
      totalPayout: result.totalPayout,
      paidPct: paidRatio(result.totalPayout, result.poolAmount),
      lines,
    };
  } catch (error) {
    if (error instanceof NotFoundError) return blank(station, 'estimado');
    throw error;
  }
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index];
      if (item === undefined) return;
      results[index] = await fn(item);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

/**
 * Closed periods use the frozen bonus_calculations snapshot.
 * Open periods, and stations that were never frozen, are calculated live and marked estimado.
 */
export async function loadStationBonuses(user: AuthUser, filters: ReportQuery, period: string): Promise<BonusLoad> {
  const stations = await listScopedStations(user, { ...filters, period });
  const periodRow = await db.selectFrom('periods').select('status').where('period', '=', period).executeTakeFirst();
  const periodStatus = periodRow?.status === 'closed' ? 'closed' : 'open';
  const higherIsBetter = await categoryFlags();

  if (periodStatus === 'open' || stations.length === 0) {
    return { periodStatus, rows: await mapLimit(stations, 6, (station) => liveBonus(station, period, higherIsBetter)) };
  }

  const ids = stations.map((station) => station.stationId);
  const items = await db
    .selectFrom('bonus_calculations as bc')
    .innerJoin('bonus_calculation_items as bi', 'bi.bonus_calculation_id', 'bc.id')
    .innerJoin('kpi_categories as kc', 'kc.id', 'bi.kpi_category_id')
    .select([
      'bc.station_id',
      'bc.pool_amount',
      'bc.total_payout',
      'bi.kpi_category_id',
      'bi.weight',
      'bi.actual_value',
      'bi.target_value',
      'bi.progress_pct',
      'bi.payout',
      'bi.rule_snapshot',
      'kc.code as kpi_code',
      'kc.name as kpi_name',
      'kc.higher_is_better',
    ])
    .where('bc.period', '=', period)
    .where('bc.station_id', 'in', ids)
    .execute();

  const byStation = new Map<string, typeof items>();
  for (const item of items) {
    const list = byStation.get(item.station_id) ?? [];
    list.push(item);
    byStation.set(item.station_id, list);
  }

  const rows: StationBonusView[] = [];
  for (const station of stations) {
    const frozen = byStation.get(station.stationId);
    if (!frozen || frozen.length === 0) {
      rows.push(await liveBonus(station, period, higherIsBetter));
      continue;
    }
    const poolAmount = Number(frozen[0]?.pool_amount ?? 0);
    const totalPayout = Number(frozen[0]?.total_payout ?? 0);
    const lines: BonusLineView[] = frozen.map((item) => {
      const weight = toNumber(item.weight);
      const payout = Number(item.payout);
      const snapshot = item.rule_snapshot;
      const payoutAmount =
        snapshot !== null && typeof snapshot === 'object' && 'payoutAmount' in snapshot
          ? toNumber((snapshot as { payoutAmount: number | null }).payoutAmount)
          : null;
      const progressPct = toNumber(item.progress_pct);
      return {
        kpiCategoryId: item.kpi_category_id,
        kpiCode: item.kpi_code,
        kpiName: item.kpi_name,
        weight,
        base: weight === null ? (payoutAmount ?? payout) : roundMoney((poolAmount * weight) / 100),
        actualValue: Number(item.actual_value),
        targetValue: Number(item.target_value),
        progressPct,
        eligible: progressPct !== null ? progressPct >= 1 : payout > 0,
        payout,
        higherIsBetter: item.higher_is_better,
      };
    });
    rows.push({
      station,
      configured: true,
      source: 'cerrado',
      poolAmount,
      totalPayout,
      paidPct: paidRatio(totalPayout, poolAmount),
      lines,
    });
  }

  return { periodStatus, rows };
}
