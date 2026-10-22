-- migrate:up

ALTER TABLE webhook_events
  ADD COLUMN status text NOT NULL DEFAULT 'pending',
  ADD COLUMN station_id uuid REFERENCES stations(id) ON DELETE SET NULL,
  ADD COLUMN survey_response_id uuid,
  ADD COLUMN processed_at timestamptz,
  ADD COLUMN message text;

ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_status_check
  CHECK (status IN ('pending', 'processed', 'unmatched', 'invalid', 'error'));

CREATE INDEX idx_webhook_events_status ON webhook_events (status);

-- migrate:down

DROP INDEX IF EXISTS idx_webhook_events_status;
ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_status_check;
ALTER TABLE webhook_events
  DROP COLUMN IF EXISTS message,
  DROP COLUMN IF EXISTS processed_at,
  DROP COLUMN IF EXISTS survey_response_id,
  DROP COLUMN IF EXISTS station_id,
  DROP COLUMN IF EXISTS status;
