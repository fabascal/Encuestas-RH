import { excludeSurveySchema } from '@portal/shared';
import { describe, expect, it } from 'vitest';

describe('exclude survey', () => {
  it('requires a reason when the survey is marked off', () => {
    expect(excludeSurveySchema.safeParse({ excluded: true }).success).toBe(false);
    expect(excludeSurveySchema.safeParse({ excluded: true, reason: 'no' }).success).toBe(false);
    expect(excludeSurveySchema.safeParse({ excluded: true, reason: 'Llegó vacía' }).success).toBe(true);
    expect(excludeSurveySchema.safeParse({ excluded: false }).success).toBe(true);
  });
});