import { createCompanySchema, createStationSchema, createZoneSchema } from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { scopeGuard } from '../middlewares/scopeGuard.js';
import { recordAuditLog } from '../services/audit/auditService.js';
import * as orgService from '../services/org/orgService.js';
export async function orgRoutes(app) {
    app.addHook('preHandler', authenticate);
    app.get('/companies', async (request) => orgService.listCompaniesForUser(request.authUser));
    app.post('/admin/companies', { preHandler: authorize('admin') }, async (request, reply) => {
        const input = createCompanySchema.parse(request.body);
        const company = await orgService.createCompany(input);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'create',
            entity: 'company',
            entityId: company.id,
            after: company,
            ip: request.ip,
        });
        return reply.status(201).send(company);
    });
    app.patch('/admin/companies/:companyId/active', { preHandler: authorize('admin') }, async (request, reply) => {
        const { companyId } = request.params;
        const { active } = request.body;
        const company = await orgService.setCompanyActive(companyId, active);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'update',
            entity: 'company',
            entityId: company.id,
            after: company,
            ip: request.ip,
        });
        return reply.send(company);
    });
    app.get('/zones', async (request) => {
        const { companyId } = request.query;
        return orgService.listZonesForUser(request.authUser, companyId);
    });
    app.post('/admin/zones', { preHandler: authorize('admin') }, async (request, reply) => {
        const input = createZoneSchema.parse(request.body);
        const zone = await orgService.createZone(input);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'create',
            entity: 'zone',
            entityId: zone.id,
            after: zone,
            ip: request.ip,
        });
        return reply.status(201).send(zone);
    });
    app.patch('/admin/zones/:zoneId/active', { preHandler: authorize('admin') }, async (request, reply) => {
        const { zoneId } = request.params;
        const { active } = request.body;
        const zone = await orgService.setZoneActive(zoneId, active);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'update',
            entity: 'zone',
            entityId: zone.id,
            after: zone,
            ip: request.ip,
        });
        return reply.send(zone);
    });
    app.get('/stations', async (request) => {
        const { zoneId } = request.query;
        return orgService.listStationsForUser(request.authUser, zoneId);
    });
    app.get('/stations/:stationId', { preHandler: scopeGuard({ level: 'station', paramName: 'stationId' }) }, async (request) => {
        const { stationId } = request.params;
        return orgService.getStation(stationId);
    });
    app.post('/admin/stations', { preHandler: authorize('admin') }, async (request, reply) => {
        const input = createStationSchema.parse(request.body);
        const station = await orgService.createStation(input);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'create',
            entity: 'station',
            entityId: station.id,
            after: station,
            ip: request.ip,
        });
        return reply.status(201).send(station);
    });
    app.patch('/admin/stations/:stationId/active', { preHandler: authorize('admin') }, async (request, reply) => {
        const { stationId } = request.params;
        const { active } = request.body;
        const station = await orgService.setStationActive(stationId, active);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'update',
            entity: 'station',
            entityId: station.id,
            after: station,
            ip: request.ip,
        });
        return reply.send(station);
    });
}
//# sourceMappingURL=org.js.map