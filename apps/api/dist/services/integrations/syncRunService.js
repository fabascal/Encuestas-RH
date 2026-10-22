import { db } from '../../db/index.js';
export function createSyncRun(credentialId, provider, jobId) {
    return db
        .insertInto('sync_runs')
        .values({
        credential_id: credentialId,
        provider,
        status: 'running',
        started_at: new Date(),
        job_id: jobId,
    })
        .returningAll()
        .executeTakeFirstOrThrow();
}
export async function finishSyncRun(id, status, patch = {}) {
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
export async function appendSyncLog(syncRunId, level, message, context) {
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
export function listSyncRuns(credentialId) {
    let query = db.selectFrom('sync_runs').selectAll().orderBy('created_at', 'desc').limit(50);
    if (credentialId)
        query = query.where('credential_id', '=', credentialId);
    return query.execute();
}
export function listSyncRunLogs(syncRunId) {
    return db
        .selectFrom('sync_run_logs')
        .selectAll()
        .where('sync_run_id', '=', syncRunId)
        .orderBy('logged_at')
        .execute();
}
//# sourceMappingURL=syncRunService.js.map