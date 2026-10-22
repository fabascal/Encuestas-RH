import { STATION_MANAGER_ROLE } from '@portal/shared';
import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { getAccessibleStationIds } from './scopeService.js';

export interface ManagerOption {
  id: string;
  name: string;
  stationCount: number;
}

export async function findStationManager(managerId: string): Promise<{ id: string; name: string } | undefined> {
  return db
    .selectFrom('users as u')
    .innerJoin('roles as r', 'r.id', 'u.role_id')
    .select(['u.id', 'u.full_name as name'])
    .where('u.id', '=', managerId)
    .where('u.active', '=', true)
    .where('r.code', '=', STATION_MANAGER_ROLE)
    .executeTakeFirst();
}

/** Station ids assigned to an active station manager. Empty when the user is not one. */
export async function managerStationIds(managerId: string): Promise<string[]> {
  const manager = await findStationManager(managerId);
  if (!manager) return [];
  const rows = await db
    .selectFrom('user_scopes')
    .select('station_id')
    .where('user_id', '=', managerId)
    .where('station_id', 'is not', null)
    .execute();
  return rows.flatMap((row) => (row.station_id ? [row.station_id] : []));
}

export async function listManagersForUser(
  user: AuthUser,
  filters: { companyId?: string; zoneId?: string },
): Promise<ManagerOption[]> {
  let stations = db.selectFrom('stations as s').innerJoin('zones as z', 'z.id', 's.zone_id').select('s.id');
  if (filters.zoneId) stations = stations.where('s.zone_id', '=', filters.zoneId);
  if (filters.companyId) stations = stations.where('z.company_id', '=', filters.companyId);

  if (!user.permissions.includes('alcance.total')) {
    const accessible = await getAccessibleStationIds(user.id);
    if (accessible.length === 0) return [];
    stations = stations.where('s.id', 'in', accessible);
  }

  const rows = await db
    .selectFrom('users as u')
    .innerJoin('roles as r', 'r.id', 'u.role_id')
    .innerJoin('user_scopes as us', 'us.user_id', 'u.id')
    .select(['u.id', 'u.full_name as name'])
    .select((eb) => eb.fn.count('us.station_id').distinct().as('stationCount'))
    .where('r.code', '=', STATION_MANAGER_ROLE)
    .where('u.active', '=', true)
    .where('us.station_id', 'in', stations)
    .groupBy(['u.id', 'u.full_name'])
    .orderBy('u.full_name')
    .execute();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    stationCount: Number(row.stationCount),
  }));
}
