import { describe, expect, it } from 'vitest';
import { oilPace } from '../reports/metrics.js';
import { groupOilProgress, projectMonth } from './oilMath.js';

describe('groupOilProgress', () => {
  it('keeps stations without a target out of the percentage', () => {
    const result = groupOilProgress([
      { actual: 80, target: 100 },
      { actual: 500, target: null },
      { actual: 40, target: 100 },
    ]);
    expect(result.actual).toBe(620);
    expect(result.counted).toBe(120);
    expect(result.target).toBe(200);
    expect(result.progress).toBeCloseTo(0.6);
  });

  it('has no progress when nobody has a target', () => {
    const result = groupOilProgress([
      { actual: 10, target: null },
      { actual: 20, target: 0 },
    ]);
    expect(result.actual).toBe(30);
    expect(result.target).toBeNull();
    expect(result.progress).toBeNull();
  });
});

describe('projectMonth and oilPace', () => {
  it('projects the rest of the month from the pace so far', () => {
    expect(projectMonth(100, 10, 30)).toBe(300);
    const pace = oilPace(100, 300, 10, 30);
    expect(pace.expectedByNow).toBeCloseTo(100);
    expect(pace.dailyNeeded).toBeCloseTo(10);
  });

  it('closes the projection at the end of the month and leaves the remainder for the last day', () => {
    expect(projectMonth(250, 30, 30)).toBeCloseTo(250);
    const pace = oilPace(250, 300, 30, 30);
    expect(pace.expectedByNow).toBeCloseTo(300);
    expect(pace.dailyNeeded).toBeCloseTo(50);
  });

  it('does not project a month that has no elapsed days', () => {
    expect(projectMonth(0, 0, 30)).toBeNull();
    const pace = oilPace(0, 300, 0, 30);
    expect(pace.expectedByNow).toBe(0);
    expect(pace.dailyNeeded).toBeCloseTo(10);
  });
});
