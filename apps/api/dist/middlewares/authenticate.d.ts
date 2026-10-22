import type { FastifyReply, FastifyRequest } from 'fastify';
import { type UserRole } from '@portal/shared';
export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    tokenVersion: number;
}
declare module 'fastify' {
    interface FastifyRequest {
        authUser?: AuthUser;
    }
}
/**
 * Verifies the access token and re-checks the user is still active and that the
 * token was not issued before a forced logout (token_version bump).
 */
export declare function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void>;
//# sourceMappingURL=authenticate.d.ts.map