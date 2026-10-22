import { useEffect, useId, useState } from 'react';
import { TrendDown, TrendUp } from '@phosphor-icons/react';
import type { HeatLevel } from '@portal/shared';
import { moneyShort, percent, points } from '../reports/format';
import { SECTION_GOAL, heatLevel } from '../../lib/surveySections';

type LevelOf = (ratio: number | null) => HeatLevel;

/** Oil goal: 100% or more is on target, 80% to 99% is close, below 80% is far. */
export function oilLevel(ratio: number | null): HeatLevel {
  if (ratio === null || Number.isNaN(ratio)) return 'sin_dato';
  if (ratio >= 1) return 'meta';
  if (ratio >= 0.8) return 'cerca';
  return 'lejos';
}

const BAR_CLASS: Record<HeatLevel, string> = {
  meta: 'bg-gradient-to-r from-success to-success/70',
  cerca: 'bg-gradient-to-r from-warning to-warning/70',
  lejos: 'bg-gradient-to-r from-danger to-danger/70',
  sin_dato: 'bg-border',
};

const RING_COLOR: Record<HeatLevel, string> = {
  meta: 'var(--color-success)',
  cerca: 'var(--color-warning)',
  lejos: 'var(--color-danger)',
  sin_dato: 'var(--color-border)',
};

export function goalGap(ratio: number): string {
  const gap = (ratio - SECTION_GOAL) * 100;
  const amount = Math.abs(gap).toLocaleString('es-MX', { maximumFractionDigits: 1 });
  if (gap >= 0) return `+${amount} pts sobre la meta`;
  return `Faltan ${amount} pts`;
}

export function heatCaption(name: string, when: string, ratio: number | null): string {
  if (ratio === null) return `${name}, ${when}: sin dato`;
  return `${name}, ${when}: ${percent(ratio)}. ${goalGap(ratio)}.`;
}

export function useMountAnimation(key: string): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(false);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setMounted(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [key]);
  return mounted;
}

export function levelBarClass(ratio: number | null, levelOf: LevelOf = heatLevel): string {
  return BAR_CLASS[levelOf(ratio)];
}

export function GoalBar({
  ratio,
  mounted,
  delay = 0,
  marker = true,
  goal = SECTION_GOAL,
  levelOf = heatLevel,
}: {
  ratio: number | null;
  mounted: boolean;
  delay?: number;
  marker?: boolean;
  goal?: number;
  levelOf?: LevelOf;
}) {
  const width = Math.max(0, Math.min((ratio ?? 0) * 100, 100));
  return (
    <div className="relative h-7 overflow-hidden rounded-full bg-bg">
      {marker && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 z-10 border-l border-dashed border-fg/35"
          style={{ left: goal >= 1 ? 'calc(100% - 1px)' : `${goal * 100}%` }}
        />
      )}
      <div
        className={`h-7 rounded-full ${levelBarClass(ratio, levelOf)} transition-[width] duration-700 ease-out motion-reduce:transition-none`}
        style={{ width: mounted ? `${width}%` : '0%', transitionDelay: `${delay}ms` }}
      />
    </div>
  );
}

export function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const tone = delta > 0 ? 'text-success' : delta < 0 ? 'text-danger' : 'text-muted';
  return (
    <p className={`inline-flex items-center gap-0.5 text-xs font-medium ${tone}`}>
      {delta > 0 ? <TrendUp size={14} aria-hidden /> : delta < 0 ? <TrendDown size={14} aria-hidden /> : null}
      {points(delta)}
    </p>
  );
}

export function GoalRing({
  ratio,
  goal = SECTION_GOAL,
  levelOf = heatLevel,
}: {
  ratio: number | null;
  goal?: number;
  levelOf?: LevelOf;
}) {
  const mounted = useMountAnimation(String(ratio));
  const size = 72;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const portion = Math.max(0, Math.min(ratio ?? 0, 1));
  const level = levelOf(ratio);
  const mark = goal * Math.PI * 2 - Math.PI / 2;
  const markX = center + Math.cos(mark) * radius;
  const markY = center + Math.sin(mark) * radius;
  const meta = Math.round(goal * 100);
  const label = goal === SECTION_GOAL ? `Calificación ${percent(ratio)}, meta 90 %` : `Avance ${percent(ratio)}, meta ${meta} %`;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="shrink-0 text-fg">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-bg)" strokeWidth={stroke} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={RING_COLOR[level]}
        strokeWidth={stroke}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none"
        style={{ strokeDasharray: `${mounted ? portion * circumference : 0} ${circumference}` }}
      />
      <circle cx={markX} cy={markY} r={2.4} fill="var(--color-fg)" />
      <text x={center} y={center} textAnchor="middle" dominantBaseline="central" fill="currentColor" fontSize="12" fontWeight="700">
        {percent(ratio)}
      </text>
    </svg>
  );
}

