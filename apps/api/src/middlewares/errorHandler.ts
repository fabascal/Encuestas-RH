import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ConflictError, HttpError } from '../utils/httpErrors.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof ZodError) {
    reply.status(422).send({
      code: 'VALIDATION_ERROR',
      message: 'Los datos enviados no son válidos',
      details: error.flatten(),
    });
    return;
  }

  if (postgresCode(error) === '23505') {
    const conflict = new ConflictError('Ya existe un registro con ese código');
    reply.status(conflict.statusCode).send({ code: conflict.code, message: conflict.message });
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
  reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
}

function postgresCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('code' in error && typeof error.code === 'string' && /^\d{5}$/.test(error.code)) return error.code;
  if ('cause' in error) return postgresCode(error.cause);
  return undefined;
}
