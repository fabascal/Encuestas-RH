import { ForbiddenError } from '../utils/httpErrors.js';
import { userHasCompanyAccess, userHasStationAccess, userHasZoneAccess, } from '../services/scope/scopeService.js';
/**
 * Ensures the authenticated user's hierarchy scope (company/zone/station) covers the
 * resource identified by the given route param. Admins always pass. Must run after
 * `authenticate`.
 */
export function scopeGuard({ level, paramName }) {
    return async (request, _reply) => {
        const user = request.authUser;
        if (!user)
            throw new ForbiddenError();
        if (user.role === 'admin')
            return;
        const id = request.params[paramName];
        if (!id)
            throw new ForbiddenError('Missing scope identifier');
        const hasAccess = level === 'company'
            ? await userHasCompanyAccess(user.id, id)
            : level === 'zone'
                ? await userHasZoneAccess(user.id, id)
                : await userHasStationAccess(user.id, id);
        if (!hasAccess) {
            throw new ForbiddenError('No access to this resource');
        }
    };
}
//# sourceMappingURL=scopeGuard.js.map