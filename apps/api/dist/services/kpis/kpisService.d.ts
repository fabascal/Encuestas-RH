import type { KpiCategoryInput, KpiFactInput } from '@portal/shared';
export declare function listKpiCategories(): Promise<{
    code: string;
    id: string;
    active: boolean;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    updated_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    name: string;
    unit: "currency" | "percentage" | "score" | "count";
    higher_is_better: boolean;
    source_provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa" | null;
}[]>;
export declare function createKpiCategory(input: KpiCategoryInput): Promise<{
    code: string;
    id: string;
    active: boolean;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    updated_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    name: string;
    unit: "currency" | "percentage" | "score" | "count";
    higher_is_better: boolean;
    source_provider: "google_forms" | "nexus_fuel" | "nomina3" | "sispa" | null;
}>;
/** Idempotent ingestion point used both by integration jobs and manual entry. */
export declare function upsertKpiFact(input: KpiFactInput, syncRunId?: string): Promise<{
    value: string;
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    updated_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    station_id: string;
    kpi_category_id: string;
    period: string;
    source: string;
    sync_run_id: string | null;
    raw: unknown;
}>;
export declare function listKpiFacts(stationId: string, period: string): Promise<{
    value: string;
    id: string;
    period: string;
    source: string;
    unit: "currency" | "percentage" | "score" | "count";
    kpi_code: string;
    kpi_name: string;
}[]>;
/** Ensures the periods row exists (open by default) so kpi_facts.period FK is satisfied. */
export declare function ensurePeriod(period: string): Promise<import("kysely").InsertResult[]>;
//# sourceMappingURL=kpisService.d.ts.map