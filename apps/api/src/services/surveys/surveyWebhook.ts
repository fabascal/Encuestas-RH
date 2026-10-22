import { sql } from 'kysely';
import { parseSurveyScore } from '../integrations/surveySheet.js';
import { db } from '../../db/index.js';
import type { WebhookEventStatus } from '../../db/types.js';
import {
  extractSurvey,
  gradeAnswers,
  normalizeStationName,
  parseSurveyTimestamp,
  scoreHasTotal,
  surveyResponseRefresh,
} from './surveyPayload.js';
import { recalculateSurveyScores } from './surveyScores.js';

export interface SurveyProcessResult {
  status: WebhookEventStatus;
  message: string | null;
  stationId: string | null;
  period: string | null;
}

async function markEvent(
  eventId: string,
  status: WebhookEventStatus,
  message: string | null,
  stationId: string | null,
  surveyResponseId: string | null,
): Promise<void> {
  await db
    .updateTable('webhook_events')
    .set({
      status,
      message,
      station_id: stationId,
      survey_response_id: surveyResponseId,
      processed_at: new Date(),
    })
    .where('id', '=', eventId)
    .execute();
}

async function findStationId(stationName: string): Promise<string | 'ambiguous' | null> {
  const refs = await db
    .selectFrom('station_external_refs')
    .select('station_id')
    .where('provider', '=', 'google_forms')
    .where(sql<boolean>`lower(btrim(external_id)) = ${stationName.toLowerCase()}`)
    .execute();
  if (refs.length > 1) return 'ambiguous';
  if (refs.length === 1) return refs[0]?.station_id ?? null;

  const wanted = normalizeStationName(stationName);
  const stations = await db.selectFrom('stations').select(['id', 'name']).where('active', '=', true).execute();
  const matches = stations.filter((station) => normalizeStationName(station.name) === wanted);
  if (matches.length === 1) return matches[0]?.id ?? null;
  if (matches.length > 1) return 'ambiguous';
  return null;
}

/** Stores one webhook payload as a survey response. Does not recompute the monthly kpi. */
export async function processSurveyEvent(eventId: string): Promise<SurveyProcessResult> {
  const event = await db
    .selectFrom('webhook_events')
    .select(['id', 'body'])
    .where('id', '=', eventId)
    .executeTakeFirst();
  if (!event) {
    return { status: 'error', message: 'No se encontró el evento', stationId: null, period: null };
  }

  const extracted = extractSurvey(event.body);
  if (!extracted.ok) {
    await markEvent(eventId, 'invalid', extracted.message, null, null);
    return { status: 'invalid', message: extracted.message, stationId: null, period: null };
  }

  const { survey } = extracted;
  if (!scoreHasTotal(survey.scoreText)) {
    const message = 'La puntuación no trae el total';
    await markEvent(eventId, 'invalid', message, null, null);
    return { status: 'invalid', message, stationId: null, period: null };
  }

  const submitted = parseSurveyTimestamp(survey.submittedAtText);
  const score = parseSurveyScore(survey.scoreText);
  if (!submitted || score === null) {
    const message = !submitted ? 'La fecha no es válida' : 'La puntuación no es válida';
    await markEvent(eventId, 'invalid', message, null, null);
    return { status: 'invalid', message, stationId: null, period: null };
  }

  const stationId = await findStationId(survey.stationName);
  if (stationId === null || stationId === 'ambiguous') {
    const message = stationId === 'ambiguous' ? 'Hay más de una estación con ese nombre' : 'Sin estación en el portal';
    await markEvent(eventId, 'unmatched', message, null, null);
    return { status: 'unmatched', message, stationId: null, period: null };
  }

  const grade = gradeAnswers(survey.sections);
  const portalScore = grade.score ?? score;
  const answers = {
    ...survey.answers,
    score: String(Math.round(portalScore * 100) / 100),
    na: String(grade.na),
    ...(grade.score === null ? {} : { aciertos: `${grade.yes} / ${grade.yes + grade.no}` }),
  };
  const externalId = `google_forms:${submitted.date.toISOString()}:${survey.email.toLowerCase()}:${normalizeStationName(survey.stationName)}`;
  const saved = await db.transaction().execute(async (trx) => {
    const row = await trx
      .insertInto('survey_responses')
      .values({
        station_id: stationId,
        period: submitted.period,
        external_id: externalId,
        respondent_email: survey.email || null,
        answers: JSON.stringify(answers),
        submitted_at: submitted.date,
        sync_run_id: null,
      })
      .onConflict((oc) =>
        oc.column('external_id').doUpdateSet(
          surveyResponseRefresh({
            answers: JSON.stringify(answers),
            stationId,
            period: submitted.period,
            email: survey.email || null,
            submittedAt: submitted.date,
          }),
        ),
      )
      .returning('id')
      .executeTakeFirstOrThrow();

    await trx.deleteFrom('survey_answers').where('survey_response_id', '=', row.id).execute();
    if (survey.sections.length > 0) {
      await trx
        .insertInto('survey_answers')
        .values(
          survey.sections.map((section) => ({
            survey_response_id: row.id,
            section: section.section,
            question_no: section.questionNo,
            question: section.question,
            value: section.value,
            kind: section.kind,
          })),
        )
        .execute();
    }
    return row;
  });

  await markEvent(eventId, 'processed', null, stationId, saved.id);
  return { status: 'processed', message: null, stationId, period: submitted.period };
}

export async function reprocessSurveyEvents(all: boolean): Promise<Record<WebhookEventStatus, number>> {
  let query = db.selectFrom('webhook_events').select('id').orderBy('created_at', 'asc');
  if (!all) query = query.where('status', '!=', 'processed');
  const events = await query.execute();

  const counts: Record<WebhookEventStatus, number> = {
    pending: 0,
    processed: 0,
    unmatched: 0,
    invalid: 0,
    error: 0,
  };
  const touched = new Set<string>();

  for (const event of events) {
    try {
      const result = await processSurveyEvent(event.id);
      counts[result.status] += 1;
      if (result.status === 'processed' && result.stationId && result.period) {
        touched.add(`${result.stationId}|${result.period}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo procesar el envío';
      await markEvent(event.id, 'error', message, null, null);
      counts.error += 1;
    }
  }

  if (touched.size > 0) await recalculateSurveyScores(touched);
  return counts;
}
