import { describe, expect, it } from 'vitest';
import { cronFromHours, hoursFromCron } from './hours.js';

describe('sync hours', () => {
  it('builds one cron for 3:00, 12:00 and 20:00', () => {
    expect(cronFromHours([20, 3, 12, 3])).toBe('0 3,12,20 * * *');
  });

  it('reads those hours back and leaves custom expressions alone', () => {
    expect(hoursFromCron('0 3,12,20 * * *')).toEqual([3, 12, 20]);
    expect(hoursFromCron('15 3 * * *')).toBeNull();
  });
});
