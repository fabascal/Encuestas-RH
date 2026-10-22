import 'dotenv/config';
import { z } from 'zod';
/** Variables required by both the API and the worker process. */
const baseEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    APP_ENCRYPTION_KEY: z.string().min(1, 'APP_ENCRYPTION_KEY is required'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});
export const env = baseEnvSchema.parse(process.env);
//# sourceMappingURL=env.js.map