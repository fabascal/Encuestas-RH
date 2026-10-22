import type { ColumnType, Generated } from 'kysely';
import type { GoalType, HierarchyLevel, IntegrationProvider, KpiUnit, PeriodStatus, SyncStatus, UserRole } from '@portal/shared';
/** Accepts Date or ISO string as input, always returns Date when selected. */
type Timestamp = ColumnType<Date, Date | string, Date | string>;
/** Postgres returns numeric columns as strings to avoid float precision loss. */
type Numeric = ColumnType<string, number | string, number | string>;
export interface CompaniesTable {
    id: Generated<string>;
    code: string;
    name: string;
    active: Generated<boolean>;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
}
export interface ZonesTable {
    id: Generated<string>;
    company_id: string;
    code: string;
    name: string;
    active: Generated<boolean>;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
}
export interface StationsTable {
    id: Generated<string>;
    zone_id: string;
    code: string;
    name: string;
    address: string | null;
    active: Generated<boolean>;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
}
export interface StationExternalRefsTable {
    id: Generated<string>;
    station_id: string;
    provider: IntegrationProvider;
    external_id: string;
    created_at: Generated<Timestamp>;
}
export interface UsersTable {
    id: Generated<string>;
    email: string;
    full_name: string;
    password_hash: string;
    role: UserRole;
    token_version: Generated<number>;
    active: Generated<boolean>;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
}
export interface RefreshTokensTable {
    id: Generated<string>;
    user_id: string;
    token_hash: string;
    expires_at: Timestamp;
    revoked_at: Timestamp | null;
    created_at: Generated<Timestamp>;
}
export interface UserScopesTable {
    id: Generated<string>;
    user_id: string;
    company_id: string | null;
    zone_id: string | null;
    station_id: string | null;
    created_at: Generated<Timestamp>;
}
export interface PeriodsTable {
    period: string;
    status: Generated<PeriodStatus>;
    closed_at: Timestamp | null;
    closed_by: string | null;
    created_at: Generated<Timestamp>;
}
export interface KpiCategoriesTable {
    id: Generated<string>;
    code: string;
    name: string;
    unit: KpiUnit;
    higher_is_better: Generated<boolean>;
    source_provider: IntegrationProvider | null;
    active: Generated<boolean>;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
}
export interface GoalRuleSetsTable {
    id: Generated<string>;
    scope_level: HierarchyLevel;
    company_id: string | null;
    zone_id: string | null;
    station_id: string | null;
    /** Postgres daterange literal, e.g. "[2026-01-01,2026-02-01)". */
    valid_during: string;
    pool_amount: Numeric;
    created_by: string | null;
    created_at: Generated<Timestamp>;
}
export interface GoalRulesTable {
    id: Generated<string>;
    rule_set_id: string;
    kpi_category_id: string;
    weight: Numeric;
    goal_type: GoalType;
    target_value: Numeric;
    min_amount: Numeric | null;
    min_threshold_pct: Numeric | null;
    /** Has a DB default of 100, but callers always supply it explicitly via the Zod schema default. */
    max_payout_pct: Numeric;
    created_at: Generated<Timestamp>;
}
export interface KpiFactsTable {
    id: Generated<string>;
    station_id: string;
    kpi_category_id: string;
    period: string;
    value: Numeric;
    source: string;
    sync_run_id: string | null;
    raw: unknown | null;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
}
export interface SurveyResponsesTable {
    id: Generated<string>;
    station_id: string | null;
    period: string | null;
    external_id: string;
    respondent_email: string | null;
    answers: unknown;
    submitted_at: Timestamp;
    sync_run_id: string | null;
    created_at: Generated<Timestamp>;
}
export interface BonusCalculationsTable {
    id: Generated<string>;
    station_id: string;
    period: string;
    rule_set_id: string;
    pool_amount: Numeric;
    total_payout: Numeric;
    calculated_at: Generated<Timestamp>;
    calculated_by: string | null;
}
export interface BonusCalculationItemsTable {
    id: Generated<string>;
    bonus_calculation_id: string;
    kpi_category_id: string;
    weight: Numeric;
    actual_value: Numeric;
    target_value: Numeric;
    progress_pct: Numeric | null;
    payout: Numeric;
    rule_snapshot: unknown;
}
export interface IntegrationCredentialsTable {
    id: Generated<string>;
    provider: IntegrationProvider;
    company_id: string | null;
    secret_ciphertext: string;
    iv: string;
    auth_tag: string;
    key_version: Generated<number>;
    config: unknown;
    cron_expression: string;
    enabled: Generated<boolean>;
    last_tested_at: Timestamp | null;
    last_test_success: boolean | null;
    last_test_message: string | null;
    created_by: string | null;
    created_at: Generated<Timestamp>;
    updated_at: Generated<Timestamp>;
}
export interface SyncRunsTable {
    id: Generated<string>;
    credential_id: string;
    provider: IntegrationProvider;
    status: Generated<SyncStatus>;
    attempt: Generated<number>;
    records_read: Generated<number>;
    records_upserted: Generated<number>;
    error_message: string | null;
    job_id: string | null;
    started_at: Timestamp | null;
    finished_at: Timestamp | null;
    created_at: Generated<Timestamp>;
}
export interface SyncRunLogsTable {
    id: Generated<string>;
    sync_run_id: string;
    level: Generated<string>;
    message: string;
    context: unknown | null;
    logged_at: Generated<Timestamp>;
}
export interface AuditLogTable {
    id: Generated<string>;
    actor_id: string | null;
    action: string;
    entity: string;
    entity_id: string | null;
    before: unknown | null;
    after: unknown | null;
    ip_address: string | null;
    created_at: Generated<Timestamp>;
}
export interface Database {
    companies: CompaniesTable;
    zones: ZonesTable;
    stations: StationsTable;
    station_external_refs: StationExternalRefsTable;
    users: UsersTable;
    refresh_tokens: RefreshTokensTable;
    user_scopes: UserScopesTable;
    periods: PeriodsTable;
    kpi_categories: KpiCategoriesTable;
    goal_rule_sets: GoalRuleSetsTable;
    goal_rules: GoalRulesTable;
    kpi_facts: KpiFactsTable;
    survey_responses: SurveyResponsesTable;
    bonus_calculations: BonusCalculationsTable;
    bonus_calculation_items: BonusCalculationItemsTable;
    integration_credentials: IntegrationCredentialsTable;
    sync_runs: SyncRunsTable;
    sync_run_logs: SyncRunLogsTable;
    audit_log: AuditLogTable;
}
export {};
//# sourceMappingURL=types.d.ts.map