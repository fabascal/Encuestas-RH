import { db } from '../../db/index.js';
import { NotFoundError } from '../../utils/httpErrors.js';
import { getAccessibleStationIds } from '../scope/scopeService.js';
// --- Companies ---
export function listCompanies() {
    return db.selectFrom('companies').selectAll().orderBy('name').execute();
}
export async function listCompaniesForUser(user) {
    if (user.role === 'admin')
        return listCompanies();
    const stationIds = await getAccessibleStationIds(user.id);
    if (stationIds.length === 0)
        return [];
    return db
        .selectFrom('companies as c')
        .selectAll('c')
        .where('c.id', 'in', db
        .selectFrom('zones as z')
        .innerJoin('stations as s', 's.zone_id', 'z.id')
        .select('z.company_id')
        .where('s.id', 'in', stationIds))
        .distinct()
        .execute();
}
export function createCompany(input) {
    return db.insertInto('companies').values(input).returningAll().executeTakeFirstOrThrow();
}
export async function setCompanyActive(id, active) {
    const company = await db
        .updateTable('companies')
        .set({ active })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
    if (!company)
        throw new NotFoundError('Company not found');
    return company;
}
// --- Zones ---
export function listZones(companyId) {
    let query = db.selectFrom('zones').selectAll().orderBy('name');
    if (companyId)
        query = query.where('company_id', '=', companyId);
    return query.execute();
}
export async function listZonesForUser(user, companyId) {
    if (user.role === 'admin')
        return listZones(companyId);
    const stationIds = await getAccessibleStationIds(user.id);
    if (stationIds.length === 0)
        return [];
    let query = db
        .selectFrom('zones as z')
        .selectAll('z')
        .where('z.id', 'in', db.selectFrom('stations').select('zone_id').where('id', 'in', stationIds));
    if (companyId)
        query = query.where('z.company_id', '=', companyId);
    return query.execute();
}
export function createZone(input) {
    return db
        .insertInto('zones')
        .values({ company_id: input.companyId, code: input.code, name: input.name })
        .returningAll()
        .executeTakeFirstOrThrow();
}
export async function setZoneActive(id, active) {
    const zone = await db
        .updateTable('zones')
        .set({ active })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
    if (!zone)
        throw new NotFoundError('Zone not found');
    return zone;
}
// --- Stations ---
export function listStations(zoneId) {
    let query = db.selectFrom('stations').selectAll().orderBy('name');
    if (zoneId)
        query = query.where('zone_id', '=', zoneId);
    return query.execute();
}
export async function listStationsForUser(user, zoneId) {
    if (user.role === 'admin')
        return listStations(zoneId);
    const stationIds = await getAccessibleStationIds(user.id);
    if (stationIds.length === 0)
        return [];
    let query = db.selectFrom('stations').selectAll().where('id', 'in', stationIds);
    if (zoneId)
        query = query.where('zone_id', '=', zoneId);
    return query.execute();
}
export function createStation(input) {
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
export async function getStation(id) {
    const station = await db.selectFrom('stations').selectAll().where('id', '=', id).executeTakeFirst();
    if (!station)
        throw new NotFoundError('Station not found');
    return station;
}
export async function setStationActive(id, active) {
    const station = await db
        .updateTable('stations')
        .set({ active })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst();
    if (!station)
        throw new NotFoundError('Station not found');
    return station;
}
//# sourceMappingURL=orgService.js.map