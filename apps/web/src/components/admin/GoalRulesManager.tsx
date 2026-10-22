import { useEffect, useRef, useState } from 'react';
import { ClockCounterClockwise, Copy, Eye, FloppyDisk, Plus, Sliders } from '@phosphor-icons/react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { GOAL_TYPES, SCOPE_LABELS } from '@portal/shared';
import type { GoalType, HierarchyLevel, KpiUnit, RuleComparator, RuleSetMode } from '@portal/shared';
import { useAllStations, useCompanies, useZones } from '../../hooks/useHierarchy';
import { useCreateGoalRuleSet, useGoalRuleSetDetail, useGoalRuleSets } from '../../hooks/useGoalRuleSets';
import type { GoalRuleRow, GoalRuleSetRow } from '../../hooks/useGoalRuleSets';
import { useKpiCategories } from '../../hooks/useKpis';
import {
  addDays,
  datesClash,
  formatDay,
  formatValidity,
  mexicoToday,
  parseValidity,
  validityState,
  versionToClose,
} from '../../lib/ruleValidity';
import type { VersionSpan } from '../../lib/ruleValidity';
import { ApiError } from '../../lib/api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile } from '../ui/IconTile';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Table } from '../ui/Table';
import { useToast } from '../ui/Toast';

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  fixed_amount: 'Meta fija en monto',
  percentage: 'Meta porcentual / escalar',
  pass_fail: 'Cumple o no paga',
};

interface RuleFormRow {
  kpiCategoryId: string;
  weight: number;
  goalType: GoalType;
  targetValue: number;
  minAmount: number | null;
  minThresholdPct: number | null;
  maxPayoutPct: number;
  comparator: RuleComparator;
  thresholdValue: number;
  payoutAmount: number;
}

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

function toFormRow(rule: GoalRuleRow): RuleFormRow {
  return {
    kpiCategoryId: rule.kpi_category_id,
    weight: rule.weight === null ? 0 : Number(rule.weight),
    goalType: rule.goal_type,
    targetValue: Number(rule.target_value),
    minAmount: rule.min_amount === null ? null : Number(rule.min_amount),
    minThresholdPct: rule.min_threshold_pct === null ? null : Number(rule.min_threshold_pct),
    maxPayoutPct: Number(rule.max_payout_pct),
    comparator: rule.comparator ?? 'gte',
    thresholdValue: rule.threshold_value === null ? Number(rule.target_value) : Number(rule.threshold_value),
    payoutAmount: rule.payout_amount === null ? 0 : Number(rule.payout_amount),
  };
}

function versionSpans(rows: GoalRuleSetRow[]): VersionSpan[] {
  return rows.flatMap((row) => {
    const range = parseValidity(row.valid_during);
    if (!range) return [];
    return [{ id: row.id, from: range.from, to: range.to }];
  });
}

function emptyRule(): RuleFormRow {
  return {
    kpiCategoryId: '',
    weight: 0,
    goalType: 'percentage',
    targetValue: 0,
    minAmount: null,
    minThresholdPct: 80,
    maxPayoutPct: 100,
    comparator: 'gte',
    thresholdValue: 0,
    payoutAmount: 0,
  };
}

function ScopeIdSelect({ level, value, onChange }: { level: HierarchyLevel; value: string; onChange: (id: string) => void }) {
  const companiesQuery = useCompanies();
  const zonesQuery = useZones(null);
  const stationsQuery = useAllStations();

  const options =
    level === 'company'
      ? (companiesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))
      : level === 'zone'
        ? (zonesQuery.data ?? []).map((z) => ({ value: z.id, label: z.name }))
        : (stationsQuery.data ?? []).map((s) => ({ value: s.id, label: s.name }));

  return (
    <Select
      label="Alcance"
      tooltip="Empresa, zona o estación concreta a la que aplica esta versión."
      placeholder="Selecciona"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      options={options}
    />
  );
}

