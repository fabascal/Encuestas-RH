import type { CreateGoalRuleSetInput, HierarchyLevel } from '@portal/shared';
/**
 * Creates a new versioned rule set for a scope. Overlapping validity ranges for the
 * same scope are rejected by the DB's EXCLUDE constraint; use endGoalRuleSetValidity
 * first to close the previous version before starting a new one.
 */
export declare function createGoalRuleSet(input: CreateGoalRuleSetInput, userId: string): Promise<{
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    scope_level: "company" | "zone" | "station";
    company_id: string | null;
    zone_id: string | null;
    station_id: string | null;
    valid_during: string;
    pool_amount: string;
    created_by: string | null;
}>;
/** Closes an open-ended (or future) rule set's validity so a new version can start. */
export declare function endGoalRuleSetValidity(ruleSetId: string, validTo: string): Promise<{
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    scope_level: "company" | "zone" | "station";
    company_id: string | null;
    zone_id: string | null;
    station_id: string | null;
    valid_during: string;
    pool_amount: string;
    created_by: string | null;
}>;
export declare function listGoalRuleSets(scopeLevel?: HierarchyLevel): Promise<{
    id: string;
    created_at: {
        readonly __select__: Date;
        readonly __insert__: string | Date;
        readonly __update__: string | Date;
    };
    scope_level: "company" | "zone" | "station";
    company_id: string | null;
    zone_id: string | null;
    station_id: string | null;
    valid_during: string;
    pool_amount: string;
    created_by: string | null;
}[]>;
export declare function getGoalRuleSetWithRules(ruleSetId: string): Promise<{
    ruleSet: {
        id: string;
        created_at: {
            readonly __select__: Date;
            readonly __insert__: string | Date;
            readonly __update__: string | Date;
        };
        scope_level: "company" | "zone" | "station";
        company_id: string | null;
        zone_id: string | null;
        station_id: string | null;
        valid_during: string;
        pool_amount: string;
        created_by: string | null;
    };
    rules: {
        kpi_category_id: string;
        id: string;
        weight: string;
        goal_type: "percentage" | "fixed_amount";
        target_value: string;
        min_amount: string | null;
        min_threshold_pct: string | null;
        max_payout_pct: string;
        kpi_code: string;
        kpi_name: string;
    }[];
}>;
export interface ResolvedGoalRule {
    id: string;
    kpi_category_id: string;
    kpi_code: string;
    weight: string;
    goal_type: 'fixed_amount' | 'percentage';
    target_value: string;
    min_amount: string | null;
    min_threshold_pct: string | null;
    max_payout_pct: string;
    higher_is_better: boolean;
}
/**
 * Finds the applicable rule set for a station and period, preferring the most
 * specific scope: station over zone over company. Only one set can be valid for a
 * given scope+date thanks to the EXCLUDE constraint, so precedence only matters
 * when multiple scope levels have a set valid at the same time.
 */
export declare function resolveGoalRuleSetForStation(stationId: string, period: string): Promise<{
    ruleSet: {
        id: string;
        created_at: {
            readonly __select__: Date;
            readonly __insert__: string | Date;
            readonly __update__: string | Date;
        };
        scope_level: "company" | "zone" | "station";
        company_id: string | null;
        zone_id: string | null;
        station_id: string | null;
        valid_during: string;
        pool_amount: string;
        created_by: string | null;
    };
    rules: ResolvedGoalRule[];
}>;
//# sourceMappingURL=goalsService.d.ts.map