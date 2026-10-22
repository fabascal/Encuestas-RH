import { sql } from 'kysely';
import type { IntegrationProvider, SyncStatus } from '@portal/shared';
import { db } from '../../db/index.js';

export function createSyncRun(
  credentialId: string,
  provider: IntegrationProvider,
  jobId: string | null,
  targetDay?: string,
) {
  return db
    .insertInto('sync_runs')
    .values({
      credential_id: credentialId,
      provider,
      status: 'running',
      started_at: new Date(),
      job_id: jobId,
      ...(targetDay ? { target_day: targetDay } : {}),
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export function setSyncRunTargetDay(id: string, day: string) {
  return db.updateTable('sync_runs').set({ target_day: day }).where('id', '=', id).execute();
}

export interface FinishSyncRunPatch {
  recordsRead?: number;
  recordsUpserted?: number;
  errorMessage?: string | null;
}

export async function finishSyncRun(id: string, status: SyncStatus, patch: FinishSyncRunPatch = {}): Promise<void> {
  await db
    .updateTable('sync_runs')
    .set({
      status,
      records_read: patch.recordsRead,
      records_upserted: patch.recordsUpserted,
      error_message: patch.errorMessage,
      finished_at: new Date(),
    })
    .where('id', '=', id)
    .execute();
}

export async function appendSyncLog(
  syncRunId: string,
  level: 'info' | 'warn' | 'error',
  message: string,
  context?: unknown,
): Promise<void> {
  await db
    .insertInto('sync_run_logs')
    .values({
      sync_run_id: syncRunId,
      level,
      message,
      context: context !== undefined ? JSON.stringify(context) : null,
    })
    .execute();
}

export function listSyncRuns(filters: {
  credentialId?: string | undefined;
  provider?: IntegrationProvider | undefined;
  limit?: number | undefined;
  before?: string | undefined;
} = {}) {
  let query = db.selectFrom('sync_runs').selectAll().orderBy('created_at', 'desc');
  if (filters.credentialId) query = query.where('credential_id', '=', filters.credentialId);
  if (filters.provider) query = query.where('provider', '=', filters.provider);
  if (filters.before) query = query.where(sql<boolean>`created_at < ${filters.before}::timestamptz`);
  return query.limit(Math.min(filters.limit ?? 50, 200)).execute();
}

export function listSyncRunLogs(syncRunId: string) {
  return db
    .selectFrom('sync_run_logs')
    .selectAll()
    .where('sync_run_id', '=', syncRunId)
    .orderBy('logged_at')
    .execute();
}
