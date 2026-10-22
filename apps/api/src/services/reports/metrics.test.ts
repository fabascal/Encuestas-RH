import { describe, expect, it } from 'vitest';
import {
  heatLevel,
  oilPace,
  periodsEndingAt,
  ratioChange,
  surveyBand,
  trendDirection,
} from './metrics.js';

describe('report metrics', () => {
  it('classifies progress into the traffic light', () => {
    expect(heatLevel(1)).toBe('meta');
    expect(heatLevel(1.2)).toBe('meta');
    expect(heatLevel(0.8)).toBe('cerca');
    expect(heatLevel(0.99)).toBe('cerca');
    expect(heatLevel(0.79)).toBe('lejos');
    expect(heatLevel(null)).toBe('sin_dato');
  });

  it('measures the daily pace still needed to hit the oil goal', () => {
    const pace = oilPace(100, 300, 10, 30);
    expect(pace.expectedByNow).toBe(100);
    expect(pace.dailyNeeded).toBe(10);
  });

  it('compares the paid share against the previous month', () => {
    expect(ratioChange(0.6, 0.45)).toBeCloseTo(0.15);
    expect(ratioChange(0.6, null)).toBeNull();
  });

  it('groups survey scores into bands', () => {
    expect(surveyBand(79.9)).toBe('bajo');
    expect(surveyBand(80)).toBe('medio');
    expect(surveyBand(89.9)).toBe('medio');
    expect(surveyBand(90)).toBe('alto');
  });

  it('builds the trend window ending on the selected month', () => {
    expect(periodsEndingAt('2026-09-01', 3)).toEqual(['2026-07-01', '2026-08-01', '2026-09-01']);
    expect(trendDirection([0.4, null, 0.55])).toBe('sube');
    expect(trendDirection([0.5, 0.2])).toBe('baja');
    expect(trendDirection([null, null])).toBe('sin_dato');
  });
});
