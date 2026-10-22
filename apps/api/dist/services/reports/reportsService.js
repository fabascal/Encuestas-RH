import { db } from '../../db/index.js';
import { NotFoundError } from '../../utils/httpErrors.js';
import { calculateStationBonusForPeriod } from '../bonusEngine/bonusEngineService.js';
import { getAccessibleStationIds } from '../scope/scopeService.js';
async function listScopedStations(user, filters) {
    let query = db
        .selectFrom('stations as s')
        .innerJoin('zones as z', 'z.id', 's.zone_id')
        .innerJoin('companies as c', 'c.id', 'z.company_id')
        .select([
        's.id as station_id',
        's.code as station_code',
        's.name as station_name',
        'z.name as zone_name',
        'c.name as company_name',
    ])
        .where('s.active', '=', true)
        .orderBy('c.name')
        .orderBy('z.name')
        .orderBy('s.name');
    if (user.role !== 'admin') {
        const stationIds = await getAccessibleStationIds(user.id);
        if (stationIds.length === 0)
            return [];
        query = query.where('s.id', 'in', stationIds);
    }
    if (filters.stationId)
        query = query.where('s.id', '=', filters.stationId);
    else if (filters.zoneId)
        query = query.where('z.id', '=', filters.zoneId);
    else if (filters.companyId)
        query = query.where('c.id', '=', filters.companyId);
    return query.execute();
}
/** On-screen / exportable report: bono breakdown for every station visible to the user. */
export async function buildStationsReport(user, filters, period) {
    const stations = await listScopedStations(user, filters);
    const rows = [];
    for (const station of stations) {
        const base = {
            stationId: station.station_id,
            stationCode: station.station_code,
            stationName: station.station_name,
            zoneName: station.zone_name,
            companyName: station.company_name,
        };
        try {
            const { result } = await calculateStationBonusForPeriod(station.station_id, period);
            rows.push({
                ...base,
                configured: true,
                poolAmount: result.poolAmount,
                totalPayout: result.totalPayout,
                lines: result.lines,
            });
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                rows.push({ ...base, configured: false, poolAmount: 0, totalPayout: 0, lines: [] });
                continue;
            }
            throw error;
        }
    }
    return {
        period,
        generatedAt: new Date().toISOString(),
        rows,
        totalPool: rows.reduce((sum, row) => sum + row.poolAmount, 0),
        totalPayout: rows.reduce((sum, row) => sum + row.totalPayout, 0),
    };
}
//# sourceMappingURL=reportsService.js.map