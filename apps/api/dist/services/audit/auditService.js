import { db } from '../../db/index.js';
/** Records a row in the append-only audit_log table. Never throws to the caller's flow. */
export async function recordAuditLog(entry) {
    await db
        .insertInto('audit_log')
        .values({
        actor_id: entry.actorId,
        action: entry.action,
        entity: entry.entity,
        entity_id: entry.entityId ?? null,
        before: entry.before !== undefined ? JSON.stringify(entry.before) : null,
        after: entry.after !== undefined ? JSON.stringify(entry.after) : null,
        ip_address: entry.ip ?? null,
    })
        .execute();
}
//# sourceMappingURL=auditService.js.map