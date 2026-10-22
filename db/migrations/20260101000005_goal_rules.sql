-- migrate:up
-- A versioned bundle of bonus rules for one scope (company, zone or station) and a
-- date range. Rules are never edited in place: changing them closes the current
-- valid_during range and inserts a new row, so past periods keep computing against
-- the parameters that were active when they happened.
CREATE TABLE goal_rule_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_level hierarchy_level NOT NULL,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES zones(id) ON DELETE CASCADE,
  station_id uuid REFERENCES stations(id) ON DELETE CASCADE,
  valid_during daterange NOT NULL,
  pool_amount numeric(14, 2) NOT NULL CHECK (pool_amount >= 0),
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_goal_rule_sets_scope CHECK (
    (scope_level = 'company' AND company_id IS NOT NULL AND zone_id IS NULL AND station_id IS NULL)
    OR (scope_level = 'zone' AND zone_id IS NOT NULL AND company_id IS NULL AND station_id IS NULL)
    OR (scope_level = 'station' AND station_id IS NOT NULL AND company_id IS NULL AND zone_id IS NULL)
  )
);

-- Blocks two overlapping validity ranges for the same scope. NULL scope columns are
-- coalesced to a sentinel uuid so the exclusion constraint can compare them with '='.
ALTER TABLE goal_rule_sets ADD CONSTRAINT excl_goal_rule_sets_no_overlap
  EXCLUDE USING gist (
    COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
    COALESCE(zone_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
    COALESCE(station_id, '00000000-0000-0000-0000-000000000000'::uuid) WITH =,
    valid_during WITH &&
  );

CREATE INDEX idx_goal_rule_sets_company ON goal_rule_sets (company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_goal_rule_sets_zone ON goal_rule_sets (zone_id) WHERE zone_id IS NOT NULL;
CREATE INDEX idx_goal_rule_sets_station ON goal_rule_sets (station_id) WHERE station_id IS NOT NULL;
CREATE INDEX idx_goal_rule_sets_valid_during ON goal_rule_sets USING gist (valid_during);

-- One row per kpi_category inside a rule set: its weight of the pool and how its
-- goal is evaluated (fixed_amount or percentage). See fn_check_goal_rule_set_weights
-- below for the cross-row invariant that weights must sum to 100.
CREATE TABLE goal_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id uuid NOT NULL REFERENCES goal_rule_sets(id) ON DELETE CASCADE,
  kpi_category_id uuid NOT NULL REFERENCES kpi_categories(id),
  weight numeric(5, 2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
  goal_type goal_type NOT NULL,
  target_value numeric(14, 2) NOT NULL CHECK (target_value >= 0),
  -- fixed_amount: minimum accreditable amount, 0 payout below it.
  min_amount numeric(14, 2) CHECK (min_amount >= 0),
  -- percentage: minimum % of target required to accredit any payout.
  min_threshold_pct numeric(5, 2) CHECK (min_threshold_pct >= 0 AND min_threshold_pct <= 100),
  -- percentage: cap on the progress % used for payout; 100 = no accelerator.
  max_payout_pct numeric(6, 2) NOT NULL DEFAULT 100 CHECK (max_payout_pct >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_set_id, kpi_category_id),
  CONSTRAINT chk_goal_rules_fixed_amount CHECK (goal_type <> 'fixed_amount' OR min_amount IS NOT NULL),
  CONSTRAINT chk_goal_rules_percentage CHECK (goal_type <> 'percentage' OR min_threshold_pct IS NOT NULL)
);
CREATE INDEX idx_goal_rules_rule_set_id ON goal_rules (rule_set_id);
CREATE INDEX idx_goal_rules_kpi_category_id ON goal_rules (kpi_category_id);

CREATE FUNCTION fn_check_goal_rule_set_weights() RETURNS trigger AS $$
DECLARE
  v_rule_set_id uuid;
  v_total numeric;
BEGIN
  v_rule_set_id := COALESCE(NEW.rule_set_id, OLD.rule_set_id);
  SELECT COALESCE(SUM(weight), 0) INTO v_total FROM goal_rules WHERE rule_set_id = v_rule_set_id;
  IF v_total <> 100 THEN
    RAISE EXCEPTION 'goal_rules weights for rule_set % must sum to 100, got %', v_rule_set_id, v_total;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Deferred to the end of the transaction so a rule set and its rules can be
-- inserted together without violating the invariant mid-transaction.
CREATE CONSTRAINT TRIGGER trg_goal_rules_weight_sum
  AFTER INSERT OR UPDATE OR DELETE ON goal_rules
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION fn_check_goal_rule_set_weights();

-- migrate:down
DROP TRIGGER IF EXISTS trg_goal_rules_weight_sum ON goal_rules;
DROP FUNCTION IF EXISTS fn_check_goal_rule_set_weights();
DROP TABLE IF EXISTS goal_rules;
DROP TABLE IF EXISTS goal_rule_sets;
