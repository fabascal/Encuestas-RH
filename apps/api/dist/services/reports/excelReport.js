import ExcelJS from 'exceljs';
/** Builds a workbook with a summary sheet (with SUM formulas) and a per-kpi detail sheet. */
export async function renderStationsReportExcel(report) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Portal de KPIs y Bonos';
    workbook.created = new Date();
    const summary = workbook.addWorksheet('Resumen');
    summary.columns = [
        { header: 'Empresa', key: 'company', width: 22 },
        { header: 'Zona', key: 'zone', width: 20 },
        { header: 'Estacion', key: 'station', width: 24 },
        { header: 'Codigo', key: 'code', width: 12 },
        { header: 'Configurado', key: 'configured', width: 14 },
        { header: 'Bolsa', key: 'pool', width: 16 },
        { header: 'Bono total', key: 'payout', width: 16 },
    ];
    summary.getRow(1).font = { bold: true };
    for (const row of report.rows) {
        summary.addRow({
            company: row.companyName,
            zone: row.zoneName,
            station: row.stationName,
            code: row.stationCode,
            configured: row.configured ? 'Si' : 'No',
            pool: row.poolAmount,
            payout: row.totalPayout,
        });
    }
    if (report.rows.length > 0) {
        const firstDataRow = 2;
        const lastDataRow = report.rows.length + 1;
        const totalRow = summary.addRow({ company: 'Total' });
        totalRow.getCell('pool').value = { formula: `SUM(F${firstDataRow}:F${lastDataRow})` };
        totalRow.getCell('payout').value = { formula: `SUM(G${firstDataRow}:G${lastDataRow})` };
        totalRow.font = { bold: true };
    }
    summary.getColumn('pool').numFmt = '$#,##0.00';
    summary.getColumn('payout').numFmt = '$#,##0.00';
    const detail = workbook.addWorksheet('Detalle por rubro');
    detail.columns = [
        { header: 'Empresa', key: 'company', width: 22 },
        { header: 'Zona', key: 'zone', width: 20 },
        { header: 'Estacion', key: 'station', width: 24 },
        { header: 'Rubro', key: 'kpi', width: 20 },
        { header: 'Peso %', key: 'weight', width: 10 },
        { header: 'Real', key: 'actual', width: 14 },
        { header: 'Meta', key: 'target', width: 14 },
        { header: 'Avance %', key: 'progress', width: 12 },
        { header: 'Pago', key: 'payout', width: 14 },
    ];
    detail.getRow(1).font = { bold: true };
    for (const row of report.rows) {
        for (const line of row.lines) {
            detail.addRow({
                company: row.companyName,
                zone: row.zoneName,
                station: row.stationName,
                kpi: line.kpiCode,
                weight: line.weight,
                actual: line.actualValue,
                target: line.targetValue,
                progress: line.progressPct !== null ? line.progressPct * 100 : null,
                payout: line.payout,
            });
        }
    }
    detail.getColumn('payout').numFmt = '$#,##0.00';
    detail.getColumn('actual').numFmt = '#,##0.00';
    detail.getColumn('target').numFmt = '#,##0.00';
    detail.getColumn('progress').numFmt = '0.0"%"';
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
}
//# sourceMappingURL=excelReport.js.map