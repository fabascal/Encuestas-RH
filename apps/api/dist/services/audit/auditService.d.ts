interface AuditEntry {
    actorId: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
    ip?: string | null;
}
/** Records a row in the append-only audit_log table. Never throws to the caller's flow. */
export declare function recordAuditLog(entry: AuditEntry): Promise<void>;
export {};
//# sourceMappingURL=auditService.d.ts.map