import { z } from 'zod';
import { INTEGRATION_PROVIDERS } from '../types/enums.js';

export const googleFormsConfigSchema = z.object({
  spreadsheetId: z.string().min(1),
  sheetName: z.string().min(1),
  serviceAccountEmail: z.string().email(),
  timestampColumn: z.string().min(1).default('Marca temporal'),
  emailColumn: z.string().min(1).default('Dirección de correo electrónico'),
  scoreColumn: z.string().min(1).default('Puntuación'),
  stationColumn: z.string().min(1).default('Estación de Servicio'),
});
export type GoogleFormsConfig = z.infer<typeof googleFormsConfigSchema>;

export const nexusFuelConfigSchema = z.object({
  baseUrl: z.string().url().default('https://combuapiv2.nexusfuel.com'),
});
export type NexusFuelConfig = z.infer<typeof nexusFuelConfigSchema>;

export const nomina3ConfigSchema = z.object({
  baseUrl: z.string().url(),
});
export type Nomina3Config = z.infer<typeof nomina3ConfigSchema>;

export const sispaConfigSchema = z.object({
  baseUrl: z.string().url(),
});
export type SispaConfig = z.infer<typeof sispaConfigSchema>;

export const integrationConfigByProvider = {
  google_forms: googleFormsConfigSchema,
  nexus_fuel: nexusFuelConfigSchema,
  nomina3: nomina3ConfigSchema,
  sispa: sispaConfigSchema,
} as const;

export const createIntegrationCredentialSchema = z.object({
  provider: z.enum(INTEGRATION_PROVIDERS),
  companyId: z.string().uuid().nullable(),
  secret: z.string().min(1),
  config: z.record(z.string(), z.unknown()),
  cronExpression: z.string().min(1),
  enabled: z.boolean().default(true),
});
export type CreateIntegrationCredentialInput = z.infer<typeof createIntegrationCredentialSchema>;

export const previewRequestSchema = z.object({
  period: z.string().date().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});
export type PreviewRequest = z.infer<typeof previewRequestSchema>;

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

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const syncNowSchema = z
  .object({
    period: z.string().regex(/^\d{4}-\d{2}-01$/).optional(),
    from: daySchema.optional(),
    to: daySchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.from) !== Boolean(value.to)) {
      ctx.addIssue({ code: 'custom', message: 'Indica el día inicial y el día final' });
      return;
    }
    if (!value.from || !value.to) return;
    if (value.from > value.to) {
      ctx.addIssue({ code: 'custom', message: 'El día inicial no puede ser posterior al final' });
    }
    if (value.to >= mexicoToday()) {
      ctx.addIssue({ code: 'custom', message: 'Solo se pueden consultar días anteriores a hoy' });
    }
    if (inclusiveDayCount(value.from, value.to) > 62) {
      ctx.addIssue({ code: 'custom', message: 'El rango no puede pasar de 62 días' });
    }
  });
export type SyncNowInput = z.infer<typeof syncNowSchema>;

export const stationRefSchema = z.object({
  externalId: z.string().min(1).max(160),
  stationId: z.string().uuid(),
});
export type StationRefInput = z.infer<typeof stationRefSchema>;

export const testConnectionResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  testedAt: z.string(),
});
export type TestConnectionResult = z.infer<typeof testConnectionResultSchema>;
