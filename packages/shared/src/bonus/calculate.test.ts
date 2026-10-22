import { describe, expect, it } from 'vitest';
import { calculateBonusLine, calculateStationBonus, type GoalRuleInput } from './calculate.js';

const percentageRule: GoalRuleInput = {
  kpiCategoryId: 'oil',
  kpiCode: 'oil_sales',
  weight: 50,
  goalType: 'percentage',
  targetValue: 1000,
  minAmount: null,
  minThresholdPct: 80,
  maxPayoutPct: 100,
  higherIsBetter: true,
};

const fixedRule: GoalRuleInput = {
  kpiCategoryId: 'oil_fixed',
  kpiCode: 'oil_sales_fixed',
  weight: 50,
  goalType: 'fixed_amount',
  targetValue: 20000,
  minAmount: 20000,
  minThresholdPct: null,
  maxPayoutPct: 100,
  higherIsBetter: true,
};

describe('calculateBonusLine - percentage goals', () => {
  it('pays proportionally when above the minimum threshold (spec example: 80% of $1000 -> 80% of $100)', () => {
    const result = calculateBonusLine(percentageRule, 800, 200);
    expect(result.base).toBe(100);
    expect(result.progressPct).toBeCloseTo(0.8);
    expect(result.eligible).toBe(true);
    expect(result.payout).toBeCloseTo(80);
  });

  it('pays zero when below the minimum threshold even if some progress was made', () => {
    const result = calculateBonusLine(percentageRule, 700, 200);
    expect(result.progressPct).toBeCloseTo(0.7);
    expect(result.eligible).toBe(false);
    expect(result.payout).toBe(0);
  });

  it('pays exactly the base at the threshold boundary', () => {
    const result = calculateBonusLine(percentageRule, 800, 200);
    expect(result.eligible).toBe(true);
  });

  it('caps payout at maxPayoutPct even when progress exceeds 100%', () => {
    const result = calculateBonusLine(percentageRule, 1500, 200);
    expect(result.progressPct).toBeCloseTo(1.5);
    expect(result.payout).toBe(100);
  });

  it('allows an accelerator above 100% when maxPayoutPct is raised', () => {
    const rule: GoalRuleInput = { ...percentageRule, maxPayoutPct: 120 };
    const result = calculateBonusLine(rule, 1500, 200);
    expect(result.payout).toBeCloseTo(120);
  });

  it('returns null progress and zero payout when target is zero', () => {
    const rule: GoalRuleInput = { ...percentageRule, targetValue: 0 };
    const result = calculateBonusLine(rule, 100, 200);
    expect(result.progressPct).toBeNull();
    expect(result.eligible).toBe(false);
    expect(result.payout).toBe(0);
  });

  it('inverts progress for lower-is-better kpis (e.g. staff turnover)', () => {
    const rule: GoalRuleInput = {
      ...percentageRule,
      higherIsBetter: false,
      targetValue: 10,
      minThresholdPct: 80,
    };
    // actual turnover 8 (better than target 10) -> progress 10/8 = 125%
    const result = calculateBonusLine(rule, 8, 200);
    expect(result.progressPct).toBeCloseTo(1.25);
    expect(result.payout).toBe(100);
  });

  it('returns null progress for lower-is-better when actual is zero', () => {
    const rule: GoalRuleInput = { ...percentageRule, higherIsBetter: false };
    const result = calculateBonusLine(rule, 0, 200);
    expect(result.progressPct).toBeNull();
    expect(result.payout).toBe(0);
  });
});

describe('calculateBonusLine - fixed amount goals', () => {
  it('pays the full base when the minimum accreditable amount is reached', () => {
    const result = calculateBonusLine(fixedRule, 20000, 200);
    expect(result.eligible).toBe(true);
    expect(result.payout).toBe(100);
  });

  it('pays the full base when the actual exceeds the minimum (no proportionality)', () => {
    const result = calculateBonusLine(fixedRule, 35000, 200);
    expect(result.payout).toBe(100);
  });

  it('pays zero when below the minimum accreditable amount', () => {
    const result = calculateBonusLine(fixedRule, 19999.99, 200);
    expect(result.eligible).toBe(false);
    expect(result.payout).toBe(0);
  });
});

describe('calculateStationBonus', () => {
  it('splits the pool by weight and sums eligible payouts', () => {
    const result = calculateStationBonus(
      200,
      [percentageRule, fixedRule],
      [
        { kpiCategoryId: 'oil', actualValue: 800 },
        { kpiCategoryId: 'oil_fixed', actualValue: 20000 },
      ],
    );
    expect(result.totalPayout).toBeCloseTo(180);
    expect(result.lines).toHaveLength(2);
  });

  it('treats missing actuals as zero instead of throwing', () => {
    const result = calculateStationBonus(200, [percentageRule], []);
    expect(result.lines[0]?.actualValue).toBe(0);
    expect(result.lines[0]?.payout).toBe(0);
  });
});

function passFail(code: string, threshold: number, payout: number, comparator: 'gte' | 'lte' = 'gte'): GoalRuleInput {
  return {
    kpiCategoryId: code,
    kpiCode: code,
    weight: null,
    goalType: 'pass_fail',
    targetValue: threshold,
    minAmount: null,
    minThresholdPct: null,
    maxPayoutPct: 100,
    higherIsBetter: comparator === 'gte',
    comparator,
    thresholdValue: threshold,
    payoutAmount: payout,
  };
}

describe('calculateStationBonus - fixed amount per rubro', () => {
  const rules = [
    passFail('oil_sales', 1000, 1400),
    passFail('sispa_compliance', 80, 400),
    passFail('survey_score', 90, 800),
    passFail('punctuality', 95, 400),
    passFail('staff_turnover', 1, 500, 'lte'),
    passFail('open_dispensers', 4, 500),
  ];

  it('pays each rubro its own amount when the comparator is met, otherwise zero', () => {
    const result = calculateStationBonus(
      4000,
      rules,
      [
        { kpiCategoryId: 'oil_sales', actualValue: 1000 },
        { kpiCategoryId: 'sispa_compliance', actualValue: 79 },
        { kpiCategoryId: 'survey_score', actualValue: 91 },
        { kpiCategoryId: 'punctuality', actualValue: 95 },
        { kpiCategoryId: 'staff_turnover', actualValue: 1 },
        { kpiCategoryId: 'open_dispensers', actualValue: 3 },
      ],
      'fixed_per_kpi',
    );

    const payoutOf = (code: string) => result.lines.find((line) => line.kpiCode === code)?.payout;
    expect(payoutOf('oil_sales')).toBe(1400);
    expect(payoutOf('sispa_compliance')).toBe(0);
    expect(payoutOf('survey_score')).toBe(800);
    expect(payoutOf('punctuality')).toBe(400);
    expect(payoutOf('staff_turnover')).toBe(500);
    expect(payoutOf('open_dispensers')).toBe(0);
    expect(result.totalPayout).toBe(3100);
  });

  it('pays nothing for a rubro that misses an at-least target and pays when resignations stay at the cap', () => {
    const oil = calculateBonusLine(passFail('oil_sales', 1000, 1400), 999, 0, 'fixed_per_kpi');
    expect(oil.eligible).toBe(false);
    expect(oil.payout).toBe(0);

    const turnover = calculateBonusLine(passFail('staff_turnover', 1, 500, 'lte'), 2, 0, 'fixed_per_kpi');
    expect(turnover.eligible).toBe(false);
    expect(turnover.payout).toBe(0);
  });
});
