export interface SyncJobData {
    credentialId: string;
}
/**
 * Executes one sync attempt for a credential. Throwing lets pg-boss apply the
 * queue's configured retry/backoff policy; each attempt gets its own sync_runs row
 * so partial progress and errors are always auditable.
 */
export declare function runSyncJob(data: SyncJobData, jobId: string | null): Promise<void>;
//# sourceMappingURL=syncJob.d.ts.map