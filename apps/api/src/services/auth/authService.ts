import { createHash, randomBytes } from 'node:crypto';
import type { Permission } from '@portal/shared';
import argon2 from 'argon2';
import { apiEnv } from '../../config/apiEnv.js';
import { db } from '../../db/index.js';
import { UnauthorizedError } from '../../utils/httpErrors.js';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: { id: string; name: string };
  permissions: Permission[];
  tokenVersion: number;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function loadSessionUser(userId: string): Promise<SessionUser | null> {
  const user = await db
    .selectFrom('users as u')
    .innerJoin('roles as r', 'r.id', 'u.role_id')
    .select([
      'u.id',
      'u.email',
      'u.full_name',
      'u.token_version',
      'u.active',
      'r.id as role_id',
      'r.name as role_name',
    ])
    .where('u.id', '=', userId)
    .executeTakeFirst();

  if (!user || !user.active) return null;

  const grants = await db
    .selectFrom('role_permissions')
    .select('permission_code')
    .where('role_id', '=', user.role_id)
    .execute();

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: { id: user.role_id, name: user.role_name },
    permissions: grants.map((grant) => grant.permission_code as Permission),
    tokenVersion: user.token_version,
  };
}

export async function verifyCredentials(email: string, password: string): Promise<SessionUser> {
  const user = await db
    .selectFrom('users')
    .select(['id', 'password_hash', 'active'])
    .where('email', '=', email)
    .executeTakeFirst();

  if (!user || !user.active) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const valid = await argon2.verify(user.password_hash, password);
  if (!valid) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const session = await loadSessionUser(user.id);
  if (!session) throw new UnauthorizedError('Credenciales inválidas');
  return session;
}

export async function issueRefreshToken(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + apiEnv.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db
    .insertInto('refresh_tokens')
    .values({ user_id: userId, token_hash: hashToken(token), expires_at: expiresAt })
    .execute();

  return { token, expiresAt };
}

export async function rotateRefreshToken(rawToken: string): Promise<{
  user: SessionUser;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}> {
  const tokenHash = hashToken(rawToken);

  const existing = await db
    .selectFrom('refresh_tokens')
    .selectAll()
    .where('token_hash', '=', tokenHash)
    .executeTakeFirst();

  if (!existing || existing.revoked_at || new Date(existing.expires_at) < new Date()) {
    throw new UnauthorizedError('La sesión no es válida o ya venció');
  }

  await db
    .updateTable('refresh_tokens')
    .set({ revoked_at: new Date() })
    .where('id', '=', existing.id)
    .execute();

  const user = await loadSessionUser(existing.user_id);
  if (!user) {
    throw new UnauthorizedError('Usuario inactivo');
  }

  const next = await issueRefreshToken(user.id);
  return { user, refreshToken: next.token, refreshTokenExpiresAt: next.expiresAt };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  await db
    .updateTable('refresh_tokens')
    .set({ revoked_at: new Date() })
    .where('token_hash', '=', hashToken(rawToken))
    .execute();
}
