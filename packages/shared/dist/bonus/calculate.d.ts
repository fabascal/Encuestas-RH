import type { GoalType, RuleComparator, RuleSetMode } from '../types/enums.js';
/**
 * A single goal rule resolved for one station/kpi/period. This is the shape
 * both the API (from goal_rules rows) and the frontend simulator must build
 * before calling calculateStationBonus, so both sides produce identical results.
 */
export interface GoalRuleInput {
    kpiCategoryId: string;
    kpiCode: string;
    /** Percentage weight of the pool assigned to this kpi, 0-100. Null in fixed_per_kpi mode. */
    weight: number | null;
    goalType: GoalType;
    /** Target value used for percentage goals (the value considered 100% progress). */
    targetValue: number;
    /** Minimum accreditable amount for fixed_amount goals. Below this, payout is 0. */
    minAmount: number | null;
    /** Minimum percentage of the target (0-100) required to accredit any payout on percentage goals. */
    minThresholdPct: number | null;
    /** Cap on progress percentage (0-100+) used to compute payout, e.g. 100 means no accelerator. */
    maxPayoutPct: number;
    /** False for kpis where a lower actual value is better (e.g. staff turnover). */
    higherIsBetter: boolean;
    /** Spanish name shown to operators. Falls back to the code's known label. */
    kpiName?: string | null;
    /** pass_fail: gte pays when actual >= threshold, lte pays when actual <= threshold. */
    comparator?: RuleComparator | null;
    /** pass_fail: the value the actual is compared against. */
    thresholdValue?: number | null;
    /** pass_fail: amount paid when the comparator is met, otherwise 0. */
    payoutAmount?: number | null;
}
export interface KpiActualInput {
    kpiCategoryId: string;
    actualValue: number;
}
export interface BonusLineResult {
    kpiCategoryId: string;
    kpiCode: string;
    kpiName: string;
    weight: number | null;
    goalType: GoalType;
    /** Slice of the pool assigned to this kpi: poolAmount * weight / 100. */
    base: number;
    actualValue: number;
    targetValue: number;
    /** Fraction of goal reached (1 = 100%). Null when it cannot be computed (e.g. target is 0). */
    progressPct: number | null;
    eligible: boolean;
    payout: number;
}
export interface BonusCalculationResult {
    poolAmount: number;
    totalPayout: number;
    lines: BonusLineResult[];
}
/**
 * Calculates the payout for a single kpi rule against an actual value.
 *
 * fixed_amount: pays the full base slice when actualValue reaches minAmount, otherwise 0.
 * percentage: pays base * min(progressPct, maxPayoutPct/100) when progressPct reaches the
 * minimum threshold, otherwise 0. Example: target $1,000, threshold 80%, base $100.
 * Actual $800 -> progress 80% -> payout $80. Actual $700 -> below threshold -> payout $0.
 */
export declare function calculateBonusLine(rule: GoalRuleInput, actualValue: number, poolAmount: number, mode?: RuleSetMode): BonusLineResult;
/**
 * Calculates the full bonus for a station.
 * pool_weighted splits the pool by weight. fixed_per_kpi pays each rubro's own amount
 * when its comparator is met, and 0 otherwise.
 */
export declare function calculateStationBonus(poolAmount: number, rules: GoalRuleInput[], actuals: KpiActualInput[], mode?: RuleSetMode): BonusCalculationResult;
//# sourceMappingURL=calculate.d.ts.map