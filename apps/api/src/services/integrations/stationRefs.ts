import type { IntegrationProvider, StationRefInput } from '@portal/shared';
import { db } from '../../db/index.js';
import { ConflictError } from '../../utils/httpErrors.js';

export function listStationRefs(provider: IntegrationProvider) {
  return db
    .selectFrom('station_external_refs as r')
    .innerJoin('stations as s', 's.id', 'r.station_id')
    .select(['r.id', 'r.provider', 'r.external_id', 'r.station_id', 's.name as station_name', 'r.created_at'])
    .where('r.provider', '=', provider)
    .orderBy('r.external_id')
    .execute();
}

export async function createStationRef(provider: IntegrationProvider, input: StationRefInput) {
  try {
    return await db
      .insertInto('station_external_refs')
      .values({
        provider,
        external_id: input.externalId.trim(),
        station_id: input.stationId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === '23505') {
      throw new ConflictError('Esa estación externa ya está ligada a este proveedor');
    }
    throw error;
  }
}

export function deleteStationRef(id: string) {
  return db.deleteFrom('station_external_refs').where('id', '=', id).execute();
}
