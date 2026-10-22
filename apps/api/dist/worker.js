import PgBoss from 'pg-boss';
import { env } from './config/env.js';
import { reconcileSchedules } from './jobs/scheduler.js';
import { logger } from './utils/logger.js';
const RECONCILE_INTERVAL_MS = 5 * 60 * 1000;
async function main() {
    logger.info('Worker starting...');
    const boss = new PgBoss({ connectionString: env.DATABASE_URL });
    boss.on('error', (error) => logger.error(error, 'pg-boss error'));
    await boss.start();
    await reconcileSchedules(boss);
    setInterval(() => {
        reconcileSchedules(boss).catch((error) => logger.error(error, 'Failed to reconcile schedules'));
    }, RECONCILE_INTERVAL_MS);
    logger.info('Worker started and listening for integration sync jobs');
}
main().catch((error) => {
    logger.error(error, 'Failed to start worker');
    process.exit(1);
});
//# sourceMappingURL=worker.js.map