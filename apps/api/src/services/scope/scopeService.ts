import { sql } from 'kysely';
import { db } from '../../db/index.js';

/** Flat list of station ids a user can access, expanded from their company/zone/station scopes. */
export async function getAccessibleStationIds(userId: string): Promise<string[]> {
  const result = await sql<{ station_id: string }>`select * from fn_user_station_ids(${userId})`.execute(db);
  return result.rows.map((row) => row.station_id);
}

export async function userHasStationAccess(userId: string, stationId: string): Promise<boolean> {
  const ids = await getAccessibleStationIds(userId);
  return ids.includes(stationId);
}

export async function userHasZoneAccess(userId: string, zoneId: string): Promise<boolean> {
  const result = await sql<{ has_access: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM user_scopes us
      WHERE us.user_id = ${userId}
        AND (
          us.zone_id = ${zoneId}
          OR us.company_id = (SELECT company_id FROM zones WHERE id = ${zoneId})
        )
    ) AS has_access
  `.execute(db);
  return result.rows[0]?.has_access ?? false;
}

export async function userHasCompanyAccess(userId: string, companyId: string): Promise<boolean> {
  const result = await sql<{ has_access: boolean }>`
    SELECT EXISTS (
      SELECT 1 FROM user_scopes us WHERE us.user_id = ${userId} AND us.company_id = ${companyId}
    ) AS has_access
  `.execute(db);
  return result.rows[0]?.has_access ?? false;
}
