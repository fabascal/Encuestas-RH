export class HttpError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, message: string, code = 'HTTP_ERROR', details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'No autorizado') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'No tienes permiso para esta acción') {
    super(403, message, 'FORBIDDEN');
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'No se encontró el recurso') {
    super(404, message, 'NOT_FOUND');
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'El dato entra en conflicto con uno existente') {
    super(409, message, 'CONFLICT');
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Los datos enviados no son válidos', details?: unknown) {
    super(422, message, 'VALIDATION_ERROR', details);
  }
}
