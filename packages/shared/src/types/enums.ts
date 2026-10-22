/** Mirrors the PostgreSQL enum types created in db/migrations. Keep in sync. */

export const PERMISSIONS = [
  'panel.ver',
  'direccion.ver',
  'reportes.ver',
  'reportes.exportar',
  'organizacion.gestionar',
  'usuarios.gestionar',
  'roles.gestionar',
  'reglas.gestionar',
  'captura.gestionar',
  'integraciones.gestionar',
  'origen.ver',
  'origen.gestionar',
  'periodos.cerrar',
  'alcance.total',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Role code for a user who manages one or more stations through user_scopes. */
export const STATION_MANAGER_ROLE = 'station_manager';

export const GOAL_TYPES = ['fixed_amount', 'percentage', 'pass_fail'] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const RULE_SET_MODES = ['pool_weighted', 'fixed_per_kpi'] as const;
export type RuleSetMode = (typeof RULE_SET_MODES)[number];

export const RULE_COMPARATORS = ['gte', 'lte'] as const;
export type RuleComparator = (typeof RULE_COMPARATORS)[number];

export const INTEGRATION_PROVIDERS = ['google_forms', 'nexus_fuel', 'nomina3', 'sispa'] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const SYNC_STATUSES = ['queued', 'running', 'success', 'failed', 'retrying'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const PERIOD_STATUSES = ['open', 'closed'] as const;
export type PeriodStatus = (typeof PERIOD_STATUSES)[number];

export const HIERARCHY_LEVELS = ['company', 'zone', 'station'] as const;
export type HierarchyLevel = (typeof HIERARCHY_LEVELS)[number];

export const KPI_UNITS = ['currency', 'percentage', 'score', 'count'] as const;
export type KpiUnit = (typeof KPI_UNITS)[number];
