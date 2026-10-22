import { ForbiddenError } from '../utils/httpErrors.js';
/** Restricts a route to the given roles. Must run after `authenticate`. */
export function authorize(...roles) {
    return async (request, _reply) => {
        if (!request.authUser || !roles.includes(request.authUser.role)) {
            throw new ForbiddenError('Insufficient role for this action');
        }
    };
}
//# sourceMappingURL=authorize.js.map