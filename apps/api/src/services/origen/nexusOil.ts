import {
  type NexusDayStatus,
  type NexusOilDay,
  type NexusOilMonth,
  type NexusOilQuery,
  type NexusOilRow,
  type NexusOilUnmatched,
  type NexusRefetchInput,
  type NexusRefetchState,
  type NexusRefetchStatus,
} from '@portal/shared';
import { sql } from 'kysely';
import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { ConflictError, ForbiddenError } from '../../utils/httpErrors.js';
import { recordAuditLog } from '../audit/auditService.js';
import { enqueueCredentialSync } from '../../jobs/queue.js';
import { daysBetween, mexicoToday, monthBounds } from '../integrations/nexusReport.js';
import { listScopedStations } from '../reports/scope.js';

function monthPeriod(period: string): string {
  return `${period.slice(0, 7)}-01`;
}

function iso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  return null;
}

function asNumber(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

async function stationsInScope(user: AuthUser, query: NexusOilQuery) {
  const period = monthPeriod(query.period);
  const stations = await listScopedStations(user, {
    period,
    ...(query.companyId ? { companyId: query.companyId } : {}),
    ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    ...(query.stationId ? { stationId: query.stationId } : {}),
  });
  if (stations.length === 0 && (query.stationId || query.zoneId || query.companyId) && !user.permissions.includes('alcance.total')) {
    throw new ForbiddenError('No tienes acceso a ese filtro');
  }
  return stations;
}

async function activeCredential() {
  return db
    .selectFrom('integration_credentials')
    .select('id')
    .where('provider', '=', 'nexus_fuel')
    .where('enabled', '=', true)
    .orderBy('created_at', 'asc')
    .executeTakeFirst();
}

function dayStatus(day: string, stored: string | undefined, today: string): NexusDayStatus {
  if (day >= today) return 'future';
  if (!stored) return 'missing';
  if (stored === 'failed') return 'failed';
  if (stored === 'running') return 'running';
  return 'ok';
}

interface UnmatchedSnapshot {
  code: string;
  amount: number;
}

function unmatchedSnapshots(value: unknown): UnmatchedSnapshot[] {
  const raw = typeof value === 'string' ? (JSON.parse(value) as unknown) : value;
  if (!Array.isArray(raw)) return [];
  const rows: UnmatchedSnapshot[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.code !== 'string' || record.matched !== false) continue;
    rows.push({ code: record.code, amount: asNumber(record.amount) });
  }
  return rows;
}

function periodsTouched(from: string, to: string): string[] {
  const months = new Set(daysBetween(from, to).map((day) => monthPeriod(day)));
  return [...months];
}

