import type { KpiUnit } from '@portal/shared';
import { kpiIcon } from '../../lib/icons';
import { Card } from '../ui/Card';
import { IconTile } from '../ui/IconTile';
import { StatusIndicator } from './StatusIndicator';

export interface KpiCardProps {
  kpiCode: string;
  name: string;
  unit: KpiUnit;
  actualValue: number;
  targetValue: number;
  progressPct: number | null;
  minThresholdPct: number;
  /** False when a lower result is better, such as rotación. */
  higherIsBetter?: boolean;
  verdict?: 'Cumple' | 'No cumple';
}

function formatValue(value: number, unit: KpiUnit): string {
  switch (unit) {
    case 'currency':
      return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'score':
      return value.toFixed(1);
    case 'count':
    default:
      return value.toLocaleString('es-MX');
  }
}

function gapLabel(actual: number, target: number, unit: KpiUnit, higherIsBetter: boolean): string {
  const gap = Math.abs(target - actual);
  if (higherIsBetter) {
    if (actual < target) return `Faltan ${formatValue(gap, unit)}`;
    if (actual > target) return `Supera la meta por ${formatValue(gap, unit)}`;
    return 'Meta alcanzada';
  }
  if (actual > target) return `Hay que bajar ${formatValue(gap, unit)}`;
  if (actual < target) return `Por debajo de la meta por ${formatValue(gap, unit)}`;
  return 'Meta alcanzada';
}

export function KpiCard({
  kpiCode,
  name,
  unit,
  actualValue,
  targetValue,
  progressPct,
  minThresholdPct,
  higherIsBetter = true,
  verdict,
}: KpiCardProps) {
  const ratio = progressPct === null ? 0 : Math.min(Math.max(progressPct, 0), 1);
  const reached = higherIsBetter ? actualValue >= targetValue : actualValue <= targetValue;
  const percentLabel = progressPct === null ? 'Sin avance' : `${(progressPct * 100).toFixed(0)}%`;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconTile icon={kpiIcon(kpiCode)} size="sm" />
          <h4 className="text-sm font-medium text-muted">{name}</h4>
        </div>
        {verdict ? (
          <span className={verdict === 'Cumple' ? 'text-sm font-medium text-success' : 'text-sm font-medium text-danger'}>
            {verdict}
          </span>
        ) : (
          <StatusIndicator progressPct={progressPct} minThresholdPct={minThresholdPct} showLabel={false} />
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold text-fg">{formatValue(actualValue, unit)}</p>
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between gap-3 text-xs text-muted">
          <span>Llevas {formatValue(actualValue, unit)}</span>
          <span>Meta {formatValue(targetValue, unit)}</span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-bg"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
          aria-label={`${name}: ${percentLabel} de la meta`}
        >
          <div
            className={`h-full rounded-full ${reached ? 'bg-success' : 'bg-brand'}`}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <p className={`mt-1 text-sm ${reached ? 'text-success' : 'text-fg'}`}>
          {gapLabel(actualValue, targetValue, unit, higherIsBetter)} · {percentLabel}
        </p>
      </div>
    </Card>
  );
}
