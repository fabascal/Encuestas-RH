-- migrate:up
-- Append-only trail of sensitive writes (org changes, RBAC changes, rule/credential
-- edits, period closes). before/after store the row state as jsonb for diffing.
CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  before jsonb,
  after jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- BRIN suits an append-only, time-ordered table much better than a btree here.
CREATE INDEX idx_audit_log_created_at ON audit_log USING brin (created_at);
CREATE INDEX idx_audit_log_entity ON audit_log (entity, entity_id);

-- migrate:down
DROP TABLE IF EXISTS audit_log;
