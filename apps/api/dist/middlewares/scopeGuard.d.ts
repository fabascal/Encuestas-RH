import type { FastifyReply, FastifyRequest } from 'fastify';
import type { HierarchyLevel } from '@portal/shared';
interface ScopeGuardOptions {
    level: HierarchyLevel;
    /** Name of the route param carrying the company/zone/station id, e.g. "stationId". */
    paramName: string;
}
/**
 * Ensures the authenticated user's hierarchy scope (company/zone/station) covers the
 * resource identified by the given route param. Admins always pass. Must run after
 * `authenticate`.
 */
export declare function scopeGuard({ level, paramName }: ScopeGuardOptions): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
export {};
//# sourceMappingURL=scopeGuard.d.ts.map