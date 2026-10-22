import {
  SURVEY_SECTION_ORDER,
  type DirectorBreakdownLevel,
  type DirectorBreakdownRow,
  type DirectorMonth,
  type DirectorSectionScore,
  type DirectorSurveyQuery,
  type DirectorSurveys,
  type DirectorWorstQuestion,
} from '@portal/shared';
import { sql } from 'kysely';
import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { periodRange } from './period.js';
import { breakdownLevel, resolveStations, scopeLabel } from './scope.js';

interface CountRow {
  id: string;
  label: string;
  section: string;
  yes: string | number;
  no: string | number;
}

interface ScoreRow {
  id: string;
  surveys: string | number;
  score: string | number | null;
}

function num(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function yesRatio(yes: number, no: number): number | null {
  const graded = yes + no;
  return graded === 0 ? null : yes / graded;
}

interface QuestionCount {
  section: string;
  question: string;
  questionNo: number | null;
  yes: number;
  no: number;
}

function questionRowsOf(
  rows: Array<{ section: string; question: string; question_no: string | number | null; yes: string | number; no: string | number }>,
): QuestionCount[] {
  return rows.map((row) => ({
    section: row.section,
    question: row.question,
    questionNo: row.question_no === null ? null : num(row.question_no),
    yes: num(row.yes),
    no: num(row.no),
  }));
}

function noShare(row: QuestionCount): number {
  const graded = row.yes + row.no;
  return graded === 0 ? 0 : row.no / graded;
}

function sectionRank(section: string): number {
  const index = SURVEY_SECTION_ORDER.indexOf(section as (typeof SURVEY_SECTION_ORDER)[number]);
  return index === -1 ? SURVEY_SECTION_ORDER.length : index;
}

function sortSections<T extends { section: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => sectionRank(left.section) - sectionRank(right.section) || left.section.localeCompare(right.section, 'es'));
}

function emptyDirector(query: DirectorSurveyQuery, level: DirectorBreakdownLevel, label: string): DirectorSurveys {
  return {
    year: query.year,
    level,
    scopeLabel: label,
    totals: { surveys: 0, stations: 0, stationsInScope: 0, score: null, weakest: null },
    sections: [],
    monthly: fillMonths([], new Map()),
    breakdown: [],
    worstQuestions: [],
  };
}

function fillMonths(
  sectionNames: string[],
  byMonth: Map<number, { total: number | null; sections: Map<string, number | null> }>,
): DirectorMonth[] {
  const months: DirectorMonth[] = [];
  for (let month = 1; month <= 12; month += 1) {
    const found = byMonth.get(month);
    const sections: Record<string, number | null> = {};
    for (const section of sectionNames) sections[section] = found?.sections.get(section) ?? null;
    months.push({ month, total: found?.total ?? null, sections });
  }
  return months;
}

