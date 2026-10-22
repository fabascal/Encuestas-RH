-- migrate:up
-- One row per station/period once the bonus has been calculated (or closed).
-- rule_set_id records which version of the rules was used.
CREATE TABLE bonus_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id uuid NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  period date NOT NULL REFERENCES periods(period),
  rule_set_id uuid NOT NULL REFERENCES goal_rule_sets(id),
  pool_amount numeric(14, 2) NOT NULL,
  total_payout numeric(14, 2) NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  calculated_by uuid REFERENCES users(id),
  UNIQUE (station_id, period)
);
CREATE INDEX idx_bonus_calculations_period ON bonus_calculations (period);
CREATE INDEX idx_bonus_calculations_rule_set_id ON bonus_calculations (rule_set_id);

-- Per-kpi breakdown of a bonus_calculation. rule_snapshot copies the goal_rules row
-- that was applied so historical reports never depend on rules that may since have
-- been superseded.
CREATE TABLE bonus_calculation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_calculation_id uuid NOT NULL REFERENCES bonus_calculations(id) ON DELETE CASCADE,
  kpi_category_id uuid NOT NULL REFERENCES kpi_categories(id),
  weight numeric(5, 2) NOT NULL,
  actual_value numeric(14, 2) NOT NULL,
  target_value numeric(14, 2) NOT NULL,
  progress_pct numeric(7, 4),
  payout numeric(14, 2) NOT NULL,
  rule_snapshot jsonb NOT NULL,
  UNIQUE (bonus_calculation_id, kpi_category_id)
);
CREATE INDEX idx_bonus_calculation_items_bonus_id ON bonus_calculation_items (bonus_calculation_id);

-- migrate:down
DROP TABLE IF EXISTS bonus_calculation_items;
DROP TABLE IF EXISTS bonus_calculations;
