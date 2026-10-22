export interface SurveyCatalogQuestion {
    no: number;
    question: string;
}
export interface ResolvedQuestion {
    section: string;
    questionNo: number | null;
    question: string;
}
export declare const SURVEY_CATALOG: Record<string, readonly SurveyCatalogQuestion[]>;
/** Comparable title: no leading number, lowercase, one space, comma followed by a space. */
export declare function questionKey(text: string): string;
/** Catalog wins over the section the form sent. Unknown titles keep their section, except OTROS. */
export declare function resolveQuestion(section: string, text: string): ResolvedQuestion;
//# sourceMappingURL=surveyCatalog.d.ts.map