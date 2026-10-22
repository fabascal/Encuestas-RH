import { z } from 'zod';
export declare const REPORT_IDS: readonly ["resumen", "cumplimiento", "pagos", "tendencia", "estacion", "encuestas"];
export type ReportId = (typeof REPORT_IDS)[number];
export declare const reportQuerySchema: z.ZodObject<{
    period: z.ZodString;
    months: z.ZodOptional<z.ZodNumber>;
    companyId: z.ZodOptional<z.ZodString>;
    zoneId: z.ZodOptional<z.ZodString>;
    managerId: z.ZodOptional<z.ZodString>;
    stationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    period: string;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    managerId?: string | undefined;
    stationId?: string | undefined;
    months?: number | undefined;
}, {
    period: string;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    managerId?: string | undefined;
    stationId?: string | undefined;
    months?: number | undefined;
}>;
export type ReportQuery = z.infer<typeof reportQuerySchema>;
//# sourceMappingURL=schema.d.ts.map