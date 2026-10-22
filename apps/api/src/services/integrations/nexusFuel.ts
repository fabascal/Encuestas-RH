import { z } from 'zod';
import { nexusFuelConfigSchema } from '@portal/shared';
import { db } from '../../db/index.js';
import { rebuildMonthlyFromDaily, recordSyncDay, replaceDailyFactsForDay } from './dailyFacts.js';
import type { DailyStationSnapshot } from './dailyFacts.js';
import { oilSalesByStation, previewRange, yesterdayInMexico } from './nexusReport.js';
import { appendSyncLog, createSyncRun, finishSyncRun, setSyncRunTargetDay } from './syncRunService.js';
import type { IntegrationAdapter, PreviewRecord, SyncContext, SyncResult, TestConnectionOutcome } from './types.js';

/**
 * Nexus ReportST: a token request, then one scrap report for the month.
 * The station key is the code before the colon in "7846: RANCHO".
 * Oil sales are "Importe Aceites", repeated on every fuel row; only the first counts.
 *
 * The stored secret is JSON: { "username": "...", "password": "..." }.
 */

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

interface NexusEnvelope {
  Error?: boolean;
  Data?: unknown;
  Comment?: unknown;
}

async function postNexus(url: URL): Promise<NexusEnvelope> {
  let response: Response;
  try {
    response = await fetch(url, { method: 'POST' });
  } catch {
    throw new Error('No se pudo contactar a Nexus');
  }
  if (!response.ok) throw new Error(`Nexus respondió ${response.status}`);
  const body: unknown = await response.json();
  if (!body || typeof body !== 'object') throw new Error('Nexus devolvió una respuesta vacía');
  return body as NexusEnvelope;
}

function assertOk(envelope: NexusEnvelope, fallback: string): void {
  if (envelope.Error) {
    const comment = typeof envelope.Comment === 'string' ? envelope.Comment.trim() : '';
    throw new Error(comment || fallback);
  }
}

async function requestToken(baseUrl: string, username: string, password: string): Promise<string> {
  const url = new URL('/ReportST/GetExternalToken', baseUrl);
  url.searchParams.set('usuario', username);
  url.searchParams.set('constrasena', password);
  const envelope = await postNexus(url);
  assertOk(envelope, 'Nexus rechazó el usuario o la contraseña');
  if (typeof envelope.Data !== 'string' || envelope.Data.length === 0) {
    throw new Error('Nexus no devolvió un token');
  }
  return envelope.Data;
}

async function requestScrap(baseUrl: string, token: string, dateIni: string, dateEnd: string): Promise<unknown[]> {
  const url = new URL('/ReportST/GetScrapByDate', baseUrl);
  url.searchParams.set('token', token);
  url.searchParams.set('dateIni', dateIni);
  url.searchParams.set('dateEnd', dateEnd);
  const envelope = await postNexus(url);
  assertOk(envelope, 'Nexus no pudo entregar el reporte');
  if (!Array.isArray(envelope.Data)) throw new Error('Nexus no devolvió la lista de estaciones');
  return envelope.Data;
}

function formatDay(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}

async function findStation(stationCode: string): Promise<{ id: string; name: string } | null> {
  const ref = await db
    .selectFrom('station_external_refs')
    .innerJoin('stations as s', 's.id', 'station_external_refs.station_id')
    .select(['station_external_refs.station_id as id', 's.name as name'])
    .where('station_external_refs.provider', '=', 'nexus_fuel')
    .where('station_external_refs.external_id', '=', stationCode)
    .executeTakeFirst();
  if (ref) return ref;

  const stations = await db
    .selectFrom('stations')
    .select(['id', 'name'])
    .where('code', '=', stationCode)
    .where('active', '=', true)
    .execute();
  return stations.length === 1 ? (stations[0] ?? null) : null;
}

