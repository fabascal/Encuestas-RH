-- migrate:up

CREATE TABLE kpi_daily_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  kpi_category_id uuid NOT NULL REFERENCES kpi_categories(id),
  day date NOT NULL,
  value numeric NOT NULL,
  source text NOT NULL,
  sync_run_id uuid REFERENCES sync_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (station_id, kpi_category_id, day)
);
CREATE INDEX idx_kpi_daily_facts_day ON kpi_daily_facts (kpi_category_id, day);
CREATE TRIGGER trg_kpi_daily_facts_updated_at BEFORE UPDATE ON kpi_daily_facts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sync_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES integration_credentials(id) ON DELETE CASCADE,
  day date NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  stations_count integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  unmatched_count integer NOT NULL DEFAULT 0,
  runs_count integer NOT NULL DEFAULT 0,
  last_run_id uuid REFERENCES sync_runs(id) ON DELETE SET NULL,
  last_synced_at timestamptz,
  error_message text,
  stations jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (credential_id, day)
);
CREATE INDEX idx_sync_days_credential_day ON sync_days (credential_id, day);

ALTER TABLE sync_runs ADD COLUMN target_day date;
CREATE INDEX idx_sync_runs_target_day ON sync_runs (credential_id, target_day);

-- migrate:down

DROP INDEX IF EXISTS idx_sync_runs_target_day;
ALTER TABLE sync_runs DROP COLUMN IF EXISTS target_day;
DROP TABLE IF EXISTS sync_days;
DROP TRIGGER IF EXISTS trg_kpi_daily_facts_updated_at ON kpi_daily_facts;
DROP TABLE IF EXISTS kpi_daily_facts;
