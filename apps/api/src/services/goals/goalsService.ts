import { sql } from 'kysely';
import type { CreateGoalRuleSetInput, HierarchyLevel } from '@portal/shared';
import { db } from '../../db/index.js';
import { ConflictError, NotFoundError } from '../../utils/httpErrors.js';

interface ScopeColumns {
  company_id: string | null;
  zone_id: string | null;
  station_id: string | null;
}

function scopeColumns(level: HierarchyLevel, scopeId: string): ScopeColumns {
  return {
    company_id: level === 'company' ? scopeId : null,
    zone_id: level === 'zone' ? scopeId : null,
    station_id: level === 'station' ? scopeId : null,
  };
}

function pgErrorCode(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/**
 * Creates a new versioned rule set for a scope. Overlapping validity ranges for the
 * same scope are rejected by the DB's EXCLUDE constraint; use endGoalRuleSetValidity
 * first to close the previous version before starting a new one.
 */
export async function createGoalRuleSet(input: CreateGoalRuleSetInput, userId: string) {
  const { mode, scopeLevel, scopeId, validFrom, validTo, rules, closePrevious } = input;
  const scope = scopeColumns(scopeLevel, scopeId);
  const validDuring = validTo ? `[${validFrom},${validTo})` : `[${validFrom},)`;
  const poolAmount =
    mode === 'fixed_per_kpi'
      ? rules.reduce((sum, rule) => sum + (rule.payoutAmount ?? 0), 0)
      : input.poolAmount;

  try {
    return await db.transaction().execute(async (trx) => {
      let closedRuleSet: Awaited<ReturnType<typeof endGoalRuleSetValidity>> | null = null;
      if (closePrevious) {
        let previous = trx
          .selectFrom('goal_rule_sets')
          .selectAll()
          .where('scope_level', '=', scopeLevel)
          .where(sql<boolean>`valid_during @> ${validFrom}::date`)
          .where(sql<boolean>`lower(valid_during) < ${validFrom}::date`);
        if (scopeLevel === 'company') previous = previous.where('company_id', '=', scopeId);
        else if (scopeLevel === 'zone') previous = previous.where('zone_id', '=', scopeId);
        else previous = previous.where('station_id', '=', scopeId);
        const found = await previous.executeTakeFirst();
        if (found) {
          closedRuleSet = await trx
            .updateTable('goal_rule_sets')
            .set({ valid_during: sql`daterange(lower(valid_during), ${validFrom}::date)` })
            .where('id', '=', found.id)
            .returningAll()
            .executeTakeFirstOrThrow();
        }
      }

      const ruleSet = await trx
        .insertInto('goal_rule_sets')
        .values({
          scope_level: scopeLevel,
          company_id: scope.company_id,
          zone_id: scope.zone_id,
          station_id: scope.station_id,
          valid_during: validDuring,
          mode,
          pool_amount: poolAmount,
          created_by: userId,
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      await trx
        .insertInto('goal_rules')
        .values(
          rules.map((rule) => ({
            rule_set_id: ruleSet.id,
            kpi_category_id: rule.kpiCategoryId,
            weight: rule.weight,
            goal_type: rule.goalType,
            target_value: rule.goalType === 'pass_fail' ? (rule.thresholdValue ?? 0) : rule.targetValue,
            min_amount: rule.minAmount,
            min_threshold_pct: rule.minThresholdPct,
            max_payout_pct: rule.maxPayoutPct,
            comparator: rule.comparator,
            threshold_value: rule.thresholdValue,
            payout_amount: rule.payoutAmount,
          })),
        )
        .execute();

      return { ruleSet, closedRuleSet };
    });
  } catch (error) {
    const code = pgErrorCode(error);
    if (code === '23P01') {
      throw new ConflictError(
        'El rango de vigencia se traslapa con una version existente para este alcance',
      );
    }
    if (code === 'P0001') {
      throw new ConflictError('Los pesos de los rubros deben sumar 100%');
    }
    throw error;
  }
}

/** Closes an open-ended (or future) rule set's validity so a new version can start. */
export async function endGoalRuleSetValidity(ruleSetId: string, validTo: string) {
  const updated = await db
    .updateTable('goal_rule_sets')
    .set({ valid_during: sql`daterange(lower(valid_during), ${validTo}::date)` })
    .where('id', '=', ruleSetId)
    .returningAll()
    .executeTakeFirst();
  if (!updated) throw new NotFoundError('No se encontró la versión de reglas');
  return updated;
}

export function listGoalRuleSets(scopeLevel?: HierarchyLevel) {
  let query = db.selectFrom('goal_rule_sets').selectAll().orderBy('valid_during', 'desc');
  if (scopeLevel) query = query.where('scope_level', '=', scopeLevel);
  return query.execute();
}

export async function getGoalRuleSetWithRules(ruleSetId: string) {
  const ruleSet = await db
    .selectFrom('goal_rule_sets')
    .selectAll()
    .where('id', '=', ruleSetId)
    .executeTakeFirst();
  if (!ruleSet) throw new NotFoundError('No se encontró la versión de reglas');

  const rules = await db
    .selectFrom('goal_rules as gr')
    .innerJoin('kpi_categories as kc', 'kc.id', 'gr.kpi_category_id')
    .select([
      'gr.id',
      'gr.kpi_category_id',
      'kc.code as kpi_code',
      'kc.name as kpi_name',
      'gr.weight',
      'gr.goal_type',
      'gr.target_value',
      'gr.min_amount',
      'gr.min_threshold_pct',
      'gr.max_payout_pct',
      'gr.comparator',
      'gr.threshold_value',
      'gr.payout_amount',
    ])
    .where('gr.rule_set_id', '=', ruleSetId)
    .execute();

  return { ruleSet, rules };
}

export interface ResolvedGoalRule {
  id: string;
  kpi_category_id: string;
  kpi_code: string;
  kpi_name: string;
  weight: string | null;
  goal_type: 'fixed_amount' | 'percentage' | 'pass_fail';
  target_value: string;
  min_amount: string | null;
  min_threshold_pct: string | null;
  max_payout_pct: string;
  comparator: 'gte' | 'lte' | null;
  threshold_value: string | null;
  payout_amount: string | null;
  higher_is_better: boolean;
}

/**
 * Finds the applicable rule set for a station and period, preferring the most
 * specific scope: station over zone over company. Only one set can be valid for a
 * given scope+date thanks to the EXCLUDE constraint, so precedence only matters
 * when multiple scope levels have a set valid at the same time.
 */
export async function resolveGoalRuleSetForStation(stationId: string, period: string) {
  const station = await db
    .selectFrom('stations as s')
    .innerJoin('zones as z', 'z.id', 's.zone_id')
    .select(['s.id as station_id', 's.zone_id', 'z.company_id'])
    .where('s.id', '=', stationId)
    .executeTakeFirst();

  if (!station) throw new NotFoundError('No se encontró la estación');

  const ruleSet = await db
    .selectFrom('goal_rule_sets')
    .selectAll()
    .where((eb) =>
      eb.or([
        eb('station_id', '=', station.station_id),
        eb('zone_id', '=', station.zone_id),
        eb('company_id', '=', station.company_id),
      ]),
    )
    .where(sql<boolean>`valid_during @> ${period}::date`)
    .orderBy(sql`CASE scope_level WHEN 'station' THEN 0 WHEN 'zone' THEN 1 ELSE 2 END`)
    .limit(1)
    .executeTakeFirst();

  if (!ruleSet) {
    throw new NotFoundError('No hay reglas de bono configuradas para esta estacion y periodo');
  }

  const rules = await db
    .selectFrom('goal_rules as gr')
    .innerJoin('kpi_categories as kc', 'kc.id', 'gr.kpi_category_id')
    .select([
      'gr.id',
      'gr.kpi_category_id',
      'kc.code as kpi_code',
      'kc.name as kpi_name',
      'gr.weight',
      'gr.goal_type',
      'gr.target_value',
      'gr.min_amount',
      'gr.min_threshold_pct',
      'gr.max_payout_pct',
      'gr.comparator',
      'gr.threshold_value',
      'gr.payout_amount',
      'kc.higher_is_better',
    ])
    .where('gr.rule_set_id', '=', ruleSet.id)
    .execute();

  return { ruleSet, rules: rules as ResolvedGoalRule[] };
}
