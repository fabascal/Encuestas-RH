import { z } from 'zod';
export const createCompanySchema = z.object({
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(120),
});
export const createZoneSchema = z.object({
    companyId: z.string().uuid(),
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(120),
});
export const createStationSchema = z.object({
    zoneId: z.string().uuid(),
    code: z.string().min(1).max(20),
    name: z.string().min(1).max(120),
    address: z.string().max(255).optional(),
});
const atLeastOneField = (value) => Object.values(value).some((field) => field !== undefined);
export const updateCompanySchema = z
    .object({
    code: z.string().trim().min(1).max(20).optional(),
    name: z.string().trim().min(1).max(120).optional(),
})
    .refine(atLeastOneField, { message: 'Indica al menos un campo' });
export const updateZoneSchema = z
    .object({
    code: z.string().trim().min(1).max(20).optional(),
    name: z.string().trim().min(1).max(120).optional(),
})
    .refine(atLeastOneField, { message: 'Indica al menos un campo' });
export const updateStationSchema = z
    .object({
    code: z.string().trim().min(1).max(20).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().max(255).nullable().optional(),
    zoneId: z.string().uuid().optional(),
})
    .refine(atLeastOneField, { message: 'Indica al menos un campo' });
export const managerListQuerySchema = z.object({
    companyId: z.string().uuid().optional(),
    zoneId: z.string().uuid().optional(),
});
export const stationListQuerySchema = z.object({
    zoneId: z.string().uuid().optional(),
    managerId: z.string().uuid().optional(),
});
export const userScopeSchema = z
    .object({
    companyId: z.string().uuid().nullable(),
    zoneId: z.string().uuid().nullable(),
    stationId: z.string().uuid().nullable(),
})
    .refine((scope) => [scope.companyId, scope.zoneId, scope.stationId].filter((v) => v !== null).length === 1, { message: 'Debe indicarse exactamente un alcance' });
export const createUserSchema = z.object({
    email: z.string().email(),
    fullName: z.string().min(1).max(120),
    password: z.string().min(8),
    roleId: z.string().uuid(),
    scopes: z.array(userScopeSchema).min(1),
});
export const updateUserSchema = z.object({
    fullName: z.string().min(1).max(120).optional(),
    roleId: z.string().uuid().optional(),
    active: z.boolean().optional(),
    scopes: z.array(userScopeSchema).optional(),
});
//# sourceMappingURL=org.js.map