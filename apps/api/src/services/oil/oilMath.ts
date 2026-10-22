export interface OilAmount {
  actual: number;
  target: number | null;
}

export interface GroupOilTotals {
  /** Sales of every station, including those without a target. */
  actual: number;
  /** Sales of stations that have a target. This is the numerator of the group progress. */
  counted: number;
  target: number | null;
  progress: number | null;
}

/** Sales divided by the target. Stations without a positive target have no progress. */
export function progressRatio(actual: number, target: number | null): number | null {
  if (target === null || !(target > 0)) return null;
  return actual / target;
}

/**
 * Sales so far, spread over the days already elapsed, times the days in the month.
 * A month with no elapsed days has no projection.
 */
export function projectMonth(actual: number, daysElapsed: number, monthDays: number): number | null {
  if (daysElapsed <= 0 || monthDays <= 0) return null;
  return (actual / daysElapsed) * monthDays;
}

/**
 * Group progress is the sum of sales over the sum of targets.
 * Stations without a target stay out of both sums, so they do not move the percentage.
 */
export function groupOilProgress(rows: OilAmount[]): GroupOilTotals {
  let actual = 0;
  let counted = 0;
  let target = 0;
  let withTarget = false;
  for (const row of rows) {
    actual += row.actual;
    if (row.target !== null && row.target > 0) {
      withTarget = true;
      counted += row.actual;
      target += row.target;
    }
  }
  return {
    actual,
    counted,
    target: withTarget ? target : null,
    progress: withTarget && target > 0 ? counted / target : null,
  };
}
