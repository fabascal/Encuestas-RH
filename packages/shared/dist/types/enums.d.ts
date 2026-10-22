/** Mirrors the PostgreSQL enum types created in db/migrations. Keep in sync. */
export declare const PERMISSIONS: readonly ["panel.ver", "direccion.ver", "reportes.ver", "reportes.exportar", "organizacion.gestionar", "usuarios.gestionar", "roles.gestionar", "reglas.gestionar", "captura.gestionar", "integraciones.gestionar", "origen.ver", "origen.gestionar", "periodos.cerrar", "alcance.total"];
export type Permission = (typeof PERMISSIONS)[number];
/** Role code for a user who manages one or more stations through user_scopes. */
export declare const STATION_MANAGER_ROLE = "station_manager";
export declare const GOAL_TYPES: readonly ["fixed_amount", "percentage", "pass_fail"];
export type GoalType = (typeof GOAL_TYPES)[number];
export declare const RULE_SET_MODES: readonly ["pool_weighted", "fixed_per_kpi"];
export type RuleSetMode = (typeof RULE_SET_MODES)[number];
export declare const RULE_COMPARATORS: readonly ["gte", "lte"];
export type RuleComparator = (typeof RULE_COMPARATORS)[number];
export declare const INTEGRATION_PROVIDERS: readonly ["google_forms", "nexus_fuel", "nomina3", "sispa"];
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];
export declare const SYNC_STATUSES: readonly ["queued", "running", "success", "failed", "retrying"];
export type SyncStatus = (typeof SYNC_STATUSES)[number];
export declare const PERIOD_STATUSES: readonly ["open", "closed"];
export type PeriodStatus = (typeof PERIOD_STATUSES)[number];
export declare const HIERARCHY_LEVELS: readonly ["company", "zone", "station"];
export type HierarchyLevel = (typeof HIERARCHY_LEVELS)[number];
export declare const KPI_UNITS: readonly ["currency", "percentage", "score", "count"];
export type KpiUnit = (typeof KPI_UNITS)[number];
//# sourceMappingURL=enums.d.ts.map