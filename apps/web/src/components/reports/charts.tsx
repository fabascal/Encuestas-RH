import type { HeatLevel, ReportSource, TrendDirection } from '@portal/shared';
import { Badge } from '../ui/Badge';
import { percent } from './format';

const HEAT_CLASS: Record<HeatLevel, string> = {
  meta: 'bg-success-soft text-success',
  cerca: 'bg-warning-soft text-warning',
  lejos: 'bg-danger-soft text-danger',
  sin_dato: 'bg-bg text-muted',
};

export function HeatCell({ level, label }: { level: HeatLevel; label: string }) {
  return (
    <span className={`inline-flex min-w-16 justify-center rounded-control px-2 py-1 text-xs font-medium ${HEAT_CLASS[level]}`}>
      {label}
    </span>
  );
}

export function SourceBadge({ source }: { source: ReportSource }) {
  return <Badge tone={source === 'cerrado' ? 'success' : 'warning'}>{source === 'cerrado' ? 'Definitivo' : 'Estimado'}</Badge>;
}

export function DirectionBadge({ direction }: { direction: TrendDirection }) {
  const tone = direction === 'sube' ? 'success' : direction === 'baja' ? 'danger' : 'neutral';
  const label = { sube: 'Sube', baja: 'Baja', igual: 'Igual', sin_dato: 'Sin dato' }[direction];
  return <Badge tone={tone}>{label}</Badge>;
}

export function BarList({ items }: { items: Array<{ label: string; ratio: number | null }> }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const width = `${Math.max(0, Math.min((item.ratio ?? 0) * 100, 100))}%`;
        return (
          <li key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-sm">
              <span className="text-fg">{item.label}</span>
              <span className="text-muted">{percent(item.ratio)}</span>
            </div>
            <div className="h-2 rounded-full bg-bg" role="img" aria-label={`${item.label}: ${percent(item.ratio)}`}>
              <div className="h-2 rounded-full bg-brand" style={{ width }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function linePoints(values: Array<number | null>, width: number, height: number): string {
  const step = values.length <= 1 ? 0 : width / (values.length - 1);
  return values
    .map((value, index) => {
      if (value === null) return null;
      const x = index * step;
      const y = height - (Math.max(0, Math.min(value, 1.2)) / 1.2) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .filter((point): point is string => point !== null)
    .join(' ');
}

export function TrendLine({ points }: { points: Array<{ label: string; ratio: number | null }> }) {
  const width = 360;
  const height = 96;
  const drawn = linePoints(points.map((point) => point.ratio), width, height);
  const label = points.map((point) => `${point.label} ${percent(point.ratio)}`).join(', ');
  return (
    <svg viewBox={`0 0 ${width} ${height + 18}`} className="w-full text-brand" role="img" aria-label={label}>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={drawn} />
      {points.map((point, index) => {
        const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
        return (
          <text key={point.label} x={x} y={height + 14} fontSize="10" fill="#64748b" textAnchor={index === 0 ? 'start' : 'middle'}>
            {point.label}
          </text>
        );
      })}
    </svg>
  );
}

const ZONE_COLORS = [
  'var(--color-brand)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-danger)',
  'var(--color-brand-strong)',
  'var(--color-danger-strong)',
  'color-mix(in srgb, var(--color-brand) 55%, var(--color-success))',
  'color-mix(in srgb, var(--color-warning) 55%, var(--color-danger))',
  'color-mix(in srgb, var(--color-brand) 40%, var(--color-fg))',
  'color-mix(in srgb, var(--color-success) 50%, var(--color-brand))',
] as const;

export function zoneColor(index: number): string {
  return ZONE_COLORS[index % ZONE_COLORS.length] ?? 'var(--color-brand)';
}

export interface PieSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

function polar(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
}

function donutPath(cx: number, cy: number, outer: number, inner: number, start: number, end: number): string {
  const span = end - start;
  if (span >= Math.PI * 2 - 1e-4) {
    const mid = start + Math.PI;
    return `${donutPath(cx, cy, outer, inner, start, mid)} ${donutPath(cx, cy, outer, inner, mid, end - 1e-4)}`;
  }
  const outerStart = polar(cx, cy, outer, start);
  const outerEnd = polar(cx, cy, outer, end);
  const innerEnd = polar(cx, cy, inner, end);
  const innerStart = polar(cx, cy, inner, start);
  const large = span > Math.PI ? 1 : 0;
  return `M ${outerStart.x} ${outerStart.y} A ${outer} ${outer} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y} L ${innerEnd.x} ${innerEnd.y} A ${inner} ${inner} 0 ${large} 0 ${innerStart.x} ${innerStart.y} Z`;
}

export function PieChart({
  slices,
  center,
  label,
  active,
  onActive,
}: {
  slices: PieSlice[];
  center: string;
  label: string;
  active: string | null;
  onActive: (id: string | null) => void;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let cursor = -Math.PI / 2;
  const arcs = slices.map((slice) => {
    const share = total === 0 ? 0 : slice.value / total;
    const start = cursor;
    const sweep = share * Math.PI * 2;
    cursor += sweep;
    const inset = slices.length > 1 ? Math.min(0.02, sweep / 3) : 0;
    return { ...slice, share, d: donutPath(100, 100, 78, 48, start + inset, start + sweep - inset) };
  });

  return (
    <svg viewBox="0 0 200 200" role="group" aria-label={label} className="h-auto w-full">
      {arcs.map((arc) => (
        <path
          key={arc.id}
          d={arc.d}
          fill={arc.color}
          tabIndex={0}
          aria-label={`${arc.label}: ${percent(arc.share)} del total pagado`}
          stroke={active === arc.id ? 'var(--color-surface)' : 'none'}
          strokeWidth={active === arc.id ? 2 : 0}
          onMouseEnter={() => onActive(arc.id)}
          onMouseLeave={() => onActive(null)}
          onFocus={() => onActive(arc.id)}
          onBlur={() => onActive(null)}
          className={`cursor-pointer outline-none transition-opacity duration-150 motion-reduce:transition-none ${active !== null && active !== arc.id ? 'opacity-40' : 'opacity-100'}`}
        />
      ))}
      <text x="100" y="94" textAnchor="middle" className="fill-muted text-[11px]">
        Pagado
      </text>
      <text x="100" y="114" textAnchor="middle" className="fill-fg text-[13px] font-semibold">
        {center}
      </text>
    </svg>
  );
}

export function Sparkline({ values, label }: { values: Array<number | null>; label: string }) {
  const drawn = linePoints(values, 96, 28);
  return (
    <svg viewBox="0 0 96 28" className="h-7 w-24 text-brand" role="img" aria-label={label}>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={drawn} />
    </svg>
  );
}
