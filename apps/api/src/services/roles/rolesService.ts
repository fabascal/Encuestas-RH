import { randomBytes } from 'node:crypto';
import { sql, type Kysely, type Transaction } from 'kysely';
import type { CreateRoleInput, Permission, UpdateRoleInput } from '@portal/shared';
import { db, type Database } from '../../db/index.js';
import { ConflictError, NotFoundError } from '../../utils/httpErrors.js';

type QueryExecutor = Kysely<Database> | Transaction<Database>;

function slug(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return base || 'rol';
}

export function listPermissions() {
  return db.selectFrom('permissions').selectAll().orderBy('group_name').orderBy('name').execute();
}

export async function listRoles() {
  const roles = await db
    .selectFrom('roles')
    .leftJoin('users', 'users.role_id', 'roles.id')
    .select([
      'roles.id',
      'roles.code',
      'roles.name',
      'roles.description',
      'roles.is_system',
      db.fn.count('users.id').as('user_count'),
    ])
    .groupBy(['roles.id', 'roles.code', 'roles.name', 'roles.description', 'roles.is_system'])
    .orderBy('roles.name')
    .execute();

  const grants = await db.selectFrom('role_permissions').select(['role_id', 'permission_code']).execute();
  return roles.map((role) => ({
    ...role,
    user_count: Number(role.user_count),
    permissions: grants
      .filter((grant) => grant.role_id === role.id)
      .map((grant) => grant.permission_code as Permission),
  }));
}

async function replacePermissions(executor: QueryExecutor, roleId: string, permissions: Permission[]) {
  await executor.deleteFrom('role_permissions').where('role_id', '=', roleId).execute();
  if (permissions.length === 0) return;
  await executor
    .insertInto('role_permissions')
    .values(permissions.map((permission) => ({ role_id: roleId, permission_code: permission })))
    .execute();
}

export async function createRole(input: CreateRoleInput) {
  const code = `${slug(input.name)}-${randomBytes(3).toString('hex')}`;
  const role = await db
    .insertInto('roles')
    .values({
      code,
      name: input.name,
      description: input.description,
      is_system: false,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  await replacePermissions(db, role.id, input.permissions);
  return { ...role, user_count: 0, permissions: input.permissions };
}

export async function updateRole(id: string, input: UpdateRoleInput) {
  const role = await db.selectFrom('roles').select(['id', 'code']).where('id', '=', id).executeTakeFirst();
  if (!role) throw new NotFoundError('No se encontró el rol');
  if (role.code === 'admin') throw new ConflictError('El Administrador general no se puede modificar');

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('roles')
      .set({ name: input.name, description: input.description, updated_at: sql`now()` })
      .where('id', '=', id)
      .execute();
    await replacePermissions(trx, id, input.permissions);
  });
  const [updated] = (await listRoles()).filter((item) => item.id === id);
  if (!updated) throw new NotFoundError('No se encontró el rol');
  return updated;
}

export async function deleteRole(id: string) {
  const role = await db
    .selectFrom('roles')
    .select(['id', 'is_system'])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!role) throw new NotFoundError('No se encontró el rol');
  if (role.is_system) throw new ConflictError('Los roles del sistema no se pueden eliminar');

  const users = await db
    .selectFrom('users')
    .select(db.fn.count('id').as('total'))
    .where('role_id', '=', id)
    .executeTakeFirstOrThrow();
  if (Number(users.total) > 0) {
    throw new ConflictError('Este rol todavía tiene usuarios asignados');
  }

  await db.deleteFrom('roles').where('id', '=', id).execute();
}
