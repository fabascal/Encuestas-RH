import { sql } from 'kysely';
import { db } from '../../db/index.js';
import type { SyncDayStatus } from '../../db/types.js';
import { ensurePeriod, upsertKpiFact } from '../kpis/kpisService.js';
import { monthBounds } from './nexusReport.js';

export interface DailyStationSnapshot {
  code: string;
  amount: number;
  stationName: string | null;
  matched: boolean;
}

export async function replaceDailyFactsForDay(input: {
  day: string;
  kpiCategoryId: string;
  source: string;
  syncRunId: string;
  rows: { stationId: string; value: number }[];
}): Promise<void> {
  for (const row of input.rows) {
    await db
      .insertInto('kpi_daily_facts')
      .values({
        station_id: row.stationId,
        kpi_category_id: input.kpiCategoryId,
        day: input.day,
        value: row.value,
        source: input.source,
        sync_run_id: input.syncRunId,
      })
      .onConflict((oc) =>
        oc.columns(['station_id', 'kpi_category_id', 'day']).doUpdateSet({
          value: row.value,
          source: input.source,
          sync_run_id: input.syncRunId,
          updated_at: new Date(),
        }),
      )
      .execute();
  }

  const kept = input.rows.map((row) => row.stationId);
  let remove = db
    .deleteFrom('kpi_daily_facts')
    .where('kpi_category_id', '=', input.kpiCategoryId)
    .where('source', '=', input.source)
    .where('day', '=', input.day);
  if (kept.length > 0) remove = remove.where('station_id', 'not in', kept);
  await remove.execute();
}

/** Monthly bonus fact = sum of the daily facts already stored for that month. */
export async function rebuildMonthlyFromDaily(kpiCategoryId: string, day: string, syncRunId: string): Promise<void> {
  const period = `${day.slice(0, 7)}-01`;
  const { dateEnd } = monthBounds(period);
  const sums = await db
    .selectFrom('kpi_daily_facts')
    .select(['station_id', sql<string>`sum(value)`.as('total')])
    .where('kpi_category_id', '=', kpiCategoryId)
    .where('source', '=', 'nexus_fuel')
    .where('day', '>=', period)
    .where('day', '<=', dateEnd)
    .groupBy('station_id')
    .execute();

  await ensurePeriod(period);
  const stationIds = sums.map((row) => row.station_id);
  for (const row of sums) {
    await upsertKpiFact(
      {
        stationId: row.station_id,
        kpiCategoryId,
        period,
        value: Number(row.total),
        source: 'nexus_fuel',
      },
      syncRunId,
    );
  }

  let stale = db
    .deleteFrom('kpi_facts')
    .where('kpi_category_id', '=', kpiCategoryId)
    .where('period', '=', period)
    .where('source', '=', 'nexus_fuel');
  if (stationIds.length > 0) stale = stale.where('station_id', 'not in', stationIds);
  await stale.execute();
}

export async function recordSyncDay(input: {
  credentialId: string;
  day: string;
  status: SyncDayStatus;
  stationsCount: number;
  totalAmount: number;
  unmatchedCount: number;
  lastRunId: string;
  errorMessage?: string | null;
  stations: DailyStationSnapshot[];
}): Promise<void> {
  await db
    .insertInto('sync_days')
    .values({
      credential_id: input.credentialId,
      day: input.day,
      status: input.status,
      stations_count: input.stationsCount,
      total_amount: input.totalAmount,
      unmatched_count: input.unmatchedCount,
      runs_count: 1,
      last_run_id: input.lastRunId,
      last_synced_at: new Date(),
      error_message: input.errorMessage ?? null,
      stations: JSON.stringify(input.stations),
    })
    .onConflict((oc) =>
      oc.columns(['credential_id', 'day']).doUpdateSet({
        status: input.status,
        stations_count: input.stationsCount,
        total_amount: input.totalAmount,
        unmatched_count: input.unmatchedCount,
        runs_count: sql`sync_days.runs_count + 1`,
        last_run_id: input.lastRunId,
        last_synced_at: new Date(),
        error_message: input.errorMessage ?? null,
        stations: JSON.stringify(input.stations),
      }),
    )
    .execute();
}
