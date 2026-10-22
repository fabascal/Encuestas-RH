import { z } from 'zod';

export const createCompanySchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const createZoneSchema = z.object({
  companyId: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
});
export type CreateZoneInput = z.infer<typeof createZoneSchema>;

export const createStationSchema = z.object({
  zoneId: z.string().uuid(),
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(120),
  address: z.string().max(255).optional(),
});
export type CreateStationInput = z.infer<typeof createStationSchema>;

const atLeastOneField = (value: Record<string, unknown>) =>
  Object.values(value).some((field) => field !== undefined);

export const updateCompanySchema = z
  .object({
    code: z.string().trim().min(1).max(20).optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine(atLeastOneField, { message: 'Indica al menos un campo' });
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const updateZoneSchema = z
  .object({
    code: z.string().trim().min(1).max(20).optional(),
    name: z.string().trim().min(1).max(120).optional(),
  })
  .refine(atLeastOneField, { message: 'Indica al menos un campo' });
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;

export const updateStationSchema = z
  .object({
    code: z.string().trim().min(1).max(20).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().max(255).nullable().optional(),
    zoneId: z.string().uuid().optional(),
  })
  .refine(atLeastOneField, { message: 'Indica al menos un campo' });
export type UpdateStationInput = z.infer<typeof updateStationSchema>;

export const managerListQuerySchema = z.object({
  companyId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
});
export type ManagerListQuery = z.infer<typeof managerListQuerySchema>;

export const stationListQuerySchema = z.object({
  zoneId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
});
export type StationListQuery = z.infer<typeof stationListQuerySchema>;

export const userScopeSchema = z
  .object({
    companyId: z.string().uuid().nullable(),
    zoneId: z.string().uuid().nullable(),
    stationId: z.string().uuid().nullable(),
  })
  .refine(
    (scope) =>
      [scope.companyId, scope.zoneId, scope.stationId].filter((v) => v !== null).length === 1,
    { message: 'Debe indicarse exactamente un alcance' },
  );
export type UserScopeInput = z.infer<typeof userScopeSchema>;

export const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  password: z.string().min(8),
  roleId: z.string().uuid(),
  scopes: z.array(userScopeSchema).min(1),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  fullName: z.string().min(1).max(120).optional(),
  roleId: z.string().uuid().optional(),
  active: z.boolean().optional(),
  scopes: z.array(userScopeSchema).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
