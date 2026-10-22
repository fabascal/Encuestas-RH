import { describe, expect, it } from 'vitest';
import { parseSheetTimestamp, parseSurveyScore } from './surveySheet.js';

describe('survey sheet parsing', () => {
  it('reads a Forms timestamp as day/month/year', () => {
    const date = parseSheetTimestamp('17/9/2026 15:05:42');
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(8);
    expect(date?.getDate()).toBe(17);
    expect(date?.getHours()).toBe(15);
    expect(date?.getMinutes()).toBe(5);
  });

  it('turns "43 / 44" into a percentage above 90', () => {
    const score = parseSurveyScore('43 / 44');
    expect(score).toBeCloseTo(97.73, 2);
  });

  it('averages two survey percents the way the monthly kpi does', () => {
    const scores = [90.5, 91.5];
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    expect(average).toBe(91);
  });
});
