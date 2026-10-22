import {
  type ExcludeSurveyInput,
  type GoogleSurveyDetail,
  type GoogleSurveyList,
  type GoogleSurveyQuery,
  type GoogleSurveyRow,
} from '@portal/shared';
import { sql } from 'kysely';
import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/httpErrors.js';
import { recordAuditLog } from '../audit/auditService.js';
import { listScopedStations } from '../reports/scope.js';
import { loadSurveySections } from '../surveys/surveyDetail.js';
import { recalculateSurveyScores } from '../surveys/surveyScores.js';

function asPeriod(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function nextPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1 + 1, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function readAnswers(answers: unknown): Record<string, unknown> {
  const record = typeof answers === 'string' ? (JSON.parse(answers) as unknown) : answers;
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return {};
  return record as Record<string, unknown>;
}

function readScore(answers: unknown): {
  scoreText: string | null;
  score: number | null;
  formTotal: number | null;
  formScoreText: string | null;
  naCount: number;
} {
  const record = readAnswers(answers);
  const formScoreText = typeof record['Puntuación'] === 'string' ? record['Puntuación'] : null;
  const aciertos = typeof record['aciertos'] === 'string' ? record['aciertos'] : null;
  const score = Number(record['score']);
  const naCount = Number(record['na']);
  const fraction = formScoreText?.match(/^\s*\d+(?:[.,]\d+)?\s*\/\s*(\d+)/);
  return {
    scoreText: aciertos ?? formScoreText,
    score: Number.isNaN(score) ? null : score,
    formTotal: fraction?.[1] ? Number(fraction[1]) : null,
    formScoreText,
    naCount: Number.isFinite(naCount) ? naCount : 0,
  };
}

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

async function stationsInScope(user: AuthUser, query: GoogleSurveyQuery) {
  const stations = await listScopedStations(user, {
    period: query.period,
    ...(query.companyId ? { companyId: query.companyId } : {}),
    ...(query.zoneId ? { zoneId: query.zoneId } : {}),
    ...(query.stationId ? { stationId: query.stationId } : {}),
  });
  if (stations.length === 0 && (query.stationId || query.zoneId || query.companyId) && !user.permissions.includes('alcance.total')) {
    throw new ForbiddenError('No tienes acceso a ese filtro');
  }
  return stations;
}

export async function listGoogleSurveys(user: AuthUser, query: GoogleSurveyQuery): Promise<GoogleSurveyList> {
  const stations = await stationsInScope(user, query);
  const ids = stations.map((station) => station.stationId);
  const end = nextPeriod(query.period);

  const pending = await db
    .selectFrom('webhook_events')
    .select(['id', 'created_at', 'status', 'message', 'body'])
    .where('status', 'in', ['unmatched', 'invalid'])
    .where(sql<boolean>`(created_at at time zone 'America/Mexico_City')::date >= ${query.period}::date`)
    .where(sql<boolean>`(created_at at time zone 'America/Mexico_City')::date < ${end}::date`)
    .orderBy('created_at', 'desc')
    .execute();

  const pendingRows = pending
    .filter((event): event is typeof event & { status: 'unmatched' | 'invalid' } => event.status === 'unmatched' || event.status === 'invalid')
    .map((event) => {
      const body = readAnswers(event.body);
      return {
        id: event.id,
        createdAt: iso(event.created_at) ?? '',
        status: event.status,
        message: event.message,
        stationName: typeof body['estacion'] === 'string' ? body['estacion'] : null,
        scoreText: typeof body['puntuacion'] === 'string' ? body['puntuacion'] : null,
      };
    });

  if (ids.length === 0) {
    return {
      period: query.period,
      summary: {
        received: 0,
        considered: 0,
        excluded: 0,
        unanswered: 0,
        unmatched: pendingRows.filter((row) => row.status === 'unmatched').length,
        invalid: pendingRows.filter((row) => row.status === 'invalid').length,
      },
      rows: [],
      pending: pendingRows,
    };
  }

  const responses = await db
    .selectFrom('survey_responses as r')
    .innerJoin('stations as s', 's.id', 'r.station_id')
    .innerJoin('zones as z', 'z.id', 's.zone_id')
    .leftJoin('users as u', 'u.id', 'r.excluded_by')
    .leftJoin('users as ru', 'ru.email', 'r.respondent_email')
    .select([
      'r.id',
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
    .where('r.period', '=', query.period)
    .where('r.station_id', 'in', ids)
    .orderBy('r.submitted_at', 'desc')
    .execute();

  const counts =
    responses.length === 0
      ? []
      : await db
          .selectFrom('survey_answers')
          .select([
            'survey_response_id',
            sql<string>`count(*) filter (where kind in ('yes', 'no'))`.as('answered'),
            sql<string>`count(*) filter (where kind = 'na')`.as('na'),
          ])
          .where(
            'survey_response_id',
            'in',
            responses.map((response) => response.id),
          )
          .groupBy('survey_response_id')
          .execute();
  const countById = new Map(counts.map((row) => [row.survey_response_id, { answered: Number(row.answered), na: Number(row.na) }]));

  const rows: GoogleSurveyRow[] = responses.map((response) => {
    const score = readScore(response.answers);
    const tally = countById.get(response.id) ?? { answered: 0, na: 0 };
    return {
      id: response.id,
      submittedAt: iso(response.submitted_at) ?? '',
      stationName: response.station_name,
      zoneName: response.zone_name,
      email: response.respondent_email,
      respondentName: response.respondent_name,
      scoreText: score.scoreText,
      score: score.score,
      formScoreText: score.formScoreText,
      naCount: score.naCount,
      answered: tally.answered,
      na: tally.na,
      formTotal: score.formTotal,
      excluded: response.excluded,
      excludedReason: response.excluded_reason,
      excludedByName: response.excluded_by_name,
      excludedAt: iso(response.excluded_at),
    };
  });

  const visible = rows.filter((row) => {
    if (query.estado === 'consideradas') return !row.excluded;
    if (query.estado === 'no_consideradas') return row.excluded;
    return true;
  });

  return {
    period: query.period,
    summary: {
      received: rows.length,
      considered: rows.filter((row) => !row.excluded).length,
      excluded: rows.filter((row) => row.excluded).length,
      unanswered: rows.filter((row) => row.answered === 0).length,
      unmatched: pendingRows.filter((row) => row.status === 'unmatched').length,
      invalid: pendingRows.filter((row) => row.status === 'invalid').length,
    },
    rows: visible,
    pending: pendingRows,
  };
}

export async function getGoogleSurvey(user: AuthUser, id: string): Promise<GoogleSurveyDetail> {
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

  const allowed = await listScopedStations(user, { period: response.period, stationId: response.station_id });
  if (allowed.length === 0) throw new ForbiddenError('No tienes acceso a esa encuesta');

  const sections = await loadSurveySections(id);
  const flat = sections.flatMap((section) => section.answers);
  const score = readScore(response.answers);
  const answered = flat.filter((answer) => answer.kind === 'yes' || answer.kind === 'no').length;
  const na = flat.filter((answer) => answer.kind === 'na').length;

  return {
    id: response.id,
    submittedAt: iso(response.submitted_at) ?? '',
    stationName: response.station_name,
    zoneName: response.zone_name,
    email: response.respondent_email,
    respondentName: response.respondent_name,
    scoreText: score.scoreText,
    score: score.score,
    formScoreText: score.formScoreText,
    naCount: score.naCount,
    answered,
    na,
    formTotal: score.formTotal,
    excluded: response.excluded,
    excludedReason: response.excluded_reason,
    excludedByName: response.excluded_by_name,
    excludedAt: iso(response.excluded_at),
    sections,
  };
}

export async function setGoogleSurveyExcluded(
  user: AuthUser,
  id: string,
  input: ExcludeSurveyInput,
  ip: string | undefined,
): Promise<GoogleSurveyDetail> {
  const current = await db
    .selectFrom('survey_responses')
    .select(['id', 'station_id', 'period', 'excluded', 'excluded_reason', 'excluded_by', 'excluded_at'])
    .where('id', '=', id)
    .executeTakeFirst();
  if (!current || !current.station_id || !current.period) throw new NotFoundError('No se encontró la encuesta');
  const period = asPeriod(current.period);

  const allowed = await listScopedStations(user, { period, stationId: current.station_id });
  if (allowed.length === 0) throw new ForbiddenError('No tienes acceso a esa encuesta');

  const periodRow = await db.selectFrom('periods').select('status').where('period', '=', period).executeTakeFirst();
  if (periodRow?.status === 'closed') {
    throw new ConflictError('El periodo ya está cerrado; la encuesta no se puede cambiar');
  }

  await db
    .updateTable('survey_responses')
    .set({
      excluded: input.excluded,
      excluded_reason: input.excluded ? (input.reason ?? null) : null,
      excluded_by: input.excluded ? user.id : null,
      excluded_at: input.excluded ? new Date() : null,
    })
    .where('id', '=', id)
    .execute();

  await recordAuditLog({
    actorId: user.id,
    action: input.excluded ? 'exclude' : 'include',
    entity: 'survey_response',
    entityId: id,
    before: {
      excluded: current.excluded,
      excludedReason: current.excluded_reason,
    },
    after: {
      excluded: input.excluded,
      excludedReason: input.excluded ? (input.reason ?? null) : null,
    },
    ...(ip ? { ip } : {}),
  });

  await recalculateSurveyScores(new Set([`${current.station_id}|${period}`]));
  return getGoogleSurvey(user, id);
}
