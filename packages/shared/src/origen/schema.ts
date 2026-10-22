import { z } from 'zod';

export const GOOGLE_SURVEY_STATES = ['todas', 'consideradas', 'no_consideradas'] as const;
export type GoogleSurveyState = (typeof GOOGLE_SURVEY_STATES)[number];

export const googleSurveyQuerySchema = z.object({
  period: z.string().date(),
  companyId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  stationId: z.string().uuid().optional(),
  estado: z.enum(GOOGLE_SURVEY_STATES).default('todas'),
});
export type GoogleSurveyQuery = z.infer<typeof googleSurveyQuerySchema>;

export const excludeSurveySchema = z
  .object({
    excluded: z.boolean(),
    reason: z.string().trim().min(3).max(200).optional(),
  })
  .superRefine((value, context) => {
    if (value.excluded && !value.reason) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Escribe el motivo', path: ['reason'] });
    }
  });
export type ExcludeSurveyInput = z.infer<typeof excludeSurveySchema>;

export const nexusOilQuerySchema = z.object({
  period: z.string().date(),
  companyId: z.string().uuid().optional(),
  zoneId: z.string().uuid().optional(),
  stationId: z.string().uuid().optional(),
});
export type NexusOilQuery = z.infer<typeof nexusOilQuerySchema>;

function mexicoToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function inclusiveDayCount(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}

export const nexusRefetchSchema = z
  .object({
    from: z.string().date(),
    to: z.string().date(),
  })
  .superRefine((value, context) => {
    if (value.from > value.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El día inicial no puede ser posterior al final',
        path: ['from'],
      });
    }
    if (value.to >= mexicoToday()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Solo se pueden consultar días anteriores a hoy',
        path: ['to'],
      });
    }
    if (inclusiveDayCount(value.from, value.to) > 31) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El rango no puede pasar de un mes',
        path: ['to'],
      });
    }
  });
export type NexusRefetchInput = z.infer<typeof nexusRefetchSchema>;
