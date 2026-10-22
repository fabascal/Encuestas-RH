import { JWT } from 'google-auth-library';
import { googleFormsConfigSchema } from '@portal/shared';
import { db } from '../../db/index.js';
import { upsertKpiFact } from '../kpis/kpisService.js';
function createJwtClient(serviceAccountKeyJson) {
    const key = JSON.parse(serviceAccountKeyJson);
    return new JWT({
        email: key.client_email,
        key: key.private_key,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
}
async function fetchRows(client, spreadsheetId, sheetName) {
    const token = await client.authorize();
    const range = encodeURIComponent(`${sheetName}!A:Z`);
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, { headers: { Authorization: `Bearer ${token.access_token ?? ''}` } });
    if (!response.ok) {
        throw new Error(`Google Sheets respondio ${response.status} ${response.statusText}`);
    }
    const body = (await response.json());
    return body.values ?? [];
}
function periodFromDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}
export const googleFormsAdapter = {
    provider: 'google_forms',
    async testConnection(secret, rawConfig) {
        try {
            const config = googleFormsConfigSchema.parse(rawConfig);
            const client = createJwtClient(secret);
            const rows = await fetchRows(client, config.spreadsheetId, config.sheetName);
            return {
                success: true,
                message: `Conexion exitosa, ${Math.max(rows.length - 1, 0)} respuestas encontradas`,
            };
        }
        catch (error) {
            return { success: false, message: error instanceof Error ? error.message : 'Error desconocido' };
        }
    },
    async sync(context) {
        const config = googleFormsConfigSchema.parse(context.config);
        const client = createJwtClient(context.secret);
        const rows = await fetchRows(client, config.spreadsheetId, config.sheetName);
        const [header, ...dataRows] = rows;
        if (!header)
            return { recordsRead: 0, recordsUpserted: 0 };
        const colIndex = (name) => header.findIndex((h) => h.trim().toLowerCase() === name);
        const idxStation = colIndex('station_external_id');
        const idxSubmittedAt = colIndex('submitted_at');
        const idxEmail = colIndex('respondent_email');
        const idxScore = colIndex('score');
        let upserted = 0;
        const touchedStationPeriods = new Set();
        for (const [rowIndex, row] of dataRows.entries()) {
            const stationExternalId = idxStation >= 0 ? row[idxStation] : undefined;
            const submittedAtRaw = idxSubmittedAt >= 0 ? row[idxSubmittedAt] : undefined;
            if (!stationExternalId || !submittedAtRaw) {
                await context.log('warn', `Fila ${rowIndex + 2} sin station_external_id o submitted_at, se omite`);
                continue;
            }
            const ref = await db
                .selectFrom('station_external_refs')
                .select('station_id')
                .where('provider', '=', 'google_forms')
                .where('external_id', '=', stationExternalId)
                .executeTakeFirst();
            if (!ref) {
                await context.log('warn', `Estacion externa sin mapear: ${stationExternalId}`);
                continue;
            }
            const submittedAt = new Date(submittedAtRaw);
            if (Number.isNaN(submittedAt.getTime())) {
                await context.log('warn', `Fecha invalida en fila ${rowIndex + 2}: ${submittedAtRaw}`);
                continue;
            }
            const period = periodFromDate(submittedAt);
            const answers = {};
            header.forEach((col, i) => {
                answers[col] = row[i] ?? '';
            });
            const externalId = `${config.spreadsheetId}:${rowIndex}`;
            await db
                .insertInto('survey_responses')
                .values({
                station_id: ref.station_id,
                period,
                external_id: externalId,
                respondent_email: idxEmail >= 0 ? row[idxEmail] || null : null,
                answers: JSON.stringify(answers),
                submitted_at: submittedAt,
                sync_run_id: context.syncRunId,
            })
                .onConflict((oc) => oc.column('external_id').doUpdateSet({
                answers: JSON.stringify(answers),
                sync_run_id: context.syncRunId,
            }))
                .execute();
            touchedStationPeriods.add(`${ref.station_id}|${period}`);
            upserted += 1;
        }
        if (idxScore >= 0 && touchedStationPeriods.size > 0) {
            await recalculateSurveyScores(touchedStationPeriods, context.syncRunId);
        }
        return { recordsRead: dataRows.length, recordsUpserted: upserted };
    },
};
async function recalculateSurveyScores(stationPeriods, syncRunId) {
    const surveyKpi = await db
        .selectFrom('kpi_categories')
        .select('id')
        .where('code', '=', 'survey_score')
        .executeTakeFirst();
    if (!surveyKpi)
        return;
    for (const key of stationPeriods) {
        const [stationId, period] = key.split('|');
        const responses = await db
            .selectFrom('survey_responses')
            .select('answers')
            .where('station_id', '=', stationId)
            .where('period', '=', period)
            .execute();
        const scores = responses
            .map((r) => Number(r.answers['score']))
            .filter((n) => !Number.isNaN(n));
        if (scores.length === 0)
            continue;
        const averageScore = scores.reduce((sum, n) => sum + n, 0) / scores.length;
        await upsertKpiFact({
            stationId,
            kpiCategoryId: surveyKpi.id,
            period,
            value: averageScore,
            source: 'google_forms',
        }, syncRunId);
    }
}
//# sourceMappingURL=googleForms.js.map