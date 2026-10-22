import { panelOilQuerySchema } from '@portal/shared';
import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { buildPanelOil } from '../services/oil/oilSales.js';

export async function panelRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/panel/aceite', { preHandler: authorize('panel.ver') }, async (request) => {
    const query = panelOilQuerySchema.parse(request.query);
    return buildPanelOil(request.authUser!, query);
  });
}
