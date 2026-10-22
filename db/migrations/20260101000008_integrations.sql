-- migrate:up
-- Encrypted external credentials (Google service account key, Nexus Fuel/Nomina3/SISPA
-- API tokens). Encryption (AES-256-GCM) happens in the API layer with a master key from
-- APP_ENCRYPTION_KEY; only ciphertext, iv and auth_tag are persisted. config holds
-- non-secret settings (base URLs, sheet ids). company_id is null for a global credential.
CREATE TABLE integration_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider integration_provider NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  secret_ciphertext text NOT NULL,
  iv text NOT NULL,
  auth_tag text NOT NULL,
  key_version integer NOT NULL DEFAULT 1,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  cron_expression text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_tested_at timestamptz,
  last_test_success boolean,
  last_test_message text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_integration_credentials_provider_company
  ON integration_credentials (provider, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE TRIGGER trg_integration_credentials_updated_at BEFORE UPDATE ON integration_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- One row per pg-boss job execution attempt against an external source.
CREATE TABLE sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES integration_credentials(id) ON DELETE CASCADE,
  provider integration_provider NOT NULL,
  status sync_status NOT NULL DEFAULT 'queued',
  attempt integer NOT NULL DEFAULT 1,
  records_read integer NOT NULL DEFAULT 0,
  records_upserted integer NOT NULL DEFAULT 0,
  error_message text,
  job_id uuid,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_runs_credential_id ON sync_runs (credential_id);
CREATE INDEX idx_sync_runs_status ON sync_runs (status);

-- Line-by-line execution log for a sync_run, shown in the admin sync status screen.
CREATE TABLE sync_run_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sync_run_id uuid NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  context jsonb,
  logged_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_run_logs_sync_run_id ON sync_run_logs (sync_run_id);

ALTER TABLE kpi_facts
  ADD CONSTRAINT fk_kpi_facts_sync_run FOREIGN KEY (sync_run_id) REFERENCES sync_runs (id) ON DELETE SET NULL;
ALTER TABLE survey_responses
  ADD CONSTRAINT fk_survey_responses_sync_run FOREIGN KEY (sync_run_id) REFERENCES sync_runs (id) ON DELETE SET NULL;

-- migrate:down
ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS fk_survey_responses_sync_run;
ALTER TABLE kpi_facts DROP CONSTRAINT IF EXISTS fk_kpi_facts_sync_run;

DROP TABLE IF EXISTS sync_run_logs;
DROP TABLE IF EXISTS sync_runs;

DROP TRIGGER IF EXISTS trg_integration_credentials_updated_at ON integration_credentials;
DROP TABLE IF EXISTS integration_credentials;
