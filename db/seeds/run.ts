/**
 * Idempotent seed script: base kpi rubros + one initial admin user.
 * Run with: DATABASE_URL=... node --experimental-strip-types db/seeds/run.ts
 */
import argon2 from 'argon2';
import { Client } from 'pg';

const KPI_CATEGORIES = [
  {
    code: 'oil_sales',
    name: 'Venta de aceite',
    unit: 'currency',
    higherIsBetter: true,
    sourceProvider: 'nexus_fuel',
  },
  {
    code: 'punctuality',
    name: 'Puntualidad',
    unit: 'percentage',
    higherIsBetter: true,
    sourceProvider: 'nomina3',
  },
  {
    code: 'staff_turnover',
    name: 'Rotación por renuncia',
    unit: 'count',
    higherIsBetter: false,
    sourceProvider: 'nomina3',
  },
  {
    code: 'sispa_compliance',
    name: 'Cumplimiento SISPA',
    unit: 'percentage',
    higherIsBetter: true,
    sourceProvider: 'sispa',
  },
  {
    code: 'survey_score',
    name: 'Encuestas a jefes de piso',
    unit: 'percentage',
    higherIsBetter: true,
    sourceProvider: 'google_forms',
  },
  {
    code: 'open_dispensers',
    name: 'Dispensarios abiertos',
    unit: 'count',
    higherIsBetter: true,
    sourceProvider: null,
  },
] as const;

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run seeds');
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    for (const kpi of KPI_CATEGORIES) {
      await client.query(
        `INSERT INTO kpi_categories (code, name, unit, higher_is_better, source_provider)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO NOTHING`,
        [kpi.code, kpi.name, kpi.unit, kpi.higherIsBetter, kpi.sourceProvider],
      );
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@portal.local';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
    const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

    await client.query(
      `INSERT INTO users (email, full_name, password_hash, role_id)
       SELECT $1, 'Administrador General', $2, id FROM roles WHERE code = 'admin'
       ON CONFLICT (email) DO NOTHING`,
      [adminEmail, passwordHash],
    );

    await client.query('COMMIT');

    console.log(`Seed complete. ${KPI_CATEGORIES.length} kpi categories ensured.`);
    console.log(`Admin user: ${adminEmail}`);
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log(`Using default password "${adminPassword}" - change it after first login.`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
