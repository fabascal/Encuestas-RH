import { useMemo, useState } from 'react';
import { Calculator } from '@phosphor-icons/react';
import { calculateStationBonus } from '@portal/shared';
import type { GoalRuleInput, RuleSetMode } from '@portal/shared';
import { Badge } from '../ui/Badge';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { IconTile, KpiMark } from '../ui/IconTile';
import { RangeSlider } from '../ui/RangeSlider';
import { StatusIndicator } from './StatusIndicator';

export interface BonusCalculatorCardProps {
  poolAmount: number;
  mode?: RuleSetMode;
  rules: GoalRuleInput[];
  /** Real actual values keyed by kpiCategoryId, used both as the baseline and as slider defaults. */
  actuals: Record<string, number>;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

/**
 * Simulates the bono using the exact same pure function the API uses to close a
 * period (`calculateStationBonus` from @portal/shared), so the on-screen simulation
 * always matches what would actually be paid.
 */
export function BonusCalculatorCard({ poolAmount, mode = 'pool_weighted', rules, actuals }: BonusCalculatorCardProps) {
  const [simulatedActuals, setSimulatedActuals] = useState<Record<string, number>>(actuals);
  const [isSimulating, setIsSimulating] = useState(false);

  const activeActuals = isSimulating ? simulatedActuals : actuals;

  const result = useMemo(
    () =>
      calculateStationBonus(
        poolAmount,
        rules,
        rules.map((rule) => ({
          kpiCategoryId: rule.kpiCategoryId,
          actualValue: activeActuals[rule.kpiCategoryId] ?? 0,
        })),
        mode,
      ),
    [poolAmount, rules, activeActuals, mode],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle icon={<IconTile icon={Calculator} size="sm" />}>Calculadora de bono</CardTitle>
        <Badge tone={isSimulating ? 'brand' : 'neutral'}>{isSimulating ? 'Simulando' : 'Real'}</Badge>
      </CardHeader>

      <div className="flex flex-col gap-4">
        {result.lines.map((line) => {
          const rule = rules.find((candidate) => candidate.kpiCategoryId === line.kpiCategoryId);
          return (
            <div key={line.kpiCategoryId} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between gap-3">
                <KpiMark code={line.kpiCode} name={line.kpiName} />
                {line.weight === null ? (
                  <span className={line.eligible ? 'text-sm font-medium text-success' : 'text-sm font-medium text-danger'}>
                    {line.eligible ? 'Cumple' : 'No cumple'}
                  </span>
                ) : (
                  <StatusIndicator progressPct={line.progressPct} minThresholdPct={rule?.minThresholdPct ?? 100} />
                )}
              </div>
              <RangeSlider
                label="Valor real"
                value={activeActuals[line.kpiCategoryId] ?? 0}
                max={Math.max(line.targetValue * 1.5, 1)}
                step={Math.max(line.targetValue / 100, 0.01)}
                onChange={(value) => {
                  setIsSimulating(true);
                  setSimulatedActuals((prev) => ({ ...prev, [line.kpiCategoryId]: value }));
                }}
                formatValue={(v) => v.toLocaleString('es-MX', { maximumFractionDigits: 1 })}
              />
              <p className="mt-1 text-sm text-fg">
                Meta {line.targetValue.toLocaleString('es-MX', { maximumFractionDigits: 2 })}
                {rule?.higherIsBetter === false || rule?.comparator === 'lte'
                  ? line.actualValue > line.targetValue
                    ? ` · Hay que bajar ${(line.actualValue - line.targetValue).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`
                    : ' · Meta alcanzada'
                  : line.actualValue < line.targetValue
                    ? ` · Faltan ${(line.targetValue - line.actualValue).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`
                    : ' · Meta alcanzada'}
              </p>
              <p className="mt-1 text-sm text-muted">
                {line.weight === null
                  ? `Monto del rubro ${formatCurrency(line.base)} · Pago ${formatCurrency(line.payout)}`
                  : `Peso ${line.weight}% · Base ${formatCurrency(line.base)} · Pago ${formatCurrency(line.payout)}`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-control bg-bg p-4">
        <span className="text-sm font-medium text-fg">Bono total</span>
        <span className="text-xl font-semibold text-brand">{formatCurrency(result.totalPayout)}</span>
      </div>

      {isSimulating && (
        <button
          type="button"
          onClick={() => {
            setIsSimulating(false);
            setSimulatedActuals(actuals);
          }}
          className="mt-3 text-sm font-medium text-brand hover:underline"
        >
          Volver a valores reales
        </button>
      )}
    </Card>
  );
}
