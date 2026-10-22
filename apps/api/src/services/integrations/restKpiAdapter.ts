import { z } from 'zod';
import { db } from '../../db/index.js';
import { upsertKpiFact } from '../kpis/kpisService.js';
import type { IntegrationAdapter, PreviewRecord, SyncContext, SyncResult, TestConnectionOutcome } from './types.js';

/**
 * Normalized wire contract expected from Nexus Fuel / Nomina 3 / SISPA once their
 * bitacoras/API is reachable: a JSON array of { stationExternalId, kpiCode, period, value }.
 * These vendors' exact response shapes aren't documented yet; if a vendor returns a
 * different shape, translate it to this contract in a thin per-vendor mapper before
 * this point (this file already owns auth, retries via pg-boss, and idempotent upsert).
 */
const kpiRecordSchema = z.object({
  stationExternalId: z.string().min(1),
  kpiCode: z.string().min(1),
  period: z.string().date(),
  value: z.number(),
});

const configSchema = z.object({ baseUrl: z.string().url() });

interface RestKpiAdapterOptions {
  provider: 'nexus_fuel' | 'nomina3' | 'sispa';
  endpointPath: string;
}

export function createRestKpiAdapter({ provider, endpointPath }: RestKpiAdapterOptions): IntegrationAdapter {
  async function fetchRecords(baseUrl: string, secret: string, period?: string) {
    const url = new URL(endpointPath, baseUrl);
    if (period) url.searchParams.set('period', period);

    const response = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
    if (!response.ok) {
      throw new Error(`${provider} respondio ${response.status} ${response.statusText}`);
    }
    const body: unknown = await response.json();
    return z.array(kpiRecordSchema).parse(body);
  }

  return {
    provider,

    async testConnection(secret, rawConfig): Promise<TestConnectionOutcome> {
      try {
        const config = configSchema.parse(rawConfig);
        const records = await fetchRecords(config.baseUrl, secret);
        return { success: true, message: `Conexion exitosa, ${records.length} registros disponibles` };
      } catch (error) {
        return { success: false, message: error instanceof Error ? error.message : 'Error desconocido' };
      }
    },

    async preview(secret, rawConfig, options): Promise<PreviewRecord[]> {
      const config = configSchema.parse(rawConfig);
      const records = await fetchRecords(config.baseUrl, secret, options.period);
      const limit = options.limit ?? 50;
      return records.slice(0, limit).map((record) => ({
        externalStationId: record.stationExternalId,
        period: record.period,
        value: record.value,
      }));
    },

    async sync(context: SyncContext): Promise<SyncResult> {
      const config = configSchema.parse(context.config);
      const period = typeof context.config.period === 'string' ? context.config.period : undefined;
      const records = await fetchRecords(config.baseUrl, context.secret, period);
      await context.log('info', `${records.length} registros recibidos de ${provider}`);

      let upserted = 0;
      for (const record of records) {
        const ref = await db
          .selectFrom('station_external_refs')
          .select('station_id')
          .where('provider', '=', provider)
          .where('external_id', '=', record.stationExternalId)
          .executeTakeFirst();

        if (!ref) {
          await context.log('warn', `Estacion externa sin mapear: ${record.stationExternalId}`);
          continue;
        }

        const kpiCategory = await db
          .selectFrom('kpi_categories')
          .select('id')
          .where('code', '=', record.kpiCode)
          .executeTakeFirst();

        if (!kpiCategory) {
          await context.log('warn', `Rubro desconocido: ${record.kpiCode}`);
          continue;
        }

        await upsertKpiFact(
          {
            stationId: ref.station_id,
            kpiCategoryId: kpiCategory.id,
            period: record.period,
            value: record.value,
            source: provider,
          },
          context.syncRunId,
        );
        upserted += 1;
      }

      return { recordsRead: records.length, recordsUpserted: upserted };
    },
  };
}
