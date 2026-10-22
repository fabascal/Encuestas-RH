import type PgBoss from 'pg-boss';
/**
 * The installed pg-boss version supports only one schedule per queue name (no
 * scheduling "key"), so each credential gets its own dedicated queue rather than
 * sharing one queue keyed by credential id.
 */
export declare function queueNameForCredential(credentialId: string): string;
/**
 * Re-reads integration_credentials and reconciles pg-boss queues/schedules so that
 * admins editing a credential's cron/enabled flag via the UI take effect without a
 * worker restart.
 */
export declare function reconcileSchedules(boss: PgBoss): Promise<void>;
//# sourceMappingURL=scheduler.d.ts.map