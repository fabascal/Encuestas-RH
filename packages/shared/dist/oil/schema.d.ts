import { z } from 'zod';
export declare const panelOilQuerySchema: z.ZodObject<{
    period: z.ZodString;
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
}, {
    period: string;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    managerId?: string | undefined;
    stationId?: string | undefined;
}>;
export type PanelOilQuery = z.infer<typeof panelOilQuerySchema>;
export declare const directorOilQuerySchema: z.ZodObject<{
    year: z.ZodNumber;
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
}, {
    year: number;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    managerId?: string | undefined;
    stationId?: string | undefined;
}>;
export type DirectorOilQuery = z.infer<typeof directorOilQuerySchema>;
//# sourceMappingURL=schema.d.ts.map