import { z } from 'zod';
import { env as baseEnv } from './env.js';
/** Additional variables only the HTTP API process needs. */
const apiEnvSchema = z.object({
    PORT: z.coerce.number().int().positive().default(3000),
    JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
});
export const apiEnv = { ...baseEnv, ...apiEnvSchema.parse(process.env) };
//# sourceMappingURL=apiEnv.js.map