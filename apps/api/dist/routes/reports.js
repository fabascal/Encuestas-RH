import { periodQuerySchema } from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { renderStationsReportExcel } from '../services/reports/excelReport.js';
import { renderStationsReportPdf } from '../services/reports/pdfReport.js';
import { buildStationsReport } from '../services/reports/reportsService.js';
export async function reportsRoutes(app) {
    app.addHook('preHandler', authenticate);
    app.get('/reports/stations', async (request) => {
        const query = periodQuerySchema.parse(request.query);
        return buildStationsReport(request.authUser, { companyId: query.companyId, zoneId: query.zoneId, stationId: query.stationId }, query.period);
    });
    app.get('/reports/stations.pdf', async (request, reply) => {
        const query = periodQuerySchema.parse(request.query);
        const report = await buildStationsReport(request.authUser, { companyId: query.companyId, zoneId: query.zoneId, stationId: query.stationId }, query.period);
        const pdf = await renderStationsReportPdf(report);
        return reply
            .header('Content-Type', 'application/pdf')
            .header('Content-Disposition', `attachment; filename="reporte-bonos-${query.period}.pdf"`)
            .send(pdf);
    });
    app.get('/reports/stations.xlsx', async (request, reply) => {
        const query = periodQuerySchema.parse(request.query);
        const report = await buildStationsReport(request.authUser, { companyId: query.companyId, zoneId: query.zoneId, stationId: query.stationId }, query.period);
        const excel = await renderStationsReportExcel(report);
        return reply
            .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            .header('Content-Disposition', `attachment; filename="reporte-bonos-${query.period}.xlsx"`)
            .send(excel);
    });
}
//# sourceMappingURL=reports.js.map