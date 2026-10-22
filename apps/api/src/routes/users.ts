import type { FastifyInstance } from 'fastify';
import { createUserSchema, updateUserSchema } from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { recordAuditLog } from '../services/audit/auditService.js';
import * as userService from '../services/users/userService.js';

/** All routes here are admin-only: user management is part of the config module. */
export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', authorize('usuarios.gestionar'));

  app.get('/admin/users', async () => userService.listUsers());

  app.get('/admin/station-managers', async () => userService.listStationManagers());

  app.get('/admin/users/:userId/scopes', async (request) => {
    const { userId } = request.params as { userId: string };
    return userService.getUserScopes(userId);
  });

  app.post('/admin/users', async (request, reply) => {
    const input = createUserSchema.parse(request.body);
    const user = await userService.createUser(input);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'create',
      entity: 'user',
      entityId: user.id,
      after: user,
      ip: request.ip,
    });
    return reply.status(201).send(user);
  });

  app.patch('/admin/users/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const input = updateUserSchema.parse(request.body);
    const beforeUser = (await userService.listUsers()).find((user) => user.id === userId) ?? null;
    const beforeScopes = await userService.getUserScopes(userId);
    const user = await userService.updateUser(userId, input, request.authUser!.id);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'update',
      entity: 'user',
      entityId: user.id,
      before: { user: beforeUser, scopes: beforeScopes },
      after: user,
      ip: request.ip,
    });
    return reply.send(user);
  });

  app.post('/admin/users/:userId/force-logout', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    await userService.forceLogout(userId);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'force_logout',
      entity: 'user',
      entityId: userId,
      ip: request.ip,
    });
    return reply.status(204).send();
  });

  app.post('/admin/users/:userId/reset-password', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { newPassword } = request.body as { newPassword: string };
    await userService.resetPassword(userId, newPassword);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'reset_password',
      entity: 'user',
      entityId: userId,
      ip: request.ip,
    });
    return reply.status(204).send();
  });
}
