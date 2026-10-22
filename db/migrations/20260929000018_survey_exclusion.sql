-- migrate:up

ALTER TABLE survey_responses
  ADD COLUMN excluded boolean NOT NULL DEFAULT false,
  ADD COLUMN excluded_reason text,
  ADD COLUMN excluded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN excluded_at timestamptz;

ALTER TABLE survey_responses
  ADD CONSTRAINT survey_responses_excluded_reason_check
  CHECK (NOT excluded OR (excluded_reason IS NOT NULL AND btrim(excluded_reason) <> ''));

CREATE INDEX idx_survey_responses_considered ON survey_responses (station_id, period) WHERE NOT excluded;

INSERT INTO permissions (code, name, group_name)
VALUES ('origen.gestionar', 'Ver y ajustar el origen de datos', 'Origen de datos');

INSERT INTO role_permissions (role_id, permission_code)
SELECT id, 'origen.gestionar' FROM roles WHERE code = 'admin';

-- migrate:down

DELETE FROM role_permissions WHERE permission_code = 'origen.gestionar';
DELETE FROM permissions WHERE code = 'origen.gestionar';

DROP INDEX IF EXISTS idx_survey_responses_considered;
ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_excluded_reason_check;
ALTER TABLE survey_responses
  DROP COLUMN IF EXISTS excluded_at,
  DROP COLUMN IF EXISTS excluded_by,
  DROP COLUMN IF EXISTS excluded_reason,
  DROP COLUMN IF EXISTS excluded;
