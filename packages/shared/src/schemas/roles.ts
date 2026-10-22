import { z } from 'zod';
import { PERMISSIONS } from '../types/enums.js';

export const createRoleSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(240).nullable(),
  permissions: z.array(z.enum(PERMISSIONS)).min(1),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = createRoleSchema;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
