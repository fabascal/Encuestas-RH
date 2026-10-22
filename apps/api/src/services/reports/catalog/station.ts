import type { ReportQuery, StationReport } from '@portal/shared';
import { db } from '../../../db/index.js';
import type { AuthUser } from '../../../middlewares/authenticate.js';
import { ValidationError } from '../../../utils/httpErrors.js';
import { loadStationBonuses } from '../bonusSnapshot.js';
import { daysInMonth, heatLevel, periodsEndingAt, oilPace, roundMoney } from '../metrics.js';
import { assertStationAccess } from '../scope.js';
import { addFiltersSheet, addSheet, createWorkbook, MONEY, RATIO, workbookBuffer } from '../excelKit.js';
import { paintBar, paintTable, renderPdf, writeHeader } from '../pdfKit.js';
import { money, pct, stamp } from './format.js';

function readScore(answers: unknown): number | null {
  const record = typeof answers === 'string' ? (JSON.parse(answers) as unknown) : answers;
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return null;
  const score = Number((record as Record<string, unknown>)['score']);
  return Number.isNaN(score) ? null : score;
}

function elapsedDays(period: string, now = new Date()): number {
  const monthDays = daysInMonth(period);
  const mexico = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const current = `${mexico.getUTCFullYear()}-${String(mexico.getUTCMonth() + 1).padStart(2, '0')}-01`;
  if (period < current) return monthDays;
  if (period > current) return 0;
  return Math.min(mexico.getUTCDate(), monthDays);
}

function nextPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, month ?? 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export async function build(user: AuthUser, query: ReportQuery): Promise<StationReport> {
  const stationId = query.stationId;
  if (!stationId) throw new ValidationError('Elige una estación');
  const station = await assertStationAccess(user, stationId);
  const loaded = await loadStationBonuses(user, { period: query.period, stationId }, query.period);
  const row = loaded.rows[0];
  const historyPeriods = periodsEndingAt(query.period, 6);
  const history = [];
  for (const period of historyPeriods) {
    const month = await loadStationBonuses(user, { period, stationId }, period);
    const item = month.rows[0];
    history.push({ period, paidPct: item?.paidPct ?? null, totalPayout: item?.totalPayout ?? 0 });
  }

  const oilCategory = await db.selectFrom('kpi_categories').select('id').where('code', '=', 'oil_sales').executeTakeFirst();
  let oil: StationReport['oil'] = null;
  if (oilCategory) {
    const days = await db
      .selectFrom('kpi_daily_facts')
      .select(['day', 'value'])
      .where('station_id', '=', stationId)
      .where('kpi_category_id', '=', oilCategory.id)
      .where('day', '>=', query.period)
      .where('day', '<', nextPeriod(query.period))
      .orderBy('day')
      .execute();
    const actual = days.reduce((sum, day) => sum + Number(day.value), 0);
    const targetLine = row?.lines.find((line) => line.kpiCode === 'oil_sales');
    const target = targetLine ? targetLine.targetValue : null;
    const monthDays = daysInMonth(query.period);
    const daysElapsed = elapsedDays(query.period);
    const pace = target === null ? null : oilPace(actual, target, daysElapsed, monthDays);
    oil = {
      target,
      actual: roundMoney(actual),
      daysElapsed,
      daysInMonth: monthDays,
      dailyNeeded: pace ? roundMoney(pace.dailyNeeded) : null,
      expectedByNow: pace ? roundMoney(pace.expectedByNow) : null,
      days: days.map((day) => ({
        day: String(day.day).slice(0, 10),
        value: Number(day.value),
      })),
    };
  }

  const responses = await db
    .selectFrom('survey_responses')
    .select(['submitted_at', 'respondent_email', 'answers'])
    .where('station_id', '=', stationId)
    .where('period', '=', query.period)
    .orderBy('submitted_at', 'desc')
    .execute();

  return {
    period: query.period,
    generatedAt: new Date().toISOString(),
    generatedBy: user.fullName,
    scopeLabel: `${station.stationName} (${station.stationCode})`,
    source: row?.source ?? 'estimado',
    stationId: station.stationId,
    stationCode: station.stationCode,
    stationName: station.stationName,
    zoneName: station.zoneName,
    companyName: station.companyName,
    configured: row?.configured ?? false,
    poolAmount: row?.poolAmount ?? 0,
    totalPayout: row?.totalPayout ?? 0,
    lines: (row?.lines ?? []).map((line) => ({
      kpiCode: line.kpiCode,
      kpiName: line.kpiName,
      actualValue: line.actualValue,
      targetValue: line.targetValue,
      progressPct: line.progressPct,
      gap: roundMoney(line.higherIsBetter ? line.targetValue - line.actualValue : line.actualValue - line.targetValue),
      higherIsBetter: line.higherIsBetter,
      payout: line.payout,
      level: heatLevel(line.progressPct),
    })),
    history,
    oil,
    surveys: responses.map((response) => ({
      submittedAt: response.submitted_at instanceof Date ? response.submitted_at.toISOString() : String(response.submitted_at),
      email: response.respondent_email,
      score: readScore(response.answers),
    })),
  };
}

