import type { FastifyReply, FastifyRequest } from 'fastify';
import type { HierarchyLevel } from '@portal/shared';
import { ForbiddenError } from '../utils/httpErrors.js';
import {
  userHasCompanyAccess,
  userHasStationAccess,
  userHasZoneAccess,
} from '../services/scope/scopeService.js';

interface ScopeGuardOptions {
  level: HierarchyLevel;
  /** Name of the route param carrying the company/zone/station id, e.g. "stationId". */
  paramName: string;
}

/**
 * Ensures the authenticated user's hierarchy scope (company/zone/station) covers the
 * resource identified by the given route param. Admins always pass. Must run after
 * `authenticate`.
 */
export function scopeGuard({ level, paramName }: ScopeGuardOptions) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = request.authUser;
    if (!user) throw new ForbiddenError();
    if (user.permissions.includes('alcance.total')) return;

    const id = (request.params as Record<string, string | undefined>)[paramName];
    if (!id) throw new ForbiddenError('Falta el identificador de alcance');

    const hasAccess =
      level === 'company'
        ? await userHasCompanyAccess(user.id, id)
        : level === 'zone'
          ? await userHasZoneAccess(user.id, id)
          : await userHasStationAccess(user.id, id);

    if (!hasAccess) {
      throw new ForbiddenError('No tienes acceso a este recurso');
    }
  };
}
