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
];
/** Role code for a user who manages one or more stations through user_scopes. */
export const STATION_MANAGER_ROLE = 'station_manager';
export const GOAL_TYPES = ['fixed_amount', 'percentage', 'pass_fail'];
export const RULE_SET_MODES = ['pool_weighted', 'fixed_per_kpi'];
export const RULE_COMPARATORS = ['gte', 'lte'];
export const INTEGRATION_PROVIDERS = ['google_forms', 'nexus_fuel', 'nomina3', 'sispa'];
export const SYNC_STATUSES = ['queued', 'running', 'success', 'failed', 'retrying'];
export const PERIOD_STATUSES = ['open', 'closed'];
export const HIERARCHY_LEVELS = ['company', 'zone', 'station'];
export const KPI_UNITS = ['currency', 'percentage', 'score', 'count'];
//# sourceMappingURL=enums.js.map