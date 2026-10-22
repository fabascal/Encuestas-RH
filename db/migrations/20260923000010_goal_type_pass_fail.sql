-- migrate:up
-- New enum values cannot be used in the same transaction that adds them,
-- so this file only introduces the types. The next migration uses them.

CREATE TYPE rule_set_mode AS ENUM ('pool_weighted', 'fixed_per_kpi');
CREATE TYPE rule_comparator AS ENUM ('gte', 'lte');
ALTER TYPE goal_type ADD VALUE IF NOT EXISTS 'pass_fail';

-- migrate:down
DROP TYPE IF EXISTS rule_comparator;
DROP TYPE IF EXISTS rule_set_mode;
