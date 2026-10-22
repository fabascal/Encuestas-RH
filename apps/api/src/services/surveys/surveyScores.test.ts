import { describe, expect, it } from 'vitest';
import { consideredAverage } from './surveyAverage.js';

describe('considered survey average', () => {
  it('ignores surveys marked off and returns null when none remain', () => {
    expect(
      consideredAverage([
        { score: 0, excluded: true },
        { score: 90, excluded: false },
        { score: 80, excluded: false },
      ]),
    ).toBe(85);
    expect(consideredAverage([{ score: 0, excluded: true }])).toBeNull();
    expect(consideredAverage([])).toBeNull();
  });
});
