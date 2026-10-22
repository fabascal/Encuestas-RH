import { kpiLabel } from '../labels/es.js';
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

function computeProgressPct(
  actualValue: number,
  targetValue: number,
  higherIsBetter: boolean,
): number | null {
  if (higherIsBetter) {
    if (targetValue === 0) return null;
    return actualValue / targetValue;
  }
  if (actualValue === 0) return null;
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
export function calculateBonusLine(
  rule: GoalRuleInput,
  actualValue: number,
  poolAmount: number,
  mode: RuleSetMode = 'pool_weighted',
): BonusLineResult {
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
  } else {
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

function calculatePassFailLine(rule: GoalRuleInput, actualValue: number): BonusLineResult {
  const threshold = rule.thresholdValue ?? rule.targetValue;
  const payoutAmount = rule.payoutAmount ?? 0;
  const comparator = rule.comparator ?? 'gte';
  const eligible = comparator === 'lte' ? actualValue <= threshold : actualValue >= threshold;
  const progressPct =
    comparator === 'lte'
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
export function calculateStationBonus(
  poolAmount: number,
  rules: GoalRuleInput[],
  actuals: KpiActualInput[],
  mode: RuleSetMode = 'pool_weighted',
): BonusCalculationResult {
  const actualsByKpi = new Map(actuals.map((a) => [a.kpiCategoryId, a.actualValue]));

  const lines = rules.map((rule) =>
    calculateBonusLine(rule, actualsByKpi.get(rule.kpiCategoryId) ?? 0, poolAmount, mode),
  );

  const totalPayout = roundCurrency(lines.reduce((sum, line) => sum + line.payout, 0));

  return { poolAmount, totalPayout, lines };
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}
