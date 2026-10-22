import { STATION_MANAGER_ROLE, type DirectorCoverage, type DirectorSurveyQuery } from '@portal/shared';
import { sql } from 'kysely';
import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { periodRange } from './period.js';
import { resolveStations, scopeLabel } from './scope.js';

function num(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function iso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  const text = String(value);
  return text === '' ? null : text;
}

export async function buildSurveyCoverage(user: AuthUser, query: DirectorSurveyQuery): Promise<DirectorCoverage> {
  const stations = await resolveStations(user, query);
  const label = await scopeLabel(stations, query);
  if (stations.length === 0) return { scopeLabel: label, stations: [] };

  const ids = stations.map((station) => station.stationId);
  const { start, end } = periodRange(query.year, query.month);

  const [counts, managers] = await Promise.all([
    db
      .selectFrom('survey_responses as r')
      .select([
        'r.station_id',
        sql<string>`count(r.id)`.as('surveys'),
        sql<Date | null>`max(r.submitted_at)`.as('last_submitted_at'),
      ])
      .where('r.station_id', 'in', ids)
      .where('r.period', '>=', start)
      .where('r.period', '<', end)
      .where('r.excluded', '=', false)
      .groupBy('r.station_id')
      .execute(),
    db
      .selectFrom('user_scopes as us')
      .innerJoin('users as u', 'u.id', 'us.user_id')
      .innerJoin('roles as role', 'role.id', 'u.role_id')
      .select(['us.station_id', 'u.full_name'])
      .where('us.station_id', 'in', ids)
      .where('u.active', '=', true)
      .where('role.code', '=', STATION_MANAGER_ROLE)
      .orderBy('u.full_name')
      .execute(),
  ]);

  const countByStation = new Map(counts.map((row) => [row.station_id, row]));
  const managerByStation = new Map<string, string>();
  for (const row of managers) {
    if (row.station_id && !managerByStation.has(row.station_id)) managerByStation.set(row.station_id, row.full_name);
  }

  return {
    scopeLabel: label,
    stations: stations.map((station) => {
      const count = countByStation.get(station.stationId);
      return {
        stationId: station.stationId,
        stationName: station.stationName,
        zoneName: station.zoneName,
        managerName: managerByStation.get(station.stationId) ?? null,
        surveys: count ? num(count.surveys) : 0,
        lastSubmittedAt: iso(count?.last_submitted_at),
      };
    }),
  };
}
