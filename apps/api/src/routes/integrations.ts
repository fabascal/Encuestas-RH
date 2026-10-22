import type { FastifyInstance } from 'fastify';
import {
  INTEGRATION_PROVIDERS,
  createIntegrationCredentialSchema,
  previewRequestSchema,
  stationRefSchema,
  syncNowSchema,
  type IntegrationProvider,
} from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { recordAuditLog } from '../services/audit/auditService.js';
import { enqueueCredentialSync } from '../jobs/queue.js';
import * as credentialsService from '../services/integrations/credentialsService.js';
import * as stationRefs from '../services/integrations/stationRefs.js';
import { daysBetween } from '../services/integrations/nexusReport.js';
import * as syncCalendar from '../services/integrations/syncCalendar.js';
import * as syncRunService from '../services/integrations/syncRunService.js';

export async function integrationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);
  app.addHook('preHandler', authorize('integraciones.gestionar'));

  app.get('/admin/integrations/credentials', async () => credentialsService.listCredentials());

  app.get('/admin/integrations/credentials/:id', async (request) => {
    const { id } = request.params as { id: string };
    return credentialsService.getCredential(id);
  });

  app.post('/admin/integrations/credentials', async (request, reply) => {
    const input = createIntegrationCredentialSchema.parse(request.body);
    const credential = await credentialsService.createCredential(input, request.authUser!.id);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'create',
      entity: 'integration_credential',
      entityId: credential.id,
      after: credential,
      ip: request.ip,
    });
    return reply.status(201).send(credential);
  });

  app.patch('/admin/integrations/credentials/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createIntegrationCredentialSchema.partial().parse(request.body);
    const credential = await credentialsService.updateCredential(id, input);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'update',
      entity: 'integration_credential',
      entityId: id,
      after: credential,
      ip: request.ip,
    });
    return reply.send(credential);
  });

  app.post('/admin/integrations/credentials/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await credentialsService.testConnection(id);
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'test_connection',
      entity: 'integration_credential',
      entityId: id,
      after: result,
      ip: request.ip,
    });
    return reply.send(result);
  });

  app.post('/admin/integrations/credentials/:id/preview', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = previewRequestSchema.parse(request.body ?? {});
    const records = await credentialsService.previewCredential(id, input);
    return reply.send({ records });
  });

  app.get('/admin/integrations/credentials/:id/calendar', async (request) => {
    const { id } = request.params as { id: string };
    const { month } = request.query as { month?: string };
    if (!month || !/^\d{4}-\d{2}-01$/.test(month)) {
      return { days: [] };
    }
    await credentialsService.getCredential(id);
    return { days: await syncCalendar.listCalendarDays(id, month) };
  });

  app.get('/admin/integrations/credentials/:id/days/:day', async (request) => {
    const { id, day } = request.params as { id: string; day: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      return { day, summary: null, runs: [] };
    }
    await credentialsService.getCredential(id);
    return syncCalendar.getSyncDay(id, day);
  });

  app.post('/admin/integrations/credentials/:id/sync', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = syncNowSchema.parse(request.body ?? {});
    await credentialsService.getCredential(id);
    const days = input.from && input.to ? daysBetween(input.from, input.to) : undefined;
    const jobId = await enqueueCredentialSync(id, {
      ...(input.period ? { period: input.period } : {}),
      ...(days ? { days } : {}),
    });
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'sync',
      entity: 'integration_credential',
      entityId: id,
      after: { jobId, period: input.period ?? null, from: input.from ?? null, to: input.to ?? null },
      ip: request.ip,
    });
    return reply.status(202).send({ jobId });
  });

  app.get('/admin/integrations/:provider/station-refs', async (request) => {
    const { provider } = request.params as { provider: string };
    if (!(INTEGRATION_PROVIDERS as readonly string[]).includes(provider)) {
      return [];
    }
    return stationRefs.listStationRefs(provider as IntegrationProvider);
  });

  app.post('/admin/integrations/:provider/station-refs', async (request, reply) => {
    const { provider } = request.params as { provider: string };
    if (!(INTEGRATION_PROVIDERS as readonly string[]).includes(provider)) {
      return reply.status(404).send({ message: 'Proveedor no reconocido' });
    }
    const input = stationRefSchema.parse(request.body);
    const ref = await stationRefs.createStationRef(provider as IntegrationProvider, input);
    return reply.status(201).send(ref);
  });

  app.delete('/admin/integrations/station-refs/:refId', async (request, reply) => {
    const { refId } = request.params as { refId: string };
    await stationRefs.deleteStationRef(refId);
    return reply.status(204).send();
  });

  app.get('/admin/integrations/sync-runs', async (request) => {
    const query = request.query as {
      credentialId?: string;
      provider?: string;
      limit?: string;
      before?: string;
    };
    const provider =
      query.provider && (INTEGRATION_PROVIDERS as readonly string[]).includes(query.provider)
        ? (query.provider as IntegrationProvider)
        : undefined;
    return syncRunService.listSyncRuns({
      credentialId: query.credentialId,
      provider,
      limit: query.limit ? Number(query.limit) : undefined,
      before: query.before,
    });
  });

  app.get('/admin/integrations/sync-runs/:id/logs', async (request) => {
    const { id } = request.params as { id: string };
    return syncRunService.listSyncRunLogs(id);
  });
}
