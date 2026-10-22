-- migrate:up
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code)
);
CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
CREATE INDEX idx_zones_company_id ON zones (company_id);
CREATE TRIGGER trg_zones_updated_at BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (zone_id, code)
);
CREATE INDEX idx_stations_zone_id ON stations (zone_id);
CREATE TRIGGER trg_stations_updated_at BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Maps a station to the external identifier used by each integration provider
-- (Google Sheet row key, Nexus Fuel site id, Nomina 3 employee-group id, SISPA station id).
CREATE TABLE station_external_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  external_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
CREATE INDEX idx_station_external_refs_station_id ON station_external_refs (station_id);

-- migrate:down
DROP TABLE IF EXISTS station_external_refs;

DROP TRIGGER IF EXISTS trg_stations_updated_at ON stations;
DROP TABLE IF EXISTS stations;

DROP TRIGGER IF EXISTS trg_zones_updated_at ON zones;
DROP TABLE IF EXISTS zones;

DROP TRIGGER IF EXISTS trg_companies_updated_at ON companies;
DROP TABLE IF EXISTS companies;
