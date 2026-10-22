import type { FastifyInstance } from 'fastify';
import { kpiCategorySchema, kpiFactSchema } from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { scopeGuard } from '../middlewares/scopeGuard.js';
import * as kpisService from '../services/kpis/kpisService.js';

export async function kpisRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/kpi-categories', async () => kpisService.listKpiCategories());

  app.post('/admin/kpi-categories', { preHandler: authorize('reglas.gestionar') }, async (request, reply) => {
    const input = kpiCategorySchema.parse(request.body);
    const category = await kpisService.createKpiCategory(input);
    return reply.status(201).send(category);
  });

  app.get(
    '/stations/:stationId/kpi-facts',
    { preHandler: scopeGuard({ level: 'station', paramName: 'stationId' }) },
    async (request) => {
      const { stationId } = request.params as { stationId: string };
      const { period } = request.query as { period: string };
      return kpisService.listKpiFacts(stationId, period);
    },
  );

  app.put('/admin/kpi-facts', { preHandler: authorize('captura.gestionar') }, async (request, reply) => {
    const input = kpiFactSchema.parse(request.body);
    await kpisService.ensurePeriod(input.period);
    const fact = await kpisService.upsertKpiFact(input);
    return reply.send(fact);
  });
}
