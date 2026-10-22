import { kpiLabel } from '../labels/es.js';
function computeProgressPct(actualValue, targetValue, higherIsBetter) {
    if (higherIsBetter) {
        if (targetValue === 0)
            return null;
        return actualValue / targetValue;
    }
    if (actualValue === 0)
        return null;
    return targetValue / actualValue;
}
/**
 * Calculates the payout for a single kpi rule against an actual value.
 *
 * fixed_amount: pays the full base slice when actualValue reaches minAmount, otherwise 0.
 * percentage: pays base * min(progressPct, maxPayoutPct/100) when progressPct reaches the
 * minimum threshold, otherwise 0. Example: target $1,000, threshold 80%, base $100.
 * Actual $800 -> progress 80% -> payout $80. Actual $700 -> below threshold -> payout $0.
 */
export function calculateBonusLine(rule, actualValue, poolAmount, mode = 'pool_weighted') {
    if (mode === 'fixed_per_kpi' || rule.goalType === 'pass_fail') {
        return calculatePassFailLine(rule, actualValue);
    }
    const base = (poolAmount * (rule.weight ?? 0)) / 100;
    const progressPct = computeProgressPct(actualValue, rule.targetValue, rule.higherIsBetter);
    let eligible = false;
    let payout = 0;
    if (rule.goalType === 'fixed_amount') {
        const minAmount = rule.minAmount ?? 0;
        eligible = actualValue >= minAmount;
        payout = eligible ? base : 0;
    }
    else {
        const minThreshold = (rule.minThresholdPct ?? 0) / 100;
        const maxPayout = rule.maxPayoutPct / 100;
        eligible = progressPct !== null && progressPct >= minThreshold;
        payout = eligible && progressPct !== null ? base * Math.min(progressPct, maxPayout) : 0;
    }
    return {
        kpiCategoryId: rule.kpiCategoryId,
        kpiCode: rule.kpiCode,
        kpiName: kpiLabel(rule.kpiCode, rule.kpiName),
        weight: rule.weight,
        goalType: rule.goalType,
        base,
        actualValue,
        targetValue: rule.targetValue,
        progressPct,
        eligible,
        payout: roundCurrency(payout),
    };
}
function calculatePassFailLine(rule, actualValue) {
    const threshold = rule.thresholdValue ?? rule.targetValue;
    const payoutAmount = rule.payoutAmount ?? 0;
    const comparator = rule.comparator ?? 'gte';
    const eligible = comparator === 'lte' ? actualValue <= threshold : actualValue >= threshold;
    const progressPct = comparator === 'lte'
        ? actualValue === 0
            ? 1
            : threshold / actualValue
        : threshold === 0
            ? null
            : actualValue / threshold;
    return {
        kpiCategoryId: rule.kpiCategoryId,
        kpiCode: rule.kpiCode,
        kpiName: kpiLabel(rule.kpiCode, rule.kpiName),
        weight: null,
        goalType: 'pass_fail',
        base: payoutAmount,
        actualValue,
        targetValue: threshold,
        progressPct,
        eligible,
        payout: eligible ? roundCurrency(payoutAmount) : 0,
    };
}
/**
 * Calculates the full bonus for a station.
 * pool_weighted splits the pool by weight. fixed_per_kpi pays each rubro's own amount
 * when its comparator is met, and 0 otherwise.
 */
export function calculateStationBonus(poolAmount, rules, actuals, mode = 'pool_weighted') {
    const actualsByKpi = new Map(actuals.map((a) => [a.kpiCategoryId, a.actualValue]));
    const lines = rules.map((rule) => calculateBonusLine(rule, actualsByKpi.get(rule.kpiCategoryId) ?? 0, poolAmount, mode));
    const totalPayout = roundCurrency(lines.reduce((sum, line) => sum + line.payout, 0));
    return { poolAmount, totalPayout, lines };
}
function roundCurrency(value) {
    return Math.round(value * 100) / 100;
}
//# sourceMappingURL=calculate.js.map