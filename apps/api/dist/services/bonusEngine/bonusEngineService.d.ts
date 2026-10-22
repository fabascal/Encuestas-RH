import { type GoalRuleInput } from '@portal/shared';
export declare function calculateStationBonusForPeriod(stationId: string, period: string): Promise<{
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
    rules: GoalRuleInput[];
    result: import("@portal/shared").BonusCalculationResult;
}>;
/**
 * Persists the bonus for a station/period, snapshotting the exact rule applied to
 * each kpi so later rule changes never alter historical results. Upserts on
 * (station_id, period), so a station can be recalculated freely before the period
 * as a whole is closed.
 */
export declare function closeStationBonusForPeriod(stationId: string, period: string, userId: string): Promise<{
    calculation: {
        id: string;
        station_id: string;
        pool_amount: string;
        rule_set_id: string;
        period: string;
        total_payout: string;
        calculated_at: {
            readonly __select__: Date;
            readonly __insert__: string | Date;
            readonly __update__: string | Date;
        };
        calculated_by: string | null;
    };
    lines: import("@portal/shared").BonusLineResult[];
}>;
export interface ClosePeriodOutcome {
    stationId: string;
    success: boolean;
    totalPayout?: string;
    error?: string;
}
/** Calculates and freezes the bonus for every active station, then marks the period closed. */
export declare function closePeriod(period: string, userId: string): Promise<ClosePeriodOutcome[]>;
//# sourceMappingURL=bonusEngineService.d.ts.map