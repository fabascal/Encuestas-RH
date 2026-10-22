import { sql } from 'kysely';
import { JWT } from 'google-auth-library';
import { googleFormsConfigSchema, type GoogleFormsConfig } from '@portal/shared';
import { db } from '../../db/index.js';
import { recalculateSurveyScores } from '../surveys/surveyScores.js';
import { parseSheetTimestamp, parseSurveyScore } from './surveySheet.js';
import type { IntegrationAdapter, PreviewRecord, SyncContext, SyncResult, TestConnectionOutcome } from './types.js';

/**
 * Reads the "Encuesta a jefes de piso" sheet. Default headers match the live form:
 * Marca temporal, Dirección de correo electrónico, Puntuación ("43 / 44"),
 * Estación de Servicio. The monthly kpi is the average of every response percent
 * for that station (90.5 and 91.5 average to 91).
 */

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

function periodFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

function createJwtClient(serviceAccountKeyJson: string): JWT {
  const key = JSON.parse(serviceAccountKeyJson) as ServiceAccountKey;
  return new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

async function fetchRows(client: JWT, spreadsheetId: string, sheetName: string): Promise<string[][]> {
  const token = await client.authorize();
  const escaped = sheetName.replace(/'/g, "''");
  const range = encodeURIComponent(`'${escaped}'`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token.access_token ?? ''}` } },
  );
  if (!response.ok) {
    throw new Error(`Google Sheets respondio ${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as { values?: string[][] };
  return body.values ?? [];
}

function columnIndex(header: string[], name: string): number {
  const wanted = name.trim().toLowerCase();
  return header.findIndex((cell) => cell.trim().toLowerCase() === wanted);
}

export const googleFormsAdapter: IntegrationAdapter = {
  provider: 'google_forms',

  async testConnection(secret, rawConfig): Promise<TestConnectionOutcome> {
    try {
      const config = googleFormsConfigSchema.parse(rawConfig);
      const client = createJwtClient(secret);
      const rows = await fetchRows(client, config.spreadsheetId, config.sheetName);
      return {
        success: true,
        message: `Conexion exitosa, ${Math.max(rows.length - 1, 0)} respuestas encontradas`,
      };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Error desconocido' };
    }
  },

  async preview(secret, rawConfig, options): Promise<PreviewRecord[]> {
    const config = googleFormsConfigSchema.parse(rawConfig);
    const client = createJwtClient(secret);
    const rows = await fetchRows(client, config.spreadsheetId, config.sheetName);
    const [header, ...dataRows] = rows;
    if (!header) return [];
    const idxStation = columnIndex(header, config.stationColumn);
    const idxSubmittedAt = columnIndex(header, config.timestampColumn);
    const idxScore = columnIndex(header, config.scoreColumn);
    if (idxStation < 0 || idxSubmittedAt < 0 || idxScore < 0) {
      throw new Error('La hoja no tiene las columnas de estación, fecha o puntuación');
    }
    const limit = options.limit ?? 50;
    const records: PreviewRecord[] = [];
    for (const row of dataRows) {
      const station = row[idxStation]?.trim();
      const submittedAt = parseSheetTimestamp(row[idxSubmittedAt]?.trim() ?? '');
      const score = parseSurveyScore(row[idxScore] ?? '');
      if (!station || !submittedAt || score === null) continue;
      const period = periodFromDate(submittedAt);
      if (options.period && period !== options.period) continue;
      records.push({
        externalStationId: station,
        period,
        value: Math.round(score * 100) / 100,
      });
      if (records.length >= limit) break;
    }
    return records;
  },

  async sync(context: SyncContext): Promise<SyncResult> {
    const config = googleFormsConfigSchema.parse(context.config);
    const client = createJwtClient(context.secret);
    const rows = await fetchRows(client, config.spreadsheetId, config.sheetName);
    const [header, ...dataRows] = rows;
    if (!header) return { recordsRead: 0, recordsUpserted: 0 };

    const idxStation = columnIndex(header, config.stationColumn);
    const idxSubmittedAt = columnIndex(header, config.timestampColumn);
    const idxEmail = columnIndex(header, config.emailColumn);
    const idxScore = columnIndex(header, config.scoreColumn);
    if (idxStation < 0 || idxSubmittedAt < 0 || idxScore < 0) {
      throw new Error(
        `Faltan columnas en la hoja. Se esperaban "${config.stationColumn}", "${config.timestampColumn}" y "${config.scoreColumn}"`,
      );
    }

    let upserted = 0;
    const touchedStationPeriods = new Set<string>();

    for (const [rowIndex, row] of dataRows.entries()) {
      const stored = await storeSurveyRow(row, header, rowIndex, config, context, {
        idxStation,
        idxSubmittedAt,
        idxEmail,
        idxScore,
      });
      if (!stored) continue;
      touchedStationPeriods.add(`${stored.stationId}|${stored.period}`);
      upserted += 1;
    }

    if (touchedStationPeriods.size > 0) {
      await recalculateSurveyScores(touchedStationPeriods, context.syncRunId);
    }

    return { recordsRead: dataRows.length, recordsUpserted: upserted };
  },
};

async function storeSurveyRow(
  row: string[],
  header: string[],
  rowIndex: number,
  config: GoogleFormsConfig,
  context: SyncContext,
  columns: { idxStation: number; idxSubmittedAt: number; idxEmail: number; idxScore: number },
): Promise<{ stationId: string; period: string } | null> {
  const stationName = row[columns.idxStation]?.trim();
  const submittedAtRaw = row[columns.idxSubmittedAt]?.trim();
  if (!stationName || !submittedAtRaw) {
    await context.log('warn', `Fila ${rowIndex + 2} sin estacion o fecha, se omite`);
    return null;
  }

  const ref = await db
    .selectFrom('station_external_refs')
    .select('station_id')
    .where('provider', '=', 'google_forms')
    .where(sql<boolean>`lower(btrim(external_id)) = ${stationName.toLowerCase()}`)
    .executeTakeFirst();
  if (!ref) {
    await context.log('warn', `Estacion externa sin mapear: ${stationName}`);
    return null;
  }

  const submittedAt = parseSheetTimestamp(submittedAtRaw);
  if (!submittedAt) {
    await context.log('warn', `Fecha invalida en fila ${rowIndex + 2}: ${submittedAtRaw}`);
    return null;
  }

  const score = parseSurveyScore(row[columns.idxScore] ?? '');
  if (score === null) {
    await context.log('warn', `Puntuacion invalida en fila ${rowIndex + 2}: ${row[columns.idxScore] ?? ''}`);
    return null;
  }

  const answers: Record<string, string> = { score: String(score) };
  header.forEach((col, i) => {
    answers[col] = row[i] ?? '';
  });

  const email = columns.idxEmail >= 0 ? (row[columns.idxEmail] ?? '').trim() : '';
  const externalId = `${config.spreadsheetId}:${submittedAt.toISOString()}:${email.toLowerCase()}:${stationName.toLowerCase()}`;
  const period = periodFromDate(submittedAt);

  await db
    .insertInto('survey_responses')
    .values({
      station_id: ref.station_id,
      period,
      external_id: externalId,
      respondent_email: email || null,
      answers: JSON.stringify(answers),
      submitted_at: submittedAt,
      sync_run_id: context.syncRunId,
    })
    .onConflict((oc) =>
      oc.column('external_id').doUpdateSet({
        answers: JSON.stringify(answers),
        station_id: ref.station_id,
        period,
        respondent_email: email || null,
        submitted_at: submittedAt,
        sync_run_id: context.syncRunId,
      }),
    )
    .execute();

  return { stationId: ref.station_id, period };
}
