import { createGoalRuleSetSchema, HIERARCHY_LEVELS } from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { recordAuditLog } from '../services/audit/auditService.js';
import * as goalsService from '../services/goals/goalsService.js';
export async function goalsRoutes(app) {
    app.addHook('preHandler', authenticate);
    app.get('/goal-rule-sets', { preHandler: authorize('admin') }, async (request) => {
        const { scopeLevel } = request.query;
        const level = scopeLevel && HIERARCHY_LEVELS.includes(scopeLevel)
            ? scopeLevel
            : undefined;
        return goalsService.listGoalRuleSets(level);
    });
    app.get('/goal-rule-sets/:ruleSetId', { preHandler: authorize('admin') }, async (request) => {
        const { ruleSetId } = request.params;
        return goalsService.getGoalRuleSetWithRules(ruleSetId);
    });
    app.get('/goal-rule-sets/resolve', async (request) => {
        const { stationId, period } = request.query;
        return goalsService.resolveGoalRuleSetForStation(stationId, period);
    });
    app.post('/admin/goal-rule-sets', { preHandler: authorize('admin') }, async (request, reply) => {
        const input = createGoalRuleSetSchema.parse(request.body);
        const ruleSet = await goalsService.createGoalRuleSet(input, request.authUser.id);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'create',
            entity: 'goal_rule_set',
            entityId: ruleSet.id,
            after: ruleSet,
            ip: request.ip,
        });
        return reply.status(201).send(ruleSet);
    });
    app.patch('/admin/goal-rule-sets/:ruleSetId/end-validity', { preHandler: authorize('admin') }, async (request, reply) => {
        const { ruleSetId } = request.params;
        const { validTo } = request.body;
        const ruleSet = await goalsService.endGoalRuleSetValidity(ruleSetId, validTo);
        await recordAuditLog({
            actorId: request.authUser.id,
            action: 'update',
            entity: 'goal_rule_set',
            entityId: ruleSet.id,
            after: ruleSet,
            ip: request.ip,
        });
        return reply.send(ruleSet);
    });
}
//# sourceMappingURL=goals.js.map