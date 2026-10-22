import { kpiCategorySchema, kpiFactSchema } from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { scopeGuard } from '../middlewares/scopeGuard.js';
import * as kpisService from '../services/kpis/kpisService.js';
export async function kpisRoutes(app) {
    app.addHook('preHandler', authenticate);
    app.get('/kpi-categories', async () => kpisService.listKpiCategories());
    app.post('/admin/kpi-categories', { preHandler: authorize('admin') }, async (request, reply) => {
        const input = kpiCategorySchema.parse(request.body);
        const category = await kpisService.createKpiCategory(input);
        return reply.status(201).send(category);
    });
    app.get('/stations/:stationId/kpi-facts', { preHandler: scopeGuard({ level: 'station', paramName: 'stationId' }) }, async (request) => {
        const { stationId } = request.params;
        const { period } = request.query;
        return kpisService.listKpiFacts(stationId, period);
    });
    app.put('/admin/kpi-facts', { preHandler: authorize('admin') }, async (request, reply) => {
        const input = kpiFactSchema.parse(request.body);
        await kpisService.ensurePeriod(input.period);
        const fact = await kpisService.upsertKpiFact(input);
        return reply.send(fact);
    });
}
//# sourceMappingURL=kpis.js.map