import { nexusRefetchSchema } from '@portal/shared';
import { describe, expect, it } from 'vitest';

function mexicoToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function shiftDay(day: string, delta: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const cursor = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, date ?? 1));
  cursor.setUTCDate(cursor.getUTCDate() + delta);
  return cursor.toISOString().slice(0, 10);
}

describe('nexus refetch range', () => {
  const today = mexicoToday();
  const yesterday = shiftDay(today, -1);

  it('rejects an inverted range, a future day, and more than a month', () => {
    expect(nexusRefetchSchema.safeParse({ from: yesterday, to: shiftDay(yesterday, -1) }).success).toBe(false);
    expect(nexusRefetchSchema.safeParse({ from: today, to: today }).success).toBe(false);
    expect(nexusRefetchSchema.safeParse({ from: shiftDay(yesterday, -31), to: yesterday }).success).toBe(false);
  });

  it('accepts yesterday and a range of 31 days', () => {
    expect(nexusRefetchSchema.safeParse({ from: yesterday, to: yesterday }).success).toBe(true);
    expect(nexusRefetchSchema.safeParse({ from: shiftDay(yesterday, -30), to: yesterday }).success).toBe(true);
  });
});