export async function listNexusOil(user: AuthUser, query: NexusOilQuery): Promise<NexusOilMonth> {
  const period = monthPeriod(query.period);
  const { dateEnd } = monthBounds(period);
  const stations = await stationsInScope(user, query);
  const ids = stations.map((station) => station.stationId);
  const credential = await activeCredential();
  const oil = await db.selectFrom('kpi_categories').select('id').where('code', '=', 'oil_sales').executeTakeFirst();

  const syncRows = credential
    ? await db
        .selectFrom('sync_days')
        .select([
          sql<string>`to_char(day, 'YYYY-MM-DD')`.as('day'),
          'status',
          'error_message',
          'last_synced_at',
          'stations',
        ])
        .where('credential_id', '=', credential.id)
        .where(sql<boolean>`day >= ${period}::date`)
        .where(sql<boolean>`day <= ${dateEnd}::date`)
        .execute()
    : [];

  const today = mexicoToday();
  const calendar = daysBetween(period, dateEnd);
  const syncByDay = new Map(syncRows.map((row) => [row.day, row]));
  const days: NexusOilDay[] = calendar.map((day) => {
    const stored = syncByDay.get(day);
    return {
      day,
      status: dayStatus(day, stored?.status, today),
      error: stored?.error_message ?? null,
      syncedAt: iso(stored?.last_synced_at),
    };
  });

  const daily =
    !oil || ids.length === 0
      ? []
      : await db
          .selectFrom('kpi_daily_facts')
          .select(['station_id', sql<string>`to_char(day, 'YYYY-MM-DD')`.as('day'), 'value'])
          .where('kpi_category_id', '=', oil.id)
          .where('source', '=', 'nexus_fuel')
          .where('station_id', 'in', ids)
          .where(sql<boolean>`day >= ${period}::date`)
          .where(sql<boolean>`day <= ${dateEnd}::date`)
          .execute();

  const monthly =
    !oil || ids.length === 0
      ? []
      : await db
          .selectFrom('kpi_facts')
          .select(['station_id', 'value'])
          .where('kpi_category_id', '=', oil.id)
          .where('source', '=', 'nexus_fuel')
          .where('station_id', 'in', ids)
          .where(sql<boolean>`period = ${period}::date`)
          .execute();

  const amountByStationDay = new Map(daily.map((row) => [`${row.station_id}|${row.day}`, asNumber(row.value)]));
  const totalByStation = new Map(monthly.map((row) => [row.station_id, asNumber(row.value)]));

  const rows: NexusOilRow[] = stations.map((station) => {
    const values: Record<string, number | null> = {};
    for (const day of calendar) {
      const amount = amountByStationDay.get(`${station.stationId}|${day}`);
      values[day] = amount === undefined ? null : amount;
    }
    return {
      stationId: station.stationId,
      stationName: station.stationName,
      zoneName: station.zoneName,
      code: station.stationCode,
      values,
      total: totalByStation.has(station.stationId) ? (totalByStation.get(station.stationId) ?? null) : null,
    };
  });

  const unmatchedMap = new Map<string, { amount: number; days: Set<string> }>();
  for (const syncDay of syncRows) {
    for (const snapshot of unmatchedSnapshots(syncDay.stations)) {
      const current = unmatchedMap.get(snapshot.code) ?? { amount: 0, days: new Set<string>() };
      current.amount += snapshot.amount;
      current.days.add(syncDay.day);
      unmatchedMap.set(snapshot.code, current);
    }
  }
  const unmatched: NexusOilUnmatched[] = [...unmatchedMap.entries()]
    .map(([code, value]) => ({ code, amount: value.amount, days: value.days.size }))
    .sort((left, right) => left.code.localeCompare(right.code, 'es'));

  const withData = rows.filter((row) => Object.values(row.values).some((amount) => amount !== null)).length;
  return {
    period,
    days,
    rows,
    summary: {
      total: rows.reduce((sum, row) => sum + (row.total ?? 0), 0),
      stations: withData,
      syncedDays: days.filter((day) => day.status === 'ok').length,
      failedDays: days.filter((day) => day.status === 'failed').length,
      unmatched: unmatched.length,
    },
    unmatched,
  };
}

export async function refetchNexus(
  user: AuthUser,
  input: NexusRefetchInput,
  ip: string | undefined,
): Promise<{ jobId: string }> {
  const stations = await listScopedStations(user, { period: monthPeriod(input.from) });
  if (stations.length === 0 && !user.permissions.includes('alcance.total')) {
    throw new ForbiddenError('No tienes estaciones en tu alcance');
  }

  const months = periodsTouched(input.from, input.to);
  const closed = await db
    .selectFrom('periods')
    .select('period')
    .where('period', 'in', months)
    .where('status', '=', 'closed')
    .executeTakeFirst();
  if (closed) throw new ConflictError('El periodo ya está cerrado; no se puede volver a consultar');

  const credential = await activeCredential();
  if (!credential) throw new ConflictError('Nexus no está configurado');

  const jobId = await enqueueCredentialSync(credential.id, { days: daysBetween(input.from, input.to) });
  await recordAuditLog({
    actorId: user.id,
    action: 'sync',
    entity: 'integration_credential',
    entityId: credential.id,
    after: { jobId, from: input.from, to: input.to, origen: 'origen' },
    ...(ip ? { ip } : {}),
  });
  return { jobId };
}

async function jobState(jobId: string): Promise<string | null> {
  const result = await sql<{ state: string }>`select state from pgboss.job where id = ${jobId}::uuid`.execute(db);
  return result.rows[0]?.state ?? null;
}

function stateFromRun(status: string): NexusRefetchState {
  if (status === 'success') return 'success';
  if (status === 'failed') return 'failed';
  if (status === 'queued') return 'queued';
  return 'running';
}

function stateFromJob(state: string): NexusRefetchState | null {
  if (state === 'created') return 'queued';
  if (state === 'retry' || state === 'active') return 'running';
  if (state === 'completed') return 'success';
  if (state === 'failed' || state === 'cancelled') return 'failed';
  return null;
}

export async function getRefetchStatus(jobId: string): Promise<NexusRefetchStatus> {
  const run = await db
    .selectFrom('sync_runs')
    .select(['status', 'error_message'])
    .where('job_id', '=', jobId)
    .orderBy('created_at', 'desc')
    .executeTakeFirst();
  const boss = await jobState(jobId);
  const fromJob = boss ? stateFromJob(boss) : null;
  const status = fromJob ?? (run ? stateFromRun(run.status) : 'queued');
  return {
    jobId,
    status,
    message: status === 'failed' ? (run?.error_message ?? null) : null,
  };
}
