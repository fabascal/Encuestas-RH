import type { FastifyInstance } from 'fastify';
import { createRoleSchema, updateRoleSchema } from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { recordAuditLog } from '../services/audit/auditService.js';
import * as rolesService from '../services/roles/rolesService.js';

export async function rolesRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', authorize('roles.gestionar', 'usuarios.gestionar'));

  app.get('/admin/permissions', async () => rolesService.listPermissions());
  app.get('/admin/roles', async () => rolesService.listRoles());

  app.post('/admin/roles', { preHandler: authorize('roles.gestionar') }, async (request, reply) => {
    const input = createRoleSchema.parse(request.body);
    const role = await rolesService.createRole(input);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'create',
      entity: 'role',
      entityId: role.id,
      after: role,
      ip: request.ip,
    });
    return reply.status(201).send(role);
  });

  app.patch('/admin/roles/:id', { preHandler: authorize('roles.gestionar') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateRoleSchema.parse(request.body);
    const role = await rolesService.updateRole(id, input);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'update',
      entity: 'role',
      entityId: id,
      after: role,
      ip: request.ip,
    });
    return reply.send(role);
  });

  app.delete('/admin/roles/:id', { preHandler: authorize('roles.gestionar') }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await rolesService.deleteRole(id);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'delete',
      entity: 'role',
      entityId: id,
      ip: request.ip,
    });
    return reply.status(204).send();
  });
}
