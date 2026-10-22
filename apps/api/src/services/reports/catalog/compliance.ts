import type { ComplianceCell, ComplianceReport, HeatLevel, ReportQuery } from '@portal/shared';
import type { AuthUser } from '../../../middlewares/authenticate.js';
import { loadStationBonuses } from '../bonusSnapshot.js';
import { heatLevel } from '../metrics.js';
import { listScopedStations, scopeLabel } from '../scope.js';
import { addFiltersSheet, addSheet, createWorkbook, paintProgress, RATIO, workbookBuffer } from '../excelKit.js';
import { paintHeat, renderPdf, writeHeader } from '../pdfKit.js';
import { pct, stamp } from './format.js';

function average(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => value !== null);
  if (known.length === 0) return null;
  return known.reduce((sum, value) => sum + value, 0) / known.length;
}

export async function build(user: AuthUser, query: ReportQuery): Promise<ComplianceReport> {
  const loaded = await loadStationBonuses(user, query, query.period);
  const stations = await listScopedStations(user, query);
  const kpis = new Map<string, string>();
  for (const row of loaded.rows) {
    for (const line of row.lines) kpis.set(line.kpiCode, line.kpiName);
  }
  const columns = [...kpis.entries()]
    .map(([kpiCode, kpiName]) => ({ kpiCode, kpiName }))
    .sort((a, b) => a.kpiName.localeCompare(b.kpiName, 'es'));

  const rows = loaded.rows.map((row) => ({
    stationId: row.station.stationId,
    stationName: row.station.stationName,
    stationCode: row.station.stationCode,
    zoneName: row.station.zoneName,
    cells: columns.map((column): ComplianceCell => {
      const line = row.lines.find((item) => item.kpiCode === column.kpiCode);
      const progressPct = line?.progressPct ?? null;
      return { kpiCode: column.kpiCode, progressPct, level: line ? heatLevel(progressPct) : 'sin_dato' };
    }),
  }));

  const totals = columns.map((column): ComplianceCell => {
    const progressPct = average(rows.map((row) => row.cells.find((cell) => cell.kpiCode === column.kpiCode)?.progressPct ?? null));
    return { kpiCode: column.kpiCode, progressPct, level: heatLevel(progressPct) };
  });

  return {
    period: query.period,
    generatedAt: new Date().toISOString(),
    generatedBy: user.fullName,
    scopeLabel: await scopeLabel(stations, query),
    source: loaded.periodStatus === 'closed' ? 'cerrado' : 'estimado',
    kpis: columns,
    rows,
    totals,
  };
}

const HEAT_LABEL: Record<HeatLevel, string> = {
  meta: 'Meta',
  cerca: 'Cerca',
  lejos: 'Lejos',
  sin_dato: 'S/D',
};

export function pdf(report: ComplianceReport): Promise<Buffer> {
  return renderPdf((doc) => {
    writeHeader(doc, 'Matriz de cumplimiento', stamp(report));
    const nameWidth = 150;
    const cellWidth = Math.max(52, Math.min(80, (doc.page.width - 80 - nameWidth) / Math.max(report.kpis.length, 1)));
    let y = doc.y;
    const drawHead = () => {
      doc.fontSize(7).fillColor('#475569').text('Estación', doc.page.margins.left, y, { width: nameWidth, lineBreak: false });
      report.kpis.forEach((kpi, index) => {
        doc.text(kpi.kpiName, doc.page.margins.left + nameWidth + index * cellWidth, y, {
          width: cellWidth - 2,
          lineBreak: false,
          ellipsis: true,
        });
      });
      y += 14;
    };
    drawHead();
    const paintRow = (label: string, cells: ComplianceCell[]) => {
      if (y > doc.page.height - 56) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHead();
      }
      doc.fontSize(7).fillColor('#0f172a').text(label, doc.page.margins.left, y + 2, { width: nameWidth - 4, lineBreak: false, ellipsis: true });
      cells.forEach((cell, index) => {
        paintHeat(doc, cell.level, `${HEAT_LABEL[cell.level]} ${pct(cell.progressPct)}`, doc.page.margins.left + nameWidth + index * cellWidth, y, cellWidth);
      });
      y += 16;
    };
    for (const row of report.rows) paintRow(row.stationName, row.cells);
    paintRow('Promedio', report.totals);
    doc.y = y;
  }, 'landscape');
}

export async function excel(report: ComplianceReport): Promise<Buffer> {
  const workbook = createWorkbook();
  const sheet = addSheet(workbook, 'Cumplimiento', [
    { header: 'Estación', key: 'station', width: 24 },
    { header: 'Código', key: 'code', width: 12 },
    { header: 'Zona', key: 'zone', width: 18 },
    ...report.kpis.map((kpi) => ({ header: kpi.kpiName, key: kpi.kpiCode, width: 16, numFmt: RATIO })),
  ]);
  for (const row of report.rows) {
    const values: Record<string, string | number | null> = {
      station: row.stationName,
      code: row.stationCode,
      zone: row.zoneName,
    };
    for (const cell of row.cells) values[cell.kpiCode] = cell.progressPct;
    sheet.addRow(values);
  }
  const total: Record<string, string | number | null> = { station: 'Promedio' };
  report.totals.forEach((cell) => {
    total[cell.kpiCode] = cell.progressPct;
  });
  const totalRow = sheet.addRow(total);
  totalRow.font = { bold: true };
  report.kpis.forEach((_, index) => {
    const letter = sheet.getColumn(index + 4).letter;
    paintProgress(sheet, letter, sheet.rowCount - 1);
  });
  addFiltersSheet(workbook, [
    ['Reporte', 'Matriz de cumplimiento'],
    ['Periodo', report.period],
    ['Alcance', report.scopeLabel],
    ['Cálculo', report.source === 'cerrado' ? 'Definitivo' : 'Estimado'],
    ['Generado por', report.generatedBy],
  ]);
  return workbookBuffer(workbook);
}
