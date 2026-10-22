import { z } from 'zod';

export const REPORT_IDS = ['resumen', 'cumplimiento', 'pagos', 'tendencia', 'estacion', 'encuestas'] as const;
export type ReportId = (typeof REPORT_IDS)[number];

export const reportQuerySchema = z.object({
  period: z.string().date(),
  months: z.coerce.number().int().min(3).max(12).optional(),
  companyId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  managerId: z.string().uuid().optional(),
  stationId: z.string().uuid().optional(),
});
export type ReportQuery = z.infer<typeof reportQuerySchema>;
