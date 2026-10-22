export class HttpError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, message, code = 'HTTP_ERROR', details) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
export class UnauthorizedError extends HttpError {
    constructor(message = 'Unauthorized') {
        super(401, message, 'UNAUTHORIZED');
    }
}
export class ForbiddenError extends HttpError {
    constructor(message = 'Forbidden') {
        super(403, message, 'FORBIDDEN');
    }
}
export class NotFoundError extends HttpError {
    constructor(message = 'Not found') {
        super(404, message, 'NOT_FOUND');
    }
}
export class ConflictError extends HttpError {
    constructor(message = 'Conflict') {
        super(409, message, 'CONFLICT');
    }
}
export class ValidationError extends HttpError {
    constructor(message = 'Validation failed', details) {
        super(422, message, 'VALIDATION_ERROR', details);
    }
}
//# sourceMappingURL=httpErrors.js.map