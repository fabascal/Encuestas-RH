import argon2 from 'argon2';
import { sql } from 'kysely';
import { db } from '../../db/index.js';
import { ConflictError, NotFoundError } from '../../utils/httpErrors.js';
export function listUsers() {
    return db
        .selectFrom('users')
        .select(['id', 'email', 'full_name', 'role', 'active', 'created_at'])
        .orderBy('full_name')
        .execute();
}
export async function getUserScopes(userId) {
    return db.selectFrom('user_scopes').selectAll().where('user_id', '=', userId).execute();
}
export async function createUser(input) {
    const existing = await db
        .selectFrom('users')
        .select('id')
        .where('email', '=', input.email)
        .executeTakeFirst();
    if (existing)
        throw new ConflictError('Email already in use');
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    return db.transaction().execute(async (trx) => {
        const user = await trx
            .insertInto('users')
            .values({
            email: input.email,
            full_name: input.fullName,
            password_hash: passwordHash,
            role: input.role,
        })
            .returning(['id', 'email', 'full_name', 'role', 'active', 'created_at'])
            .executeTakeFirstOrThrow();
        if (input.scopes.length > 0) {
            await trx
                .insertInto('user_scopes')
                .values(input.scopes.map((scope) => ({
                user_id: user.id,
                company_id: scope.companyId,
                zone_id: scope.zoneId,
                station_id: scope.stationId,
            })))
                .execute();
        }
        return user;
    });
}
export async function updateUser(id, input) {
    const existing = await db.selectFrom('users').select('id').where('id', '=', id).executeTakeFirst();
    if (!existing)
        throw new NotFoundError('User not found');
    return db.transaction().execute(async (trx) => {
        const patch = {};
        if (input.fullName !== undefined)
            patch.full_name = input.fullName;
        if (input.role !== undefined)
            patch.role = input.role;
        if (input.active !== undefined)
            patch.active = input.active;
        const user = Object.keys(patch).length > 0
            ? await trx
                .updateTable('users')
                .set(patch)
                .where('id', '=', id)
                .returning(['id', 'email', 'full_name', 'role', 'active', 'created_at'])
                .executeTakeFirstOrThrow()
            : await trx
                .selectFrom('users')
                .select(['id', 'email', 'full_name', 'role', 'active', 'created_at'])
                .where('id', '=', id)
                .executeTakeFirstOrThrow();
        if (input.scopes) {
            await trx.deleteFrom('user_scopes').where('user_id', '=', id).execute();
            if (input.scopes.length > 0) {
                await trx
                    .insertInto('user_scopes')
                    .values(input.scopes.map((scope) => ({
                    user_id: id,
                    company_id: scope.companyId,
                    zone_id: scope.zoneId,
                    station_id: scope.stationId,
                })))
                    .execute();
            }
        }
        return user;
    });
}
/** Bumps token_version and revokes active refresh tokens, invalidating all live sessions. */
export async function forceLogout(userId) {
    await db.transaction().execute(async (trx) => {
        await trx
            .updateTable('users')
            .set({ token_version: sql `token_version + 1` })
            .where('id', '=', userId)
            .execute();
        await trx
            .updateTable('refresh_tokens')
            .set({ revoked_at: new Date() })
            .where('user_id', '=', userId)
            .where('revoked_at', 'is', null)
            .execute();
    });
}
export async function resetPassword(userId, newPassword) {
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    const user = await db
        .updateTable('users')
        .set({ password_hash: passwordHash, token_version: sql `token_version + 1` })
        .where('id', '=', userId)
        .returning('id')
        .executeTakeFirst();
    if (!user)
        throw new NotFoundError('User not found');
}
//# sourceMappingURL=userService.js.map