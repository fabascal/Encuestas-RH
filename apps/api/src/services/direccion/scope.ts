import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { ForbiddenError, NotFoundError } from '../../utils/httpErrors.js';
import { breakdownLevel, formatScopeLabel } from '../scope/hierarchyFilter.js';
import { findStationManager, managerStationIds } from '../scope/managers.js';
import { getAccessibleStationIds } from '../scope/scopeService.js';

export { breakdownLevel };

export interface DirectorStation {
  stationId: string;
  stationName: string;
  zoneId: string;
  zoneName: string;
  companyId: string;
  companyName: string;
}

export interface DirectionFilter {
  companyId?: string | undefined;
  zoneId?: string | undefined;
  managerId?: string | undefined;
  stationId?: string | undefined;
}

export async function resolveStations(user: AuthUser, query: DirectionFilter): Promise<DirectorStation[]> {
  let request = db
    .selectFrom('stations as s')
    .innerJoin('zones as z', 'z.id', 's.zone_id')
    .innerJoin('companies as c', 'c.id', 'z.company_id')
    .select([
      's.id as stationId',
      's.name as stationName',
      'z.id as zoneId',
      'z.name as zoneName',
      'c.id as companyId',
      'c.name as companyName',
    ])
    .where('s.active', '=', true)
    .orderBy('c.name')
    .orderBy('z.name')
    .orderBy('s.name');

  if (!user.permissions.includes('alcance.total')) {
    const ids = await getAccessibleStationIds(user.id);
    if (ids.length === 0) {
      await assertFilterVisible(query, false);
      return [];
    }
    request = request.where('s.id', 'in', ids);
  }

  if (query.stationId) {
    request = request.where('s.id', '=', query.stationId);
  } else {
    if (query.zoneId) request = request.where('z.id', '=', query.zoneId);
    else if (query.companyId) request = request.where('c.id', '=', query.companyId);
    if (query.managerId) {
      const managed = await managerStationIds(query.managerId);
      if (managed.length === 0) {
        await assertFilterVisible(query, user.permissions.includes('alcance.total'));
        return [];
      }
      request = request.where('s.id', 'in', managed);
    }
  }

  const stations = await request.execute();
  if (stations.length > 0) return stations;
  await assertFilterVisible(query, user.permissions.includes('alcance.total'));
  return [];
}

/** A filter outside the caller's stations is 403. A missing company, zone or station is 404. */
export async function assertFilterVisible(query: DirectionFilter, allowEmpty: boolean): Promise<void> {
  if (query.stationId) {
    const exists = await db.selectFrom('stations').select('id').where('id', '=', query.stationId).executeTakeFirst();
    if (!exists) throw new NotFoundError('No se encontró la estación');
  } else if (query.zoneId) {
    const exists = await db.selectFrom('zones').select('id').where('id', '=', query.zoneId).executeTakeFirst();
    if (!exists) throw new NotFoundError('No se encontró la zona');
  } else if (query.companyId) {
    const exists = await db.selectFrom('companies').select('id').where('id', '=', query.companyId).executeTakeFirst();
    if (!exists) throw new NotFoundError('No se encontró la empresa');
  } else if (!query.managerId && !allowEmpty) {
    throw new ForbiddenError('No tienes estaciones en tu alcance');
  }
  if (query.managerId) {
    const manager = await findStationManager(query.managerId);
    if (!manager) throw new NotFoundError('No se encontró el gerente');
  }
  if (!allowEmpty && (query.stationId || query.zoneId || query.companyId || query.managerId)) {
    throw new ForbiddenError('No tienes acceso a ese filtro');
  }
}

export async function scopeLabel(stations: DirectorStation[], query: DirectionFilter): Promise<string> {
  const first = stations[0];
  let base = 'Todas las estaciones';
  if (query.stationId) base = first?.stationName ?? (await lookupName('stations', query.stationId)) ?? 'Estación';
  else if (query.zoneId) base = first?.zoneName ?? (await lookupName('zones', query.zoneId)) ?? 'Zona';
  else if (query.companyId) base = first?.companyName ?? (await lookupName('companies', query.companyId)) ?? 'Empresa';
  const manager = query.managerId ? await findStationManager(query.managerId) : undefined;
  return formatScopeLabel(base, manager?.name);
}

async function lookupName(table: 'stations' | 'zones' | 'companies', id: string): Promise<string | undefined> {
  const row = await db.selectFrom(table).select('name').where('id', '=', id).executeTakeFirst();
  return row?.name;
}
