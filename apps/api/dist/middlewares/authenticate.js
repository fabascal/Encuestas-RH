import { USER_ROLES } from '@portal/shared';
import { z } from 'zod';
import { db } from '../db/index.js';
import { UnauthorizedError } from '../utils/httpErrors.js';
const accessTokenPayloadSchema = z.object({
    sub: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(USER_ROLES),
    tokenVersion: z.number().int(),
});
/**
 * Verifies the access token and re-checks the user is still active and that the
 * token was not issued before a forced logout (token_version bump).
 */
export async function authenticate(request, _reply) {
    try {
        await request.jwtVerify();
    }
    catch {
        throw new UnauthorizedError('Invalid or expired token');
    }
    const payload = accessTokenPayloadSchema.parse(request.user);
    const user = await db
        .selectFrom('users')
        .select(['id', 'token_version', 'active'])
        .where('id', '=', payload.sub)
        .executeTakeFirst();
    if (!user || !user.active || user.token_version !== payload.tokenVersion) {
        throw new UnauthorizedError('Session no longer valid');
    }
    request.authUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        tokenVersion: payload.tokenVersion,
    };
}
//# sourceMappingURL=authenticate.js.map