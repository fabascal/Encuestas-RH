import type { IntegrationProvider } from '@portal/shared';
export interface SyncContext {
    credentialId: string;
    syncRunId: string;
    companyId: string | null;
    config: Record<string, unknown>;
    secret: string;
    log: (level: 'info' | 'warn' | 'error', message: string, context?: unknown) => Promise<void>;
}
export interface SyncResult {
    recordsRead: number;
    recordsUpserted: number;
}
export interface TestConnectionOutcome {
    success: boolean;
    message: string;
}
export interface IntegrationAdapter {
    provider: IntegrationProvider;
    testConnection(secret: string, config: Record<string, unknown>): Promise<TestConnectionOutcome>;
    sync(context: SyncContext): Promise<SyncResult>;
}
//# sourceMappingURL=types.d.ts.map