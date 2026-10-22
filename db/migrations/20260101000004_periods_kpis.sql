-- migrate:up
-- One row per calendar month. Closing a period freezes its bonus calculations.
CREATE TABLE periods (
  period date PRIMARY KEY,
  status period_status NOT NULL DEFAULT 'open',
  closed_at timestamptz,
  closed_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_periods_first_of_month CHECK (period = date_trunc('month', period)::date)
);

-- The 5 evaluation rubros (oil sales, punctuality, staff turnover, SISPA, surveys) plus
-- any future ones. higher_is_better = false for kpis like turnover where less is better.
CREATE TABLE kpi_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  unit kpi_unit NOT NULL,
  higher_is_better boolean NOT NULL DEFAULT true,
  source_provider integration_provider,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_kpi_categories_updated_at BEFORE UPDATE ON kpi_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- migrate:down
DROP TRIGGER IF EXISTS trg_kpi_categories_updated_at ON kpi_categories;
DROP TABLE IF EXISTS kpi_categories;
DROP TABLE IF EXISTS periods;
