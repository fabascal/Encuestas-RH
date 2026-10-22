import { db } from '../../db/index.js';
import { ensurePeriod, upsertKpiFact } from '../kpis/kpisService.js';
import { consideredAverage } from './surveyAverage.js';

function readStoredScore(answers: unknown): number {
  const record = typeof answers === 'string' ? (JSON.parse(answers) as unknown) : answers;
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return Number.NaN;
  return Number((record as Record<string, unknown>)['score']);
}

/** Averages the stored survey percents for each station and month into kpi_facts. */
export async function recalculateSurveyScores(stationPeriods: Set<string>, syncRunId?: string): Promise<void> {
  const surveyKpi = await db
    .selectFrom('kpi_categories')
    .select('id')
    .where('code', '=', 'survey_score')
    .executeTakeFirst();
  if (!surveyKpi) return;

  for (const key of stationPeriods) {
    const [stationId, period] = key.split('|') as [string, string];
    const responses = await db
      .selectFrom('survey_responses')
      .select(['answers', 'excluded'])
      .where('station_id', '=', stationId)
      .where('period', '=', period)
      .where('excluded', '=', false)
      .execute();

    const averageScore = consideredAverage(
      responses.map((response) => ({ score: readStoredScore(response.answers), excluded: response.excluded })),
    );
    if (averageScore === null) {
      await db
        .deleteFrom('kpi_facts')
        .where('station_id', '=', stationId)
        .where('kpi_category_id', '=', surveyKpi.id)
        .where('period', '=', period)
        .where('source', '=', 'google_forms')
        .execute();
      continue;
    }

    const fact = {
      stationId,
      kpiCategoryId: surveyKpi.id,
      period,
      value: averageScore,
      source: 'google_forms',
    };
    await ensurePeriod(period);
    if (syncRunId !== undefined) {
      await upsertKpiFact(fact, syncRunId);
    } else {
      await upsertKpiFact(fact);
    }
  }
}
