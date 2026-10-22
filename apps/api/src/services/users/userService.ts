import argon2 from 'argon2';
import { sql, type Transaction } from 'kysely';
import { STATION_MANAGER_ROLE, type CreateUserInput, type UpdateUserInput, type UserScopeInput } from '@portal/shared';
import { db } from '../../db/index.js';
import type { Database } from '../../db/index.js';
import { ConflictError, NotFoundError, ValidationError } from '../../utils/httpErrors.js';

type Executor = Transaction<Database>;

async function scopesOf(trx: Executor, userId: string): Promise<UserScopeInput[]> {
  const rows = await trx
    .selectFrom('user_scopes')
    .select(['company_id', 'zone_id', 'station_id'])
    .where('user_id', '=', userId)
    .execute();
  return rows.map((row) => ({
    companyId: row.company_id,
    zoneId: row.zone_id,
    stationId: row.station_id,
  }));
}

/** A station manager is assigned only to stations, and each station has one active manager. */
async function assertStationManagerScopes(
  trx: Executor,
  userId: string | null,
  roleId: string,
  active: boolean,
  scopes: UserScopeInput[],
): Promise<void> {
  const role = await trx.selectFrom('roles').select('code').where('id', '=', roleId).executeTakeFirst();
  if (role?.code !== STATION_MANAGER_ROLE) return;
  if (scopes.some((scope) => scope.stationId === null)) {
    throw new ValidationError('Un gerente de estación solo se asigna a estaciones');
  }
  if (!active) return;

  const stationIds = scopes.flatMap((scope) => (scope.stationId ? [scope.stationId] : []));
  if (stationIds.length === 0) return;

  let conflicts = trx
    .selectFrom('user_scopes as us')
    .innerJoin('users as u', 'u.id', 'us.user_id')
    .innerJoin('roles as r', 'r.id', 'u.role_id')
    .innerJoin('stations as s', 's.id', 'us.station_id')
    .select(['s.name as stationName', 'u.full_name as managerName'])
    .where('r.code', '=', STATION_MANAGER_ROLE)
    .where('u.active', '=', true)
    .where('us.station_id', 'in', stationIds)
    .orderBy('s.name');
  if (userId) conflicts = conflicts.where('u.id', '!=', userId);

  const conflict = await conflicts.executeTakeFirst();
  if (conflict) {
    throw new ConflictError(`La estación ${conflict.stationName} ya tiene gerente: ${conflict.managerName}`);
  }
}

const USER_COLUMNS = [
  'users.id',
  'users.email',
  'users.full_name',
  'users.role_id',
  'roles.name as role_name',
  'users.active',
  'users.created_at',
] as const;

export function listUsers() {
  return db
    .selectFrom('users')
    .innerJoin('roles', 'roles.id', 'users.role_id')
    .select(USER_COLUMNS)
    .orderBy('users.full_name')
    .execute();
}

export async function getUserScopes(userId: string) {
  return db.selectFrom('user_scopes').selectAll().where('user_id', '=', userId).execute();
}

/** Active station managers, one row per station they already have. */
export async function listStationManagers(): Promise<{ stationId: string; userId: string; fullName: string }[]> {
  const rows = await db
    .selectFrom('user_scopes as us')
    .innerJoin('users as u', 'u.id', 'us.user_id')
    .innerJoin('roles as r', 'r.id', 'u.role_id')
    .select(['us.station_id as stationId', 'u.id as userId', 'u.full_name as fullName'])
    .where('r.code', '=', STATION_MANAGER_ROLE)
    .where('u.active', '=', true)
    .where('us.station_id', 'is not', null)
    .orderBy('u.full_name')
    .execute();
  return rows.flatMap((row) =>
    row.stationId ? [{ stationId: row.stationId, userId: row.userId, fullName: row.fullName }] : [],
  );
}

export async function createUser(input: CreateUserInput) {
  const existing = await db
    .selectFrom('users')
    .select('id')
    .where('email', '=', input.email)
    .executeTakeFirst();
  if (existing) throw new ConflictError('Ese correo ya está registrado');

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

  return db.transaction().execute(async (trx) => {
    const user = await trx
      .insertInto('users')
      .values({
        email: input.email,
        full_name: input.fullName,
        password_hash: passwordHash,
        role_id: input.roleId,
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await assertStationManagerScopes(trx, null, input.roleId, true, input.scopes);

    if (input.scopes.length > 0) {
      await trx
        .insertInto('user_scopes')
        .values(
          input.scopes.map((scope) => ({
            user_id: user.id,
            company_id: scope.companyId,
            zone_id: scope.zoneId,
            station_id: scope.stationId,
          })),
        )
        .execute();
    }

    return trx
      .selectFrom('users')
      .innerJoin('roles', 'roles.id', 'users.role_id')
      .select(USER_COLUMNS)
      .where('users.id', '=', user.id)
      .executeTakeFirstOrThrow();
  });
}

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
  const existing = await db
    .selectFrom('users')
    .select(['id', 'role_id', 'active'])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!existing) throw new NotFoundError('No se encontró el usuario');
  if (actorId === id && input.roleId !== undefined && input.roleId !== existing.role_id) {
    throw new ConflictError('No puedes cambiar tu propio rol');
  }
  if (actorId === id && input.active === false) {
    throw new ConflictError('No puedes desactivar tu propio usuario');
  }

  return db.transaction().execute(async (trx) => {
    const roleId = input.roleId ?? existing.role_id;
    const active = input.active ?? existing.active;
    const scopes = input.scopes ?? (await scopesOf(trx, id));
    await assertStationManagerScopes(trx, id, roleId, active, scopes);

    const patch: Record<string, unknown> = {};
    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.roleId !== undefined) patch.role_id = input.roleId;
    if (input.active !== undefined) patch.active = input.active;

    if (Object.keys(patch).length > 0) {
      await trx.updateTable('users').set(patch).where('id', '=', id).execute();
    }

    if (input.scopes) {
      await trx.deleteFrom('user_scopes').where('user_id', '=', id).execute();
      if (input.scopes.length > 0) {
        await trx
          .insertInto('user_scopes')
          .values(
            input.scopes.map((scope) => ({
              user_id: id,
              company_id: scope.companyId,
              zone_id: scope.zoneId,
              station_id: scope.stationId,
            })),
          )
          .execute();
      }
    }

    return trx
      .selectFrom('users')
      .innerJoin('roles', 'roles.id', 'users.role_id')
      .select(USER_COLUMNS)
      .where('users.id', '=', id)
      .executeTakeFirstOrThrow();
  });
}

/** Bumps token_version and revokes active refresh tokens, invalidating all live sessions. */
export async function forceLogout(userId: string): Promise<void> {
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('users')
      .set({ token_version: sql`token_version + 1` })
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

export async function resetPassword(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
  const user = await db
    .updateTable('users')
    .set({ password_hash: passwordHash, token_version: sql`token_version + 1` })
    .where('id', '=', userId)
    .returning('id')
    .executeTakeFirst();
  if (!user) throw new NotFoundError('No se encontró el usuario');
}
