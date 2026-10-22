-- migrate:up

CREATE TABLE webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'google_forms',
  method text NOT NULL,
  content_type text,
  headers jsonb NOT NULL,
  query jsonb NOT NULL,
  body jsonb,
  raw_body text,
  remote_ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_events_created_at ON webhook_events (created_at DESC);

-- migrate:down

DROP TABLE IF EXISTS webhook_events;
