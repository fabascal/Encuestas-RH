import type { PayoutsReport, ReportQuery } from '@portal/shared';
import type { AuthUser } from '../../../middlewares/authenticate.js';
import { loadStationBonuses } from '../bonusSnapshot.js';
import { roundMoney } from '../metrics.js';
import { listScopedStations, scopeLabel } from '../scope.js';
import { addFiltersSheet, createWorkbook, MONEY, RATIO, workbookBuffer } from '../excelKit.js';
import { paintTable, renderPdf, writeHeader } from '../pdfKit.js';
import { money, pct, sourceLabel, stamp } from './format.js';

export async function build(user: AuthUser, query: ReportQuery): Promise<PayoutsReport> {
  const loaded = await loadStationBonuses(user, query, query.period);
  const stations = await listScopedStations(user, query);
  const rows = loaded.rows.map((row) => ({
    stationId: row.station.stationId,
    stationCode: row.station.stationCode,
    stationName: row.station.stationName,
    zoneName: row.station.zoneName,
    companyName: row.station.companyName,
    configured: row.configured,
    source: row.source,
    poolAmount: row.poolAmount,
    totalPayout: row.totalPayout,
    paidPct: row.paidPct,
  }));
  return {
    period: query.period,
    generatedAt: new Date().toISOString(),
    generatedBy: user.fullName,
    scopeLabel: await scopeLabel(stations, query),
    source: loaded.periodStatus === 'closed' ? 'cerrado' : 'estimado',
    periodStatus: loaded.periodStatus,
    rows,
    totalPool: roundMoney(rows.reduce((sum, row) => sum + row.poolAmount, 0)),
    totalPayout: roundMoney(rows.reduce((sum, row) => sum + row.totalPayout, 0)),
  };
}

export function pdf(report: PayoutsReport): Promise<Buffer> {
  return renderPdf((doc) => {
    writeHeader(doc, 'Bonos a pagar', stamp(report));
    if (report.periodStatus === 'open') {
      doc.fontSize(9).fillColor('#b45309').text('El periodo sigue abierto: estos montos son estimados y pueden cambiar.');
      doc.moveDown(0.4);
    }
    paintTable(
      doc,
      [
        { header: 'Zona', width: 110 },
        { header: 'Estación', width: 150 },
        { header: 'Código', width: 55 },
        { header: 'Bolsa', width: 75, align: 'right' },
        { header: 'Pago', width: 75, align: 'right' },
        { header: '%', width: 45, align: 'right' },
      ],
      report.rows.map((row) => [
        row.zoneName,
        row.stationName,
        row.stationCode,
        row.configured ? money(row.poolAmount) : 'Sin reglas',
        row.configured ? money(row.totalPayout) : '—',
        pct(row.paidPct),
      ]),
    );
    doc.fontSize(11).fillColor('#0f172a').text(`Total bolsa ${money(report.totalPool)}`);
    doc.text(`Total a pagar ${money(report.totalPayout)}`);
  }, 'landscape');
}

export async function excel(report: PayoutsReport): Promise<Buffer> {
  const workbook = createWorkbook();
  const sheet = workbook.addWorksheet('Estaciones');
  sheet.getCell('A1').value =
    report.periodStatus === 'open'
      ? 'Aviso: el periodo sigue abierto. Los montos son estimados y pueden cambiar antes del cierre.'
      : 'Periodo cerrado. Montos definitivos para nómina.';
  sheet.getCell('A1').font = { bold: true, color: { argb: report.periodStatus === 'open' ? 'FFB45309' : 'FF047857' } };
  sheet.mergeCells('A1:H1');
  const headers = ['Empresa', 'Zona', 'Estación', 'Código', 'Bolsa', 'Pago', 'Pagado', 'Cálculo'];
  headers.forEach((header, index) => {
    const cell = sheet.getRow(2).getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true };
  });
  sheet.views = [{ state: 'frozen', ySplit: 2 }];
  report.rows.forEach((row, index) => {
    const excelRow = sheet.getRow(index + 3);
    excelRow.getCell(1).value = row.companyName;
    excelRow.getCell(2).value = row.zoneName;
    excelRow.getCell(3).value = row.stationName;
    excelRow.getCell(4).value = row.stationCode;
    excelRow.getCell(5).value = row.poolAmount;
    excelRow.getCell(5).numFmt = MONEY;
    excelRow.getCell(6).value = row.totalPayout;
    excelRow.getCell(6).numFmt = MONEY;
    excelRow.getCell(7).value = row.paidPct;
    excelRow.getCell(7).numFmt = RATIO;
    excelRow.getCell(8).value = row.configured ? sourceLabel(row.source) : 'Sin reglas';
  });
  const first = 3;
  const last = Math.max(first, report.rows.length + 2);
  const total = sheet.getRow(last + 1);
  total.getCell(1).value = 'Total';
  total.getCell(1).font = { bold: true };
  total.getCell(5).value = { formula: `SUM(E${first}:E${last})` };
  total.getCell(6).value = { formula: `SUM(F${first}:F${last})` };
  total.getCell(5).numFmt = MONEY;
  total.getCell(6).numFmt = MONEY;
  total.font = { bold: true };
  sheet.columns = [
    { width: 22 },
    { width: 18 },
    { width: 24 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 12 },
    { width: 14 },
  ];

  const zones = [...new Set(report.rows.map((row) => row.zoneName))];
  const byZone = workbook.addWorksheet('Por zona');
  ['Zona', 'Bolsa', 'Pago', 'Pagado'].forEach((header, index) => {
    byZone.getRow(1).getCell(index + 1).value = header;
  });
  byZone.getRow(1).font = { bold: true };
  zones.forEach((zone, index) => {
    const excelRow = byZone.getRow(index + 2);
    excelRow.getCell(1).value = zone;
    excelRow.getCell(2).value = { formula: `SUMIF(Estaciones!B:B,A${index + 2},Estaciones!E:E)` };
    excelRow.getCell(3).value = { formula: `SUMIF(Estaciones!B:B,A${index + 2},Estaciones!F:F)` };
    excelRow.getCell(4).value = { formula: `IF(B${index + 2}=0,"",C${index + 2}/B${index + 2})` };
    excelRow.getCell(2).numFmt = MONEY;
    excelRow.getCell(3).numFmt = MONEY;
    excelRow.getCell(4).numFmt = RATIO;
  });
  byZone.columns = [{ width: 22 }, { width: 16 }, { width: 16 }, { width: 12 }];

  addFiltersSheet(workbook, [
    ['Reporte', 'Bonos a pagar'],
    ['Periodo', report.period],
    ['Alcance', report.scopeLabel],
    ['Estado del periodo', report.periodStatus === 'closed' ? 'Cerrado' : 'Abierto'],
    ['Generado por', report.generatedBy],
  ]);
  return workbookBuffer(workbook);
}
