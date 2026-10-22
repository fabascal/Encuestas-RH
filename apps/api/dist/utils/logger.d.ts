import pino, { type LoggerOptions } from 'pino';
/** Shared options so the Fastify-managed logger and the standalone one match. */
export declare function buildLoggerOptions(): LoggerOptions;
/** Standalone logger for use outside of a request context (worker, startup, services). */
export declare const logger: pino.Logger<never, boolean>;
//# sourceMappingURL=logger.d.ts.map