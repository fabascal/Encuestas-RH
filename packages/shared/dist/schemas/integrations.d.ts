import { z } from 'zod';
export declare const googleFormsConfigSchema: z.ZodObject<{
    spreadsheetId: z.ZodString;
    sheetName: z.ZodString;
    serviceAccountEmail: z.ZodString;
    timestampColumn: z.ZodDefault<z.ZodString>;
    emailColumn: z.ZodDefault<z.ZodString>;
    scoreColumn: z.ZodDefault<z.ZodString>;
    stationColumn: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    spreadsheetId: string;
    sheetName: string;
    serviceAccountEmail: string;
    timestampColumn: string;
    emailColumn: string;
    scoreColumn: string;
    stationColumn: string;
}, {
    spreadsheetId: string;
    sheetName: string;
    serviceAccountEmail: string;
    timestampColumn?: string | undefined;
    emailColumn?: string | undefined;
    scoreColumn?: string | undefined;
    stationColumn?: string | undefined;
}>;
export type GoogleFormsConfig = z.infer<typeof googleFormsConfigSchema>;
export declare const nexusFuelConfigSchema: z.ZodObject<{
    baseUrl: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
}, {
    baseUrl?: string | undefined;
}>;
export type NexusFuelConfig = z.infer<typeof nexusFuelConfigSchema>;
export declare const nomina3ConfigSchema: z.ZodObject<{
    baseUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
}, {
    baseUrl: string;
}>;
export type Nomina3Config = z.infer<typeof nomina3ConfigSchema>;
export declare const sispaConfigSchema: z.ZodObject<{
    baseUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
}, {
    baseUrl: string;
}>;
export type SispaConfig = z.infer<typeof sispaConfigSchema>;
export declare const integrationConfigByProvider: {
    readonly google_forms: z.ZodObject<{
        spreadsheetId: z.ZodString;
        sheetName: z.ZodString;
        serviceAccountEmail: z.ZodString;
        timestampColumn: z.ZodDefault<z.ZodString>;
        emailColumn: z.ZodDefault<z.ZodString>;
        scoreColumn: z.ZodDefault<z.ZodString>;
        stationColumn: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        spreadsheetId: string;
        sheetName: string;
        serviceAccountEmail: string;
        timestampColumn: string;
        emailColumn: string;
        scoreColumn: string;
        stationColumn: string;
    }, {
        spreadsheetId: string;
        sheetName: string;
        serviceAccountEmail: string;
        timestampColumn?: string | undefined;
        emailColumn?: string | undefined;
        scoreColumn?: string | undefined;
        stationColumn?: string | undefined;
    }>;
    readonly nexus_fuel: z.ZodObject<{
        baseUrl: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
    }, {
        baseUrl?: string | undefined;
    }>;
    readonly nomina3: z.ZodObject<{
        baseUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
    }, {
        baseUrl: string;
    }>;
    readonly sispa: z.ZodObject<{
        baseUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
    }, {
        baseUrl: string;
    }>;
};
export declare const createIntegrationCredentialSchema: z.ZodObject<{
    provider: z.ZodEnum<["google_forms", "nexus_fuel", "nomina3", "sispa"]>;
    companyId: z.ZodNullable<z.ZodString>;
    secret: z.ZodString;
    config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    cronExpression: z.ZodString;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    companyId: string | null;
    provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa";
    secret: string;
    config: Record<string, unknown>;
    cronExpression: string;
    enabled: boolean;
}, {
    companyId: string | null;
    provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa";
    secret: string;
    config: Record<string, unknown>;
    cronExpression: string;
    enabled?: boolean | undefined;
}>;
export type CreateIntegrationCredentialInput = z.infer<typeof createIntegrationCredentialSchema>;
export declare const previewRequestSchema: z.ZodObject<{
    period: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    period?: string | undefined;
}, {
    period?: string | undefined;
    limit?: number | undefined;
}>;
export type PreviewRequest = z.infer<typeof previewRequestSchema>;
export declare const syncNowSchema: z.ZodEffects<z.ZodObject<{
    period: z.ZodOptional<z.ZodString>;
    from: z.ZodOptional<z.ZodString>;
    to: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    period?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    period?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>, {
    period?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}, {
    period?: string | undefined;
    from?: string | undefined;
    to?: string | undefined;
}>;
export type SyncNowInput = z.infer<typeof syncNowSchema>;
export declare const stationRefSchema: z.ZodObject<{
    externalId: z.ZodString;
    stationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    stationId: string;
    externalId: string;
}, {
    stationId: string;
    externalId: string;
}>;
export type StationRefInput = z.infer<typeof stationRefSchema>;
export declare const testConnectionResultSchema: z.ZodObject<{
    success: z.ZodBoolean;
    message: z.ZodString;
    testedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    success: boolean;
    message: string;
    testedAt: string;
}, {
    success: boolean;
    message: string;
    testedAt: string;
}>;
export type TestConnectionResult = z.infer<typeof testConnectionResultSchema>;
//# sourceMappingURL=integrations.d.ts.map