export async function buildDirectorSurveys(user: AuthUser, query: DirectorSurveyQuery): Promise<DirectorSurveys> {
  const stations = await resolveStations(user, query);
  const level = breakdownLevel(query, stations);
  const label = await scopeLabel(stations, query);
  if (stations.length === 0) return emptyDirector(query, level, label);

  const ids = stations.map((station) => station.stationId);
  const { start, end } = periodRange(query.year, query.month);

  const [totalsRow, sectionRows, monthSectionRows, monthScoreRows, breakdownCounts, breakdownScores, questionCountRows] =
    await Promise.all([
      db
        .selectFrom('survey_responses as r')
        .select([
          sql<string>`count(*)`.as('surveys'),
          sql<string>`count(distinct r.station_id)`.as('stations'),
          sql<string | null>`avg((r.answers->>'score')::numeric)`.as('score'),
        ])
        .where('r.station_id', 'in', ids)
        .where('r.period', '>=', start)
        .where('r.period', '<', end).where('r.excluded', '=', false)
        .executeTakeFirstOrThrow(),
      db
        .selectFrom('survey_answers as a')
        .innerJoin('survey_responses as r', 'r.id', 'a.survey_response_id')
        .select([
          'a.section',
          sql<string>`count(*) filter (where a.kind = 'yes')`.as('yes'),
          sql<string>`count(*) filter (where a.kind = 'no')`.as('no'),
          sql<string>`count(distinct a.question) filter (where a.kind in ('yes', 'no'))`.as('questions'),
        ])
        .where('r.station_id', 'in', ids)
        .where('r.period', '>=', start)
        .where('r.period', '<', end).where('r.excluded', '=', false)
        .groupBy('a.section')
        .execute(),
      db
        .selectFrom('survey_answers as a')
        .innerJoin('survey_responses as r', 'r.id', 'a.survey_response_id')
        .select([
          sql<string>`extract(month from r.period)::int`.as('month'),
          'a.section',
          sql<string>`count(*) filter (where a.kind = 'yes')`.as('yes'),
          sql<string>`count(*) filter (where a.kind = 'no')`.as('no'),
        ])
        .where('r.station_id', 'in', ids)
        .where('r.period', '>=', start)
        .where('r.period', '<', end).where('r.excluded', '=', false)
        .groupBy([sql`extract(month from r.period)`, 'a.section'])
        .execute(),
      db
        .selectFrom('survey_responses as r')
        .select([
          sql<string>`extract(month from r.period)::int`.as('month'),
          sql<string | null>`avg((r.answers->>'score')::numeric)`.as('score'),
        ])
        .where('r.station_id', 'in', ids)
        .where('r.period', '>=', start)
        .where('r.period', '<', end).where('r.excluded', '=', false)
        .groupBy(sql`extract(month from r.period)`)
        .execute(),
      loadBreakdownCounts(level, ids, start, end),
      loadBreakdownScores(level, ids, start, end),
      db
        .selectFrom('survey_answers as a')
        .innerJoin('survey_responses as r', 'r.id', 'a.survey_response_id')
        .select([
          'a.section',
          'a.question',
          sql<string | null>`max(a.question_no)`.as('question_no'),
          sql<string>`count(*) filter (where a.kind = 'yes')`.as('yes'),
          sql<string>`count(*) filter (where a.kind = 'no')`.as('no'),
        ])
        .where('r.station_id', 'in', ids)
        .where('r.period', '>=', start)
        .where('r.period', '<', end).where('r.excluded', '=', false)
        .where('a.kind', 'in', ['yes', 'no'])
        .groupBy(['a.section', 'a.question'])
        .having(sql<boolean>`count(*) filter (where a.kind = 'no') > 0`)
        .execute(),
    ]);

  const questionRows = questionRowsOf(questionCountRows);
  const lossesBySection = new Map<string, QuestionCount[]>();
  for (const row of questionRows) {
    const current = lossesBySection.get(row.section) ?? [];
    current.push(row);
    lossesBySection.set(row.section, current);
  }

  const sections = sortSections(
    sectionRows.map((row) => {
      const yes = num(row.yes);
      const no = num(row.no);
      const graded = yes + no;
      const losses = (lossesBySection.get(row.section) ?? [])
        .map((loss) => ({
          question: loss.question,
          questionNo: loss.questionNo,
          yes: loss.yes,
          no: loss.no,
          impact: graded === 0 ? 0 : loss.no / graded,
        }))
        .sort((left, right) => right.impact - left.impact || right.no - left.no || left.question.localeCompare(right.question, 'es'));
      return {
        section: row.section,
        yes,
        no,
        questions: num(row.questions),
        ratio: yesRatio(yes, no),
        losses,
      };
    }),
  );

  const graded = sections.filter((section): section is DirectorSectionScore & { ratio: number } => section.ratio !== null);
  const weakest = graded.reduce<DirectorSectionScore | null>((lowest, section) => {
    if (!lowest || (section.ratio ?? 1) < (lowest.ratio ?? 1)) return section;
    return lowest;
  }, null);

  const byMonth = new Map<number, { total: number | null; sections: Map<string, number | null> }>();
  for (const row of monthScoreRows) {
    const month = num(row.month);
    const current = byMonth.get(month) ?? { total: null, sections: new Map() };
    current.total = row.score === null ? null : num(row.score) / 100;
    byMonth.set(month, current);
  }
  for (const row of monthSectionRows) {
    const month = num(row.month);
    const current = byMonth.get(month) ?? { total: null, sections: new Map() };
    current.sections.set(row.section, yesRatio(num(row.yes), num(row.no)));
    byMonth.set(month, current);
  }

  const scoreById = new Map(breakdownScores.map((row) => [row.id, row]));
  const grouped = new Map<string, { label: string; sections: Map<string, { yes: number; no: number }> }>();
  for (const row of breakdownCounts) {
    const current = grouped.get(row.id) ?? { label: row.label, sections: new Map() };
    current.sections.set(row.section, { yes: num(row.yes), no: num(row.no) });
    grouped.set(row.id, current);
  }
  for (const row of breakdownScores) {
    if (!grouped.has(row.id)) grouped.set(row.id, { label: row.label, sections: new Map() });
  }

  const sectionNames = sections.map((section) => section.section);
  const breakdown: DirectorBreakdownRow[] = [...grouped.entries()].map(([id, group]) => {
    const score = scoreById.get(id);
    const cells: Record<string, number | null> = {};
    for (const section of sectionNames) {
      const cell = group.sections.get(section);
      cells[section] = cell ? yesRatio(cell.yes, cell.no) : null;
    }
    return {
      id,
      label: group.label,
      surveys: num(score?.surveys),
      total: score?.score === null || score?.score === undefined ? null : num(score.score) / 100,
      sections: cells,
    };
  });
  breakdown.sort((left, right) => left.label.localeCompare(right.label, 'es'));

  const worstQuestions: DirectorWorstQuestion[] = [...questionRows]
    .sort((left, right) => right.no - left.no || noShare(right) - noShare(left) || left.question.localeCompare(right.question, 'es'))
    .slice(0, 10)
    .map((row) => ({
      section: row.section,
      question: row.question,
      questionNo: row.questionNo,
      yes: row.yes,
      no: row.no,
      ratio: row.yes + row.no === 0 ? null : noShare(row),
    }));

  const average = totalsRow.score === null ? null : num(totalsRow.score) / 100;

  return {
    year: query.year,
    level,
    scopeLabel: label,
    totals: {
      surveys: num(totalsRow.surveys),
      stations: num(totalsRow.stations),
      stationsInScope: stations.length,
      score: average,
      weakest: weakest?.ratio === null || weakest === null ? null : { section: weakest.section, ratio: weakest.ratio },
    },
    sections,
    monthly: fillMonths(sectionNames, byMonth),
    breakdown,
    worstQuestions,
  };
}

