import { SURVEY_SECTION_ORDER, type GoogleSurveyAnswer, type GoogleSurveySection } from '@portal/shared';

export function sectionRank(section: string): number {
  const index = SURVEY_SECTION_ORDER.indexOf(section as (typeof SURVEY_SECTION_ORDER)[number]);
  return index === -1 ? SURVEY_SECTION_ORDER.length : index;
}

/** Comments last, then question number, then the question text. */
export function orderSurveyAnswers(answers: GoogleSurveyAnswer[]): GoogleSurveyAnswer[] {
  return [...answers].sort((left, right) => {
    const kind = Number(left.kind === 'text') - Number(right.kind === 'text');
    if (kind !== 0) return kind;
    const number = (left.questionNo ?? Number.MAX_SAFE_INTEGER) - (right.questionNo ?? Number.MAX_SAFE_INTEGER);
    if (number !== 0) return number;
    return left.question.localeCompare(right.question, 'es');
  });
}

export function orderSurveySections(sections: GoogleSurveySection[]): GoogleSurveySection[] {
  return sections
    .map((section) => ({ ...section, answers: orderSurveyAnswers(section.answers) }))
    .sort((left, right) => sectionRank(left.section) - sectionRank(right.section) || left.section.localeCompare(right.section, 'es'));
}

export function readSurveyScore(answers: unknown): {
  scoreText: string | null;
  score: number | null;
  formTotal: number | null;
  formScoreText: string | null;
  naCount: number;
} {
  const record = typeof answers === 'string' ? (JSON.parse(answers) as unknown) : answers;
  const body = record !== null && typeof record === 'object' && !Array.isArray(record) ? (record as Record<string, unknown>) : {};
  const formScoreText = typeof body['Puntuación'] === 'string' ? body['Puntuación'] : null;
  const aciertos = typeof body['aciertos'] === 'string' ? body['aciertos'] : null;
  const score = Number(body['score']);
  const naCount = Number(body['na']);
  const fraction = formScoreText?.match(/^\s*\d+(?:[.,]\d+)?\s*\/\s*(\d+)/);
  const total = fraction?.[1];
  return {
    scoreText: aciertos ?? formScoreText,
    score: Number.isNaN(score) ? null : score,
    formTotal: total ? Number(total) : null,
    formScoreText,
    naCount: Number.isFinite(naCount) ? naCount : 0,
  };
}
