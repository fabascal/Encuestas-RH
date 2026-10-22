import PDFDocument from 'pdfkit';
import type { HeatLevel } from '@portal/shared';

type Doc = InstanceType<typeof PDFDocument>;

const HEAT: Record<HeatLevel, string> = {
  meta: '#059669',
  cerca: '#d97706',
  lejos: '#dc2626',
  sin_dato: '#94a3b8',
};

export function heatColor(level: HeatLevel): string {
  return HEAT[level];
}

export function renderPdf(draw: (doc: Doc) => void, layout: 'portrait' | 'landscape' = 'portrait'): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'letter', layout, margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    draw(doc);
    doc.end();
  });
}

export function writeHeader(doc: Doc, title: string, lines: string[]): void {
  doc.fontSize(16).fillColor('#0f172a').text(title, { lineBreak: true });
  doc.moveDown(0.2);
  for (const line of lines) {
    doc.fontSize(9).fillColor('#64748b').text(line);
  }
  doc.moveDown(0.6);
}

export interface PdfColumn {
  header: string;
  width: number;
  align?: 'left' | 'right';
}

function drawHeaderRow(doc: Doc, columns: PdfColumn[], y: number): number {
  let x = doc.page.margins.left;
  doc.fontSize(8).fillColor('#475569');
  for (const column of columns) {
    doc.text(column.header, x, y, { width: column.width, align: column.align ?? 'left', lineBreak: false });
    x += column.width;
  }
  const next = y + 14;
  doc
    .moveTo(doc.page.margins.left, next - 2)
    .lineTo(doc.page.width - doc.page.margins.right, next - 2)
    .strokeColor('#e2e8f0')
    .stroke();
  return next;
}

/** Text table that repeats the header after each page break. */
export function paintTable(doc: Doc, columns: PdfColumn[], rows: string[][]): void {
  let y = drawHeaderRow(doc, columns, doc.y);
  for (const row of rows) {
    if (y > doc.page.height - doc.page.margins.bottom - 20) {
      doc.addPage();
      y = drawHeaderRow(doc, columns, doc.page.margins.top);
    }
    let x = doc.page.margins.left;
    doc.fontSize(8).fillColor('#0f172a');
    row.forEach((cell, index) => {
      const column = columns[index];
      if (!column) return;
      doc.text(cell, x, y, { width: column.width - 4, align: column.align ?? 'left', lineBreak: false, ellipsis: true });
      x += column.width;
    });
    y += 13;
  }
  doc.y = y + 6;
}

export function paintBar(doc: Doc, label: string, ratio: number | null): void {
  const y = doc.y;
  const x = doc.page.margins.left;
  const width = 220;
  const filled = ratio === null ? 0 : Math.max(0, Math.min(ratio, 1)) * width;
  doc.fontSize(9).fillColor('#0f172a').text(label, x, y, { width: 140, lineBreak: false, ellipsis: true });
  doc.roundedRect(x + 148, y + 1, width, 8, 2).fillColor('#e2e8f0').fill();
  if (filled > 0) doc.roundedRect(x + 148, y + 1, filled, 8, 2).fillColor('#2563eb').fill();
  doc
    .fontSize(8)
    .fillColor('#475569')
    .text(ratio === null ? '—' : `${(ratio * 100).toFixed(1)}%`, x + 148 + width + 8, y, { lineBreak: false });
  doc.y = y + 16;
}

export function paintHeat(doc: Doc, level: HeatLevel, label: string, x: number, y: number, width: number): void {
  doc.roundedRect(x, y, width - 4, 12, 2).fillColor(heatColor(level)).fill();
  doc.fontSize(7).fillColor('#ffffff').text(label, x + 2, y + 2, { width: width - 8, align: 'center', lineBreak: false });
}
