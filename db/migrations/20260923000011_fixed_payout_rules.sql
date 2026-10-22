-- migrate:up

ALTER TABLE goal_rule_sets
  ADD COLUMN mode rule_set_mode NOT NULL DEFAULT 'pool_weighted';

ALTER TABLE goal_rules ALTER COLUMN weight DROP NOT NULL;
ALTER TABLE goal_rules
  ADD COLUMN comparator rule_comparator,
  ADD COLUMN threshold_value numeric(14, 2),
  ADD COLUMN payout_amount numeric(14, 2) CHECK (payout_amount IS NULL OR payout_amount >= 0);

ALTER TABLE goal_rules DROP CONSTRAINT chk_goal_rules_fixed_amount;
ALTER TABLE goal_rules DROP CONSTRAINT chk_goal_rules_percentage;

ALTER TABLE goal_rules ADD CONSTRAINT chk_goal_rules_fixed_amount
  CHECK (goal_type <> 'fixed_amount' OR min_amount IS NOT NULL);
ALTER TABLE goal_rules ADD CONSTRAINT chk_goal_rules_percentage
  CHECK (goal_type <> 'percentage' OR min_threshold_pct IS NOT NULL);
ALTER TABLE goal_rules ADD CONSTRAINT chk_goal_rules_pass_fail
  CHECK (
    goal_type <> 'pass_fail'
    OR (comparator IS NOT NULL AND threshold_value IS NOT NULL AND payout_amount IS NOT NULL)
  );

-- Pool sets still require weights that sum to 100. Fixed-amount sets must not carry weights.
CREATE OR REPLACE FUNCTION fn_check_goal_rule_set_weights() RETURNS trigger AS $$
DECLARE
  v_rule_set_id uuid;
  v_mode rule_set_mode;
  v_total numeric;
  v_null_weights int;
  v_non_null_weights int;
BEGIN
  v_rule_set_id := COALESCE(NEW.rule_set_id, OLD.rule_set_id);
  SELECT mode INTO v_mode FROM goal_rule_sets WHERE id = v_rule_set_id;
  IF v_mode IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(weight), 0),
         COUNT(*) FILTER (WHERE weight IS NULL),
         COUNT(*) FILTER (WHERE weight IS NOT NULL)
    INTO v_total, v_null_weights, v_non_null_weights
  FROM goal_rules
  WHERE rule_set_id = v_rule_set_id;

  IF v_mode = 'pool_weighted' THEN
    IF v_null_weights > 0 OR v_total <> 100 THEN
      RAISE EXCEPTION 'goal_rules weights for rule_set % must sum to 100, got %', v_rule_set_id, v_total;
    END IF;
  ELSIF v_non_null_weights > 0 THEN
    RAISE EXCEPTION 'goal_rules in fixed_per_kpi rule_set % must not have weights', v_rule_set_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE bonus_calculation_items ALTER COLUMN weight DROP NOT NULL;

INSERT INTO kpi_categories (code, name, unit, higher_is_better, source_provider)
VALUES ('open_dispensers', 'Dispensarios abiertos', 'count', true, NULL)
ON CONFLICT (code) DO NOTHING;

UPDATE kpi_categories
SET name = 'Rotación por renuncia',
    unit = 'count',
    higher_is_better = false
WHERE code = 'staff_turnover';

UPDATE kpi_categories
SET unit = 'percentage'
WHERE code = 'survey_score';

-- migrate:down

UPDATE kpi_categories
SET name = 'Rotacion de personal',
    unit = 'percentage',
    higher_is_better = false
WHERE code = 'staff_turnover';

UPDATE kpi_categories
SET unit = 'score'
WHERE code = 'survey_score';

DELETE FROM kpi_categories WHERE code = 'open_dispensers';

ALTER TABLE bonus_calculation_items ALTER COLUMN weight SET NOT NULL;

CREATE OR REPLACE FUNCTION fn_check_goal_rule_set_weights() RETURNS trigger AS $$
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

ALTER TABLE goal_rules DROP CONSTRAINT IF EXISTS chk_goal_rules_pass_fail;
ALTER TABLE goal_rules DROP CONSTRAINT IF EXISTS chk_goal_rules_percentage;
ALTER TABLE goal_rules DROP CONSTRAINT IF EXISTS chk_goal_rules_fixed_amount;
ALTER TABLE goal_rules ADD CONSTRAINT chk_goal_rules_fixed_amount
  CHECK (goal_type <> 'fixed_amount' OR min_amount IS NOT NULL);
ALTER TABLE goal_rules ADD CONSTRAINT chk_goal_rules_percentage
  CHECK (goal_type <> 'percentage' OR min_threshold_pct IS NOT NULL);

ALTER TABLE goal_rules DROP COLUMN IF EXISTS payout_amount;
ALTER TABLE goal_rules DROP COLUMN IF EXISTS threshold_value;
ALTER TABLE goal_rules DROP COLUMN IF EXISTS comparator;
ALTER TABLE goal_rules ALTER COLUMN weight SET NOT NULL;
ALTER TABLE goal_rule_sets DROP COLUMN IF EXISTS mode;
