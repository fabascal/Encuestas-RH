import { z } from 'zod';
import { GOAL_TYPES, HIERARCHY_LEVELS, RULE_COMPARATORS, RULE_SET_MODES } from '../types/enums.js';
export const goalRuleSchema = z
    .object({
    kpiCategoryId: z.string().uuid(),
    weight: z.number().min(0).max(100).nullable(),
    goalType: z.enum(GOAL_TYPES),
    targetValue: z.number().nonnegative(),
    minAmount: z.number().nonnegative().nullable(),
    minThresholdPct: z.number().min(0).max(100).nullable(),
    maxPayoutPct: z.number().min(0).default(100),
    comparator: z.enum(RULE_COMPARATORS).nullable(),
    thresholdValue: z.number().nonnegative().nullable(),
    payoutAmount: z.number().nonnegative().nullable(),
})
    .superRefine((rule, ctx) => {
    if (rule.goalType === 'fixed_amount' && rule.minAmount === null) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'minAmount is required for fixed_amount goals',
            path: ['minAmount'],
        });
    }
    if (rule.goalType === 'percentage' && rule.minThresholdPct === null) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'minThresholdPct is required for percentage goals',
            path: ['minThresholdPct'],
        });
    }
    if (rule.goalType === 'pass_fail') {
        if (rule.comparator === null) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'comparator is required', path: ['comparator'] });
        }
        if (rule.thresholdValue === null) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'thresholdValue is required',
                path: ['thresholdValue'],
            });
        }
        if (rule.payoutAmount === null) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'payoutAmount is required', path: ['payoutAmount'] });
        }
    }
});
export const createGoalRuleSetSchema = z
    .object({
    mode: z.enum(RULE_SET_MODES).default('pool_weighted'),
    scopeLevel: z.enum(HIERARCHY_LEVELS),
    scopeId: z.string().uuid(),
    validFrom: z.string().date(),
    validTo: z.string().date().nullable(),
    poolAmount: z.number().nonnegative(),
    /** When true, the previous version of this same scope is closed the day before validFrom. */
    closePrevious: z.boolean().default(false),
    rules: z.array(goalRuleSchema).min(1),
})
    .superRefine((data, ctx) => {
    if (data.mode === 'fixed_per_kpi') {
        for (const [index, rule] of data.rules.entries()) {
            if (rule.weight !== null) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'fixed_per_kpi rules must not have a weight',
                    path: ['rules', index, 'weight'],
                });
            }
            if (rule.goalType !== 'pass_fail') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'fixed_per_kpi rules must use pass_fail',
                    path: ['rules', index, 'goalType'],
                });
            }
        }
        return;
    }
    const totalWeight = data.rules.reduce((sum, rule) => sum + (rule.weight ?? 0), 0);
    if (data.rules.some((rule) => rule.weight === null) || Math.abs(totalWeight - 100) > 0.01) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Rule weights must sum to 100, got ${totalWeight}`,
            path: ['rules'],
        });
    }
});
//# sourceMappingURL=goals.js.map