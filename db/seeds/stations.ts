/**
 * Idempotent station load from the operations export.
 * Zone names in the file map to the portal zone codes.
 * Run with: DATABASE_URL=... node --experimental-strip-types db/seeds/stations.ts demo/data.txt
 */
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const ZONE_CODES: Record<string, string> = {
  'Zona Bajio': 'BAJ',
  'Zona Occidente': 'OCC',
  'Zona Sur': 'SUR',
};

interface SourceStation {
  nombre: string;
  identificador_externo: string;
}

interface SourceZone {
  nombre: string;
  estaciones: SourceStation[];
}

interface SourceFile {
  data: { zonas: SourceZone[] };
}

interface ZoneRow {
  id: string;
  code: string;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');

  const filePath = process.argv[2] ?? 'demo/data.txt';
  const source = JSON.parse(readFileSync(filePath, 'utf8')) as SourceFile;
  const zones = source.data?.zonas;
  if (!Array.isArray(zones) || zones.length === 0) throw new Error('El archivo no trae zonas');

  const unknown = zones.map((zone) => zone.nombre).filter((name) => !(name in ZONE_CODES));
  if (unknown.length > 0) throw new Error(`Zona sin mapa: ${unknown.join(', ')}`);

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  let started = false;
  try {
    const portalZones = await client.query<ZoneRow>('SELECT id, code FROM zones WHERE active = true');
    const zoneByCode = new Map(portalZones.rows.map((zone) => [zone.code, zone.id]));
    for (const code of new Set(Object.values(ZONE_CODES))) {
      if (!zoneByCode.has(code)) throw new Error(`No existe la zona ${code} en el portal`);
    }

    const planned = zones.flatMap((zone) =>
      zone.estaciones.map((station) => ({
        zoneCode: ZONE_CODES[zone.nombre] ?? '',
        zoneId: zoneByCode.get(ZONE_CODES[zone.nombre] ?? '') ?? '',
        code: station.identificador_externo.trim(),
        name: station.nombre.trim(),
      })),
    );

    const existing = await client.query<{ code: string; zone_code: string }>(
      `SELECT s.code, z.code AS zone_code
       FROM stations s
       JOIN zones z ON z.id = s.zone_id
       WHERE s.code = ANY($1::text[])`,
      [planned.map((station) => station.code)],
    );
    const conflicts = existing.rows.filter((row) => {
      const target = planned.find((station) => station.code === row.code);
      return target !== undefined && target.zoneCode !== row.zone_code;
    });
    if (conflicts.length > 0) {
      const detail = conflicts.map((row) => `${row.code} está en ${row.zone_code}`).join('; ');
      throw new Error(`Código en otra zona, no se mueve: ${detail}`);
    }

    await client.query('BEGIN');
    started = true;
    const summary = new Map<string, { created: number; updated: number }>();
    for (const station of planned) {
      const counts = summary.get(station.zoneCode) ?? { created: 0, updated: 0 };
      const current = await client.query<{ id: string }>(
        'SELECT id FROM stations WHERE zone_id = $1 AND code = $2',
        [station.zoneId, station.code],
      );
      if (current.rowCount === 0) {
        await client.query(
          'INSERT INTO stations (zone_id, code, name, active) VALUES ($1, $2, $3, true)',
          [station.zoneId, station.code, station.name],
        );
        counts.created += 1;
      } else {
        await client.query('UPDATE stations SET name = $1, active = true WHERE zone_id = $2 AND code = $3', [
          station.name,
          station.zoneId,
          station.code,
        ]);
        counts.updated += 1;
      }
      summary.set(station.zoneCode, counts);
    }
    await client.query('COMMIT');

    for (const [code, counts] of summary) {
      console.log(`${code}: ${counts.created} nuevas, ${counts.updated} actualizadas`);
    }
    console.log(`Total: ${planned.length} estaciones`);
  } catch (error) {
    if (started) await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('Alta de estaciones falló:', error);
  process.exit(1);
});
