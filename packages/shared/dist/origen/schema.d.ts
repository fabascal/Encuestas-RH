import { z } from 'zod';
export declare const GOOGLE_SURVEY_STATES: readonly ["todas", "consideradas", "no_consideradas"];
export type GoogleSurveyState = (typeof GOOGLE_SURVEY_STATES)[number];
export declare const googleSurveyQuerySchema: z.ZodObject<{
    period: z.ZodString;
    companyId: z.ZodOptional<z.ZodString>;
    zoneId: z.ZodOptional<z.ZodString>;
    stationId: z.ZodOptional<z.ZodString>;
    estado: z.ZodDefault<z.ZodEnum<["todas", "consideradas", "no_consideradas"]>>;
}, "strip", z.ZodTypeAny, {
    period: string;
    estado: "todas" | "consideradas" | "no_consideradas";
    companyId?: string | undefined;
    zoneId?: string | undefined;
    stationId?: string | undefined;
}, {
    period: string;
    companyId?: string | undefined;
    zoneId?: string | undefined;
    stationId?: string | undefined;
    estado?: "todas" | "consideradas" | "no_consideradas" | undefined;
}>;
export type GoogleSurveyQuery = z.infer<typeof googleSurveyQuerySchema>;
export declare const excludeSurveySchema: z.ZodEffects<z.ZodObject<{
    excluded: z.ZodBoolean;
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    excluded: boolean;
    reason?: string | undefined;
}, {
    excluded: boolean;
    reason?: string | undefined;
}>, {
    excluded: boolean;
    reason?: string | undefined;
}, {
    excluded: boolean;
    reason?: string | undefined;
}>;
export type ExcludeSurveyInput = z.infer<typeof excludeSurveySchema>;
export declare const nexusOilQuerySchema: z.ZodObject<{
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
export type NexusOilQuery = z.infer<typeof nexusOilQuerySchema>;
export declare const nexusRefetchSchema: z.ZodEffects<z.ZodObject<{
    from: z.ZodString;
    to: z.ZodString;
}, "strip", z.ZodTypeAny, {
    from: string;
    to: string;
}, {
    from: string;
    to: string;
}>, {
    from: string;
    to: string;
}, {
    from: string;
    to: string;
}>;
export type NexusRefetchInput = z.infer<typeof nexusRefetchSchema>;
//# sourceMappingURL=schema.d.ts.map