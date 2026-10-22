import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { env } from '../config/env.js';
const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
});
export const db = new Kysely({
    dialect: new PostgresDialect({ pool }),
});
//# sourceMappingURL=index.js.map