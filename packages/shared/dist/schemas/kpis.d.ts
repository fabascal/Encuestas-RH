import { z } from 'zod';
export declare const kpiCategorySchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    unit: z.ZodEnum<["currency", "percentage", "score", "count"]>;
    higherIsBetter: z.ZodBoolean;
    sourceProvider: z.ZodNullable<z.ZodEnum<["google_forms", "nexus_fuel", "nomina3", "sispa"]>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    unit: "percentage" | "currency" | "score" | "count";
    higherIsBetter: boolean;
    sourceProvider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa" | null;
}, {
    code: string;
    name: string;
    unit: "percentage" | "currency" | "score" | "count";
    higherIsBetter: boolean;
    sourceProvider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa" | null;
}>;
export type KpiCategoryInput = z.infer<typeof kpiCategorySchema>;
export declare const kpiFactSchema: z.ZodObject<{
    stationId: z.ZodString;
    kpiCategoryId: z.ZodString;
    period: z.ZodString;
    value: z.ZodNumber;
    source: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: number;
    stationId: string;
    kpiCategoryId: string;
    period: string;
    source: string;
}, {
    value: number;
    stationId: string;
    kpiCategoryId: string;
    period: string;
    source: string;
}>;
export type KpiFactInput = z.infer<typeof kpiFactSchema>;
export declare const periodQuerySchema: z.ZodObject<{
    period: z.ZodString;
    companyId: z.ZodOptional<z.ZodString>;
    zoneId: z.ZodOptional<z.ZodString>;
    stationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    period: string;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    stationId?: string | undefined;
}, {
    period: string;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    stationId?: string | undefined;
}>;
export type PeriodQuery = z.infer<typeof periodQuerySchema>;
//# sourceMappingURL=kpis.d.ts.map