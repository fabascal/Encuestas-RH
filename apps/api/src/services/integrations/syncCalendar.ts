import { sql } from 'kysely';
import { db } from '../../db/index.js';
import { monthBounds } from './nexusReport.js';

export async function listCalendarDays(credentialId: string, month: string) {
  const { dateIni, dateEnd } = monthBounds(month);
  return db
    .selectFrom('sync_days')
    .select([
      'id',
      'credential_id',
      sql<string>`to_char(day, 'YYYY-MM-DD')`.as('day'),
      'status',
      'stations_count',
      'total_amount',
      'unmatched_count',
      'runs_count',
      'last_run_id',
      'last_synced_at',
      'error_message',
    ])
    .where('credential_id', '=', credentialId)
    .where(sql<boolean>`day >= ${dateIni}::date`)
    .where(sql<boolean>`day <= ${dateEnd}::date`)
    .orderBy('day')
    .execute();
}

export async function getSyncDay(credentialId: string, day: string) {
  const summary = await db
    .selectFrom('sync_days')
    .select([
      'id',
      sql<string>`to_char(day, 'YYYY-MM-DD')`.as('day'),
      'status',
      'stations_count',
      'total_amount',
      'unmatched_count',
      'runs_count',
      'last_synced_at',
      'error_message',
      'stations',
    ])
    .where('credential_id', '=', credentialId)
    .where(sql<boolean>`day = ${day}::date`)
    .executeTakeFirst();

  const runs = await db
    .selectFrom('sync_runs')
    .select([
      'id',
      'status',
      'records_read',
      'records_upserted',
      'error_message',
      'started_at',
      'finished_at',
      'created_at',
    ])
    .where('credential_id', '=', credentialId)
    .where(sql<boolean>`target_day = ${day}::date`)
    .orderBy('created_at', 'desc')
    .execute();

  const runIds = runs.map((run) => run.id);
  const logs =
    runIds.length === 0
      ? []
      : await db
          .selectFrom('sync_run_logs')
          .select(['id', 'sync_run_id', 'level', 'message', 'logged_at'])
          .where('sync_run_id', 'in', runIds)
          .orderBy('logged_at')
          .execute();

  return {
    day,
    summary: summary ?? null,
    runs: runs.map((run) => ({
      ...run,
      logs: logs.filter((entry) => entry.sync_run_id === run.id),
    })),
  };
}