export function pdf(report: StationReport): Promise<Buffer> {
  return renderPdf((doc) => {
    writeHeader(doc, `Ficha de ${report.stationName}`, stamp(report));
    doc.fontSize(11).fillColor('#0f172a').text(`${report.companyName} · ${report.zoneName} · ${report.stationCode}`);
    doc.fontSize(10).fillColor('#475569').text(`Bolsa ${money(report.poolAmount)} · Bono ${money(report.totalPayout)}`);
    doc.moveDown(0.4);
    if (!report.configured) {
      doc.fillColor('#b45309').text('Esta estación no tiene reglas de bono para el periodo.');
      doc.moveDown(0.4);
    }
    paintTable(
      doc,
      [
        { header: 'Rubro', width: 150 },
        { header: 'Real', width: 70, align: 'right' },
        { header: 'Meta', width: 70, align: 'right' },
        { header: 'Avance', width: 60, align: 'right' },
        { header: 'Falta', width: 70, align: 'right' },
        { header: 'Pago', width: 70, align: 'right' },
      ],
      report.lines.map((line) => [
        line.kpiName,
        line.actualValue.toLocaleString('es-MX'),
        line.targetValue.toLocaleString('es-MX'),
        pct(line.progressPct),
        line.gap === null ? '—' : line.gap <= 0 ? 'En meta' : line.gap.toLocaleString('es-MX'),
        money(line.payout),
      ]),
    );
    doc.fontSize(12).fillColor('#0f172a').text('Últimos 6 meses');
    doc.moveDown(0.3);
    for (const point of report.history) paintBar(doc, point.period, point.paidPct);
    if (report.oil) {
      doc.moveDown(0.3);
      doc.fontSize(12).fillColor('#0f172a').text('Venta de aceite');
      doc.fontSize(9).fillColor('#475569');
      doc.text(
        `Llevas ${report.oil.actual.toLocaleString('es-MX')} de ${report.oil.target?.toLocaleString('es-MX') ?? 'sin meta'}. ` +
          (report.oil.dailyNeeded === null ? '' : `Para llegar hacen falta ${report.oil.dailyNeeded.toLocaleString('es-MX')} por día.`),
      );
    }
    doc.moveDown(0.4);
    doc.fontSize(12).fillColor('#0f172a').text(`Encuestas del mes (${report.surveys.length})`);
    doc.moveDown(0.3);
    paintTable(
      doc,
      [
        { header: 'Fecha', width: 160 },
        { header: 'Correo', width: 200 },
        { header: 'Puntuación', width: 80, align: 'right' },
      ],
      report.surveys.map((survey) => [
        new Date(survey.submittedAt).toLocaleString('es-MX'),
        survey.email ?? '—',
        survey.score === null ? '—' : survey.score.toFixed(2),
      ]),
    );
  });
}

export async function excel(report: StationReport): Promise<Buffer> {
  const workbook = createWorkbook();
  const lines = addSheet(workbook, 'Rubros', [
    { header: 'Rubro', key: 'kpi', width: 28 },
    { header: 'Real', key: 'actual', width: 14 },
    { header: 'Meta', key: 'target', width: 14 },
    { header: 'Avance', key: 'progress', width: 12, numFmt: RATIO },
    { header: 'Brecha', key: 'gap', width: 14 },
    { header: 'Pago', key: 'payout', width: 14, numFmt: MONEY },
  ]);
  for (const line of report.lines) {
    lines.addRow({
      kpi: line.kpiName,
      actual: line.actualValue,
      target: line.targetValue,
      progress: line.progressPct,
      gap: line.gap,
      payout: line.payout,
    });
  }
  const history = addSheet(workbook, 'Historial', [
    { header: 'Periodo', key: 'period', width: 14 },
    { header: '% pagado', key: 'paid', width: 14, numFmt: RATIO },
    { header: 'Bono', key: 'payout', width: 14, numFmt: MONEY },
  ]);
  for (const point of report.history) history.addRow({ period: point.period, paid: point.paidPct, payout: point.totalPayout });
  if (report.oil) {
    const oil = addSheet(workbook, 'Aceite diario', [
      { header: 'Día', key: 'day', width: 14 },
      { header: 'Venta', key: 'value', width: 14 },
    ]);
    for (const day of report.oil.days) oil.addRow(day);
  }
  const surveys = addSheet(workbook, 'Encuestas', [
    { header: 'Fecha', key: 'date', width: 22 },
    { header: 'Correo', key: 'email', width: 32 },
    { header: 'Puntuación', key: 'score', width: 14 },
  ]);
  for (const survey of report.surveys) surveys.addRow({ date: survey.submittedAt, email: survey.email, score: survey.score });
  addFiltersSheet(workbook, [
    ['Reporte', 'Ficha de estación'],
    ['Estación', report.scopeLabel],
    ['Periodo', report.period],
    ['Cálculo', report.source === 'cerrado' ? 'Definitivo' : 'Estimado'],
    ['Generado por', report.generatedBy],
  ]);
  return workbookBuffer(workbook);
}
