import { createIntegrationCredentialSchema } from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { recordAuditLog } from '../services/audit/auditService.js';
import * as credentialsService from '../services/integrations/credentialsService.js';
import * as syncRunService from '../services/integrations/syncRunService.js';
export async function integrationsRoutes(app) {
    app.addHook('preHandler', authenticate);
    app.addHook('preHandler', authorize('admin'));
    app.get('/admin/integrations/credentials', async () => credentialsService.listCredentials());
    app.get('/admin/integrations/credentials/:id', async (request) => {
        const { id } = request.params;
        return credentialsService.getCredential(id);
    });
    app.post('/admin/integrations/credentials', async (request, reply) => {
        const input = createIntegrationCredentialSchema.parse(request.body);
        const credential = await credentialsService.createCredential(input, request.authUser.id);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'create',
            entity: 'integration_credential',
            entityId: credential.id,
            after: credential,
            ip: request.ip,
        });
        return reply.status(201).send(credential);
    });
    app.patch('/admin/integrations/credentials/:id', async (request, reply) => {
        const { id } = request.params;
        const input = createIntegrationCredentialSchema.partial().parse(request.body);
        const credential = await credentialsService.updateCredential(id, input);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'update',
            entity: 'integration_credential',
            entityId: id,
            after: credential,
            ip: request.ip,
        });
        return reply.send(credential);
    });
    app.post('/admin/integrations/credentials/:id/test', async (request, reply) => {
        const { id } = request.params;
        const result = await credentialsService.testConnection(id);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'test_connection',
            entity: 'integration_credential',
            entityId: id,
            after: result,
            ip: request.ip,
        });
        return reply.send(result);
    });
    app.get('/admin/integrations/sync-runs', async (request) => {
        const { credentialId } = request.query;
        return syncRunService.listSyncRuns(credentialId);
    });
    app.get('/admin/integrations/sync-runs/:id/logs', async (request) => {
        const { id } = request.params;
        return syncRunService.listSyncRunLogs(id);
    });
}
//# sourceMappingURL=integrations.js.map