/**
 * JS-side counterpart of theme/tokens.css: semantic tokens needed in component
 * logic (not just CSS), such as mapping a KPI's progress to a semaphore color.
 * Keep in sync with the semantic color names defined in tokens.css.
 */

export const SEMAPHORE_LEVELS = ['success', 'warning', 'danger'] as const;
export type SemaphoreLevel = (typeof SEMAPHORE_LEVELS)[number];

export interface SemaphoreStyle {
  badgeClassName: string;
  dotClassName: string;
  label: string;
}

export const semaphoreStyles: Record<SemaphoreLevel, SemaphoreStyle> = {
  success: {
    badgeClassName: 'bg-success-soft text-success',
    dotClassName: 'bg-success',
    label: 'En meta',
  },
  warning: {
    badgeClassName: 'bg-warning-soft text-warning',
    dotClassName: 'bg-warning',
    label: 'En riesgo',
  },
  danger: {
    badgeClassName: 'bg-danger-soft text-danger',
    dotClassName: 'bg-danger',
    label: 'Fuera de meta',
  },
};

/**
 * Maps a goal's progress fraction (1 = 100% of target) to a semaphore level,
 * using the same threshold semantics as the bonus engine: below the minimum
 * threshold is red, at/above threshold but under full target is amber, at or
 * above full target is green.
 */
export function resolveSemaphoreLevel(
  progressPct: number | null,
  minThresholdPct: number,
): SemaphoreLevel {
  if (progressPct === null) return 'danger';
  if (progressPct >= 1) return 'success';
  if (progressPct >= minThresholdPct / 100) return 'warning';
  return 'danger';
}
