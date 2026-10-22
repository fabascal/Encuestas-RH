import pino from 'pino';
import { env } from '../config/env.js';
/** Shared options so the Fastify-managed logger and the standalone one match. */
export function buildLoggerOptions() {
    const base = { level: env.LOG_LEVEL };
    if (env.NODE_ENV === 'development') {
        return { ...base, transport: { target: 'pino-pretty' } };
    }
    return base;
}
/** Standalone logger for use outside of a request context (worker, startup, services). */
export const logger = pino(buildLoggerOptions());
//# sourceMappingURL=logger.js.map