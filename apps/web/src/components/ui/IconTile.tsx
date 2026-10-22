import type { Icon } from '@phosphor-icons/react';
import { kpiIcon } from '../../lib/icons';

type IconTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_CLASS: Record<IconTone, string> = {
  brand: 'bg-brand-soft text-brand',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-bg text-muted',
};

const SIZE_CLASS = {
  sm: { box: 'h-8 w-8', icon: 16 },
  md: { box: 'h-11 w-11', icon: 22 },
  lg: { box: 'h-16 w-16', icon: 32 },
} as const;

export function IconTile({
  icon: Glyph,
  tone = 'brand',
  size = 'md',
}: {
  icon: Icon;
  tone?: IconTone;
  size?: keyof typeof SIZE_CLASS;
}) {
  const spec = SIZE_CLASS[size];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-control ${spec.box} ${TONE_CLASS[tone]}`}
    >
      <Glyph size={spec.icon} />
    </span>
  );
}

/** Small glyph plus the rubric name. The name stays in the text for screen readers. */
export function KpiMark({ code, name }: { code: string; name: string }) {
  const Glyph = kpiIcon(code);
  return (
    <span className="inline-flex items-center gap-1.5">
      <Glyph size={16} aria-hidden />
      {name}
    </span>
  );
}
