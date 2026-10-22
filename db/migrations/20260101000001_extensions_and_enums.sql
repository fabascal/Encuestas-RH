-- migrate:up
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_role AS ENUM ('admin', 'zone_manager', 'floor_manager');
CREATE TYPE goal_type AS ENUM ('fixed_amount', 'percentage');
CREATE TYPE integration_provider AS ENUM ('google_forms', 'nexus_fuel', 'nomina3', 'sispa');
CREATE TYPE sync_status AS ENUM ('queued', 'running', 'success', 'failed', 'retrying');
CREATE TYPE period_status AS ENUM ('open', 'closed');
CREATE TYPE hierarchy_level AS ENUM ('company', 'zone', 'station');
CREATE TYPE kpi_unit AS ENUM ('currency', 'percentage', 'score', 'count');

-- Reused by every table that has an updated_at column.
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- migrate:down
DROP FUNCTION IF EXISTS set_updated_at();

DROP TYPE IF EXISTS kpi_unit;
DROP TYPE IF EXISTS hierarchy_level;
DROP TYPE IF EXISTS period_status;
DROP TYPE IF EXISTS sync_status;
DROP TYPE IF EXISTS integration_provider;
DROP TYPE IF EXISTS goal_type;
DROP TYPE IF EXISTS user_role;

DROP EXTENSION IF EXISTS btree_gist;
DROP EXTENSION IF EXISTS citext;
DROP EXTENSION IF EXISTS pgcrypto;
