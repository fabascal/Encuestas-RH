import { db } from '../db/index.js';
import { logger } from '../utils/logger.js';
import { runSyncJob } from './syncJob.js';
/**
 * The installed pg-boss version supports only one schedule per queue name (no
 * scheduling "key"), so each credential gets its own dedicated queue rather than
 * sharing one queue keyed by credential id.
 */
export function queueNameForCredential(credentialId) {
    return `integration-sync:${credentialId}`;
}
const registeredQueues = new Set();
/**
 * Re-reads integration_credentials and reconciles pg-boss queues/schedules so that
 * admins editing a credential's cron/enabled flag via the UI take effect without a
 * worker restart.
 */
export async function reconcileSchedules(boss) {
    const credentials = await db
        .selectFrom('integration_credentials')
        .select(['id', 'cron_expression', 'enabled'])
        .execute();
    let active = 0;
    for (const credential of credentials) {
        const queueName = queueNameForCredential(credential.id);
        if (!registeredQueues.has(queueName)) {
            await boss.createQueue(queueName, {
                name: queueName,
                retryLimit: 3,
                retryDelay: 30,
                retryBackoff: true,
            });
            await boss.work(queueName, async ([job]) => {
                if (!job)
                    return;
                logger.info(`Running sync job ${job.id} for credential ${credential.id}`);
                await runSyncJob({ credentialId: credential.id }, job.id);
            });
            registeredQueues.add(queueName);
        }
        if (credential.enabled) {
            await boss.schedule(queueName, credential.cron_expression, { credentialId: credential.id });
            active += 1;
        }
        else {
            await boss.unschedule(queueName).catch(() => undefined);
        }
    }
    logger.info(`Reconciled integration schedules: ${active} active of ${credentials.length} credentials`);
}
//# sourceMappingURL=scheduler.js.map