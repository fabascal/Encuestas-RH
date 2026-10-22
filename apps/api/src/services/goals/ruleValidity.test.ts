import { describe, expect, it } from 'vitest';
import { parseValidity } from '../../../../web/src/lib/ruleValidity.ts';

describe('parseValidity', () => {
  it('reads an open range', () => {
    expect(parseValidity('[2026-01-01,)')).toEqual({ from: '2026-01-01', to: null, lastDay: null });
  });

  it('reads a closed range and the last day it includes', () => {
    expect(parseValidity('[2026-01-01,2026-07-01)')).toEqual({
      from: '2026-01-01',
      to: '2026-07-01',
      lastDay: '2026-06-30',
    });
  });

  it('keeps the last day when the database bound is inclusive', () => {
    expect(parseValidity('[2026-01-01,2026-06-30]')).toEqual({
      from: '2026-01-01',
      to: '2026-07-01',
      lastDay: '2026-06-30',
    });
  });
});
