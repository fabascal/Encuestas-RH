import type {
  DirectorOil,
  DirectorOilBreakdown,
  DirectorOilMonth,
  DirectorOilRank,
  GroupOilMonth,
  GroupOilRow,
  OilDay,
  PanelOil,
  PanelOilQuery,
  StationOilMonth,
} from '@portal/shared';
import type { DirectorOilQuery } from '@portal/shared';
import { sql } from 'kysely';
import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { NotFoundError } from '../../utils/httpErrors.js';
import { assertFilterVisible, breakdownLevel, resolveStations, scopeLabel } from '../direccion/scope.js';
import { formatScopeLabel } from '../scope/hierarchyFilter.js';
import { findStationManager } from '../scope/managers.js';
import type { DirectorStation } from '../direccion/scope.js';
import { daysInMonth, oilPace, roundMoney, shiftPeriod } from '../reports/metrics.js';
import { listScopedStations } from '../reports/scope.js';
import { groupOilProgress, progressRatio, projectMonth } from './oilMath.js';

interface OilStation {
  stationId: string;
  stationName: string;
  zoneId: string;
  zoneName: string;
  companyId: string;
  companyName: string;
}

interface MonthSlice {
  actual: number;
  target: number | null;
  future: boolean;
}

const OIL_CODE = 'oil_sales';
const OIL_SOURCE = 'nexus_fuel';

function mexicoClock(now: Date): { year: number; month: number; yesterday: string } {
  const shifted = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const yesterday = new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() - 1));
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    yesterday: yesterday.toISOString().slice(0, 10),
  };
}

function nextIso(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + 1));
  return date.toISOString().slice(0, 10);
}

