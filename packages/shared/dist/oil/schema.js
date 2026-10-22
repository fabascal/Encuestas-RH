import { z } from 'zod';
export const panelOilQuerySchema = z.object({
    period: z.string().date(),
    companyId: z.string().uuid().optional(),
    zoneId: z.string().uuid().optional(),
    managerId: z.string().uuid().optional(),
    stationId: z.string().uuid().optional(),
});
export const directorOilQuerySchema = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    companyId: z.string().uuid().optional(),
    zoneId: z.string().uuid().optional(),
    managerId: z.string().uuid().optional(),
    stationId: z.string().uuid().optional(),
});
//# sourceMappingURL=schema.js.map