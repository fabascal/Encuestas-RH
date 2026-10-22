/** Spanish names for values that are stored as codes. Used everywhere a person can see them. */
const KPI_LABELS = {
    oil_sales: 'Venta de aceite',
    punctuality: 'Puntualidad',
    staff_turnover: 'Rotación por renuncia',
    sispa_compliance: 'Cumplimiento SISPA',
    survey_score: 'Encuestas a jefes de piso',
    open_dispensers: 'Dispensarios abiertos',
};
export function kpiLabel(code, name) {
    const trimmed = name?.trim();
    if (trimmed)
        return trimmed;
    return KPI_LABELS[code] ?? code;
}
export const SCOPE_LABELS = {
    company: 'Empresa',
    zone: 'Zona',
    station: 'Estación',
};
export const SYNC_STATUS_LABELS = {
    queued: 'En cola',
    running: 'En curso',
    success: 'Correcta',
    failed: 'Fallida',
    retrying: 'Reintentando',
};
//# sourceMappingURL=es.js.map