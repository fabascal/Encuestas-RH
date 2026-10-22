import type { RankedStation, ReportQuery, SummaryReport, ZonePaidBar } from '@portal/shared';
import type { AuthUser } from '../../../middlewares/authenticate.js';
import { loadStationBonuses, type StationBonusView } from '../bonusSnapshot.js';
import { heatLevel, paidRatio, ratioChange, roundMoney, shiftPeriod } from '../metrics.js';
import { listScopedStations, scopeLabel } from '../scope.js';
import { addFiltersSheet, addSheet, createWorkbook, MONEY, RATIO, workbookBuffer } from '../excelKit.js';
import { paintBar, paintTable, renderPdf, writeHeader } from '../pdfKit.js';
import { money, pct, stamp } from './format.js';

function onGoal(row: StationBonusView): boolean {
  return row.configured && row.lines.length > 0 && row.lines.every((line) => heatLevel(line.progressPct) === 'meta');
}

function rank(rows: StationBonusView[]): RankedStation[] {
  return rows
    .filter((row) => row.configured && row.paidPct !== null)
    .map((row) => ({
      stationId: row.station.stationId,
      stationName: row.station.stationName,
      stationCode: row.station.stationCode,
      zoneName: row.station.zoneName,
      paidPct: row.paidPct,
      totalPayout: row.totalPayout,
    }))
    .sort((a, b) => (b.paidPct ?? 0) - (a.paidPct ?? 0));
}

export async function build(user: AuthUser, query: ReportQuery): Promise<SummaryReport> {
  const current = await loadStationBonuses(user, query, query.period);
  const previousPeriod = shiftPeriod(query.period, -1);
  const previous = await loadStationBonuses(user, query, previousPeriod);
  const stations = await listScopedStations(user, query);

  const poolAmount = roundMoney(current.rows.reduce((sum, row) => sum + row.poolAmount, 0));
  const totalPayout = roundMoney(current.rows.reduce((sum, row) => sum + row.totalPayout, 0));
  const paidPct = paidRatio(totalPayout, poolAmount);
  const previousPaidPct = paidRatio(
    previous.rows.reduce((sum, row) => sum + row.totalPayout, 0),
    previous.rows.reduce((sum, row) => sum + row.poolAmount, 0),
  );

  const zones = new Map<string, ZonePaidBar>();
  for (const row of current.rows) {
    const zone = zones.get(row.station.zoneName) ?? {
      zoneName: row.station.zoneName,
      poolAmount: 0,
      totalPayout: 0,
      paidPct: null,
    };
    zone.poolAmount = roundMoney(zone.poolAmount + row.poolAmount);
    zone.totalPayout = roundMoney(zone.totalPayout + row.totalPayout);
    zones.set(row.station.zoneName, zone);
  }
  const zoneBars = [...zones.values()]
    .map((zone) => ({ ...zone, paidPct: paidRatio(zone.totalPayout, zone.poolAmount) }))
    .sort((a, b) => (b.paidPct ?? -1) - (a.paidPct ?? -1));

  const ranked = rank(current.rows);
  const best = ranked.slice(0, 5);
  const bestIds = new Set(best.map((row) => row.stationId));
  const worst = [...ranked].reverse().filter((row) => !bestIds.has(row.stationId)).slice(0, 5);

  const lost = new Map<string, { kpiCode: string; kpiName: string; lostAmount: number }>();
  for (const row of current.rows) {
    for (const line of row.lines) {
      const gap = Math.max(0, line.base - line.payout);
      const currentLost = lost.get(line.kpiCode) ?? { kpiCode: line.kpiCode, kpiName: line.kpiName, lostAmount: 0 };
      currentLost.lostAmount = roundMoney(currentLost.lostAmount + gap);
      lost.set(line.kpiCode, currentLost);
    }
  }

  return {
    period: query.period,
    previousPeriod,
    generatedAt: new Date().toISOString(),
    generatedBy: user.fullName,
    scopeLabel: await scopeLabel(stations, query),
    source: current.periodStatus === 'closed' ? 'cerrado' : 'estimado',
    poolAmount,
    totalPayout,
    paidPct,
    previousPaidPct,
    paidPctChange: ratioChange(paidPct, previousPaidPct),
    stationsOnGoal: current.rows.filter(onGoal).length,
    stationsConfigured: current.rows.filter((row) => row.configured).length,
    stationsWithoutRules: current.rows.filter((row) => !row.configured).length,
    zones: zoneBars,
    best,
    worst,
    lostByKpi: [...lost.values()].sort((a, b) => b.lostAmount - a.lostAmount),
  };
}

