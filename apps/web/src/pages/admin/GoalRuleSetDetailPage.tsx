import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Copy } from '@phosphor-icons/react';
import { calculateStationBonus, SCOPE_LABELS } from '@portal/shared';
import type { GoalRuleInput, KpiUnit } from '@portal/shared';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { useAllStations, useCompanies, useZones } from '../../hooks/useHierarchy';
import { useGoalRuleSetDetail } from '../../hooks/useGoalRuleSets';
import type { GoalRuleRow, GoalRuleSetRow } from '../../hooks/useGoalRuleSets';
import { useKpiCategories } from '../../hooks/useKpis';
import { ApiError } from '../../lib/api';
import { money, percent } from '../../components/reports/format';
import { formatValidity, mexicoToday, parseValidity, validityState } from '../../lib/ruleValidity';

const STATE_LABEL = { vigente: 'Vigente', terminada: 'Terminada', futura: 'Futura' } as const;
const STATE_TONE = { vigente: 'success', terminada: 'neutral', futura: 'brand' } as const;

const UNIT_LABEL: Record<KpiUnit, string> = {
  currency: 'MXN',
  percentage: '%',
  score: 'puntos',
  count: 'cantidad',
};

function scopeTargetId(row: Pick<GoalRuleSetRow, 'scope_level' | 'company_id' | 'zone_id' | 'station_id'>): string {
  if (row.scope_level === 'company') return row.company_id ?? '';
  if (row.scope_level === 'zone') return row.zone_id ?? '';
  return row.station_id ?? '';
}

function defaultActual(rule: GoalRuleRow): number {
  if (rule.goal_type === 'pass_fail') return Number(rule.threshold_value ?? rule.target_value);
  return Number(rule.target_value);
}

function explain(rule: GoalRuleRow, base: number, higherIsBetter: boolean, unit: KpiUnit): string {
  if (rule.goal_type === 'fixed_amount') {
    return `Si el resultado llega a ${money(Number(rule.min_amount ?? 0))}, paga su parte completa, ${money(base)}; si no, paga 0.`;
  }
  if (rule.goal_type === 'pass_fail') {
    const sense = rule.comparator === 'lte' ? 'como máximo' : 'al menos';
    const value = Number(rule.threshold_value ?? rule.target_value).toLocaleString('es-MX');
    return `Si el resultado es ${sense} ${value} ${UNIT_LABEL[unit]}, paga ${money(Number(rule.payout_amount ?? 0))}; si no, 0.`;
  }
  const direction = higherIsBetter
    ? 'Avance = resultado entre meta.'
    : 'Avance = meta entre resultado, porque menos es mejor.';
  return `${direction} Si llega a ${Number(rule.min_threshold_pct ?? 0)} %, paga ${money(base)} por el avance, con tope de ${Number(rule.max_payout_pct)} %.`;
}

function operation(line: { goalType: GoalRuleRow['goal_type']; eligible: boolean; progressPct: number | null; base: number; payout: number }, maxPayoutPct: number): string {
  if (!line.eligible) {
    return line.goalType === 'pass_fail' ? 'No cumple la condición, paga $0.' : 'No llega al mínimo, paga $0.';
  }
  if (line.goalType === 'percentage' && line.progressPct !== null) {
    const capped = Math.min(line.progressPct, maxPayoutPct / 100);
    return `${money(line.base)} × ${percent(capped)} = ${money(line.payout)}`;
  }
  return `Paga ${money(line.payout)}.`;
}