export function Sparkline({
  values,
  label,
  goal = SECTION_GOAL,
}: {
  values: Array<number | null>;
  label: string;
  goal?: number | null;
}) {
  const width = 96;
  const height = 28;
  const pad = 2;
  const finite = values.filter((value): value is number => value !== null && !Number.isNaN(value));
  const peak = Math.max(1, ...finite, goal ?? 0);
  const yFor = (value: number) => pad + (1 - Math.min(Math.max(value, 0), peak) / peak) * (height - pad * 2);
  const xFor = (index: number) => (values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width);
  const parts: string[] = [];
  let current: string[] = [];
  values.forEach((value, index) => {
    if (value === null) {
      if (current.length > 0) parts.push(current.join(' '));
      current = [];
      return;
    }
    current.push(`${xFor(index)},${yFor(value)}`);
  });
  if (current.length > 0) parts.push(current.join(' '));
  const goalY = goal === null ? null : yFor(goal);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-3 h-7 w-24" role="img" aria-label={label}>
      {goalY !== null && <line x1={0} x2={width} y1={goalY} y2={goalY} stroke="var(--color-border)" strokeDasharray="2 2" />}
      {parts.map((points) => (
        <polyline key={points} points={points} fill="none" stroke="var(--color-brand)" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export function heatTone(ratio: number | null, goal = SECTION_GOAL, levelOf: LevelOf = heatLevel): { box: string; text: string } {
  if (ratio === null || Number.isNaN(ratio)) {
    return { box: 'border border-dashed border-border bg-transparent', text: 'text-muted' };
  }
  const level = levelOf(ratio);
  if (level === 'meta') {
    if (ratio >= goal + 0.07) return { box: 'bg-success', text: 'text-on-brand' };
    if (ratio >= goal + 0.03) return { box: 'bg-success/60', text: 'text-fg' };
    return { box: 'bg-success-soft', text: 'text-fg' };
  }
  if (level === 'cerca') {
    const distance = goal - ratio;
    if (distance >= 0.07) return { box: 'bg-warning', text: 'text-on-brand' };
    if (distance >= 0.04) return { box: 'bg-warning/60', text: 'text-fg' };
    return { box: 'bg-warning-soft', text: 'text-fg' };
  }
  if (ratio < 0.5) return { box: 'bg-danger', text: 'text-on-brand' };
  if (ratio < 0.7) return { box: 'bg-danger/60', text: 'text-fg' };
  return { box: 'bg-danger-soft', text: 'text-fg' };
}

export function HeatSquare({
  ratio,
  title,
  compact = false,
  goal = SECTION_GOAL,
  levelOf = heatLevel,
}: {
  ratio: number | null;
  title: string;
  compact?: boolean;
  goal?: number;
  levelOf?: LevelOf;
}) {
  const tone = heatTone(ratio, goal, levelOf);
  return (
    <span
      title={title}
      role="img"
      aria-label={title}
      className={`inline-flex items-center justify-center rounded-control font-semibold tabular-nums ${compact ? 'h-8 min-w-8 px-1 text-[10px]' : 'h-11 min-w-11 px-1 text-xs'} ${tone.box} ${tone.text}`}
    >
      {ratio === null ? '' : percent(ratio)}
    </span>
  );
}

export function HeatLegend({ goal = SECTION_GOAL }: { goal?: number }) {
  const meta = Math.round(goal * 100);
  return (
    <ul className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
      <li className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-success" />
        En meta {meta} % o más
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-warning" />
        Cerca 80 a {meta - 1} %
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="h-3 w-3 rounded-sm bg-danger" />
        Lejos, menos de 80 %
      </li>
    </ul>
  );
}

const BAR_FILL: Record<HeatLevel, string> = {
  meta: 'var(--color-success)',
  cerca: 'var(--color-warning)',
  lejos: 'var(--color-danger)',
  sin_dato: 'var(--color-border)',
};

export interface DailyBarPoint {
  key: string;
  label: string;
  value: number | null;
  /** Daily pace, or that month's target. Null when there is no goal. */
  target: number | null;
  detail: string;
}

/**
 * Vertical bars with a target mark, plus an optional cumulative line against the goal diagonal.
 * Used for day-by-day oil sales and for the director's month columns.
 */
export function DailyBars({
  points,
  ariaLabel,
  levelOf = oilLevel,
}: {
  points: DailyBarPoint[];
  ariaLabel: string;
  levelOf?: LevelOf;
}) {
  const mounted = useMountAnimation(points.map((point) => `${point.key}:${point.value ?? ''}`).join('|'));
  const [active, setActive] = useState(0);
  const detailId = useId();
  const selected = points[Math.min(active, Math.max(points.length - 1, 0))];

  const width = 640;
  const height = 228;
  const left = 52;
  const right = 16;
  const top = 16;
  const bottom = 32;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const slot = plotW / Math.max(points.length, 1);
  const barW = Math.max(3, Math.min(slot * 0.62, 28));

  const dailyValues = points.map((point) => point.value ?? 0);
  const dailyTargets = points.map((point) => point.target ?? 0);
  const dailyMax = Math.max(1, ...dailyValues, ...dailyTargets);

  let running = 0;
  let runningTarget = 0;
  const cumulative: Array<number | null> = [];
  const cumulativeTarget: number[] = [];
  for (const point of points) {
    if (point.target !== null) runningTarget += point.target;
    cumulativeTarget.push(runningTarget);
    if (point.value === null) cumulative.push(null);
    else {
      running += point.value;
      cumulative.push(running);
    }
  }
  const cumulativeMax = Math.max(1, ...cumulative.filter((value): value is number => value !== null), ...cumulativeTarget);

  const yDaily = (value: number) => top + plotH - (Math.max(value, 0) / dailyMax) * plotH;
  const yTotal = (value: number) => top + plotH - (Math.max(value, 0) / cumulativeMax) * plotH;
  const xAt = (index: number) => left + slot * index + slot / 2;

  const actualLine = cumulative.flatMap((value, index) => (value === null ? [] : [`${xAt(index)},${yTotal(value)}`]));
  const targetLine = cumulativeTarget.map((value, index) => `${xAt(index)},${yTotal(value)}`);
  const sameTarget = points.every((point) => point.target === points[0]?.target) && points[0]?.target != null;
  const pace = sameTarget ? points[0]?.target ?? null : null;

  const showLabel = (index: number) => {
    if (points.length <= 12) return true;
    const day = index + 1;
    return day === 1 || day === points.length || day % 5 === 0;
  };

  return (
    <div>
      <div
        tabIndex={0}
        role="group"
        aria-label={ariaLabel}
        aria-describedby={detailId}
        className="rounded-control outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            setActive((index) => Math.min(points.length - 1, index + 1));
          } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            setActive((index) => Math.max(0, index - 1));
          }
        }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full text-fg">
          {[0, 0.5, 1].map((step) => {
            const y = yDaily(dailyMax * step);
            return (
              <g key={step}>
                <line x1={left} x2={width - right} y1={y} y2={y} stroke="var(--color-border)" strokeDasharray={step === 0 ? undefined : '3 3'} />
                <text x={left - 8} y={y + 4} textAnchor="end" fill="var(--color-muted)" fontSize="11">
                  {moneyShort(dailyMax * step)}
                </text>
              </g>
            );
          })}
          {pace !== null && (
            <line x1={left} x2={width - right} y1={yDaily(pace)} y2={yDaily(pace)} stroke="var(--color-fg)" strokeDasharray="4 3" strokeOpacity="0.55" />
          )}
          {points.map((point, index) => {
            const value = point.value ?? 0;
            const barHeight = point.value === null ? 0 : ((mounted ? value : 0) / dailyMax) * plotH;
            const x = xAt(index) - barW / 2;
            const ratio = point.target !== null && point.target > 0 && point.value !== null ? point.value / point.target : null;
            const selectedBar = index === active;
            return (
              <g key={point.key}>
                <rect
                  x={x}
                  y={top + plotH - barHeight}
                  width={barW}
                  height={barHeight}
                  rx={3}
                  fill={BAR_FILL[levelOf(ratio)]}
                  opacity={point.value === null ? 0.35 : 1}
                  stroke={selectedBar ? 'var(--color-fg)' : 'none'}
                  strokeWidth={selectedBar ? 1.5 : 0}
                  className="pointer-events-none transition-[height,y] duration-700 ease-out motion-reduce:transition-none"
                />
                {point.target !== null && !sameTarget && (
                  <line
                    x1={x}
                    x2={x + barW}
                    y1={yDaily(point.target)}
                    y2={yDaily(point.target)}
                    stroke="var(--color-fg)"
                    strokeWidth="2"
                  />
                )}
                {showLabel(index) && (
                  <text x={xAt(index)} y={height - 10} textAnchor="middle" fill="var(--color-muted)" fontSize="11" className="pointer-events-none">
                    {point.label}
                  </text>
                )}
                <rect
                  x={left + slot * index}
                  y={top}
                  width={slot}
                  height={plotH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActive(index)}
                >
                  <title>{point.detail}</title>
                </rect>
              </g>
            );
          })}
          {targetLine.length > 1 && (
            <polyline points={targetLine.join(' ')} fill="none" stroke="var(--color-fg)" strokeOpacity="0.45" strokeWidth="1.5" strokeDasharray="5 4" className="pointer-events-none" />
          )}
          {actualLine.length > 1 && (
            <polyline
              points={actualLine.join(' ')}
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="2.25"
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={mounted ? 0 : 1}
              className="pointer-events-none transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
            />
          )}
        </svg>
      </div>
      <p id={detailId} className="mt-2 text-sm text-muted" aria-live="polite">
        {selected?.detail ?? 'Sin días para mostrar.'}
      </p>
      <ul className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
        <li className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
          Venta
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t border-dashed border-fg" />
          {sameTarget ? 'Ritmo necesario' : 'Meta'}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-brand" />
          Acumulado
        </li>
      </ul>
    </div>
  );
}
