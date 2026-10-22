import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { scopeGuard } from '../middlewares/scopeGuard.js';
import { recordAuditLog } from '../services/audit/auditService.js';
import * as bonusEngineService from '../services/bonusEngine/bonusEngineService.js';
export async function bonusRoutes(app) {
    app.addHook('preHandler', authenticate);
    app.get('/stations/:stationId/bonus', { preHandler: scopeGuard({ level: 'station', paramName: 'stationId' }) }, async (request) => {
        const { stationId } = request.params;
        const { period } = request.query;
        return bonusEngineService.calculateStationBonusForPeriod(stationId, period);
    });
    app.post('/admin/stations/:stationId/bonus/close', { preHandler: authorize('admin') }, async (request, reply) => {
        const { stationId } = request.params;
        const { period } = request.body;
        const outcome = await bonusEngineService.closeStationBonusForPeriod(stationId, period, request.authUser.id);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'close',
            entity: 'bonus_calculation',
            entityId: outcome.calculation.id,
            after: outcome.calculation,
            ip: request.ip,
        });
        return reply.send(outcome);
    });
    app.post('/admin/periods/:period/close', { preHandler: authorize('admin') }, async (request, reply) => {
        const { period } = request.params;
        const results = await bonusEngineService.closePeriod(period, request.authUser.id);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'close_period',
            entity: 'period',
            entityId: period,
            after: { results },
            ip: request.ip,
        });
        return reply.send(results);
    });
}
//# sourceMappingURL=bonus.js.map