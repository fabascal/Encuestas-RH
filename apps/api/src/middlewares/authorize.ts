import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Permission } from '@portal/shared';
import { ForbiddenError } from '../utils/httpErrors.js';

/** Restricts a route to callers that have at least one of the given permissions. */
export function authorize(...permissions: Permission[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const granted = request.authUser?.permissions ?? [];
    if (!permissions.some((permission) => granted.includes(permission))) {
      throw new ForbiddenError('No tienes permiso para esta acción');
    }
  };
}
