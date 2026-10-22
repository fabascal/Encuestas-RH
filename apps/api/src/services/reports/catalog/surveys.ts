import type { ReportQuery, SurveyBand, SurveysReport } from '@portal/shared';
import { db } from '../../../db/index.js';
import type { AuthUser } from '../../../middlewares/authenticate.js';
import { surveyBand } from '../metrics.js';
import { listScopedStations, scopeLabel } from '../scope.js';
import { addFiltersSheet, addSheet, createWorkbook, workbookBuffer } from '../excelKit.js';
import { paintBar, paintTable, renderPdf, writeHeader } from '../pdfKit.js';
import { stamp } from './format.js';

function readScore(answers: unknown): number | null {
  const record = typeof answers === 'string' ? (JSON.parse(answers) as unknown) : answers;
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return null;
  const score = Number((record as Record<string, unknown>)['score']);
  return Number.isNaN(score) ? null : score;
}

const BAND_LABEL: Record<SurveyBand, string> = {
  bajo: 'Menos de 80',
  medio: '80 a 89',
  alto: '90 o más',
};

export async function build(user: AuthUser, query: ReportQuery): Promise<SurveysReport> {
  const stations = await listScopedStations(user, query);
  const ids = stations.map((station) => station.stationId);
  const responses =
    ids.length === 0
      ? []
      : await db
          .selectFrom('survey_responses')
          .select(['station_id', 'submitted_at', 'respondent_email', 'answers', 'excluded'])
          .where('period', '=', query.period)
          .where('station_id', 'in', ids)
          .orderBy('submitted_at', 'desc')
          .execute();

  const bands: Record<SurveyBand, number> = { bajo: 0, medio: 0, alto: 0 };
  const byStation = new Map<string, number[]>();
  const details = responses.map((response) => {
    const station = stations.find((item) => item.stationId === response.station_id);
    const score = readScore(response.answers);
    if (score !== null && !response.excluded) {
      bands[surveyBand(score)] += 1;
      const scores = byStation.get(response.station_id ?? '') ?? [];
      scores.push(score);
      if (response.station_id) byStation.set(response.station_id, scores);
    }
    return {
      stationName: station?.stationName ?? '—',
      zoneName: station?.zoneName ?? '—',
      submittedAt: response.submitted_at instanceof Date ? response.submitted_at.toISOString() : String(response.submitted_at),
      email: response.respondent_email,
      score,
      band: score === null || response.excluded ? null : surveyBand(score),
      excluded: response.excluded,
    };
  });

  const stationRows = stations
    .map((station) => {
      const scores = byStation.get(station.stationId) ?? [];
      return {
        stationId: station.stationId,
        stationName: station.stationName,
        stationCode: station.stationCode,
        zoneName: station.zoneName,
        responses: scores.length,
        average: scores.length === 0 ? null : scores.reduce((sum, score) => sum + score, 0) / scores.length,
      };
    })
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));

  const scored = details
    .filter((detail) => !detail.excluded)
    .map((detail) => detail.score)
    .filter((score): score is number => score !== null);

  return {
    period: query.period,
    generatedAt: new Date().toISOString(),
    generatedBy: user.fullName,
    scopeLabel: await scopeLabel(stations, query),
    responseCount: scored.length,
    stationCount: stationRows.filter((row) => row.responses > 0).length,
    average: scored.length === 0 ? null : scored.reduce((sum, score) => sum + score, 0) / scored.length,
    bands,
    stations: stationRows,
    missing: stationRows
      .filter((row) => row.responses === 0)
      .map((row) => ({
        stationId: row.stationId,
        stationName: row.stationName,
        stationCode: row.stationCode,
        zoneName: row.zoneName,
      })),
    details,
  };
}

export function pdf(report: SurveysReport): Promise<Buffer> {
  const total = report.bands.bajo + report.bands.medio + report.bands.alto;
  return renderPdf((doc) => {
    writeHeader(doc, 'Encuestas', stamp(report));
    doc.fontSize(11).fillColor('#0f172a').text(`${report.responseCount} respuestas en ${report.stationCount} estaciones`);
    doc.fontSize(9).fillColor('#475569').text(`Promedio ${report.average === null ? '—' : report.average.toFixed(1)} · Sin respuesta: ${report.missing.length}`);
    doc.moveDown(0.4);
    (['alto', 'medio', 'bajo'] as const).forEach((band) => {
      paintBar(doc, BAND_LABEL[band], total === 0 ? null : report.bands[band] / total);
    });
    doc.moveDown(0.3);
    paintTable(
      doc,
      [
        { header: 'Estación', width: 170 },
        { header: 'Zona', width: 130 },
        { header: 'Respuestas', width: 80, align: 'right' },
        { header: 'Promedio', width: 80, align: 'right' },
      ],
      report.stations
        .filter((row) => row.responses > 0)
        .map((row) => [row.stationName, row.zoneName, String(row.responses), row.average === null ? '—' : row.average.toFixed(1)]),
    );
    doc.fontSize(12).fillColor('#0f172a').text('Sin respuesta en el mes');
    doc.moveDown(0.3);
    paintTable(
      doc,
      [
        { header: 'Estación', width: 200 },
        { header: 'Código', width: 80 },
        { header: 'Zona', width: 160 },
      ],
      report.missing.map((row) => [row.stationName, row.stationCode, row.zoneName]),
    );
  });
}

export async function excel(report: SurveysReport): Promise<Buffer> {
  const workbook = createWorkbook();
  const stations = addSheet(workbook, 'Por estación', [
    { header: 'Estación', key: 'station', width: 24 },
    { header: 'Código', key: 'code', width: 12 },
    { header: 'Zona', key: 'zone', width: 18 },
    { header: 'Respuestas', key: 'responses', width: 14 },
    { header: 'Promedio', key: 'average', width: 12 },
  ]);
  for (const row of report.stations) stations.addRow({ station: row.stationName, code: row.stationCode, zone: row.zoneName, responses: row.responses, average: row.average });
  const details = addSheet(workbook, 'Respuestas', [
    { header: 'Estación', key: 'station', width: 24 },
    { header: 'Zona', key: 'zone', width: 18 },
    { header: 'Fecha', key: 'date', width: 22 },
    { header: 'Correo', key: 'email', width: 32 },
    { header: 'Puntuación', key: 'score', width: 14 },
    { header: 'Rango', key: 'band', width: 16 },
  ]);
  for (const detail of report.details) {
    details.addRow({
      station: detail.stationName,
      zone: detail.zoneName,
      date: detail.submittedAt,
      email: detail.email,
      score: detail.score,
      band: detail.excluded ? 'No considerada' : detail.band ? BAND_LABEL[detail.band] : '',
    });
  }
  addFiltersSheet(workbook, [
    ['Reporte', 'Encuestas'],
    ['Periodo', report.period],
    ['Alcance', report.scopeLabel],
    ['Respuestas', String(report.responseCount)],
    ['Estaciones con respuesta', String(report.stationCount)],
    ['Generado por', report.generatedBy],
  ]);
  return workbookBuffer(workbook);
}
