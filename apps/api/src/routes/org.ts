import type { FastifyInstance } from 'fastify';
import {
  createCompanySchema,
  createStationSchema,
  createZoneSchema,
  managerListQuerySchema,
  stationListQuerySchema,
  updateCompanySchema,
  updateStationSchema,
  updateZoneSchema,
} from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { scopeGuard } from '../middlewares/scopeGuard.js';
import { recordAuditLog } from '../services/audit/auditService.js';
import * as orgService from '../services/org/orgService.js';
import { listManagersForUser } from '../services/scope/managers.js';

export async function orgRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/companies', async (request) => orgService.listCompaniesForUser(request.authUser!));

  app.post('/admin/companies', { preHandler: authorize('organizacion.gestionar') }, async (request, reply) => {
    const input = createCompanySchema.parse(request.body);
    const company = await orgService.createCompany(input);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'create',
      entity: 'company',
      entityId: company.id,
      after: company,
      ip: request.ip,
    });
    return reply.status(201).send(company);
  });

  app.patch(
    '/admin/companies/:companyId',
    { preHandler: authorize('organizacion.gestionar') },
    async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const input = updateCompanySchema.parse(request.body);
      const { before, company } = await orgService.updateCompany(companyId, input);
      await recordAuditLog({
        actorId: request.authUser!.id,
        action: 'update',
        entity: 'company',
        entityId: company.id,
        before,
        after: company,
        ip: request.ip,
      });
      return reply.send(company);
    },
  );

  app.patch(
    '/admin/companies/:companyId/active',
    { preHandler: authorize('organizacion.gestionar') },
    async (request, reply) => {
      const { companyId } = request.params as { companyId: string };
      const { active } = request.body as { active: boolean };
      const company = await orgService.setCompanyActive(companyId, active);
      await recordAuditLog({
        actorId: request.authUser!.id,
        action: 'update',
        entity: 'company',
        entityId: company.id,
        after: company,
        ip: request.ip,
      });
      return reply.send(company);
    },
  );

  app.get('/zones', async (request) => {
    const { companyId } = request.query as { companyId?: string };
    return orgService.listZonesForUser(request.authUser!, companyId);
  });

  app.post('/admin/zones', { preHandler: authorize('organizacion.gestionar') }, async (request, reply) => {
    const input = createZoneSchema.parse(request.body);
    const zone = await orgService.createZone(input);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'create',
      entity: 'zone',
      entityId: zone.id,
      after: zone,
      ip: request.ip,
    });
    return reply.status(201).send(zone);
  });

  app.patch(
    '/admin/zones/:zoneId',
    { preHandler: authorize('organizacion.gestionar') },
    async (request, reply) => {
      const { zoneId } = request.params as { zoneId: string };
      const input = updateZoneSchema.parse(request.body);
      const { before, zone } = await orgService.updateZone(zoneId, input);
      await recordAuditLog({
        actorId: request.authUser!.id,
        action: 'update',
        entity: 'zone',
        entityId: zone.id,
        before,
        after: zone,
        ip: request.ip,
      });
      return reply.send(zone);
    },
  );

  app.patch(
    '/admin/zones/:zoneId/active',
    { preHandler: authorize('organizacion.gestionar') },
    async (request, reply) => {
      const { zoneId } = request.params as { zoneId: string };
      const { active } = request.body as { active: boolean };
      const zone = await orgService.setZoneActive(zoneId, active);
      await recordAuditLog({
        actorId: request.authUser!.id,
        action: 'update',
        entity: 'zone',
        entityId: zone.id,
        after: zone,
        ip: request.ip,
      });
      return reply.send(zone);
    },
  );

  app.get('/managers', async (request) => {
    const query = managerListQuerySchema.parse(request.query);
    return listManagersForUser(request.authUser!, {
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    });
  });

  app.get('/stations', async (request) => {
    const query = stationListQuerySchema.parse(request.query);
    return orgService.listStationsForUser(request.authUser!, {
      ...(query.zoneId ? { zoneId: query.zoneId } : {}),
      ...(query.managerId ? { managerId: query.managerId } : {}),
    });
  });

  app.get(
    '/stations/:stationId',
    { preHandler: scopeGuard({ level: 'station', paramName: 'stationId' }) },
    async (request) => {
      const { stationId } = request.params as { stationId: string };
      return orgService.getStation(stationId);
    },
  );

  app.post('/admin/stations', { preHandler: authorize('organizacion.gestionar') }, async (request, reply) => {
    const input = createStationSchema.parse(request.body);
    const station = await orgService.createStation(input);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'create',
      entity: 'station',
      entityId: station.id,
      after: station,
      ip: request.ip,
    });
    return reply.status(201).send(station);
  });

  app.patch(
    '/admin/stations/:stationId',
    { preHandler: authorize('organizacion.gestionar') },
    async (request, reply) => {
      const { stationId } = request.params as { stationId: string };
      const input = updateStationSchema.parse(request.body);
      const { before, station } = await orgService.updateStation(stationId, input);
      await recordAuditLog({
        actorId: request.authUser!.id,
        action: 'update',
        entity: 'station',
        entityId: station.id,
        before,
        after: station,
        ip: request.ip,
      });
      return reply.send(station);
    },
  );

  app.patch(
    '/admin/stations/:stationId/active',
    { preHandler: authorize('organizacion.gestionar') },
    async (request, reply) => {
      const { stationId } = request.params as { stationId: string };
      const { active } = request.body as { active: boolean };
      const station = await orgService.setStationActive(stationId, active);
      await recordAuditLog({
        actorId: request.authUser!.id,
        action: 'update',
        entity: 'station',
        entityId: station.id,
        after: station,
        ip: request.ip,
      });
      return reply.send(station);
    },
  );
}
