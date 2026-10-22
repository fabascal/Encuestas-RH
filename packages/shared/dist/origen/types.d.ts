export interface GoogleSurveySummary {
    received: number;
    considered: number;
    excluded: number;
    unanswered: number;
    unmatched: number;
    invalid: number;
}
export interface GoogleSurveyRow {
    id: string;
    submittedAt: string;
    stationName: string;
    zoneName: string;
    email: string | null;
    /** Portal user matched by email. Null when the address is unknown. */
    respondentName: string | null;
    /** Graded result, "36 / 42". Falls back to the form's own fraction. */
    scoreText: string | null;
    /** 0 to 100. Yes among yes and no; the form fraction when the survey has no graded answers. */
    score: number | null;
    /** The form's own fraction, such as "38 / 44". */
    formScoreText: string | null;
    /** N/A answers stored with the survey. They are not part of the grade. */
    naCount: number;
    answered: number;
    na: number;
    formTotal: number | null;
    excluded: boolean;
    excludedReason: string | null;
    excludedByName: string | null;
    excludedAt: string | null;
}
export interface GoogleSurveyPending {
    id: string;
    createdAt: string;
    status: 'unmatched' | 'invalid';
    message: string | null;
    stationName: string | null;
    scoreText: string | null;
}
export interface GoogleSurveyList {
    period: string;
    summary: GoogleSurveySummary;
    rows: GoogleSurveyRow[];
    pending: GoogleSurveyPending[];
}
export interface GoogleSurveyAnswer {
    questionNo: number | null;
    question: string;
    value: string;
    kind: 'yes' | 'no' | 'na' | 'text';
}
export interface GoogleSurveySection {
    section: string;
    answers: GoogleSurveyAnswer[];
}
export interface GoogleSurveyDetail extends GoogleSurveyRow {
    sections: GoogleSurveySection[];
}
export type NexusDayStatus = 'ok' | 'failed' | 'running' | 'missing' | 'future';
export interface NexusOilDay {
    day: string;
    status: NexusDayStatus;
    error: string | null;
    syncedAt: string | null;
}
export interface NexusOilRow {
    stationId: string;
    stationName: string;
    zoneName: string;
    code: string;
    /** Importe del día; null si ese día no tiene dato guardado. */
    values: Record<string, number | null>;
    /** Total mensual guardado en kpi_facts. Null si todavía no hay uno. */
    total: number | null;
}
export interface NexusOilUnmatched {
    code: string;
    amount: number;
    days: number;
}
export interface NexusOilSummary {
    total: number;
    stations: number;
    syncedDays: number;
    failedDays: number;
    unmatched: number;
}
export interface NexusOilMonth {
    period: string;
    days: NexusOilDay[];
    rows: NexusOilRow[];
    summary: NexusOilSummary;
    unmatched: NexusOilUnmatched[];
}
export type NexusRefetchState = 'queued' | 'running' | 'success' | 'failed';
export interface NexusRefetchStatus {
    jobId: string;
    status: NexusRefetchState;
    message: string | null;
}
//# sourceMappingURL=types.d.ts.map