export declare const SURVEY_SECTION_ORDER: readonly ["SERVICIO AL CLIENTE", "LIMPIEZA", "INSTALACIONES", "BOMBAS", "TERMINALES", "RESULTADOS GENERALES"];
export type DirectorBreakdownLevel = 'company' | 'zone' | 'station' | 'survey';
export interface DirectorQuestionLoss {
    question: string;
    questionNo: number | null;
    yes: number;
    no: number;
    /** NO of this question divided by SI + NO of its section. */
    impact: number;
}
export interface DirectorSectionScore {
    section: string;
    yes: number;
    no: number;
    questions: number;
    /** SI divided by SI + NO. Null when the section has no graded answers. */
    ratio: number | null;
    /** Questions with at least one NO, largest impact first. They sum to 1 - ratio. */
    losses: DirectorQuestionLoss[];
}
export interface DirectorMonth {
    month: number;
    total: number | null;
    sections: Record<string, number | null>;
}
export interface DirectorBreakdownRow {
    id: string;
    label: string;
    surveys: number;
    total: number | null;
    sections: Record<string, number | null>;
}
export interface DirectorWorstQuestion {
    section: string;
    question: string;
    questionNo: number | null;
    yes: number;
    no: number;
    /** NO divided by SI + NO. */
    ratio: number | null;
}
export interface DirectorSurveySheet {
    id: string;
    submittedAt: string;
    stationName: string;
    zoneName: string;
    respondentName: string | null;
    respondentEmail: string | null;
    score: number | null;
    scoreText: string | null;
    formScoreText: string | null;
    naCount: number;
    sectionYes: number;
    sectionNo: number;
}
export interface DirectorSurveySheets {
    section: string;
    sheets: DirectorSurveySheet[];
}
export interface DirectorStationCoverage {
    stationId: string;
    stationName: string;
    zoneName: string;
    managerName: string | null;
    surveys: number;
    lastSubmittedAt: string | null;
}
export interface DirectorCoverage {
    scopeLabel: string;
    stations: DirectorStationCoverage[];
}
export interface DirectorSurveys {
    year: number;
    level: DirectorBreakdownLevel;
    scopeLabel: string;
    totals: {
        surveys: number;
        stations: number;
        stationsInScope: number;
        score: number | null;
        weakest: {
            section: string;
            ratio: number;
        } | null;
    };
    sections: DirectorSectionScore[];
    monthly: DirectorMonth[];
    breakdown: DirectorBreakdownRow[];
    worstQuestions: DirectorWorstQuestion[];
}
//# sourceMappingURL=types.d.ts.map