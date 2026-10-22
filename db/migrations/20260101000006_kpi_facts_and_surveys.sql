-- migrate:up
-- One value per station/kpi/period. The unique constraint makes ingestion from
-- external sources idempotent: jobs upsert on (station_id, kpi_category_id, period).
-- sync_run_id is a plain uuid here; its FK to sync_runs is added once that table
-- exists (see 20260101000008_integrations.sql) to avoid a forward reference.
CREATE TABLE kpi_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  kpi_category_id uuid NOT NULL REFERENCES kpi_categories(id),
  period date NOT NULL REFERENCES periods(period),
  value numeric(14, 2) NOT NULL,
  source text NOT NULL,
  sync_run_id uuid,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (station_id, kpi_category_id, period)
);
CREATE INDEX idx_kpi_facts_period ON kpi_facts (period);
CREATE INDEX idx_kpi_facts_station_id ON kpi_facts (station_id);
CREATE TRIGGER trg_kpi_facts_updated_at BEFORE UPDATE ON kpi_facts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Raw Google Forms/Sheets submissions from floor managers, kept for audit even
-- after being aggregated into kpi_facts for the surveys rubro.
CREATE TABLE survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid REFERENCES stations(id) ON DELETE SET NULL,
  period date REFERENCES periods(period),
  external_id text NOT NULL UNIQUE,
  respondent_email citext,
  answers jsonb NOT NULL,
  submitted_at timestamptz NOT NULL,
  sync_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_survey_responses_station_period ON survey_responses (station_id, period);

-- migrate:down
DROP TABLE IF EXISTS survey_responses;
DROP TRIGGER IF EXISTS trg_kpi_facts_updated_at ON kpi_facts;
DROP TABLE IF EXISTS kpi_facts;
