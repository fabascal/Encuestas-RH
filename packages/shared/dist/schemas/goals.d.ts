import { z } from 'zod';
export declare const goalRuleSchema: z.ZodEffects<z.ZodObject<{
    kpiCategoryId: z.ZodString;
    weight: z.ZodNullable<z.ZodNumber>;
    goalType: z.ZodEnum<["fixed_amount", "percentage", "pass_fail"]>;
    targetValue: z.ZodNumber;
    minAmount: z.ZodNullable<z.ZodNumber>;
    minThresholdPct: z.ZodNullable<z.ZodNumber>;
    maxPayoutPct: z.ZodDefault<z.ZodNumber>;
    comparator: z.ZodNullable<z.ZodEnum<["gte", "lte"]>>;
    thresholdValue: z.ZodNullable<z.ZodNumber>;
    payoutAmount: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    kpiCategoryId: string;
    weight: number | null;
    goalType: "fixed_amount" | "percentage" | "pass_fail";
    targetValue: number;
    minAmount: number | null;
    minThresholdPct: number | null;
    maxPayoutPct: number;
    comparator: "gte" | "lte" | null;
    thresholdValue: number | null;
    payoutAmount: number | null;
}, {
    kpiCategoryId: string;
    weight: number | null;
    goalType: "fixed_amount" | "percentage" | "pass_fail";
    targetValue: number;
    minAmount: number | null;
    minThresholdPct: number | null;
    comparator: "gte" | "lte" | null;
    thresholdValue: number | null;
    payoutAmount: number | null;
    maxPayoutPct?: number | undefined;
}>, {
    kpiCategoryId: string;
    weight: number | null;
    goalType: "fixed_amount" | "percentage" | "pass_fail";
    targetValue: number;
    minAmount: number | null;
    minThresholdPct: number | null;
    maxPayoutPct: number;
    comparator: "gte" | "lte" | null;
    thresholdValue: number | null;
    payoutAmount: number | null;
}, {
    kpiCategoryId: string;
    weight: number | null;
    goalType: "fixed_amount" | "percentage" | "pass_fail";
    targetValue: number;
    minAmount: number | null;
    minThresholdPct: number | null;
    comparator: "gte" | "lte" | null;
    thresholdValue: number | null;
    payoutAmount: number | null;
    maxPayoutPct?: number | undefined;
}>;
export type GoalRuleInputDto = z.infer<typeof goalRuleSchema>;
export declare const createGoalRuleSetSchema: z.ZodEffects<z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["pool_weighted", "fixed_per_kpi"]>>;
    scopeLevel: z.ZodEnum<["company", "zone", "station"]>;
    scopeId: z.ZodString;
    validFrom: z.ZodString;
    validTo: z.ZodNullable<z.ZodString>;
    poolAmount: z.ZodNumber;
    /** When true, the previous version of this same scope is closed the day before validFrom. */
    closePrevious: z.ZodDefault<z.ZodBoolean>;
    rules: z.ZodArray<z.ZodEffects<z.ZodObject<{
        kpiCategoryId: z.ZodString;
        weight: z.ZodNullable<z.ZodNumber>;
        goalType: z.ZodEnum<["fixed_amount", "percentage", "pass_fail"]>;
        targetValue: z.ZodNumber;
        minAmount: z.ZodNullable<z.ZodNumber>;
        minThresholdPct: z.ZodNullable<z.ZodNumber>;
        maxPayoutPct: z.ZodDefault<z.ZodNumber>;
        comparator: z.ZodNullable<z.ZodEnum<["gte", "lte"]>>;
        thresholdValue: z.ZodNullable<z.ZodNumber>;
        payoutAmount: z.ZodNullable<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        kpiCategoryId: string;
        weight: number | null;
        goalType: "fixed_amount" | "percentage" | "pass_fail";
        targetValue: number;
        minAmount: number | null;
        minThresholdPct: number | null;
        maxPayoutPct: number;
        comparator: "gte" | "lte" | null;
        thresholdValue: number | null;
        payoutAmount: number | null;
    }, {
        kpiCategoryId: string;
        weight: number | null;
        goalType: "fixed_amount" | "percentage" | "pass_fail";
        targetValue: number;
        minAmount: number | null;
        minThresholdPct: number | null;
        comparator: "gte" | "lte" | null;
        thresholdValue: number | null;
        payoutAmount: number | null;
        maxPayoutPct?: number | undefined;
    }>, {
        kpiCategoryId: string;
        weight: number | null;
        goalType: "fixed_amount" | "percentage" | "pass_fail";
        targetValue: number;
        minAmount: number | null;
        minThresholdPct: number | null;
        maxPayoutPct: number;
        comparator: "gte" | "lte" | null;
        thresholdValue: number | null;
        payoutAmount: number | null;
    }, {
        kpiCategoryId: string;
        weight: number | null;
        goalType: "fixed_amount" | "percentage" | "pass_fail";
        targetValue: number;
        minAmount: number | null;
        minThresholdPct: number | null;
        comparator: "gte" | "lte" | null;
        thresholdValue: number | null;
        payoutAmount: number | null;
        maxPayoutPct?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    mode: "pool_weighted" | "fixed_per_kpi";
    scopeLevel: "company" | "zone" | "station";
    scopeId: string;
    validFrom: string;
    validTo: string | null;
    poolAmount: number;
    closePrevious: boolean;
    rules: {
        kpiCategoryId: string;
        weight: number | null;
        goalType: "fixed_amount" | "percentage" | "pass_fail";
        targetValue: number;
        minAmount: number | null;
        minThresholdPct: number | null;
        maxPayoutPct: number;
        comparator: "gte" | "lte" | null;
        thresholdValue: number | null;
        payoutAmount: number | null;
    }[];
}, {
    scopeLevel: "company" | "zone" | "station";
    scopeId: string;
    validFrom: string;
    validTo: string | null;
    poolAmount: number;
    rules: {
        kpiCategoryId: string;
        weight: number | null;
        goalType: "fixed_amount" | "percentage" | "pass_fail";
        targetValue: number;
        minAmount: number | null;
        minThresholdPct: number | null;
        comparator: "gte" | "lte" | null;
        thresholdValue: number | null;
        payoutAmount: number | null;
        maxPayoutPct?: number | undefined;
    }[];
    mode?: "pool_weighted" | "fixed_per_kpi" | undefined;
    closePrevious?: boolean | undefined;
}>, {
    mode: "pool_weighted" | "fixed_per_kpi";
    scopeLevel: "company" | "zone" | "station";
    scopeId: string;
    validFrom: string;
    validTo: string | null;
    poolAmount: number;
    closePrevious: boolean;
    rules: {
        kpiCategoryId: string;
        weight: number | null;
        goalType: "fixed_amount" | "percentage" | "pass_fail";
        targetValue: number;
        minAmount: number | null;
        minThresholdPct: number | null;
        maxPayoutPct: number;
        comparator: "gte" | "lte" | null;
        thresholdValue: number | null;
        payoutAmount: number | null;
    }[];
}, {
    scopeLevel: "company" | "zone" | "station";
    scopeId: string;
    validFrom: string;
    validTo: string | null;
    poolAmount: number;
    rules: {
        kpiCategoryId: string;
        weight: number | null;
        goalType: "fixed_amount" | "percentage" | "pass_fail";
        targetValue: number;
        minAmount: number | null;
        minThresholdPct: number | null;
        comparator: "gte" | "lte" | null;
        thresholdValue: number | null;
        payoutAmount: number | null;
        maxPayoutPct?: number | undefined;
    }[];
    mode?: "pool_weighted" | "fixed_per_kpi" | undefined;
    closePrevious?: boolean | undefined;
}>;
export type CreateGoalRuleSetInput = z.infer<typeof createGoalRuleSetSchema>;
//# sourceMappingURL=goals.d.ts.map