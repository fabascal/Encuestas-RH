import { db } from '../../db/index.js';

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
export async function recordAuditLog(entry: AuditEntry): Promise<void> {
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
