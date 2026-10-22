import { createHash, randomBytes } from 'node:crypto';
import argon2 from 'argon2';
import { apiEnv } from '../../config/apiEnv.js';
import { db } from '../../db/index.js';
import { UnauthorizedError } from '../../utils/httpErrors.js';
function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
export async function verifyCredentials(email, password) {
    const user = await db
        .selectFrom('users')
        .select(['id', 'email', 'full_name', 'password_hash', 'role', 'token_version', 'active'])
        .where('email', '=', email)
        .executeTakeFirst();
    if (!user || !user.active) {
        throw new UnauthorizedError('Credenciales invalidas');
    }
    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
        throw new UnauthorizedError('Credenciales invalidas');
    }
    return user;
}
export async function issueRefreshToken(userId) {
    const token = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + apiEnv.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await db
        .insertInto('refresh_tokens')
        .values({ user_id: userId, token_hash: hashToken(token), expires_at: expiresAt })
        .execute();
    return { token, expiresAt };
}
export async function rotateRefreshToken(rawToken) {
    const tokenHash = hashToken(rawToken);
    const existing = await db
        .selectFrom('refresh_tokens')
        .selectAll()
        .where('token_hash', '=', tokenHash)
        .executeTakeFirst();
    if (!existing || existing.revoked_at || new Date(existing.expires_at) < new Date()) {
        throw new UnauthorizedError('Refresh token invalido o expirado');
    }
    await db
        .updateTable('refresh_tokens')
        .set({ revoked_at: new Date() })
        .where('id', '=', existing.id)
        .execute();
    const user = await db
        .selectFrom('users')
        .select(['id', 'email', 'full_name', 'role', 'token_version', 'active'])
        .where('id', '=', existing.user_id)
        .executeTakeFirst();
    if (!user || !user.active) {
        throw new UnauthorizedError('Usuario inactivo');
    }
    const next = await issueRefreshToken(user.id);
    return { user, refreshToken: next.token, refreshTokenExpiresAt: next.expiresAt };
}
export async function revokeRefreshToken(rawToken) {
    await db
        .updateTable('refresh_tokens')
        .set({ revoked_at: new Date() })
        .where('token_hash', '=', hashToken(rawToken))
        .execute();
}
//# sourceMappingURL=authService.js.map