import { resolveSemaphoreLevel, semaphoreStyles } from '../../theme/theme.config';

export interface StatusIndicatorProps {
  /** Progress fraction (1 = 100% of target), or null when it cannot be computed. */
  progressPct: number | null;
  /** Minimum threshold percentage (0-100) required to accredit any payout. */
  minThresholdPct: number;
  showLabel?: boolean;
}

/** Traffic-light indicator reused across KpiCard, tables and the bonus simulator. */
export function StatusIndicator({ progressPct, minThresholdPct, showLabel = true }: StatusIndicatorProps) {
  const level = resolveSemaphoreLevel(progressPct, minThresholdPct);
  const style = semaphoreStyles[level];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${style.badgeClassName}`}>
      <span className={`h-2 w-2 rounded-full ${style.dotClassName}`} aria-hidden="true" />
      {showLabel && style.label}
    </span>
  );
}
