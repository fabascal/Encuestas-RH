import PDFDocument from 'pdfkit';
function formatCurrency(value) {
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}
function formatPercent(progressPct) {
    return progressPct !== null ? `${(progressPct * 100).toFixed(0)}%` : 'N/D';
}
/** Renders the institutional PDF: header, per-station KPI breakdown, semaphore status, and totals. */
export function renderStationsReportPdf(report) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'letter', margin: 48 });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.fontSize(18).fillColor('#0f172a').text('Portal de KPIs y Bonos');
        doc.fontSize(11).fillColor('#64748b').text(`Reporte de bonos - Periodo ${report.period}`);
        doc.text(`Generado: ${new Date(report.generatedAt).toLocaleString('es-MX')}`);
        doc.moveDown();
        for (const row of report.rows) {
            if (doc.y > doc.page.height - 150)
                doc.addPage();
            doc
                .fontSize(13)
                .fillColor('#0f172a')
                .text(`${row.companyName} / ${row.zoneName} / ${row.stationName} (${row.stationCode})`);
            if (!row.configured) {
                doc.fontSize(10).fillColor('#dc2626').text('Sin reglas de bono configuradas para este periodo.');
                doc.moveDown();
                continue;
            }
            doc
                .fontSize(10)
                .fillColor('#475569')
                .text(`Bolsa: ${formatCurrency(row.poolAmount)}   Bono total: ${formatCurrency(row.totalPayout)}`);
            doc.moveDown(0.3);
            for (const line of row.lines) {
                const status = line.eligible ? 'En meta' : 'Fuera de meta';
                doc
                    .fontSize(9)
                    .fillColor(line.eligible ? '#059669' : '#dc2626')
                    .text(`  ${line.kpiCode}: real ${line.actualValue.toLocaleString('es-MX')} / meta ${line.targetValue.toLocaleString('es-MX')} (${formatPercent(line.progressPct)}) -> ${status}, pago ${formatCurrency(line.payout)}`);
            }
            doc.moveDown();
        }
        doc.moveDown();
        doc
            .fontSize(12)
            .fillColor('#0f172a')
            .text(`Total bolsas: ${formatCurrency(report.totalPool)}`);
        doc.text(`Total bonos: ${formatCurrency(report.totalPayout)}`);
        doc.end();
    });
}
//# sourceMappingURL=pdfReport.js.map