export function GoalRuleSetDetailPage() {
  const { ruleSetId } = useParams();
  const navigate = useNavigate();
  const detail = useGoalRuleSetDetail(ruleSetId ?? null);
  const categories = useKpiCategories();
  const companies = useCompanies();
  const zones = useZones(null);
  const stations = useAllStations();
  const [actuals, setActuals] = useState<Record<string, number>>({});

  const rules = detail.data?.rules ?? [];
  const ruleSet = detail.data?.ruleSet;

  useEffect(() => {
    if (!detail.data) return;
    const next: Record<string, number> = {};
    for (const rule of detail.data.rules) next[rule.kpi_category_id] = defaultActual(rule);
    setActuals(next);
  }, [detail.data]);

  const names = new Map<string, string>([
    ...(companies.data ?? []).map((company) => [company.id, company.name] as const),
    ...(zones.data ?? []).map((zone) => [zone.id, zone.name] as const),
    ...(stations.data ?? []).map((station) => [station.id, station.name] as const),
  ]);

  const goalRules = useMemo<GoalRuleInput[]>(() => {
    if (!ruleSet) return [];
    return rules.map((rule) => {
      const category = (categories.data ?? []).find((item) => item.id === rule.kpi_category_id);
      return {
        kpiCategoryId: rule.kpi_category_id,
        kpiCode: rule.kpi_code,
        kpiName: rule.kpi_name,
        weight: rule.weight === null ? null : Number(rule.weight),
        goalType: rule.goal_type,
        targetValue: Number(rule.target_value),
        minAmount: rule.min_amount === null ? null : Number(rule.min_amount),
        minThresholdPct: rule.min_threshold_pct === null ? null : Number(rule.min_threshold_pct),
        maxPayoutPct: Number(rule.max_payout_pct),
        higherIsBetter: category?.higher_is_better ?? true,
        comparator: rule.comparator,
        thresholdValue: rule.threshold_value === null ? null : Number(rule.threshold_value),
        payoutAmount: rule.payout_amount === null ? null : Number(rule.payout_amount),
      };
    });
  }, [categories.data, ruleSet, rules]);

  const result = useMemo(() => {
    if (!ruleSet) return null;
    return calculateStationBonus(
      Number(ruleSet.pool_amount),
      goalRules,
      goalRules.map((rule) => ({ kpiCategoryId: rule.kpiCategoryId, actualValue: actuals[rule.kpiCategoryId] ?? 0 })),
      ruleSet.mode,
    );
  }, [actuals, goalRules, ruleSet]);

  if (detail.isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (detail.isError || !ruleSet || !result) {
    return (
      <Card>
        <p className="text-center text-sm text-danger">
          {detail.error instanceof ApiError ? detail.error.message : 'No se encontró la versión de reglas.'}
        </p>
      </Card>
    );
  }

  const range = parseValidity(ruleSet.valid_during);
  const state = range ? validityState(range, mexicoToday()) : null;
  const scope = names.get(scopeTargetId(ruleSet));
  const scopeLabel = scope ? `${SCOPE_LABELS[ruleSet.scope_level]} ${scope}` : SCOPE_LABELS[ruleSet.scope_level];
  const fixed = ruleSet.mode === 'fixed_per_kpi';

  const resetActuals = () => {
    const next: Record<string, number> = {};
    for (const rule of rules) next[rule.kpi_category_id] = defaultActual(rule);
    setActuals(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link to="/admin/reglas/historial" className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:underline">
          <ArrowLeft size={16} aria-hidden />
          Volver al historial
        </Link>
        <Button type="button" onClick={() => navigate(`/admin/reglas/nueva?copiar=${ruleSet.id}`)}>
          <Copy size={18} aria-hidden />
          Copiar regla
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{scopeLabel}</CardTitle>
            <p className="mt-1 text-sm text-muted">{range ? formatValidity(range) : ruleSet.valid_during}</p>
          </div>
          {state && <Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>}
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Método</dt>
            <dd className="font-medium text-fg">{fixed ? 'Monto fijo por rubro' : 'Bolsa con pesos'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">{fixed ? 'Total posible' : 'Bolsa'}</dt>
            <dd className="font-medium text-fg">{money(Number(ruleSet.pool_amount))}</dd>
          </div>
        </dl>
      </Card>

      {rules.map((rule) => {
        const category = (categories.data ?? []).find((item) => item.id === rule.kpi_category_id);
        const line = result.lines.find((item) => item.kpiCategoryId === rule.kpi_category_id);
        const base = line?.base ?? 0;
        const unit = category?.unit ?? 'count';
        return (
          <Card key={rule.id}>
            <CardTitle>{rule.kpi_name}</CardTitle>
            <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {!fixed && (
                <Fact label="Peso" value={rule.weight === null ? '—' : `${Number(rule.weight)} %`} />
              )}
              <Fact label={fixed ? 'Monto' : 'Parte de la bolsa'} value={money(base)} />
              <Fact
                label="Tipo de meta"
                value={rule.goal_type === 'percentage' ? 'Porcentual' : rule.goal_type === 'fixed_amount' ? 'Monto fijo' : 'Cumple o no paga'}
              />
              {rule.goal_type === 'pass_fail' ? (
                <Fact
                  label="Condición"
                  value={`${rule.comparator === 'lte' ? 'Como máximo' : 'Al menos'} ${Number(rule.threshold_value ?? rule.target_value).toLocaleString('es-MX')} ${UNIT_LABEL[unit]}`}
                />
              ) : (
                <Fact label="Meta" value={Number(rule.target_value).toLocaleString('es-MX')} />
              )}
              {rule.goal_type === 'percentage' && (
                <Fact label="Umbral mínimo" value={`${Number(rule.min_threshold_pct ?? 0)} %`} />
              )}
              {rule.goal_type === 'fixed_amount' && (
                <Fact label="Monto mínimo" value={money(Number(rule.min_amount ?? 0))} />
              )}
              {rule.goal_type === 'percentage' && <Fact label="Tope de pago" value={`${Number(rule.max_payout_pct)} %`} />}
            </dl>
            <p className="mt-3 text-sm text-muted">{explain(rule, base, category?.higher_is_better ?? true, unit)}</p>
          </Card>
        );
      })}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Ejemplo del cálculo</CardTitle>
          <Button type="button" variant="ghost" size="sm" onClick={resetActuals}>
            Volver a la meta
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          {rules.map((rule) => {
            const line = result.lines.find((item) => item.kpiCategoryId === rule.kpi_category_id);
            const category = (categories.data ?? []).find((item) => item.id === rule.kpi_category_id);
            return (
              <div key={rule.id} className="grid grid-cols-1 items-end gap-3 border-b border-border pb-4 last:border-0 last:pb-0 sm:grid-cols-2">
                <Input
                  label={`${rule.kpi_name} · resultado del mes`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={actuals[rule.kpi_category_id] ?? 0}
                  onChange={(event) =>
                    setActuals((current) => ({ ...current, [rule.kpi_category_id]: Number(event.target.value) }))
                  }
                />
                <div>
                  <p className="text-sm text-muted">
                    {line ? (line.progressPct === null ? 'Sin avance' : `Avance ${percent(line.progressPct)}`) : '—'}
                    {line ? ` · ${line.eligible ? 'Cumple' : 'No cumple'}` : ''}
                  </p>
                  <p className="font-medium text-fg">{line ? operation(line, Number(rule.max_payout_pct)) : '—'}</p>
                  {category && !category.higher_is_better && rule.goal_type === 'percentage' && (
                    <p className="text-xs text-muted">Menos es mejor: el avance es la meta entre el resultado.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-base font-semibold text-fg">
          Total {money(result.totalPayout)} de {money(result.poolAmount)}
        </p>
      </Card>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-medium text-fg">{value}</dd>
    </div>
  );
}
