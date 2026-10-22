import type PgBoss from 'pg-boss';
import { db } from '../db/index.js';
import { logger } from '../utils/logger.js';
import { runSyncJob } from './syncJob.js';

/**
 * The installed pg-boss version supports only one schedule per queue name (no
 * scheduling "key"), so each credential gets its own dedicated queue rather than
 * sharing one queue keyed by credential id.
 */
export function queueNameForCredential(credentialId: string): string {
  return `integration-sync:${credentialId}`;
}

const registeredQueues = new Set<string>();
const scheduledCron = new Map<string, string>();
const MEXICO_TZ = 'America/Mexico_City';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function syncDays(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  if (!value.every((day) => typeof day === 'string' && DAY.test(day))) return null;
  return value;
}

/**
 * Re-reads integration_credentials and reconciles pg-boss queues/schedules so that
 * admins editing a credential's cron/enabled flag via the UI take effect without a
 * worker restart.
 */
export async function reconcileSchedules(boss: PgBoss): Promise<void> {
  const credentials = await db
    .selectFrom('integration_credentials')
    .select(['id', 'cron_expression', 'enabled'])
    .execute();

  let active = 0;
  for (const credential of credentials) {
    const queueName = queueNameForCredential(credential.id);

    if (!registeredQueues.has(queueName)) {
      await boss
        .createQueue(queueName, {
          name: queueName,
          retryLimit: 3,
          retryDelay: 30,
          retryBackoff: true,
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          if (!/exist/i.test(message)) throw error;
        });
      await boss.work(queueName, async ([job]) => {
        if (!job) return;
        const payload = job.data as { period?: string; days?: unknown };
        const days = syncDays(payload.days);
        logger.info(
          `Running sync job ${job.id} for credential ${credential.id}${days ? `, ${days.length} días` : ''}`,
        );
        await runSyncJob(
          {
            credentialId: credential.id,
            ...(payload.period ? { period: payload.period } : {}),
            ...(days ? { days } : {}),
          },
          job.id,
        );
      });
      registeredQueues.add(queueName);
    }

    if (credential.enabled) {
      const signature = `${credential.cron_expression}|${MEXICO_TZ}`;
      if (scheduledCron.get(queueName) !== signature) {
        await boss.unschedule(queueName).catch(() => undefined);
        await boss.schedule(queueName, credential.cron_expression, { credentialId: credential.id }, { tz: MEXICO_TZ });
        scheduledCron.set(queueName, signature);
      }
      active += 1;
    } else {
      await boss.unschedule(queueName).catch(() => undefined);
      scheduledCron.delete(queueName);
    }
  }

  logger.info(`Reconciled integration schedules: ${active} active of ${credentials.length} credentials`);
}