function CreateRuleSetForm({ onCreated }: { onCreated: () => void }) {
  const { showToast } = useToast();
  const kpiCategoriesQuery = useKpiCategories();
  const createRuleSet = useCreateGoalRuleSet();

  const [mode, setMode] = useState<RuleSetMode>('pool_weighted');
  const [scopeLevel, setScopeLevel] = useState<HierarchyLevel>('station');
  const [scopeId, setScopeId] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [poolAmount, setPoolAmount] = useState(0);
  const [rules, setRules] = useState<RuleFormRow[]>([emptyRule()]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const copyId = searchParams.get('copiar');
  const copyQuery = useGoalRuleSetDetail(copyId);
  const existingQuery = useGoalRuleSets();
  const filledCopy = useRef<string | null>(null);

  useEffect(() => {
    const detail = copyQuery.data;
    if (!copyId || !detail || filledCopy.current === copyId) return;
    filledCopy.current = copyId;
    setMode(detail.ruleSet.mode);
    setScopeLevel(detail.ruleSet.scope_level);
    setScopeId(scopeTargetId(detail.ruleSet));
    setPoolAmount(Number(detail.ruleSet.pool_amount));
    setValidFrom('');
    setValidTo('');
    setRules(detail.rules.map(toFormRow));
    setConfirmClose(false);
  }, [copyId, copyQuery.data]);

  const spans = versionSpans(
    (existingQuery.data ?? []).filter((row) => row.scope_level === scopeLevel && scopeTargetId(row) === scopeId),
  );
  const predecessor = validFrom ? versionToClose(spans, validFrom) : null;
  const clash = validFrom ? datesClash(spans, validFrom, validTo || null, predecessor?.id ?? null) : false;
  const copyRange = copyQuery.data ? parseValidity(copyQuery.data.ruleSet.valid_during) : null;

  useEffect(() => {
    setConfirmClose(false);
  }, [predecessor?.id, validFrom]);

  const totalWeight = rules.reduce((sum, rule) => sum + (rule.weight || 0), 0);
  const weightIsValid = mode === 'fixed_per_kpi' || Math.abs(totalWeight - 100) < 0.01;
  const fixedTotal = rules.reduce((sum, rule) => sum + (rule.payoutAmount || 0), 0);
  const fixedRulesComplete =
    mode !== 'fixed_per_kpi' || rules.every((rule) => rule.kpiCategoryId && rule.payoutAmount >= 0);

  const updateRule = (index: number, patch: Partial<RuleFormRow>) => {
    setRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!scopeId || !validFrom || !weightIsValid || !fixedRulesComplete) return;

    createRuleSet.mutate(
      {
        mode,
        scopeLevel,
        scopeId,
        validFrom,
        validTo: validTo || null,
        poolAmount: mode === 'fixed_per_kpi' ? fixedTotal : poolAmount,
        closePrevious: Boolean(predecessor && confirmClose),
        rules: rules.map((rule) =>
          mode === 'fixed_per_kpi'
            ? {
                kpiCategoryId: rule.kpiCategoryId,
                weight: null,
                goalType: 'pass_fail' as const,
                targetValue: rule.thresholdValue,
                minAmount: null,
                minThresholdPct: null,
                maxPayoutPct: 100,
                comparator: rule.comparator,
                thresholdValue: rule.thresholdValue,
                payoutAmount: rule.payoutAmount,
              }
            : {
                kpiCategoryId: rule.kpiCategoryId,
                weight: rule.weight,
                goalType: rule.goalType,
                targetValue: rule.targetValue,
                minAmount: rule.goalType === 'fixed_amount' ? rule.minAmount : null,
                minThresholdPct: rule.goalType === 'percentage' ? rule.minThresholdPct : null,
                maxPayoutPct: rule.maxPayoutPct,
                comparator: null,
                thresholdValue: null,
                payoutAmount: null,
              },
        ),
      },
      {
        onSuccess: () => {
          showToast('Reglas de bono creadas', 'success');
          setScopeId('');
          setValidFrom('');
          setValidTo('');
          setPoolAmount(0);
          setRules([emptyRule()]);
          onCreated();
        },
        onError: (error) =>
          showToast(error instanceof ApiError ? error.message : 'No se pudo crear el conjunto de reglas', 'danger'),
      },
    );
  };

  const startEmpty = () => {
    if (copyId) filledCopy.current = copyId;
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.delete('copiar');
        return next;
      },
      { replace: true },
    );
    setMode('pool_weighted');
    setScopeLevel('station');
    setScopeId('');
    setValidFrom('');
    setValidTo('');
    setPoolAmount(0);
    setRules([emptyRule()]);
    setConfirmClose(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {copyId && copyRange && (
        <div className="flex flex-col gap-2 rounded-control border border-border bg-bg px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-fg">Copia de la versión del {formatDay(copyRange.from)}. Elige la nueva vigencia.</p>
          <Button type="button" variant="ghost" size="sm" onClick={startEmpty}>
            Empezar vacío
          </Button>
        </div>
      )}
      <Select
        label="Método de pago"
        tooltip="Bolsa con pesos reparte un monto total. Monto fijo paga cada rubro solo si cumple su condición."
        value={mode}
        onChange={(e) => setMode(e.target.value as RuleSetMode)}
        options={[
          { value: 'pool_weighted', label: 'Bolsa con pesos' },
          { value: 'fixed_per_kpi', label: 'Monto fijo por rubro' },
        ]}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Nivel de alcance"
          tooltip="Si hay varias versiones vigentes, gana la más específica: estación, luego zona, luego empresa."
          value={scopeLevel}
          onChange={(e) => {
            setScopeLevel(e.target.value as HierarchyLevel);
            setScopeId('');
          }}
          options={[
            { value: 'company', label: 'Empresa' },
            { value: 'zone', label: 'Zona' },
            { value: 'station', label: 'Estación' },
          ]}
        />
        <ScopeIdSelect level={scopeLevel} value={scopeId} onChange={setScopeId} />
        <Input
          label="Vigente desde"
          tooltip="Primer día en que esta versión se usa para calcular bonos."
          type="date"
          required
          value={validFrom}
          onChange={(e) => setValidFrom(e.target.value)}
        />
        <Input
          label="Vigente hasta (opcional)"
          tooltip="Último día de vigencia. Vacío significa que sigue activa hasta que crees otra versión."
          type="date"
          value={validTo}
          onChange={(e) => setValidTo(e.target.value)}
        />
        {mode === 'pool_weighted' && (
          <Input
            label="Bolsa de bono (MXN)"
            tooltip="Monto total del periodo. Se reparte entre los rubros según el peso de cada uno."
            type="number"
            min={0}
            step="0.01"
            required
            value={poolAmount}
            onChange={(e) => setPoolAmount(Number(e.target.value))}
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-fg">Rubros y reglas</span>
          <Badge tone={mode === 'fixed_per_kpi' || weightIsValid ? 'success' : 'danger'}>
            {mode === 'fixed_per_kpi'
              ? `Total posible: ${fixedTotal.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}`
              : weightIsValid
                ? 'Pesos en 100%'
                : `Pesos en ${totalWeight.toFixed(1)}%. Deben sumar 100%`}
          </Badge>
        </div>

        {rules.map((rule, index) => (
          <div key={index} className="grid grid-cols-1 items-end gap-3 rounded-control border border-border p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <Select
                label="Rubro"
                tooltip="Indicador que se evalúa, por ejemplo venta de aceite o puntualidad."
                placeholder="Selecciona"
                value={rule.kpiCategoryId}
                onChange={(e) => updateRule(index, { kpiCategoryId: e.target.value })}
                options={(kpiCategoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
              />
            </div>
            {mode === 'fixed_per_kpi' ? (
              <>
                <Select
                  label="Condición"
                  tooltip="Al menos paga al llegar al valor. Como máximo paga mientras el valor no lo rebase, por ejemplo una renuncia al mes."
                  value={rule.comparator}
                  onChange={(e) => updateRule(index, { comparator: e.target.value as RuleComparator })}
                  options={[
                    { value: 'gte', label: 'Al menos' },
                    { value: 'lte', label: 'Como máximo' },
                  ]}
                />
                <Input
                  label={`Valor a cumplir (${UNIT_LABEL[(kpiCategoriesQuery.data ?? []).find((c) => c.id === rule.kpiCategoryId)?.unit ?? 'count']})`}
                  tooltip="Número contra el que se compara el dato del mes. Aceite en pesos, SISPA y encuestas en porcentaje, renuncias y dispensarios en cantidad."
                  type="number"
                  min={0}
                  step="0.01"
                  value={rule.thresholdValue}
                  onChange={(e) => updateRule(index, { thresholdValue: Number(e.target.value) })}
                />
                <Input
                  label="Monto a pagar (MXN)"
                  tooltip="Se paga completo si cumple. Si no cumple, este rubro paga 0."
                  type="number"
                  min={0}
                  step="0.01"
                  value={rule.payoutAmount}
                  onChange={(e) => updateRule(index, { payoutAmount: Number(e.target.value) })}
                />
              </>
            ) : (
              <>
                <Input
                  label="Peso %"
                  tooltip="Parte de la bolsa para este rubro. La suma de todos los rubros debe ser 100."
                  type="number"
                  min={0}
                  max={100}
                  value={rule.weight}
                  onChange={(e) => updateRule(index, { weight: Number(e.target.value) })}
                />
                <Select
                  label="Tipo de meta"
                  tooltip="Porcentual paga según el avance, después del umbral. Monto fijo paga la parte completa solo si se alcanza el monto mínimo."
                  value={rule.goalType}
                  onChange={(e) => updateRule(index, { goalType: e.target.value as GoalType })}
                  options={GOAL_TYPES.filter((type) => type !== 'pass_fail').map((type) => ({
                    value: type,
                    label: GOAL_TYPE_LABELS[type],
                  }))}
                />
                <Input
                  label="Meta"
                  tooltip="Valor que cuenta como 100% de avance. Con meta de 1000, un resultado de 800 es 80%."
                  type="number"
                  min={0}
                  value={rule.targetValue}
                  onChange={(e) => updateRule(index, { targetValue: Number(e.target.value) })}
                />
                {rule.goalType === 'fixed_amount' ? (
                  <Input
                    label="Monto mínimo"
                    tooltip="Si el resultado no llega a este monto, el rubro paga 0. Si llega, paga su parte completa de la bolsa."
                    type="number"
                    min={0}
                    value={rule.minAmount ?? 0}
                    onChange={(e) => updateRule(index, { minAmount: Number(e.target.value) })}
                  />
                ) : (
                  <Input
                    label="Umbral mín. %"
                    tooltip="Avance mínimo para empezar a pagar. Con 80%, un 79% paga 0 y un 80% paga el 80% de la parte del rubro."
                    type="number"
                    min={0}
                    max={100}
                    value={rule.minThresholdPct ?? 0}
                    onChange={(e) => updateRule(index, { minThresholdPct: Number(e.target.value) })}
                  />
                )}
                <Input
                  label="Tope de pago %"
                  tooltip="Límite del pago. 100 no paga de más. Un valor mayor permite pagar por encima de la meta."
                  type="number"
                  min={0}
                  value={rule.maxPayoutPct}
                  onChange={(e) => updateRule(index, { maxPayoutPct: Number(e.target.value) })}
                />
              </>
            )}
            <div className="flex items-end sm:col-span-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRules((prev) => prev.filter((_, i) => i !== index))}>
                Quitar rubro
              </Button>
            </div>
          </div>
        ))}

        <Button type="button" variant="secondary" size="sm" onClick={() => setRules((prev) => [...prev, emptyRule()])}>
          <Plus size={16} aria-hidden />
          Agregar rubro
        </Button>
      </div>

      {mode === 'pool_weighted' && !weightIsValid && (
        <p className="text-sm text-danger" role="status">
          No se puede guardar todavía: los pesos suman {totalWeight.toFixed(1)}% y deben sumar 100%.
          {rules.length === 1 ? ' Con un solo rubro, pon 100 en Peso %.' : ' Ajusta los pesos hasta llegar a 100%.'}
        </p>
      )}
      {clash && (
        <p className="text-sm text-danger" role="status">
          Las fechas chocan con otra versión de este mismo alcance. Elige otro inicio.
        </p>
      )}
      {predecessor && !clash && (
        <div className="flex flex-col gap-2 rounded-control border border-border bg-bg px-3 py-3">
          <p className="text-sm text-fg">
            La versión vigente desde {formatDay(predecessor.from)} se cerrará el {formatDay(addDays(validFrom, -1))}, un día
            antes de la nueva.
          </p>
          <label className="flex items-start gap-2 text-sm text-fg">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmClose}
              onChange={(event) => setConfirmClose(event.target.checked)}
            />
            Cerrar la versión anterior y guardar la nueva.
          </label>
        </div>
      )}
      <Button
        type="submit"
        isLoading={createRuleSet.isPending}
        disabled={!weightIsValid || !fixedRulesComplete || !scopeId || !validFrom || clash || (predecessor !== null && !confirmClose)}
      >
        <FloppyDisk size={18} aria-hidden />
        Guardar version de reglas
      </Button>
    </form>
  );
}

const STATE_LABEL = { vigente: 'Vigente', terminada: 'Terminada', futura: 'Futura' } as const;
const STATE_TONE = { vigente: 'success', terminada: 'neutral', futura: 'brand' } as const;

export function GoalRulesManager({ view }: { view: 'form' | 'history' }) {
  const ruleSetsQuery = useGoalRuleSets();
  const companiesQuery = useCompanies();
  const zonesQuery = useZones(null);
  const stationsQuery = useAllStations();
  const names = new Map<string, string>([
    ...(companiesQuery.data ?? []).map((company) => [company.id, company.name] as const),
    ...(zonesQuery.data ?? []).map((zone) => [zone.id, zone.name] as const),
    ...(stationsQuery.data ?? []).map((station) => [station.id, station.name] as const),
  ]);
  const today = mexicoToday();

  const scopeName = (row: GoalRuleSetRow) => {
    const name = names.get(scopeTargetId(row));
    const level = SCOPE_LABELS[row.scope_level];
    return name ? `${level} ${name}` : level;
  };

  if (view === 'form') {
    return (
      <Card>
        <CardHeader>
          <CardTitle icon={<IconTile icon={Sliders} size="sm" />}>Nueva versión de reglas</CardTitle>
        </CardHeader>
        <CreateRuleSetForm onCreated={() => ruleSetsQuery.refetch()} />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<IconTile icon={ClockCounterClockwise} size="sm" />}>Historial de reglas</CardTitle>
      </CardHeader>
      <Table
          columns={[
            { key: 'scope', header: 'Alcance', render: (row) => scopeName(row) },
            { key: 'mode', header: 'Método', render: (row) => (row.mode === 'fixed_per_kpi' ? 'Monto fijo' : 'Bolsa') },
            { key: 'pool', header: 'Bolsa', render: (row) => Number(row.pool_amount).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) },
            {
              key: 'validity',
              header: 'Vigencia',
              render: (row) => {
                const range = parseValidity(row.valid_during);
                return range ? formatValidity(range) : row.valid_during;
              },
            },
            {
              key: 'state',
              header: 'Estado',
              render: (row) => {
                const range = parseValidity(row.valid_during);
                if (!range) return '—';
                const state = validityState(range, today);
                return <Badge tone={STATE_TONE[state]}>{STATE_LABEL[state]}</Badge>;
              },
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (row) => (
                <div className="flex justify-end gap-1">
                  <Link
                    to={`/admin/reglas/historial/${row.id}`}
                    aria-label={`Ver detalle de ${scopeName(row)}`}
                    title="Ver detalle"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-control text-fg hover:bg-bg"
                  >
                    <Eye size={18} aria-hidden />
                  </Link>
                  <Link
                    to={`/admin/reglas/nueva?copiar=${row.id}`}
                    aria-label={`Copiar regla de ${scopeName(row)}`}
                    title="Copiar regla"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-control text-fg hover:bg-bg"
                  >
                    <Copy size={18} aria-hidden />
                  </Link>
                </div>
              ),
            },
          ]}
          rows={ruleSetsQuery.data ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="Sin reglas configuradas"
        />
        <p className="mt-3 text-xs text-muted">
          Las reglas nunca se editan: cada cambio cierra la vigencia actual y crea una nueva versión, por lo que los
          cálculos de meses pasados nunca cambian.
        </p>
    </Card>
  );
}
