import type { ReportQuery } from '@portal/shared';
import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { ForbiddenError, NotFoundError } from '../../utils/httpErrors.js';
import { formatScopeLabel } from '../scope/hierarchyFilter.js';
import { findStationManager, managerStationIds } from '../scope/managers.js';
import { getAccessibleStationIds } from '../scope/scopeService.js';

export interface ScopedStation {
  stationId: string;
  stationCode: string;
  stationName: string;
  zoneName: string;
  companyName: string;
}

export async function listScopedStations(user: AuthUser, filters: ReportQuery): Promise<ScopedStation[]> {
  let query = db
    .selectFrom('stations as s')
    .innerJoin('zones as z', 'z.id', 's.zone_id')
    .innerJoin('companies as c', 'c.id', 'z.company_id')
    .select([
      's.id as stationId',
      's.code as stationCode',
      's.name as stationName',
      'z.name as zoneName',
      'c.name as companyName',
    ])
    .where('s.active', '=', true)
    .orderBy('c.name')
    .orderBy('z.name')
    .orderBy('s.name');

  if (!user.permissions.includes('alcance.total')) {
    const stationIds = await getAccessibleStationIds(user.id);
    if (stationIds.length === 0) return [];
    query = query.where('s.id', 'in', stationIds);
  }

  if (filters.stationId) {
    query = query.where('s.id', '=', filters.stationId);
  } else {
    if (filters.zoneId) query = query.where('z.id', '=', filters.zoneId);
    else if (filters.companyId) query = query.where('c.id', '=', filters.companyId);
    if (filters.managerId) {
      const managed = await managerStationIds(filters.managerId);
      if (managed.length === 0) return [];
      query = query.where('s.id', 'in', managed);
    }
  }

  return query.execute();
}

export async function scopeLabel(stations: ScopedStation[], filters: ReportQuery): Promise<string> {
  const first = stations[0];
  let base = 'Todas las estaciones';
  if (filters.stationId) base = first ? `${first.stationName} (${first.stationCode})` : 'Estación';
  else if (filters.zoneId) base = first?.zoneName ?? 'Zona';
  else if (filters.companyId) base = first?.companyName ?? 'Empresa';
  const manager = filters.managerId ? await findStationManager(filters.managerId) : undefined;
  return formatScopeLabel(base, manager?.name);
}

/** 422 is raised by the route when stationId is missing. Here, out of scope is 403. */
export async function assertStationAccess(user: AuthUser, stationId: string): Promise<ScopedStation> {
  const rows = await listScopedStations(user, { period: '2000-01-01', stationId });
  const station = rows[0];
  if (station) return station;
  const exists = await db.selectFrom('stations').select('id').where('id', '=', stationId).executeTakeFirst();
  if (!exists) throw new NotFoundError('No se encontró la estación');
  throw new ForbiddenError('No tienes acceso a esa estación');
}
