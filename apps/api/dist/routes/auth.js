import { loginRequestSchema } from '@portal/shared';
import { apiEnv } from '../config/apiEnv.js';
import { authenticate } from '../middlewares/authenticate.js';
import * as authService from '../services/auth/authService.js';
import { recordAuditLog } from '../services/audit/auditService.js';
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';
function toPublicUser(user) {
    return { id: user.id, email: user.email, fullName: user.full_name, role: user.role };
}
export async function authRoutes(app) {
    app.post('/auth/login', async (request, reply) => {
        const body = loginRequestSchema.parse(request.body);
        const user = await authService.verifyCredentials(body.email, body.password);
        const accessToken = app.jwt.sign({ sub: user.id, email: user.email, role: user.role, tokenVersion: user.token_version }, { expiresIn: apiEnv.ACCESS_TOKEN_TTL_SECONDS });
        const { token: refreshToken, expiresAt } = await authService.issueRefreshToken(user.id);
        reply.setCookie(REFRESH_COOKIE, refreshToken, {
            httpOnly: true,
            secure: apiEnv.NODE_ENV === 'production',
            sameSite: 'lax',
            path: REFRESH_COOKIE_PATH,
            expires: expiresAt,
        });
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
            return reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Missing refresh token' });
        }
        const { user, refreshToken, refreshTokenExpiresAt } = await authService.rotateRefreshToken(raw);
        const accessToken = app.jwt.sign({ sub: user.id, email: user.email, role: user.role, tokenVersion: user.token_version }, { expiresIn: apiEnv.ACCESS_TOKEN_TTL_SECONDS });
        reply.setCookie(REFRESH_COOKIE, refreshToken, {
            httpOnly: true,
            secure: apiEnv.NODE_ENV === 'production',
            sameSite: 'lax',
            path: REFRESH_COOKIE_PATH,
            expires: refreshTokenExpiresAt,
        });
        return reply.send({
            accessToken,
            expiresInSeconds: apiEnv.ACCESS_TOKEN_TTL_SECONDS,
            user: toPublicUser(user),
        });
    });
    app.post('/auth/logout', { preHandler: authenticate }, async (request, reply) => {
        const raw = request.cookies[REFRESH_COOKIE];
        if (raw)
            await authService.revokeRefreshToken(raw);
        reply.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
        return reply.status(204).send();
    });
    app.get('/auth/me', { preHandler: authenticate }, async (request, reply) => {
        return reply.send(request.authUser);
    });
}
//# sourceMappingURL=auth.js.map