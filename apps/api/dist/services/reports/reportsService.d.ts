import type { BonusLineResult } from '@portal/shared';
import type { AuthUser } from '../../middlewares/authenticate.js';
export interface ReportFilters {
    companyId?: string | undefined;
    zoneId?: string | undefined;
    stationId?: string | undefined;
}
export interface StationReportRow {
    stationId: string;
    stationCode: string;
    stationName: string;
    zoneName: string;
    companyName: string;
    /** False when no goal_rule_set is configured yet for this station/period. */
    configured: boolean;
    poolAmount: number;
    totalPayout: number;
    lines: BonusLineResult[];
}
export interface StationsReport {
    period: string;
    generatedAt: string;
    rows: StationReportRow[];
    totalPool: number;
    totalPayout: number;
}
/** On-screen / exportable report: bono breakdown for every station visible to the user. */
export declare function buildStationsReport(user: AuthUser, filters: ReportFilters, period: string): Promise<StationsReport>;
//# sourceMappingURL=reportsService.d.ts.map