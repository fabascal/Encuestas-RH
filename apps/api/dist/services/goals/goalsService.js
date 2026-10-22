import { sql } from 'kysely';
import { db } from '../../db/index.js';
import { ConflictError, NotFoundError } from '../../utils/httpErrors.js';
function scopeColumns(level, scopeId) {
    return {
        company_id: level === 'company' ? scopeId : null,
        zone_id: level === 'zone' ? scopeId : null,
        station_id: level === 'station' ? scopeId : null,
    };
}
function pgErrorCode(error) {
    return typeof error === 'object' && error !== null && 'code' in error
        ? String(error.code)
        : undefined;
}
/**
 * Creates a new versioned rule set for a scope. Overlapping validity ranges for the
 * same scope are rejected by the DB's EXCLUDE constraint; use endGoalRuleSetValidity
 * first to close the previous version before starting a new one.
 */
export async function createGoalRuleSet(input, userId) {
    const { scopeLevel, scopeId, validFrom, validTo, poolAmount, rules } = input;
    const scope = scopeColumns(scopeLevel, scopeId);
    const validDuring = validTo ? `[${validFrom},${validTo})` : `[${validFrom},)`;
    try {
        return await db.transaction().execute(async (trx) => {
            const ruleSet = await trx
                .insertInto('goal_rule_sets')
                .values({
                scope_level: scopeLevel,
                company_id: scope.company_id,
                zone_id: scope.zone_id,
                station_id: scope.station_id,
                valid_during: validDuring,
                pool_amount: poolAmount,
                created_by: userId,
            })
                .returningAll()
                .executeTakeFirstOrThrow();
            await trx
                .insertInto('goal_rules')
                .values(rules.map((rule) => ({
                rule_set_id: ruleSet.id,
                kpi_category_id: rule.kpiCategoryId,
                weight: rule.weight,
                goal_type: rule.goalType,
                target_value: rule.targetValue,
                min_amount: rule.minAmount,
                min_threshold_pct: rule.minThresholdPct,
                max_payout_pct: rule.maxPayoutPct,
            })))
                .execute();
            return ruleSet;
        });
    }
    catch (error) {
        const code = pgErrorCode(error);
        if (code === '23P01') {
            throw new ConflictError('El rango de vigencia se traslapa con una version existente para este alcance');
        }
        if (code === 'P0001') {
            throw new ConflictError('Los pesos de los rubros deben sumar 100%');
        }
        throw error;
    }
}
/** Closes an open-ended (or future) rule set's validity so a new version can start. */
export async function endGoalRuleSetValidity(ruleSetId, validTo) {
    const updated = await db
        .updateTable('goal_rule_sets')
        .set({ valid_during: sql `daterange(lower(valid_during), ${validTo}::date)` })
        .where('id', '=', ruleSetId)
        .returningAll()
        .executeTakeFirst();
    if (!updated)
        throw new NotFoundError('Rule set not found');
    return updated;
}
export function listGoalRuleSets(scopeLevel) {
    let query = db.selectFrom('goal_rule_sets').selectAll().orderBy('valid_during', 'desc');
    if (scopeLevel)
        query = query.where('scope_level', '=', scopeLevel);
    return query.execute();
}
export async function getGoalRuleSetWithRules(ruleSetId) {
    const ruleSet = await db
        .selectFrom('goal_rule_sets')
        .selectAll()
        .where('id', '=', ruleSetId)
        .executeTakeFirst();
    if (!ruleSet)
        throw new NotFoundError('Rule set not found');
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
    ])
        .where('gr.rule_set_id', '=', ruleSetId)
        .execute();
    return { ruleSet, rules };
}
/**
 * Finds the applicable rule set for a station and period, preferring the most
 * specific scope: station over zone over company. Only one set can be valid for a
 * given scope+date thanks to the EXCLUDE constraint, so precedence only matters
 * when multiple scope levels have a set valid at the same time.
 */
export async function resolveGoalRuleSetForStation(stationId, period) {
    const station = await db
        .selectFrom('stations as s')
        .innerJoin('zones as z', 'z.id', 's.zone_id')
        .select(['s.id as station_id', 's.zone_id', 'z.company_id'])
        .where('s.id', '=', stationId)
        .executeTakeFirst();
    if (!station)
        throw new NotFoundError('Station not found');
    const ruleSet = await db
        .selectFrom('goal_rule_sets')
        .selectAll()
        .where((eb) => eb.or([
        eb('station_id', '=', station.station_id),
        eb('zone_id', '=', station.zone_id),
        eb('company_id', '=', station.company_id),
    ]))
        .where(sql `valid_during @> ${period}::date`)
        .orderBy(sql `CASE scope_level WHEN 'station' THEN 0 WHEN 'zone' THEN 1 ELSE 2 END`)
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
        'gr.weight',
        'gr.goal_type',
        'gr.target_value',
        'gr.min_amount',
        'gr.min_threshold_pct',
        'gr.max_payout_pct',
        'kc.higher_is_better',
    ])
        .where('gr.rule_set_id', '=', ruleSet.id)
        .execute();
    return { ruleSet, rules: rules };
}
//# sourceMappingURL=goalsService.js.map