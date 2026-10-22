import { REPORT_IDS, reportQuerySchema, type ReportId } from '@portal/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { REPORTS } from '../services/reports/catalog/index.js';
import { NotFoundError, ValidationError } from '../utils/httpErrors.js';

const idSchema = z.enum(REPORT_IDS);

function isReportId(value: string): value is ReportId {
  return idSchema.safeParse(value).success;
}

async function sendReport(request: FastifyRequest, reply: FastifyReply, id: string, format: 'json' | 'pdf' | 'xlsx') {
  if (!isReportId(id)) throw new NotFoundError('No se encontró el reporte');
  const query = reportQuerySchema.parse(request.query);
  if (id === 'estacion' && !query.stationId) throw new ValidationError('Elige una estación');
  const report = REPORTS[id];
  const data = await report.build(request.authUser!, query);
  if (format === 'json') return data;

  const filename = `reporte-${id}-${query.period}`;
  if (format === 'pdf') {
    const pdf = await report.pdf(data as never);
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}.pdf"`)
      .send(pdf);
  }
  const excel = await report.excel(data as never);
  return reply
    .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    .header('Content-Disposition', `attachment; filename="${filename}.xlsx"`)
    .send(excel);
}

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/reports/stations', { preHandler: authorize('reportes.ver') }, (request, reply) =>
    sendReport(request, reply, 'pagos', 'json'),
  );
  app.get('/reports/stations.pdf', { preHandler: authorize('reportes.exportar') }, (request, reply) =>
    sendReport(request, reply, 'pagos', 'pdf'),
  );
  app.get('/reports/stations.xlsx', { preHandler: authorize('reportes.exportar') }, (request, reply) =>
    sendReport(request, reply, 'pagos', 'xlsx'),
  );

  app.get('/reports/:id', { preHandler: authorize('reportes.ver') }, (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return sendReport(request, reply, id, 'json');
  });
  app.get('/reports/:id.pdf', { preHandler: authorize('reportes.exportar') }, (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return sendReport(request, reply, id, 'pdf');
  });
  app.get('/reports/:id.xlsx', { preHandler: authorize('reportes.exportar') }, (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    return sendReport(request, reply, id, 'xlsx');
  });
}
