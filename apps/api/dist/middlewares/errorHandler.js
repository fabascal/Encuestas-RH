import { ZodError } from 'zod';
import { HttpError } from '../utils/httpErrors.js';
import { logger } from '../utils/logger.js';
export function errorHandler(error, request, reply) {
    if (error instanceof ZodError) {
        reply.status(422).send({
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: error.flatten(),
        });
        return;
    }
    if (error instanceof HttpError) {
        reply.status(error.statusCode).send({
            code: error.code,
            message: error.message,
            details: error.details,
        });
        return;
    }
    logger.error({ err: error, url: request.url }, 'Unhandled error');
    reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}
//# sourceMappingURL=errorHandler.js.map