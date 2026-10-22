import type { IntegrationProvider, SyncStatus } from '@portal/shared';
export declare function createSyncRun(credentialId: string, provider: IntegrationProvider, jobId: string | null): Promise<{
    status: "queued" | "running" | "success" | "failed" | "retrying";
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa";
    credential_id: string;
    attempt: number;
    records_read: number;
    records_upserted: number;
    error_message: string | null;
    job_id: string | null;
    started_at: Date | null;
    finished_at: Date | null;
}>;
export interface FinishSyncRunPatch {
    recordsRead?: number;
    recordsUpserted?: number;
    errorMessage?: string | null;
}
export declare function finishSyncRun(id: string, status: SyncStatus, patch?: FinishSyncRunPatch): Promise<void>;
export declare function appendSyncLog(syncRunId: string, level: 'info' | 'warn' | 'error', message: string, context?: unknown): Promise<void>;
export declare function listSyncRuns(credentialId?: string): Promise<{
    status: "queued" | "running" | "success" | "failed" | "retrying";
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa";
    credential_id: string;
    attempt: number;
    records_read: number;
    records_upserted: number;
    error_message: string | null;
    job_id: string | null;
    started_at: Date | null;
    finished_at: Date | null;
}[]>;
export declare function listSyncRunLogs(syncRunId: string): Promise<{
    message: string;
    level: string;
    id: string;
    sync_run_id: string;
    context: unknown;
    logged_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
}[]>;
//# sourceMappingURL=syncRunService.d.ts.map