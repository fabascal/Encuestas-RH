export interface ValidityRange {
  from: string;
  /** Exclusive end. Null while the version is still open. */
  to: string | null;
  /** Last day the version applies. Null while it is still open. */
  lastDay: string | null;
}

export interface VersionSpan {
  id: string;
  from: string;
  to: string | null;
}

export type ValidityState = 'vigente' | 'terminada' | 'futura';

export function mexicoToday(now = new Date()): string {
  const shifted = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shifted.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(iso: string, delta: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + delta));
  return date.toISOString().slice(0, 10);
}

/** Reads a Postgres daterange such as `[2026-01-01,2026-07-01)` or `[2026-01-01,)`. */
export function parseValidity(validDuring: string): ValidityRange | null {
  const match = validDuring.trim().match(/^[[(]([^,]*),([^)\]]*)([)\]])$/);
  const start = match?.[1];
  const end = match?.[2];
  const closing = match?.[3];
  if (!start || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !closing) return null;
  const open = !end || end === 'infinity';
  if (open) return { from: start, to: null, lastDay: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  const to = closing === ')' ? end : addDays(end, 1);
  const lastDay = closing === ')' ? addDays(end, -1) : end;
  if (lastDay < start) return null;
  return { from: start, to, lastDay };
}

export function formatDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function formatValidity(range: ValidityRange): string {
  if (!range.lastDay) return `Desde ${formatDay(range.from)}`;
  return `${formatDay(range.from)} al ${formatDay(range.lastDay)}`;
}

export function validityState(range: ValidityRange, today: string): ValidityState {
  if (today < range.from) return 'futura';
  if (range.to !== null && today >= range.to) return 'terminada';
  return 'vigente';
}

/** Version of the same scope that is still open on `validFrom` and started earlier. */
export function versionToClose(versions: VersionSpan[], validFrom: string): VersionSpan | null {
  const matches = versions.filter((version) => version.from < validFrom && (version.to === null || version.to > validFrom));
  matches.sort((left, right) => right.from.localeCompare(left.from));
  return matches[0] ?? null;
}

/** True when another version of the same scope overlaps the new range. The one that will be closed is ignored. */
export function datesClash(
  versions: VersionSpan[],
  validFrom: string,
  validTo: string | null,
  ignoreId: string | null = null,
): boolean {
  return versions.some((version) => {
    if (ignoreId !== null && version.id === ignoreId) return false;
    const startsBeforeEnd = validTo === null || version.from < validTo;
    const endsAfterStart = version.to === null || version.to > validFrom;
    return startsBeforeEnd && endsAfterStart;
  });
}
