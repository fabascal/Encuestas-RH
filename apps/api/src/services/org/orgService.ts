import type {
  CreateCompanyInput,
  CreateStationInput,
  CreateZoneInput,
  UpdateCompanyInput,
  UpdateStationInput,
  UpdateZoneInput,
} from '@portal/shared';
import { db } from '../../db/index.js';
import type { AuthUser } from '../../middlewares/authenticate.js';
import { NotFoundError, ValidationError } from '../../utils/httpErrors.js';
import { managerStationIds } from '../scope/managers.js';
import { getAccessibleStationIds } from '../scope/scopeService.js';

// --- Companies ---

export function listCompanies() {
  return db.selectFrom('companies').selectAll().orderBy('name').execute();
}

export async function listCompaniesForUser(user: AuthUser) {
  if (user.permissions.includes('alcance.total')) return listCompanies();

  const stationIds = await getAccessibleStationIds(user.id);
  if (stationIds.length === 0) return [];

  return db
    .selectFrom('companies as c')
    .selectAll('c')
    .where(
      'c.id',
      'in',
      db
        .selectFrom('zones as z')
        .innerJoin('stations as s', 's.zone_id', 'z.id')
        .select('z.company_id')
        .where('s.id', 'in', stationIds),
    )
    .distinct()
    .execute();
}

export function createCompany(input: CreateCompanyInput) {
  return db.insertInto('companies').values(input).returningAll().executeTakeFirstOrThrow();
}

export async function updateCompany(id: string, input: UpdateCompanyInput) {
  const before = await db.selectFrom('companies').selectAll().where('id', '=', id).executeTakeFirst();
  if (!before) throw new NotFoundError('No se encontró la empresa');
  const company = await db
    .updateTable('companies')
    .set({
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow();
  return { before, company };
}

export async function setCompanyActive(id: string, active: boolean) {
  const company = await db
    .updateTable('companies')
    .set({ active })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
  if (!company) throw new NotFoundError('No se encontró la empresa');
  return company;
}

// --- Zones ---

export function listZones(companyId?: string) {
  let query = db.selectFrom('zones').selectAll().orderBy('name');
  if (companyId) query = query.where('company_id', '=', companyId);
  return query.execute();
}

export async function listZonesForUser(user: AuthUser, companyId?: string) {
  if (user.permissions.includes('alcance.total')) return listZones(companyId);

  const stationIds = await getAccessibleStationIds(user.id);
  if (stationIds.length === 0) return [];

  let query = db
    .selectFrom('zones as z')
    .selectAll('z')
    .where(
      'z.id',
      'in',
      db.selectFrom('stations').select('zone_id').where('id', 'in', stationIds),
    );
  if (companyId) query = query.where('z.company_id', '=', companyId);
  return query.execute();
}

export function createZone(input: CreateZoneInput) {
  return db
    .insertInto('zones')
    .values({ company_id: input.companyId, code: input.code, name: input.name })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateZone(id: string, input: UpdateZoneInput) {
  const before = await db.selectFrom('zones').selectAll().where('id', '=', id).executeTakeFirst();
  if (!before) throw new NotFoundError('No se encontró la zona');
  const zone = await db
    .updateTable('zones')
    .set({
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow();
  return { before, zone };
}

export async function setZoneActive(id: string, active: boolean) {
  const zone = await db
    .updateTable('zones')
    .set({ active })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
  if (!zone) throw new NotFoundError('No se encontró la zona');
  return zone;
}

// --- Stations ---

export async function listStations(filters: { zoneId?: string; managerId?: string } = {}) {
  let query = db.selectFrom('stations').selectAll().orderBy('name');
  if (filters.zoneId) query = query.where('zone_id', '=', filters.zoneId);
  if (filters.managerId) {
    const managed = await managerStationIds(filters.managerId);
    if (managed.length === 0) return [];
    query = query.where('id', 'in', managed);
  }
  return query.execute();
}

export async function listStationsForUser(
  user: AuthUser,
  filters: { zoneId?: string; managerId?: string } = {},
) {
  if (user.permissions.includes('alcance.total')) return listStations(filters);

  const stationIds = await getAccessibleStationIds(user.id);
  if (stationIds.length === 0) return [];

  let allowed = stationIds;
  if (filters.managerId) {
    const managed = new Set(await managerStationIds(filters.managerId));
    allowed = stationIds.filter((id) => managed.has(id));
    if (allowed.length === 0) return [];
  }

  let query = db.selectFrom('stations').selectAll().where('id', 'in', allowed);
  if (filters.zoneId) query = query.where('zone_id', '=', filters.zoneId);
  return query.execute();
}

export function createStation(input: CreateStationInput) {
  return db
    .insertInto('stations')
    .values({
      zone_id: input.zoneId,
      code: input.code,
      name: input.name,
      address: input.address ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function getStation(id: string) {
  const station = await db.selectFrom('stations').selectAll().where('id', '=', id).executeTakeFirst();
  if (!station) throw new NotFoundError('No se encontró la estación');
  return station;
}

export async function updateStation(id: string, input: UpdateStationInput) {
  const before = await db.selectFrom('stations').selectAll().where('id', '=', id).executeTakeFirst();
  if (!before) throw new NotFoundError('No se encontró la estación');

  let zoneId = before.zone_id;
  if (input.zoneId !== undefined && input.zoneId !== before.zone_id) {
    const currentZone = await db
      .selectFrom('zones')
      .select('company_id')
      .where('id', '=', before.zone_id)
      .executeTakeFirst();
    const nextZone = await db
      .selectFrom('zones')
      .select('company_id')
      .where('id', '=', input.zoneId)
      .executeTakeFirst();
    if (!nextZone || !currentZone || nextZone.company_id !== currentZone.company_id) {
      throw new ValidationError('La estación solo puede moverse a una zona de la misma empresa');
    }
    zoneId = input.zoneId;
  }

  const station = await db
    .updateTable('stations')
    .set({
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(zoneId !== before.zone_id ? { zone_id: zoneId } : {}),
    })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirstOrThrow();
  return { before, station };
}

export async function setStationActive(id: string, active: boolean) {
  const station = await db
    .updateTable('stations')
    .set({ active })
    .where('id', '=', id)
    .returningAll()
    .executeTakeFirst();
  if (!station) throw new NotFoundError('No se encontró la estación');
  return station;
}
