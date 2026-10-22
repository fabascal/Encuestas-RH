import { z } from 'zod';
import { PERMISSIONS } from '../types/enums.js';

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  role: z.object({
    id: z.string().uuid(),
    name: z.string(),
  }),
  permissions: z.array(z.enum(PERMISSIONS)),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  expiresInSeconds: z.number().int().positive(),
  user: authUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
