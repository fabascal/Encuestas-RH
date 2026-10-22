import type { GoogleSurveySection } from '@portal/shared';
import { db } from '../../db/index.js';
import { orderSurveySections } from './surveyOrder.js';

export async function loadSurveySections(responseId: string): Promise<GoogleSurveySection[]> {
  const answers = await db
    .selectFrom('survey_answers')
    .select(['section', 'question_no', 'question', 'value', 'kind'])
    .where('survey_response_id', '=', responseId)
    .execute();

  const grouped = new Map<string, GoogleSurveySection>();
  for (const answer of answers) {
    const section = grouped.get(answer.section) ?? { section: answer.section, answers: [] };
    section.answers.push({
      questionNo: answer.question_no,
      question: answer.question,
      value: answer.value,
      kind: answer.kind,
    });
    grouped.set(answer.section, section);
  }
  return orderSurveySections([...grouped.values()]);
}
