import { getCredentialWithSecret } from '../services/integrations/credentialsService.js';
import { integrationAdapters } from '../services/integrations/registry.js';
import { appendSyncLog, createSyncRun, finishSyncRun } from '../services/integrations/syncRunService.js';
import { logger } from '../utils/logger.js';
/**
 * Executes one sync attempt for a credential. Throwing lets pg-boss apply the
 * queue's configured retry/backoff policy; each attempt gets its own sync_runs row
 * so partial progress and errors are always auditable.
 */
export async function runSyncJob(data, jobId) {
    const { credential, secret } = await getCredentialWithSecret(data.credentialId);
    if (!credential.enabled) {
        logger.info(`Credential ${data.credentialId} is disabled, skipping sync`);
        return;
    }
    const adapter = integrationAdapters[credential.provider];
    const syncRun = await createSyncRun(data.credentialId, credential.provider, jobId);
    try {
        const result = await adapter.sync({
            credentialId: data.credentialId,
            syncRunId: syncRun.id,
            companyId: credential.company_id,
            config: (credential.config ?? {}),
            secret,
            log: (level, message, context) => appendSyncLog(syncRun.id, level, message, context),
        });
        await finishSyncRun(syncRun.id, 'success', {
            recordsRead: result.recordsRead,
            recordsUpserted: result.recordsUpserted,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        await appendSyncLog(syncRun.id, 'error', message);
        await finishSyncRun(syncRun.id, 'failed', { errorMessage: message });
        throw error;
    }
}
//# sourceMappingURL=syncJob.js.map