function periodOf(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function isFutureMonth(year: number, month: number, today: { year: number; month: number }): boolean {
  if (year > today.year) return true;
  if (year < today.year) return false;
  return month > today.month;
}

function targetKey(stationId: string, period: string): string {
  return `${stationId}|${period}`;
}

function uuidList(ids: string[]) {
  return sql`array[${sql.join(ids.map((id) => sql`${id}::uuid`))}]`;
}

function dateList(days: string[]) {
  return sql`array[${sql.join(days.map((day) => sql`${day}::date`))}]`;
}

async function oilCategoryId(): Promise<string | null> {
  const row = await db.selectFrom('kpi_categories').select('id').where('code', '=', OIL_CODE).executeTakeFirst();
  return row?.id ?? null;
}

/** Most specific oil target for each station and month. Closed periods keep the saved cut. */
export async function oilTargets(stationIds: string[], periods: string[]): Promise<Map<string, number>> {
  const targets = new Map<string, number>();
  if (stationIds.length === 0 || periods.length === 0) return targets;

  const ids = uuidList(stationIds);
  const months = dateList(periods);
  const rules = await sql<{ station_id: string; period: string; target_value: number | string }>`
    select distinct on (s.id, p.period)
      s.id::text as station_id,
      to_char(p.period, 'YYYY-MM-DD') as period,
      gr.target_value::float8 as target_value
    from stations s
    inner join zones z on z.id = s.zone_id
    cross join unnest(${months}) as p(period)
    inner join goal_rule_sets rs
      on rs.valid_during @> p.period
      and (
        (rs.scope_level = 'station' and rs.station_id = s.id)
        or (rs.scope_level = 'zone' and rs.zone_id = z.id)
        or (rs.scope_level = 'company' and rs.company_id = z.company_id)
      )
    inner join goal_rules gr on gr.rule_set_id = rs.id
    inner join kpi_categories kc on kc.id = gr.kpi_category_id and kc.code = ${OIL_CODE}
    where s.id = any(${ids})
    order by s.id, p.period, case rs.scope_level when 'station' then 0 when 'zone' then 1 else 2 end
  `.execute(db);

  for (const row of rules.rows) {
    const value = Number(row.target_value);
    if (value > 0) targets.set(targetKey(row.station_id, row.period), value);
  }

  const closed = await sql<{ station_id: string; period: string; target_value: number | string }>`
    select distinct on (bc.station_id, bc.period)
      bc.station_id::text as station_id,
      to_char(bc.period, 'YYYY-MM-DD') as period,
      bi.target_value::float8 as target_value
    from bonus_calculations bc
    inner join periods pe on pe.period = bc.period and pe.status = 'closed'
    inner join bonus_calculation_items bi on bi.bonus_calculation_id = bc.id
    inner join kpi_categories kc on kc.id = bi.kpi_category_id and kc.code = ${OIL_CODE}
    where bc.station_id = any(${ids})
      and bc.period = any(${months})
    order by bc.station_id, bc.period, bc.calculated_at desc
  `.execute(db);

  for (const row of closed.rows) {
    const value = Number(row.target_value);
    const key = targetKey(row.station_id, row.period);
    if (value > 0) targets.set(key, value);
    else targets.delete(key);
  }

  return targets;
}

async function loadDaily(stationIds: string[], start: string, end: string): Promise<Map<string, Map<string, number>>> {
  const byStation = new Map<string, Map<string, number>>();
  if (stationIds.length === 0 || start >= end) return byStation;
  const categoryId = await oilCategoryId();
  if (!categoryId) return byStation;

  const rows = await sql<{ station_id: string; day: string; value: number | string }>`
    select station_id::text as station_id,
      to_char(day, 'YYYY-MM-DD') as day,
      value::float8 as value
    from kpi_daily_facts
    where kpi_category_id = ${categoryId}::uuid
      and source = ${OIL_SOURCE}
      and station_id = any(${uuidList(stationIds)})
      and day >= ${start}::date
      and day < ${end}::date
  `.execute(db);

  for (const row of rows.rows) {
    const days = byStation.get(row.station_id) ?? new Map<string, number>();
    days.set(row.day, Number(row.value));
    byStation.set(row.station_id, days);
  }
  return byStation;
}

function buildDays(period: string, through: string, values: Map<string, number> | undefined): OilDay[] {
  const count = daysInMonth(period);
  const month = period.slice(0, 7);
  const days: OilDay[] = [];
  for (let day = 1; day <= count; day += 1) {
    const iso = `${month}-${String(day).padStart(2, '0')}`;
    if (iso <= through) days.push({ day: iso, value: roundMoney(values?.get(iso) ?? 0) });
    else days.push({ day: iso, value: null });
  }
  return days;
}

function sumThrough(values: Map<string, number> | undefined, period: string, through: string): number {
  if (!values) return 0;
  const month = period.slice(0, 7);
  let total = 0;
  for (const [day, value] of values) {
    if (day.slice(0, 7) === month && day <= through) total += value;
  }
  return total;
}

function elapsedDays(period: string, through: string): number {
  const count = daysInMonth(period);
  const month = period.slice(0, 7);
  let elapsed = 0;
  for (let day = 1; day <= count; day += 1) {
    if (`${month}-${String(day).padStart(2, '0')}` <= through) elapsed += 1;
  }
  return elapsed;
}

async function loadPanelStations(user: AuthUser, query: PanelOilQuery): Promise<OilStation[]> {
  const scoped = await listScopedStations(user, query);
  if (scoped.length === 0) {
    await assertFilterVisible(query, user.permissions.includes('alcance.total'));
    return [];
  }
  const rows = await db
    .selectFrom('stations as s')
    .innerJoin('zones as z', 'z.id', 's.zone_id')
    .innerJoin('companies as c', 'c.id', 'z.company_id')
    .select(['s.id as stationId', 'z.id as zoneId', 'c.id as companyId', 'c.name as companyName'])
    .where('s.id', 'in', scoped.map((station) => station.stationId))
    .execute();
  const extra = new Map(rows.map((row) => [row.stationId, row]));
  return scoped.flatMap((station) => {
    const row = extra.get(station.stationId);
    if (!row) return [];
    return [
      {
        stationId: station.stationId,
        stationName: station.stationName,
        zoneId: row.zoneId,
        zoneName: station.zoneName,
        companyId: row.companyId,
        companyName: row.companyName,
      },
    ];
  });
}

function stationRow(station: OilStation, actual: number, target: number | null, elapsed: number, monthDays: number): GroupOilRow {
  const projection = projectMonth(actual, elapsed, monthDays);
  return {
    stationId: station.stationId,
    stationName: station.stationName,
    zoneId: station.zoneId,
    zoneName: station.zoneName,
    companyId: station.companyId,
    companyName: station.companyName,
    actual: roundMoney(actual),
    target: target === null ? null : roundMoney(target),
    progress: progressRatio(actual, target),
    projection: projection === null ? null : roundMoney(projection),
    projectedProgress: projection === null ? null : progressRatio(projection, target),
  };
}

async function stationOilMonth(station: OilStation, period: string, now: Date): Promise<StationOilMonth> {
  const clock = mexicoClock(now);
  const monthDays = daysInMonth(period);
  const targets = await oilTargets([station.stationId], [period]);
  const sales = await loadDaily([station.stationId], period, shiftPeriod(period, 1));
  const values = sales.get(station.stationId);
  const days = buildDays(period, clock.yesterday, values);
  const actual = sumThrough(values, period, clock.yesterday);
  const elapsed = days.filter((day) => day.value !== null).length;
  const target = targets.get(targetKey(station.stationId, period)) ?? null;
  const projection = projectMonth(actual, elapsed, monthDays);
  const pace = target === null ? null : oilPace(actual, target, elapsed, monthDays);

  return {
    mode: 'station',
    period,
    stationId: station.stationId,
    stationName: station.stationName,
    zoneId: station.zoneId,
    zoneName: station.zoneName,
    companyId: station.companyId,
    companyName: station.companyName,
    actual: roundMoney(actual),
    target: target === null ? null : roundMoney(target),
    progress: progressRatio(actual, target),
    expectedByNow: pace === null ? null : roundMoney(pace.expectedByNow),
    dailyNeeded: pace === null ? null : roundMoney(pace.dailyNeeded),
    projection: projection === null ? null : roundMoney(projection),
    projectedProgress: projection === null ? null : progressRatio(projection, target),
    daysElapsed: elapsed,
    daysInMonth: monthDays,
    days,
  };
}

async function groupOilMonth(stations: OilStation[], period: string, label: string, now: Date): Promise<GroupOilMonth> {
  const clock = mexicoClock(now);
  const monthDays = daysInMonth(period);
  const elapsed = elapsedDays(period, clock.yesterday);
  const ids = stations.map((station) => station.stationId);
  const targets = await oilTargets(ids, [period]);
  const sales = await loadDaily(ids, period, shiftPeriod(period, 1));
  const rows = stations
    .map((station) =>
      stationRow(
        station,
        sumThrough(sales.get(station.stationId), period, clock.yesterday),
        targets.get(targetKey(station.stationId, period)) ?? null,
        elapsed,
        monthDays,
      ),
    )
    .sort((left, right) => {
      if (left.progress === null && right.progress === null) return left.stationName.localeCompare(right.stationName, 'es');
      if (left.progress === null) return 1;
      if (right.progress === null) return -1;
      return left.progress - right.progress || left.stationName.localeCompare(right.stationName, 'es');
    });
  const totals = groupOilProgress(rows);
  const projection = projectMonth(totals.counted, elapsed, monthDays);

  return {
    mode: 'group',
    period,
    scopeLabel: label,
    actual: roundMoney(totals.actual),
    measured: roundMoney(totals.counted),
    target: totals.target === null ? null : roundMoney(totals.target),
    progress: totals.progress,
    projection: projection === null ? null : roundMoney(projection),
    projectedProgress: projection === null ? null : progressRatio(projection, totals.target),
    rows,
  };
}

export async function buildPanelOil(user: AuthUser, query: PanelOilQuery, now = new Date()): Promise<PanelOil> {
  const stations = await loadPanelStations(user, query);
  if (query.stationId) {
    const station = stations[0];
    if (!station) throw new NotFoundError('No se encontró la estación');
    return stationOilMonth(station, query.period, now);
  }
  return groupOilMonth(stations, query.period, await panelLabel(stations, query), now);
}

async function panelLabel(stations: OilStation[], query: PanelOilQuery): Promise<string> {
  const first = stations[0];
  let base = 'Todas las estaciones';
  if (query.zoneId) base = first?.zoneName ?? 'Zona';
  else if (query.companyId) base = first?.companyName ?? 'Empresa';
  const manager = query.managerId ? await findStationManager(query.managerId) : undefined;
  return formatScopeLabel(base, manager?.name);
}

function monthSlices(
  stations: DirectorStation[],
  year: number,
  targets: Map<string, number>,
  sales: Map<string, Map<string, number>>,
  today: { year: number; month: number },
  through: string,
): Map<string, MonthSlice[]> {
  const byStation = new Map<string, MonthSlice[]>();
  for (const station of stations) {
    const days = sales.get(station.stationId);
    const slices: MonthSlice[] = [];
    for (let month = 1; month <= 12; month += 1) {
      const period = periodOf(year, month);
      const future = isFutureMonth(year, month, today);
      slices.push({
        actual: future ? 0 : sumThrough(days, period, through),
        target: future ? null : (targets.get(targetKey(station.stationId, period)) ?? null),
        future,
      });
    }
    byStation.set(station.stationId, slices);
  }
  return byStation;
}

function combine(slices: MonthSlice[]): { actual: number; target: number | null; progress: number | null; future: boolean } {
  if (slices.every((slice) => slice.future)) return { actual: 0, target: null, progress: null, future: true };
  const totals = groupOilProgress(slices.filter((slice) => !slice.future));
  return { actual: totals.actual, target: totals.target, progress: totals.progress, future: false };
}

function rankRows(stations: DirectorStation[], slices: Map<string, MonthSlice[]>, monthIndex: number): DirectorOilRank[] {
  return stations.flatMap((station) => {
    const slice = slices.get(station.stationId)?.[monthIndex];
    if (!slice || slice.future) return [];
    const progress = progressRatio(slice.actual, slice.target);
    if (progress === null) return [];
    return [
      {
        stationId: station.stationId,
        stationName: station.stationName,
        zoneId: station.zoneId,
        zoneName: station.zoneName,
        companyId: station.companyId,
        actual: roundMoney(slice.actual),
        target: slice.target === null ? null : roundMoney(slice.target),
        progress,
      },
    ];
  });
}

function breakdownRows(
  stations: DirectorStation[],
  slices: Map<string, MonthSlice[]>,
  level: DirectorOil['level'],
): DirectorOilBreakdown[] {
  const groups = new Map<string, { label: string; stations: DirectorStation[] }>();
  for (const station of stations) {
    const grouped =
      level === 'company'
        ? { id: station.companyId, label: station.companyName }
        : level === 'zone'
          ? { id: station.zoneId, label: station.zoneName }
          : { id: station.stationId, label: station.stationName };
    const current = groups.get(grouped.id) ?? { label: grouped.label, stations: [] };
    current.stations.push(station);
    groups.set(grouped.id, current);
  }

  const rows: DirectorOilBreakdown[] = [];
  for (const [id, group] of groups) {
    const months: Array<number | null> = [];
    const yearSlices: MonthSlice[] = [];
    for (let index = 0; index < 12; index += 1) {
      const column = group.stations.flatMap((station) => {
        const slice = slices.get(station.stationId)?.[index];
        return slice ? [slice] : [];
      });
      const combined = combine(column);
      months.push(combined.future ? null : combined.progress);
      yearSlices.push(...column);
    }
    const year = combine(yearSlices);
    rows.push({
      id,
      label: group.label,
      actual: roundMoney(year.actual),
      target: year.target === null ? null : roundMoney(year.target),
      progress: year.progress,
      months,
    });
  }

  return rows.sort((left, right) => {
    if (left.progress === null && right.progress === null) return left.label.localeCompare(right.label, 'es');
    if (left.progress === null) return 1;
    if (right.progress === null) return -1;
    return left.progress - right.progress || left.label.localeCompare(right.label, 'es');
  });
}

function emptyDirectorOil(query: DirectorOilQuery, level: DirectorOil['level'], label: string, referenceMonth: number | null): DirectorOil {
  const monthly: DirectorOilMonth[] = [];
  for (let month = 1; month <= 12; month += 1) monthly.push({ month, actual: null, target: null, progress: null });
  return {
    year: query.year,
    level,
    scopeLabel: label,
    hasTargets: false,
    referenceMonth,
    totals: { actual: 0, measured: 0, target: null, progress: null, onGoal: 0, stations: 0, strongest: null, weakest: null },
    monthly,
    breakdown: [],
    farthest: [],
    best: [],
  };
}

export async function buildDirectorOil(user: AuthUser, query: DirectorOilQuery, now = new Date()): Promise<DirectorOil> {
  const stations = await resolveStations(user, query);
  const level = breakdownLevel(query, stations);
  const label = await scopeLabel(stations, query);
  const clock = mexicoClock(now);
  const referenceMonth = query.year === clock.year ? clock.month : query.year < clock.year ? 12 : null;
  if (stations.length === 0) return emptyDirectorOil(query, level, label, referenceMonth);

  const periods = Array.from({ length: 12 }, (_, index) => periodOf(query.year, index + 1));
  const start = periodOf(query.year, 1);
  const yearEnd = periodOf(query.year + 1, 1);
  const throughEnd = nextIso(clock.yesterday);
  const salesEnd = throughEnd < start ? start : throughEnd < yearEnd ? throughEnd : yearEnd;
  const [targets, sales] = await Promise.all([
    oilTargets(stations.map((station) => station.stationId), periods),
    loadDaily(stations.map((station) => station.stationId), start, salesEnd),
  ]);
  const slices = monthSlices(stations, query.year, targets, sales, clock, clock.yesterday);

  const monthly: DirectorOilMonth[] = [];
  const yearSlices: MonthSlice[] = [];
  for (let index = 0; index < 12; index += 1) {
    const column = stations.flatMap((station) => {
      const slice = slices.get(station.stationId)?.[index];
      return slice ? [slice] : [];
    });
    const combined = combine(column);
    yearSlices.push(...column);
    monthly.push({
      month: index + 1,
      actual: combined.future ? null : roundMoney(combined.actual),
      target: combined.future || combined.target === null ? null : roundMoney(combined.target),
      progress: combined.future ? null : combined.progress,
    });
  }

  const year = combine(yearSlices);
  const measured = groupOilProgress(yearSlices.filter((slice) => !slice.future)).counted;
  const comparable = monthly.filter((month) => (year.target !== null ? month.progress !== null : month.actual !== null));
  const byStrength = [...comparable].sort((left, right) => {
    const leftScore = year.target !== null ? (left.progress ?? 0) : (left.actual ?? 0);
    const rightScore = year.target !== null ? (right.progress ?? 0) : (right.actual ?? 0);
    return rightScore - leftScore;
  });
  const strongest = byStrength[0] ?? null;
  const weakest = byStrength[byStrength.length - 1] ?? null;

  const referenceIndex = referenceMonth === null ? -1 : referenceMonth - 1;
  const referenceSlices =
    referenceIndex < 0
      ? []
      : stations.flatMap((station) => {
          const slice = slices.get(station.stationId)?.[referenceIndex];
          return slice && !slice.future ? [slice] : [];
        });
  const onGoal = referenceSlices.filter((slice) => progressRatio(slice.actual, slice.target) !== null && (progressRatio(slice.actual, slice.target) ?? 0) >= 1).length;
  const stationsWithTarget = referenceSlices.filter((slice) => slice.target !== null && slice.target > 0).length;

  const ranked = rankRows(stations, slices, referenceIndex).sort((left, right) => (left.progress ?? 0) - (right.progress ?? 0));
  const farthest = ranked.slice(0, 5);
  const farIds = new Set(farthest.map((row) => row.stationId));
  const best = [...ranked].reverse().filter((row) => !farIds.has(row.stationId)).slice(0, 5);

  return {
    year: query.year,
    level,
    scopeLabel: label,
    hasTargets: year.target !== null,
    referenceMonth,
    totals: {
      actual: roundMoney(year.actual),
      measured: roundMoney(measured),
      target: year.target === null ? null : roundMoney(year.target),
      progress: year.progress,
      onGoal,
      stations: stationsWithTarget,
      strongest: strongest?.actual == null ? null : { month: strongest.month, progress: strongest.progress, actual: strongest.actual },
      weakest:
        weakest?.actual == null || strongest?.month === weakest.month
          ? null
          : { month: weakest.month, progress: weakest.progress, actual: weakest.actual },
    },
    monthly,
    breakdown: breakdownRows(stations, slices, level),
    farthest,
    best,
  };
}
