import type { HeatLevel, SurveyBand, TrendDirection } from '@portal/shared';

/** 100% or more is on goal, 80% to 99% is close, below that is far. */
export function heatLevel(progressPct: number | null): HeatLevel {
  if (progressPct === null || Number.isNaN(progressPct)) return 'sin_dato';
  if (progressPct >= 1) return 'meta';
  if (progressPct >= 0.8) return 'cerca';
  return 'lejos';
}

export function paidRatio(payout: number, pool: number): number | null {
  if (pool <= 0) return null;
  return payout / pool;
}

/** Difference in ratio points. 0.05 means the paid share rose 5 points. */
export function ratioChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return current - previous;
}

export function shiftPeriod(period: string, deltaMonths: number): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1 + deltaMonths, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/** Months ending at `period`, oldest first. */
export function periodsEndingAt(period: string, count: number): string[] {
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) months.push(shiftPeriod(period, -offset));
  return months;
}

export function daysInMonth(period: string): number {
  const [year, month] = period.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, month ?? 1, 0)).getUTCDate();
}

/** How much oil must be sold per remaining day, and how much should already be sold. */
export function oilPace(
  actual: number,
  target: number,
  daysElapsed: number,
  monthDays: number,
): { dailyNeeded: number; expectedByNow: number } {
  const safeDays = monthDays > 0 ? monthDays : 1;
  const remainingDays = Math.max(safeDays - daysElapsed, 0);
  const remaining = Math.max(target - actual, 0);
  const dailyNeeded = remainingDays === 0 ? remaining : remaining / remainingDays;
  return { dailyNeeded, expectedByNow: target * (daysElapsed / safeDays) };
}

export function surveyBand(score: number): SurveyBand {
  if (score >= 90) return 'alto';
  if (score >= 80) return 'medio';
  return 'bajo';
}

export function trendDirection(points: Array<number | null>): TrendDirection {
  const known = points.filter((point): point is number => point !== null);
  const first = known[0];
  const last = known[known.length - 1];
  if (first === undefined || last === undefined) return 'sin_dato';
  if (last > first + 0.005) return 'sube';
  if (last < first - 0.005) return 'baja';
  return 'igual';
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
