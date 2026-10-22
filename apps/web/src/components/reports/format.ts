export function money(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
}

/** Short money for axes and labels: $1.2 M, $85 k. Full amounts stay in the detail. */
export function moneyShort(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toLocaleString('es-MX', { maximumFractionDigits: 1 })} M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000).toLocaleString('es-MX')} k`;
  }
  return money(value);
}

export function percent(ratio: number | null): string {
  if (ratio === null || Number.isNaN(ratio)) return '—';
  return `${(ratio * 100).toLocaleString('es-MX', { maximumFractionDigits: 1 })}%`;
}

export function points(delta: number | null): string {
  if (delta === null) return 'sin mes anterior';
  const value = delta * 100;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('es-MX', { maximumFractionDigits: 1 })} pts`;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function monthLabel(period: string): string {
  const [year, month] = period.split('-');
  return `${MONTHS[(Number(month) || 1) - 1]} ${year}`;
}
