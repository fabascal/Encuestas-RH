import { z } from 'zod';
import { INTEGRATION_PROVIDERS, KPI_UNITS } from '../types/enums.js';
export const kpiCategorySchema = z.object({
    code: z.string().min(1).max(40),
    name: z.string().min(1).max(120),
    unit: z.enum(KPI_UNITS),
    higherIsBetter: z.boolean(),
    sourceProvider: z.enum(INTEGRATION_PROVIDERS).nullable(),
});
export const kpiFactSchema = z.object({
    stationId: z.string().uuid(),
    kpiCategoryId: z.string().uuid(),
    period: z.string().date(),
    value: z.number(),
    source: z.string().min(1).max(40),
});
export const periodQuerySchema = z.object({
    period: z.string().date(),
    companyId: z.string().uuid().optional(),
    zoneId: z.string().uuid().optional(),
    stationId: z.string().uuid().optional(),
});
//# sourceMappingURL=kpis.js.map