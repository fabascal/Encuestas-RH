import ExcelJS from 'exceljs';

export interface ExcelColumn {
  header: string;
  key: string;
  width: number;
  numFmt?: string;
}

export function createWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Portal de KPIs y Bonos';
  workbook.created = new Date();
  return workbook;
}

export function addSheet(workbook: ExcelJS.Workbook, name: string, columns: ExcelColumn[]): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns.map((column) => ({ header: column.header, key: column.key, width: column.width }));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FF0F172A' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  for (const column of columns) {
    if (column.numFmt) sheet.getColumn(column.key).numFmt = column.numFmt;
  }
  return sheet;
}

export function addFiltersSheet(workbook: ExcelJS.Workbook, rows: Array<[string, string]>): void {
  const sheet = workbook.addWorksheet('Filtros');
  sheet.columns = [
    { header: 'Dato', key: 'label', width: 28 },
    { header: 'Valor', key: 'value', width: 42 },
  ];
  sheet.getRow(1).font = { bold: true };
  for (const [label, value] of rows) sheet.addRow({ label, value });
}

/** Colors a 0-1 progress column: green at 100%, amber from 80%, red below. */
export function paintProgress(sheet: ExcelJS.Worksheet, columnLetter: string, lastRow: number): void {
  if (lastRow < 2) return;
  const ref = `${columnLetter}2:${columnLetter}${lastRow}`;
  sheet.addConditionalFormatting({
    ref,
    rules: [
      {
        type: 'cellIs',
        operator: 'between',
        formulae: ['1', '100'],
        priority: 1,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFD1FAE5' } } },
      },
      {
        type: 'cellIs',
        operator: 'between',
        formulae: ['0.8', '0.999'],
        priority: 2,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEF3C7' } } },
      },
      {
        type: 'cellIs',
        operator: 'lessThan',
        formulae: ['0.8'],
        priority: 3,
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFEE2E2' } } },
      },
    ],
  });
}

export async function workbookBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export const MONEY = '$#,##0.00';
export const RATIO = '0.0%';
