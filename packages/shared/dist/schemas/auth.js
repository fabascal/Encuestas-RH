import { z } from 'zod';
import { PERMISSIONS } from '../types/enums.js';
export const loginRequestSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});
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
export const loginResponseSchema = z.object({
    accessToken: z.string(),
    expiresInSeconds: z.number().int().positive(),
    user: authUserSchema,
});
//# sourceMappingURL=auth.js.map