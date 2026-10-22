export declare class HttpError extends Error {
    statusCode: number;
    code: string;
    details?: unknown;
    constructor(statusCode: number, message: string, code?: string, details?: unknown);
}
export declare class UnauthorizedError extends HttpError {
    constructor(message?: string);
}
export declare class ForbiddenError extends HttpError {
    constructor(message?: string);
}
export declare class NotFoundError extends HttpError {
    constructor(message?: string);
}
export declare class ConflictError extends HttpError {
    constructor(message?: string);
}
export declare class ValidationError extends HttpError {
    constructor(message?: string, details?: unknown);
}
//# sourceMappingURL=httpErrors.d.ts.map