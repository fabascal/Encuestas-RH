import { z } from 'zod';
export declare const createCompanySchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
}, {
    code: string;
    name: string;
}>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export declare const createZoneSchema: z.ZodObject<{
    companyId: z.ZodString;
    code: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    companyId: string;
}, {
    code: string;
    name: string;
    companyId: string;
}>;
export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export declare const createStationSchema: z.ZodObject<{
    zoneId: z.ZodString;
    code: z.ZodString;
    name: z.ZodString;
    address: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    zoneId: string;
    address?: string | undefined;
}, {
    code: string;
    name: string;
    zoneId: string;
    address?: string | undefined;
}>;
export type CreateStationInput = z.infer<typeof createStationSchema>;
export declare const updateCompanySchema: z.ZodEffects<z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    name?: string | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
}>, {
    code?: string | undefined;
    name?: string | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
}>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export declare const updateZoneSchema: z.ZodEffects<z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    name?: string | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
}>, {
    code?: string | undefined;
    name?: string | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
}>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
export declare const updateStationSchema: z.ZodEffects<z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    zoneId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    name?: string | undefined;
    zoneId?: string | undefined;
    address?: string | null | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
    zoneId?: string | undefined;
    address?: string | null | undefined;
}>, {
    code?: string | undefined;
    name?: string | undefined;
    zoneId?: string | undefined;
    address?: string | null | undefined;
}, {
    code?: string | undefined;
    name?: string | undefined;
    zoneId?: string | undefined;
    address?: string | null | undefined;
}>;
export type UpdateStationInput = z.infer<typeof updateStationSchema>;
export declare const managerListQuerySchema: z.ZodObject<{
    companyId: z.ZodOptional<z.ZodString>;
    zoneId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    companyId?: string | undefined;
    zoneId?: string | undefined;
}, {
    companyId?: string | undefined;
    zoneId?: string | undefined;
}>;
export type ManagerListQuery = z.infer<typeof managerListQuerySchema>;
export declare const stationListQuerySchema: z.ZodObject<{
    zoneId: z.ZodOptional<z.ZodString>;
    managerId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    zoneId?: string | undefined;
    managerId?: string | undefined;
}, {
    zoneId?: string | undefined;
    managerId?: string | undefined;
}>;
export type StationListQuery = z.infer<typeof stationListQuerySchema>;
export declare const userScopeSchema: z.ZodEffects<z.ZodObject<{
    companyId: z.ZodNullable<z.ZodString>;
    zoneId: z.ZodNullable<z.ZodString>;
    stationId: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    companyId: string | null;
    zoneId: string | null;
    stationId: string | null;
}, {
    companyId: string | null;
    zoneId: string | null;
    stationId: string | null;
}>, {
    companyId: string | null;
    zoneId: string | null;
    stationId: string | null;
}, {
    companyId: string | null;
    zoneId: string | null;
    stationId: string | null;
}>;
export type UserScopeInput = z.infer<typeof userScopeSchema>;
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    fullName: z.ZodString;
    password: z.ZodString;
    roleId: z.ZodString;
    scopes: z.ZodArray<z.ZodEffects<z.ZodObject<{
        companyId: z.ZodNullable<z.ZodString>;
        zoneId: z.ZodNullable<z.ZodString>;
        stationId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }, {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }>, {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }, {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    fullName: string;
    roleId: string;
    scopes: {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }[];
}, {
    email: string;
    password: string;
    fullName: string;
    roleId: string;
    scopes: {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }[];
}>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export declare const updateUserSchema: z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    roleId: z.ZodOptional<z.ZodString>;
    active: z.ZodOptional<z.ZodBoolean>;
    scopes: z.ZodOptional<z.ZodArray<z.ZodEffects<z.ZodObject<{
        companyId: z.ZodNullable<z.ZodString>;
        zoneId: z.ZodNullable<z.ZodString>;
        stationId: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }, {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }>, {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }, {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    fullName?: string | undefined;
    roleId?: string | undefined;
    scopes?: {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }[] | undefined;
    active?: boolean | undefined;
}, {
    fullName?: string | undefined;
    roleId?: string | undefined;
    scopes?: {
        companyId: string | null;
        zoneId: string | null;
        stationId: string | null;
    }[] | undefined;
    active?: boolean | undefined;
}>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
//# sourceMappingURL=org.d.ts.map