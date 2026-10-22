import { db } from '../../db/index.js';
export function listKpiCategories() {
    return db
        .selectFrom('kpi_categories')
        .selectAll()
        .where('active', '=', true)
        .orderBy('name')
        .execute();
}
export function createKpiCategory(input) {
    return db
        .insertInto('kpi_categories')
        .values({
        code: input.code,
        name: input.name,
        unit: input.unit,
        higher_is_better: input.higherIsBetter,
        source_provider: input.sourceProvider,
    })
        .returningAll()
        .executeTakeFirstOrThrow();
}
/** Idempotent ingestion point used both by integration jobs and manual entry. */
export function upsertKpiFact(input, syncRunId) {
    return db
        .insertInto('kpi_facts')
        .values({
        station_id: input.stationId,
        kpi_category_id: input.kpiCategoryId,
        period: input.period,
        value: input.value,
        source: input.source,
        sync_run_id: syncRunId ?? null,
    })
        .onConflict((oc) => oc.columns(['station_id', 'kpi_category_id', 'period']).doUpdateSet({
        value: input.value,
        source: input.source,
        sync_run_id: syncRunId ?? null,
        updated_at: new Date(),
    }))
        .returningAll()
        .executeTakeFirstOrThrow();
}
export function listKpiFacts(stationId, period) {
    return db
        .selectFrom('kpi_facts as f')
        .innerJoin('kpi_categories as c', 'c.id', 'f.kpi_category_id')
        .select(['f.id', 'c.code as kpi_code', 'c.name as kpi_name', 'c.unit', 'f.value', 'f.period', 'f.source'])
        .where('f.station_id', '=', stationId)
        .where('f.period', '=', period)
        .execute();
}
/** Ensures the periods row exists (open by default) so kpi_facts.period FK is satisfied. */
export function ensurePeriod(period) {
    return db
        .insertInto('periods')
        .values({ period })
        .onConflict((oc) => oc.column('period').doNothing())
        .execute();
}
//# sourceMappingURL=kpisService.js.map