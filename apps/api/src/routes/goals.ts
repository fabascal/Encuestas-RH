import type { FastifyInstance } from 'fastify';
import { createGoalRuleSetSchema, HIERARCHY_LEVELS, type HierarchyLevel } from '@portal/shared';
import { authenticate } from '../middlewares/authenticate.js';
import { authorize } from '../middlewares/authorize.js';
import { recordAuditLog } from '../services/audit/auditService.js';
import * as goalsService from '../services/goals/goalsService.js';

export async function goalsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/goal-rule-sets', { preHandler: authorize('reglas.gestionar') }, async (request) => {
    const { scopeLevel } = request.query as { scopeLevel?: string };
    const level =
      scopeLevel && (HIERARCHY_LEVELS as readonly string[]).includes(scopeLevel)
        ? (scopeLevel as HierarchyLevel)
        : undefined;
    return goalsService.listGoalRuleSets(level);
  });

  app.get('/goal-rule-sets/:ruleSetId', { preHandler: authorize('reglas.gestionar') }, async (request) => {
    const { ruleSetId } = request.params as { ruleSetId: string };
    return goalsService.getGoalRuleSetWithRules(ruleSetId);
  });

  app.get('/goal-rule-sets/resolve', async (request) => {
    const { stationId, period } = request.query as { stationId: string; period: string };
    return goalsService.resolveGoalRuleSetForStation(stationId, period);
  });

  app.post('/admin/goal-rule-sets', { preHandler: authorize('reglas.gestionar') }, async (request, reply) => {
    const input = createGoalRuleSetSchema.parse(request.body);
    const { ruleSet, closedRuleSet } = await goalsService.createGoalRuleSet(input, request.authUser!.id);
    if (closedRuleSet) {
      await recordAuditLog({
        actorId: request.authUser!.id,
        action: 'update',
        entity: 'goal_rule_set',
        entityId: closedRuleSet.id,
        after: closedRuleSet,
        ip: request.ip,
      });
    }
    await recordAuditLog({
      actorId: request.authUser!.id,
      action: 'create',
      entity: 'goal_rule_set',
      entityId: ruleSet.id,
      after: ruleSet,
      ip: request.ip,
    });
    return reply.status(201).send(ruleSet);
  });

  app.patch(
    '/admin/goal-rule-sets/:ruleSetId/end-validity',
    { preHandler: authorize('reglas.gestionar') },
    async (request, reply) => {
      const { ruleSetId } = request.params as { ruleSetId: string };
      const { validTo } = request.body as { validTo: string };
      const ruleSet = await goalsService.endGoalRuleSetValidity(ruleSetId, validTo);
      await recordAuditLog({
        actorId: request.authUser!.id,
        action: 'update',
        entity: 'goal_rule_set',
        entityId: ruleSet.id,
        after: ruleSet,
        ip: request.ip,
      });
      return reply.send(ruleSet);
    },
  );
}
