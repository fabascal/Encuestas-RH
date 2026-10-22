import { z } from 'zod';
export const directorSurveyQuerySchema = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12).optional(),
    companyId: z.string().uuid().optional(),
    zoneId: z.string().uuid().optional(),
    managerId: z.string().uuid().optional(),
    stationId: z.string().uuid().optional(),
});
export const directorSheetsQuerySchema = directorSurveyQuerySchema.extend({
    section: z.string().min(1).max(120),
});
//# sourceMappingURL=schema.js.map