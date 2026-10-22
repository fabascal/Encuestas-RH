import { z } from 'zod';
export declare const directorSurveyQuerySchema: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodOptional<z.ZodNumber>;
    companyId: z.ZodOptional<z.ZodString>;
    zoneId: z.ZodOptional<z.ZodString>;
    managerId: z.ZodOptional<z.ZodString>;
    stationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    year: number;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    managerId?: string | undefined;
    stationId?: string | undefined;
    month?: number | undefined;
}, {
    year: number;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    managerId?: string | undefined;
    stationId?: string | undefined;
    month?: number | undefined;
}>;
export type DirectorSurveyQuery = z.infer<typeof directorSurveyQuerySchema>;
export declare const directorSheetsQuerySchema: z.ZodObject<{
    year: z.ZodNumber;
    month: z.ZodOptional<z.ZodNumber>;
    companyId: z.ZodOptional<z.ZodString>;
    zoneId: z.ZodOptional<z.ZodString>;
    managerId: z.ZodOptional<z.ZodString>;
    stationId: z.ZodOptional<z.ZodString>;
} & {
    section: z.ZodString;
}, "strip", z.ZodTypeAny, {
    year: number;
    section: string;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    managerId?: string | undefined;
    stationId?: string | undefined;
    month?: number | undefined;
}, {
    year: number;
    section: string;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    managerId?: string | undefined;
    stationId?: string | undefined;
    month?: number | undefined;
}>;
export type DirectorSheetsQuery = z.infer<typeof directorSheetsQuerySchema>;
//# sourceMappingURL=schema.d.ts.map