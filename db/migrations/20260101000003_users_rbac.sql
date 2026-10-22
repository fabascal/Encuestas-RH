-- migrate:up
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  -- Bumped on password change/forced logout so previously issued access tokens are rejected.
  token_version integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Stores only the hash of each refresh token, never the raw value.
CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE UNIQUE INDEX idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);

-- A user is granted access to exactly one node of the hierarchy per row; multiple
-- rows let a zone manager (for example) be assigned to several zones.
CREATE TABLE user_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES zones(id) ON DELETE CASCADE,
  station_id uuid REFERENCES stations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_user_scope_single_level CHECK (num_nonnulls(company_id, zone_id, station_id) = 1)
);
CREATE INDEX idx_user_scopes_user_id ON user_scopes (user_id);
CREATE UNIQUE INDEX idx_user_scopes_unique_company ON user_scopes (user_id, company_id) WHERE company_id IS NOT NULL;
CREATE UNIQUE INDEX idx_user_scopes_unique_zone ON user_scopes (user_id, zone_id) WHERE zone_id IS NOT NULL;
CREATE UNIQUE INDEX idx_user_scopes_unique_station ON user_scopes (user_id, station_id) WHERE station_id IS NOT NULL;

-- Expands a user's company/zone/station scopes into the flat list of station ids
-- they may access. Every KPI, report and bonus query filters through this function.
CREATE FUNCTION fn_user_station_ids(p_user_id uuid) RETURNS TABLE (station_id uuid) AS $$
  SELECT s.id
  FROM stations s
  JOIN zones z ON z.id = s.zone_id
  WHERE
    EXISTS (SELECT 1 FROM user_scopes us WHERE us.user_id = p_user_id AND us.company_id = z.company_id)
    OR EXISTS (SELECT 1 FROM user_scopes us WHERE us.user_id = p_user_id AND us.zone_id = s.zone_id)
    OR EXISTS (SELECT 1 FROM user_scopes us WHERE us.user_id = p_user_id AND us.station_id = s.id)
$$ LANGUAGE sql STABLE;

-- migrate:down
DROP FUNCTION IF EXISTS fn_user_station_ids(uuid);
DROP TABLE IF EXISTS user_scopes;
DROP TABLE IF EXISTS refresh_tokens;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP TABLE IF EXISTS users;