async function loadBreakdownCounts(
  level: DirectorBreakdownLevel,
  ids: string[],
  start: string,
  end: string,
): Promise<CountRow[]> {
  const base = db
    .selectFrom('survey_answers as a')
    .innerJoin('survey_responses as r', 'r.id', 'a.survey_response_id')
    .innerJoin('stations as s', 's.id', 'r.station_id')
    .innerJoin('zones as z', 'z.id', 's.zone_id')
    .innerJoin('companies as c', 'c.id', 'z.company_id')
    .where('r.station_id', 'in', ids)
    .where('r.period', '>=', start)
    .where('r.period', '<', end).where('r.excluded', '=', false)
    .where('a.kind', 'in', ['yes', 'no']);

  const counts = [
    sql<string>`count(*) filter (where a.kind = 'yes')`.as('yes'),
    sql<string>`count(*) filter (where a.kind = 'no')`.as('no'),
  ] as const;

  if (level === 'company') {
    return base
      .select(['c.id as id', 'c.name as label', 'a.section', ...counts])
      .groupBy(['c.id', 'c.name', 'a.section'])
      .execute();
  }
  if (level === 'zone') {
    return base
      .select(['z.id as id', 'z.name as label', 'a.section', ...counts])
      .groupBy(['z.id', 'z.name', 'a.section'])
      .execute();
  }
  if (level === 'station') {
    return base
      .select(['s.id as id', 's.name as label', 'a.section', ...counts])
      .groupBy(['s.id', 's.name', 'a.section'])
      .execute();
  }
  return base
    .select([
      'r.id as id',
      sql<string>`to_char(min(r.submitted_at) at time zone 'America/Mexico_City', 'DD/MM/YYYY HH24:MI')`.as('label'),
      'a.section',
      ...counts,
    ])
    .groupBy(['r.id', 'a.section'])
    .execute();
}

async function loadBreakdownScores(
  level: DirectorBreakdownLevel,
  ids: string[],
  start: string,
  end: string,
): Promise<Array<ScoreRow & { label: string }>> {
  const base = db
    .selectFrom('survey_responses as r')
    .innerJoin('stations as s', 's.id', 'r.station_id')
    .innerJoin('zones as z', 'z.id', 's.zone_id')
    .innerJoin('companies as c', 'c.id', 'z.company_id')
    .where('r.station_id', 'in', ids)
    .where('r.period', '>=', start)
    .where('r.period', '<', end).where('r.excluded', '=', false);

  const metrics = [
    sql<string>`count(*)`.as('surveys'),
    sql<string | null>`avg((r.answers->>'score')::numeric)`.as('score'),
  ] as const;

  if (level === 'company') {
    return base.select(['c.id as id', 'c.name as label', ...metrics]).groupBy(['c.id', 'c.name']).execute();
  }
  if (level === 'zone') {
    return base.select(['z.id as id', 'z.name as label', ...metrics]).groupBy(['z.id', 'z.name']).execute();
  }
  if (level === 'station') {
    return base.select(['s.id as id', 's.name as label', ...metrics]).groupBy(['s.id', 's.name']).execute();
  }
  return base
    .select([
      'r.id as id',
      sql<string>`to_char(r.submitted_at at time zone 'America/Mexico_City', 'DD/MM/YYYY HH24:MI')`.as('label'),
      sql<string>`count(*)`.as('surveys'),
      sql<string | null>`avg((r.answers->>'score')::numeric)`.as('score'),
    ])
    .groupBy(['r.id', 'r.submitted_at'])
    .execute();
}