export const nexusFuelAdapter: IntegrationAdapter = {
  provider: 'nexus_fuel',

  async testConnection(secret, rawConfig): Promise<TestConnectionOutcome> {
    try {
      const config = nexusFuelConfigSchema.parse(rawConfig);
      const credentials = credentialsSchema.parse(JSON.parse(secret));
      await requestToken(config.baseUrl, credentials.username, credentials.password);
      return { success: true, message: 'Conexión exitosa. El token de Nexus es válido.' };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Error desconocido' };
    }
  },

  async preview(secret, rawConfig, options): Promise<PreviewRecord[]> {
    const config = nexusFuelConfigSchema.parse(rawConfig);
    const credentials = credentialsSchema.parse(JSON.parse(secret));
    const period = options.period ?? `${yesterdayInMexico().slice(0, 7)}-01`;
    const bounds = previewRange(period);
    const token = await requestToken(config.baseUrl, credentials.username, credentials.password);
    let rows: unknown[];
    try {
      rows = await requestScrap(config.baseUrl, token, bounds.dateIni, bounds.dateEnd);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Nexus no pudo entregar la vista previa: ${detail}`);
    }
    const limit = options.limit ?? 50;
    return oilSalesByStation(rows)
      .slice(0, limit)
      .map((sale) => ({ externalStationId: sale.stationCode, period, value: sale.amount }));
  },

  async sync(context: SyncContext): Promise<SyncResult> {
    const config = nexusFuelConfigSchema.parse(context.config);
    const credentials = credentialsSchema.parse(JSON.parse(context.secret));
    const requested = context.config.days;
    const days =
      Array.isArray(requested) && requested.length > 0 && requested.every((day) => typeof day === 'string')
        ? requested
        : [yesterdayInMexico()];
    const token = await requestToken(config.baseUrl, credentials.username, credentials.password);

    const oilKpi = await db
      .selectFrom('kpi_categories')
      .select('id')
      .where('code', '=', 'oil_sales')
      .executeTakeFirst();
    if (!oilKpi) throw new Error('No existe el rubro de venta de aceite');

    let recordsRead = 0;
    let upserted = 0;
    let failed = 0;

    for (const day of days) {
      const dayRun =
        days.length === 1
          ? { id: context.syncRunId }
          : await createSyncRun(context.credentialId, 'nexus_fuel', null, day);
      if (days.length === 1) await setSyncRunTargetDay(context.syncRunId, day);

      try {
        const rows = await requestScrap(config.baseUrl, token, day, day);
        const sales = oilSalesByStation(rows);
        const snapshots: DailyStationSnapshot[] = [];
        const matched: { stationId: string; value: number }[] = [];
        for (const sale of sales) {
          const station = await findStation(sale.stationCode);
          snapshots.push({
            code: sale.stationCode,
            amount: sale.amount,
            stationName: station?.name ?? null,
            matched: Boolean(station),
          });
          if (station) matched.push({ stationId: station.id, value: sale.amount });
        }
        await replaceDailyFactsForDay({
          day,
          kpiCategoryId: oilKpi.id,
          source: 'nexus_fuel',
          syncRunId: dayRun.id,
          rows: matched,
        });
        await rebuildMonthlyFromDaily(oilKpi.id, day, dayRun.id);
        const unmatched = snapshots.filter((row) => !row.matched).length;
        await recordSyncDay({
          credentialId: context.credentialId,
          day,
          status: 'success',
          stationsCount: snapshots.length,
          totalAmount: snapshots.reduce((sum, row) => sum + row.amount, 0),
          unmatchedCount: unmatched,
          lastRunId: dayRun.id,
          stations: snapshots,
        });
        const message = `${formatDay(day)}: ${snapshots.length} estaciones, ${unmatched} sin estación en el portal`;
        await appendSyncLog(dayRun.id, 'info', message);
        if (dayRun.id !== context.syncRunId) {
          await context.log('info', message);
          await finishSyncRun(dayRun.id, 'success', { recordsRead: rows.length, recordsUpserted: matched.length });
        }
        recordsRead += rows.length;
        upserted += matched.length;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : 'Error desconocido';
        await recordSyncDay({
          credentialId: context.credentialId,
          day,
          status: 'failed',
          stationsCount: 0,
          totalAmount: 0,
          unmatchedCount: 0,
          lastRunId: dayRun.id,
          errorMessage: message,
          stations: [],
        });
        await appendSyncLog(dayRun.id, 'error', `${formatDay(day)}: ${message}`);
        if (dayRun.id !== context.syncRunId) await context.log('error', `${formatDay(day)}: ${message}`);
        if (dayRun.id !== context.syncRunId) {
          await finishSyncRun(dayRun.id, 'failed', { errorMessage: message });
        } else {
          throw error;
        }
      }
    }

    if (failed > 0) {
      await context.log('warn', `${failed} días no se pudieron actualizar`);
    }
    return { recordsRead, recordsUpserted: upserted };
  },
};
