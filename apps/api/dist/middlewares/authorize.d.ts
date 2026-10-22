import type { FastifyReply, FastifyRequest } from 'fastify';
import type { UserRole } from '@portal/shared';
/** Restricts a route to the given roles. Must run after `authenticate`. */
export declare function authorize(...roles: UserRole[]): (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=authorize.d.ts.map