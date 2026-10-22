import { z } from 'zod';
import { env as baseEnv } from './env.js';

/** Additional variables only the HTTP API process needs. */
const apiEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 chars'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** Shared secret for POST /api/webhook, sent by Google as X-Webhook-Secret. Empty accepts any caller. */
  SECRET_TOKEN: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim() ?? '';
      return trimmed.length === 0 ? undefined : trimmed;
    })
    .refine((value) => value === undefined || value.length >= 24, 'SECRET_TOKEN must be at least 24 chars'),
});

export const apiEnv = { ...baseEnv, ...apiEnvSchema.parse(process.env) };
export type ApiEnv = typeof apiEnv;