export function pdf(report: SummaryReport): Promise<Buffer> {
  return renderPdf((doc) => {
    writeHeader(doc, 'Resumen ejecutivo', stamp(report));
    doc.fontSize(11).fillColor('#0f172a').text(`Bono a pagar ${money(report.totalPayout)} de ${money(report.poolAmount)} (${pct(report.paidPct)})`);
    doc.fontSize(9).fillColor('#475569').text(`Contra ${report.previousPeriod}: ${pct(report.previousPaidPct)} (${report.paidPctChange === null ? 'sin comparación' : pct(report.paidPctChange)})`);
    doc.text(`En meta: ${report.stationsOnGoal} de ${report.stationsConfigured} con reglas · Sin reglas: ${report.stationsWithoutRules}`);
    doc.moveDown();
    doc.fontSize(12).fillColor('#0f172a').text('Bolsa pagada por zona');
    doc.moveDown(0.4);
    for (const zone of report.zones) paintBar(doc, zone.zoneName, zone.paidPct);
    doc.moveDown(0.4);
    doc.fontSize(12).fillColor('#0f172a').text('Mejor avance');
    doc.moveDown(0.3);
    paintTable(
      doc,
      [
        { header: 'Estación', width: 180 },
        { header: 'Zona', width: 140 },
        { header: '% pagado', width: 80, align: 'right' },
        { header: 'Bono', width: 90, align: 'right' },
      ],
      report.best.map((row) => [row.stationName, row.zoneName, pct(row.paidPct), money(row.totalPayout)]),
    );
    doc.fontSize(12).fillColor('#0f172a').text('Menor avance');
    doc.moveDown(0.3);
    paintTable(
      doc,
      [
        { header: 'Estación', width: 180 },
        { header: 'Zona', width: 140 },
        { header: '% pagado', width: 80, align: 'right' },
        { header: 'Bono', width: 90, align: 'right' },
      ],
      report.worst.map((row) => [row.stationName, row.zoneName, pct(row.paidPct), money(row.totalPayout)]),
    );
    doc.fontSize(12).fillColor('#0f172a').text('Dónde se deja de pagar');
    doc.moveDown(0.3);
    paintTable(
      doc,
      [
        { header: 'Rubro', width: 260 },
        { header: 'Bono no pagado', width: 120, align: 'right' },
      ],
      report.lostByKpi.map((row) => [row.kpiName, money(row.lostAmount)]),
    );
  });
}

export async function excel(report: SummaryReport): Promise<Buffer> {
  const workbook = createWorkbook();
  const zones = addSheet(workbook, 'Por zona', [
    { header: 'Zona', key: 'zone', width: 24 },
    { header: 'Bolsa', key: 'pool', width: 16, numFmt: MONEY },
    { header: 'Bono', key: 'payout', width: 16, numFmt: MONEY },
    { header: '% pagado', key: 'paid', width: 14, numFmt: RATIO },
  ]);
  for (const zone of report.zones) {
    zones.addRow({ zone: zone.zoneName, pool: zone.poolAmount, payout: zone.totalPayout, paid: zone.paidPct });
  }
  const ranking = addSheet(workbook, 'Estaciones', [
    { header: 'Estación', key: 'station', width: 24 },
    { header: 'Código', key: 'code', width: 12 },
    { header: 'Zona', key: 'zone', width: 20 },
    { header: '% pagado', key: 'paid', width: 14, numFmt: RATIO },
    { header: 'Bono', key: 'payout', width: 16, numFmt: MONEY },
    { header: 'Grupo', key: 'group', width: 14 },
  ]);
  for (const row of report.best) ranking.addRow({ station: row.stationName, code: row.stationCode, zone: row.zoneName, paid: row.paidPct, payout: row.totalPayout, group: 'Mejor' });
  for (const row of report.worst) ranking.addRow({ station: row.stationName, code: row.stationCode, zone: row.zoneName, paid: row.paidPct, payout: row.totalPayout, group: 'Menor' });
  const lost = addSheet(workbook, 'Bono no pagado', [
    { header: 'Rubro', key: 'kpi', width: 28 },
    { header: 'Bono no pagado', key: 'lost', width: 18, numFmt: MONEY },
  ]);
  for (const row of report.lostByKpi) lost.addRow({ kpi: row.kpiName, lost: row.lostAmount });
  addFiltersSheet(workbook, [
    ['Reporte', 'Resumen ejecutivo'],
    ['Periodo', report.period],
    ['Alcance', report.scopeLabel],
    ['Cálculo', report.source === 'cerrado' ? 'Definitivo' : 'Estimado'],
    ['Generado por', report.generatedBy],
  ]);
  return workbookBuffer(workbook);
}
