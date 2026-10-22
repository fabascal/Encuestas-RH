import type { ReportSource } from '@portal/shared';

export function money(value: number): string {
  return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 });
}

export function pct(ratio: number | null): string {
  if (ratio === null || Number.isNaN(ratio)) return '—';
  return `${(ratio * 100).toFixed(1)}%`;
}

export function sourceLabel(source: ReportSource): string {
  return source === 'cerrado' ? 'Definitivo' : 'Estimado';
}

export function stamp(input: {
  period?: string;
  generatedAt: string;
  generatedBy: string;
  scopeLabel: string;
  source?: ReportSource;
}): string[] {
  const lines = [
    input.period ? `Periodo ${input.period} · ${input.scopeLabel}` : input.scopeLabel,
    `Generado por ${input.generatedBy} · ${new Date(input.generatedAt).toLocaleString('es-MX')}`,
  ];
  if (input.source) lines.push(input.source === 'cerrado' ? 'Cálculo definitivo' : 'Cálculo estimado: el periodo sigue abierto');
  return lines;
}
