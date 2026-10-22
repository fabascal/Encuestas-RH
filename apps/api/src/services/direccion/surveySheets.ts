import type { DirectorSheetsQuery, DirectorSurveySheet, DirectorSurveySheets, GoogleSurveyDetail } from '@portal/shared';
import { sql } from 'kysely';
import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { ForbiddenError, NotFoundError } from '../../utils/httpErrors.js';
import { listScopedStations } from '../reports/scope.js';
import { loadSurveySections } from '../surveys/surveyDetail.js';
import { readSurveyScore } from '../surveys/surveyOrder.js';
import { periodRange } from './period.js';
import { resolveStations } from './scope.js';

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? '');
}

function num(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function listSectionSheets(user: AuthUser, query: DirectorSheetsQuery): Promise<DirectorSurveySheets> {
  const stations = await resolveStations(user, query);
  if (stations.length === 0) return { section: query.section, sheets: [] };

  const { start, end } = periodRange(query.year, query.month);
  const rows = await db
    .selectFrom('survey_responses as r')
    .innerJoin('stations as s', 's.id', 'r.station_id')
    .innerJoin('zones as z', 'z.id', 's.zone_id')
    .innerJoin('survey_answers as a', 'a.survey_response_id', 'r.id')
    .leftJoin('users as ru', 'ru.email', 'r.respondent_email')
    .select([
      'r.id',
      'r.submitted_at',
      'r.respondent_email',
      'r.answers',
      's.name as station_name',
      'z.name as zone_name',
      'ru.full_name as respondent_name',
      sql<string>`count(*) filter (where a.kind = 'yes')`.as('section_yes'),
      sql<string>`count(*) filter (where a.kind = 'no')`.as('section_no'),
    ])
    .where('r.station_id', 'in', stations.map((station) => station.stationId))
    .where('r.period', '>=', start)
    .where('r.period', '<', end)
    .where('r.excluded', '=', false)
    .where('a.section', '=', query.section)
    .where('a.kind', 'in', ['yes', 'no'])
    .groupBy(['r.id', 'r.submitted_at', 'r.respondent_email', 'r.answers', 's.name', 'z.name', 'ru.full_name'])
    .orderBy('r.submitted_at', 'desc')
    .execute();

  const sheets: DirectorSurveySheet[] = rows.map((row) => {
    const score = readSurveyScore(row.answers);
    return {
      id: row.id,
      submittedAt: iso(row.submitted_at),
      stationName: row.station_name,
      zoneName: row.zone_name,
      respondentName: row.respondent_name,
      respondentEmail: row.respondent_email,
      score: score.score,
      scoreText: score.scoreText,
      formScoreText: score.formScoreText,
      naCount: score.naCount,
      sectionYes: num(row.section_yes),
      sectionNo: num(row.section_no),
    };
  });

  return { section: query.section, sheets };
}

export async function getSectionSheet(user: AuthUser, id: string): Promise<GoogleSurveyDetail> {
  const response = await db
    .selectFrom('survey_responses as r')
    .innerJoin('stations as s', 's.id', 'r.station_id')
    .innerJoin('zones as z', 'z.id', 's.zone_id')
    .leftJoin('users as u', 'u.id', 'r.excluded_by')
    .leftJoin('users as ru', 'ru.email', 'r.respondent_email')
    .select([
      'r.id',
      'r.station_id',
      'r.period',
      'r.submitted_at',
      'r.respondent_email',
      'r.answers',
      'r.excluded',
      'r.excluded_reason',
      'r.excluded_at',
      's.name as station_name',
      'z.name as zone_name',
      'u.full_name as excluded_by_name',
      'ru.full_name as respondent_name',
    ])
    .where('r.id', '=', id)
    .executeTakeFirst();
  if (!response || !response.station_id || !response.period) throw new NotFoundError('No se encontró la encuesta');

  const period = String(response.period).slice(0, 10);
  const allowed = await listScopedStations(user, { period, stationId: response.station_id });
  if (allowed.length === 0) throw new ForbiddenError('No tienes acceso a esa encuesta');
  if (response.excluded) throw new NotFoundError('No se encontró la encuesta');

  const sections = await loadSurveySections(id);
  const flat = sections.flatMap((section) => section.answers);
  const score = readSurveyScore(response.answers);

  return {
    id: response.id,
    submittedAt: iso(response.submitted_at),
    stationName: response.station_name,
    zoneName: response.zone_name,
    email: response.respondent_email,
    respondentName: response.respondent_name,
    scoreText: score.scoreText,
    score: score.score,
    formScoreText: score.formScoreText,
    naCount: score.naCount,
    answered: flat.filter((answer) => answer.kind === 'yes' || answer.kind === 'no').length,
    na: flat.filter((answer) => answer.kind === 'na').length,
    formTotal: score.formTotal,
    excluded: response.excluded,
    excludedReason: response.excluded_reason,
    excludedByName: response.excluded_by_name,
    excludedAt: response.excluded_at instanceof Date ? response.excluded_at.toISOString() : response.excluded_at ? String(response.excluded_at) : null,
    sections,
  };
}
