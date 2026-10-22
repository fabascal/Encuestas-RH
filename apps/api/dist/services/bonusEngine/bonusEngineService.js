import { calculateStationBonus } from '@portal/shared';
import { db } from '../../db/index.js';
import { resolveGoalRuleSetForStation } from '../goals/goalsService.js';
function toNumber(value) {
    return typeof value === 'number' ? value : Number(value);
}
export async function calculateStationBonusForPeriod(stationId, period) {
    const { ruleSet, rules } = await resolveGoalRuleSetForStation(stationId, period);
    const facts = await db
        .selectFrom('kpi_facts')
        .select(['kpi_category_id', 'value'])
        .where('station_id', '=', stationId)
        .where('period', '=', period)
        .execute();
    const goalRules = rules.map((rule) => ({
        kpiCategoryId: rule.kpi_category_id,
        kpiCode: rule.kpi_code,
        weight: toNumber(rule.weight),
        goalType: rule.goal_type,
        targetValue: toNumber(rule.target_value),
        minAmount: rule.min_amount !== null ? toNumber(rule.min_amount) : null,
        minThresholdPct: rule.min_threshold_pct !== null ? toNumber(rule.min_threshold_pct) : null,
        maxPayoutPct: toNumber(rule.max_payout_pct),
        higherIsBetter: rule.higher_is_better,
    }));
    const actuals = facts.map((fact) => ({
        kpiCategoryId: fact.kpi_category_id,
        actualValue: toNumber(fact.value),
    }));
    const result = calculateStationBonus(toNumber(ruleSet.pool_amount), goalRules, actuals);
    return { ruleSet, rules: goalRules, result };
}
/**
 * Persists the bonus for a station/period, snapshotting the exact rule applied to
 * each kpi so later rule changes never alter historical results. Upserts on
 * (station_id, period), so a station can be recalculated freely before the period
 * as a whole is closed.
 */
export async function closeStationBonusForPeriod(stationId, period, userId) {
    const { ruleSet, rules, result } = await calculateStationBonusForPeriod(stationId, period);
    const rulesByKpi = new Map(rules.map((rule) => [rule.kpiCategoryId, rule]));
    return db.transaction().execute(async (trx) => {
        const calculation = await trx
            .insertInto('bonus_calculations')
            .values({
            station_id: stationId,
            period,
            rule_set_id: ruleSet.id,
            pool_amount: result.poolAmount,
            total_payout: result.totalPayout,
            calculated_by: userId,
        })
            .onConflict((oc) => oc.columns(['station_id', 'period']).doUpdateSet({
            rule_set_id: ruleSet.id,
            pool_amount: result.poolAmount,
            total_payout: result.totalPayout,
            calculated_by: userId,
            calculated_at: new Date(),
        }))
            .returningAll()
            .executeTakeFirstOrThrow();
        await trx
            .deleteFrom('bonus_calculation_items')
            .where('bonus_calculation_id', '=', calculation.id)
            .execute();
        if (result.lines.length > 0) {
            await trx
                .insertInto('bonus_calculation_items')
                .values(result.lines.map((line) => ({
                bonus_calculation_id: calculation.id,
                kpi_category_id: line.kpiCategoryId,
                weight: line.weight,
                actual_value: line.actualValue,
                target_value: line.targetValue,
                progress_pct: line.progressPct,
                payout: line.payout,
                rule_snapshot: JSON.stringify(rulesByKpi.get(line.kpiCategoryId) ?? null),
            })))
                .execute();
        }
        return { calculation, lines: result.lines };
    });
}
/** Calculates and freezes the bonus for every active station, then marks the period closed. */
export async function closePeriod(period, userId) {
    const stations = await db.selectFrom('stations').select('id').where('active', '=', true).execute();
    const results = [];
    for (const station of stations) {
        try {
            const outcome = await closeStationBonusForPeriod(station.id, period, userId);
            results.push({ stationId: station.id, success: true, totalPayout: outcome.calculation.total_payout });
        }
        catch (error) {
            results.push({
                stationId: station.id,
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido',
            });
        }
    }
    await db
        .insertInto('periods')
        .values({ period, status: 'closed', closed_at: new Date(), closed_by: userId })
        .onConflict((oc) => oc.column('period').doUpdateSet({ status: 'closed', closed_at: new Date(), closed_by: userId }))
        .execute();
    return results;
}
//# sourceMappingURL=bonusEngineService.js.map