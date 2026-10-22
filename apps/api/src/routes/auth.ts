import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { loginRequestSchema } from '@portal/shared';
import { apiEnv } from '../config/apiEnv.js';
import { authenticate } from '../middlewares/authenticate.js';
import * as authService from '../services/auth/authService.js';
import { recordAuditLog } from '../services/audit/auditService.js';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

/** Secure only on https. The portal is also opened over plain http on the LAN. */
function cookieOptions(request: FastifyRequest, expires?: Date) {
  return {
    httpOnly: true,
    secure: request.protocol === 'https',
    sameSite: 'lax' as const,
    path: REFRESH_COOKIE_PATH,
    ...(expires ? { expires } : {}),
  };
}

function setRefreshCookie(reply: FastifyReply, request: FastifyRequest, token: string, expires: Date): void {
  reply.setCookie(REFRESH_COOKIE, token, cookieOptions(request, expires));
}

function toPublicUser(user: {
  id: string;
  email: string;
  fullName: string;
  role: { id: string; name: string };
  permissions: string[];
}) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    permissions: user.permissions,
  };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', async (request, reply) => {
    const body = loginRequestSchema.parse(request.body);
    const user = await authService.verifyCredentials(body.email, body.password);

    const accessToken = app.jwt.sign(
      { sub: user.id, email: user.email, tokenVersion: user.tokenVersion },
      { expiresIn: apiEnv.ACCESS_TOKEN_TTL_SECONDS },
    );
    const { token: refreshToken, expiresAt } = await authService.issueRefreshToken(user.id);

    setRefreshCookie(reply, request, refreshToken, expiresAt);

    await recordAuditLog({
      actorId: user.id,
      action: 'login',
      entity: 'user',
      entityId: user.id,
      ip: request.ip,
    });

    return reply.send({
      accessToken,
      expiresInSeconds: apiEnv.ACCESS_TOKEN_TTL_SECONDS,
      user: toPublicUser(user),
    });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const raw = request.cookies[REFRESH_COOKIE];
    if (!raw) {
      return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Falta la sesión' });
    }

    const { user, refreshToken, refreshTokenExpiresAt } = await authService.rotateRefreshToken(raw);

    const accessToken = app.jwt.sign(
      { sub: user.id, email: user.email, tokenVersion: user.tokenVersion },
      { expiresIn: apiEnv.ACCESS_TOKEN_TTL_SECONDS },
    );

    setRefreshCookie(reply, request, refreshToken, refreshTokenExpiresAt);

    return reply.send({
      accessToken,
      expiresInSeconds: apiEnv.ACCESS_TOKEN_TTL_SECONDS,
      user: toPublicUser(user),
    });
  });

  app.post('/auth/logout', { preHandler: authenticate }, async (request, reply) => {
    const raw = request.cookies[REFRESH_COOKIE];
    if (raw) await authService.revokeRefreshToken(raw);
    reply.clearCookie(REFRESH_COOKIE, cookieOptions(request));
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
    return reply.send(toPublicUser(request.authUser!));
  });
}
