import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Permission } from '@portal/shared';
import { z } from 'zod';
import { loadSessionUser } from '../services/auth/authService.js';
import { UnauthorizedError } from '../utils/httpErrors.js';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: { id: string; name: string };
  permissions: Permission[];
  tokenVersion: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthUser;
  }
}

const accessTokenPayloadSchema = z.object({
  sub: z.string().uuid(),
  email: z.string().email(),
  tokenVersion: z.number().int(),
});

/**
 * Verifies the access token and reloads the role permissions from the database,
 * so a role change applies on the next request without a new login.
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError('La sesión no es válida o ya venció');
  }

  const payload = accessTokenPayloadSchema.parse(request.user);
  const session = await loadSessionUser(payload.sub);

  if (!session || session.tokenVersion !== payload.tokenVersion) {
    throw new UnauthorizedError('La sesión ya no es válida');
  }

  request.authUser = session;
}
