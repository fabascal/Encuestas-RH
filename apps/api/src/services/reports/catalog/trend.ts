import type { ReportQuery, TrendReport, TrendStation } from '@portal/shared';
import type { AuthUser } from '../../../middlewares/authenticate.js';
import { loadStationBonuses, type BonusLoad } from '../bonusSnapshot.js';
import { paidRatio, periodsEndingAt, trendDirection } from '../metrics.js';
import { listScopedStations, scopeLabel } from '../scope.js';
import { addFiltersSheet, addSheet, createWorkbook, RATIO, workbookBuffer } from '../excelKit.js';
import { paintBar, paintTable, renderPdf, writeHeader } from '../pdfKit.js';
import { pct, stamp } from './format.js';

const DIRECTION_LABEL = { sube: 'Sube', baja: 'Baja', igual: 'Igual', sin_dato: 'Sin dato' } as const;

function monthLabel(period: string): string {
  const [year, month] = period.split('-');
  const names = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${names[(Number(month) || 1) - 1]} ${year}`;
}

export async function build(user: AuthUser, query: ReportQuery): Promise<TrendReport> {
  const months = periodsEndingAt(query.period, query.months ?? 6);
  const loads: BonusLoad[] = [];
  for (const period of months) loads.push(await loadStationBonuses(user, query, period));
  const stations = await listScopedStations(user, query);

  const network = loads.map((load, index) => ({
    period: months[index] ?? query.period,
    paidPct: paidRatio(
      load.rows.reduce((sum, row) => sum + row.totalPayout, 0),
      load.rows.reduce((sum, row) => sum + row.poolAmount, 0),
    ),
  }));

  const kpiNames = new Map<string, string>();
  for (const load of loads) {
    for (const row of load.rows) {
      for (const line of row.lines) kpiNames.set(line.kpiCode, line.kpiName);
    }
  }
  const kpis = [...kpiNames.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'es'))
    .map(([kpiCode, kpiName]) => ({
      kpiCode,
      kpiName,
      points: loads.map((load, index) => {
        const values = load.rows.flatMap((row) => row.lines.filter((line) => line.kpiCode === kpiCode && line.progressPct !== null).map((line) => line.progressPct as number));
        const average = values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
        return { period: months[index] ?? query.period, averageProgressPct: average };
      }),
    }));

  const stationRows: TrendStation[] = stations.map((station) => {
    const points = loads.map((load, index) => ({
      period: months[index] ?? query.period,
      paidPct: load.rows.find((row) => row.station.stationId === station.stationId)?.paidPct ?? null,
    }));
    return {
      stationId: station.stationId,
      stationName: station.stationName,
      stationCode: station.stationCode,
      zoneName: station.zoneName,
      points,
      direction: trendDirection(points.map((point) => point.paidPct)),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: user.fullName,
    scopeLabel: await scopeLabel(stations, query),
    months,
    network,
    kpis,
    stations: stationRows.sort((a, b) => a.zoneName.localeCompare(b.zoneName, 'es') || a.stationName.localeCompare(b.stationName, 'es')),
  };
}

export function pdf(report: TrendReport): Promise<Buffer> {
  return renderPdf((doc) => {
    writeHeader(doc, 'Tendencia', stamp({ ...report, period: `${report.months[0] ?? ''} a ${report.months.at(-1) ?? ''}` }));
    doc.fontSize(12).fillColor('#0f172a').text('Bolsa pagada de la red');
    doc.moveDown(0.3);
    for (const point of report.network) paintBar(doc, monthLabel(point.period), point.paidPct);
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#0f172a').text('Avance promedio por rubro');
    doc.moveDown(0.3);
    paintTable(
      doc,
      [
        { header: 'Rubro', width: 160 },
        ...report.months.map((period) => ({ header: monthLabel(period), width: 58, align: 'right' as const })),
      ],
      report.kpis.map((kpi) => [kpi.kpiName, ...kpi.points.map((point) => pct(point.averageProgressPct))]),
    );
    doc.fontSize(12).fillColor('#0f172a').text('Estaciones');
    doc.moveDown(0.3);
    paintTable(
      doc,
      [
        { header: 'Estación', width: 150 },
        { header: 'Zona', width: 100 },
        { header: 'Rumbo', width: 60 },
        ...report.months.map((period) => ({ header: monthLabel(period), width: 52, align: 'right' as const })),
      ],
      report.stations.map((station) => [
        station.stationName,
        station.zoneName,
        DIRECTION_LABEL[station.direction],
        ...station.points.map((point) => pct(point.paidPct)),
      ]),
    );
  }, 'landscape');
}

export async function excel(report: TrendReport): Promise<Buffer> {
  const workbook = createWorkbook();
  const network = addSheet(workbook, 'Red', [
    { header: 'Periodo', key: 'period', width: 14 },
    { header: '% pagado', key: 'paid', width: 14, numFmt: RATIO },
  ]);
  for (const point of report.network) network.addRow({ period: point.period, paid: point.paidPct });
  const kpis = addSheet(workbook, 'Rubros', [
    { header: 'Rubro', key: 'kpi', width: 28 },
    ...report.months.map((period) => ({ header: period, key: period, width: 14, numFmt: RATIO })),
  ]);
  for (const kpi of report.kpis) {
    const values: Record<string, string | number | null> = { kpi: kpi.kpiName };
    for (const point of kpi.points) values[point.period] = point.averageProgressPct;
    kpis.addRow(values);
  }
  const stations = addSheet(workbook, 'Estaciones', [
    { header: 'Estación', key: 'station', width: 24 },
    { header: 'Código', key: 'code', width: 12 },
    { header: 'Zona', key: 'zone', width: 18 },
    { header: 'Rumbo', key: 'direction', width: 12 },
    ...report.months.map((period) => ({ header: period, key: period, width: 14, numFmt: RATIO })),
  ]);
  for (const station of report.stations) {
    const values: Record<string, string | number | null> = {
      station: station.stationName,
      code: station.stationCode,
      zone: station.zoneName,
      direction: DIRECTION_LABEL[station.direction],
    };
    for (const point of station.points) values[point.period] = point.paidPct;
    stations.addRow(values);
  }
  addFiltersSheet(workbook, [
    ['Reporte', 'Tendencia'],
    ['Meses', report.months.join(', ')],
    ['Alcance', report.scopeLabel],
    ['Generado por', report.generatedBy],
  ]);
  return workbookBuffer(workbook);
}
