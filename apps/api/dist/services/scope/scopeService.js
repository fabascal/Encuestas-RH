import { sql } from 'kysely';
import { db } from '../../db/index.js';
/** Flat list of station ids a user can access, expanded from their company/zone/station scopes. */
export async function getAccessibleStationIds(userId) {
    const result = await sql `select * from fn_user_station_ids(${userId})`.execute(db);
    return result.rows.map((row) => row.station_id);
}
export async function userHasStationAccess(userId, stationId) {
    const ids = await getAccessibleStationIds(userId);
    return ids.includes(stationId);
}
export async function userHasZoneAccess(userId, zoneId) {
    const result = await sql `
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
export async function userHasCompanyAccess(userId, companyId) {
    const result = await sql `
    SELECT EXISTS (
      SELECT 1 FROM user_scopes us WHERE us.user_id = ${userId} AND us.company_id = ${companyId}
    ) AS has_access
  `.execute(db);
    return result.rows[0]?.has_access ?? false;
}
//# sourceMappingURL=scopeService.js.map