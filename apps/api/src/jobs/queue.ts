import PgBoss from 'pg-boss';
import { env } from '../config/env.js';
import { queueNameForCredential } from './scheduler.js';

let boss: PgBoss | null = null;

async function getBoss(): Promise<PgBoss> {
  if (!boss) {
    boss = new PgBoss({ connectionString: env.DATABASE_URL });
    await boss.start();
  }
  return boss;
}

/** Sends a one-off sync job. The worker process is the one that runs it. */
export async function enqueueCredentialSync(
  credentialId: string,
  input: { period?: string; days?: string[] } = {},
): Promise<string> {
  const client = await getBoss();
  const queueName = queueNameForCredential(credentialId);
  await client
    .createQueue(queueName, { name: queueName, retryLimit: 3, retryDelay: 30, retryBackoff: true })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (!/exist/i.test(message)) throw error;
    });
  const jobId = await client.send(queueName, {
    credentialId,
    ...(input.period ? { period: input.period } : {}),
    ...(input.days?.length ? { days: input.days } : {}),
  });
  if (!jobId) throw new Error('No se pudo encolar la sincronización');
  return jobId;
}
