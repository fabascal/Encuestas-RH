import type { DirectorMonth, HeatLevel } from '@portal/shared';

const SECTION_COLORS: Record<string, string> = {
  'SERVICIO AL CLIENTE': '#2563eb',
  LIMPIEZA: '#0891b2',
  INSTALACIONES: '#7c3aed',
  BOMBAS: '#d97706',
  TERMINALES: '#db2777',
  'RESULTADOS GENERALES': '#64748b',
};

const FALLBACK_COLORS = ['#0f766e', '#b45309', '#4338ca', '#be123c', '#0369a1'];

export const TOTAL_COLOR = '#0f172a';

/** Survey section goal: 90% of SI among SI and NO answers. */
export const SECTION_GOAL = 0.9;

export const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

export function sectionLabel(section: string): string {
  const lower = section.toLocaleLowerCase('es-MX');
  return lower.charAt(0).toLocaleUpperCase('es-MX') + lower.slice(1);
}

export function sectionColor(section: string, index: number): string {
  return SECTION_COLORS[section] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length] ?? TOTAL_COLOR;
}

/** 90% or more is on goal, 80% to 89% is close, below that is far. */
export function heatLevel(ratio: number | null): HeatLevel {
  if (ratio === null || Number.isNaN(ratio)) return 'sin_dato';
  if (ratio >= SECTION_GOAL) return 'meta';
  if (ratio >= 0.8) return 'cerca';
  return 'lejos';
}

/** Difference between the two latest months that have a number. */
export function monthDelta(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null && !Number.isNaN(value));
  const latest = present.at(-1);
  const previous = present.at(-2);
  if (latest === undefined || previous === undefined) return null;
  return latest - previous;
}

/** Difference between the two latest months that have a score for this section. */
export function sectionDelta(monthly: DirectorMonth[], section: string): number | null {
  return monthDelta(monthly.map((month) => month.sections[section] ?? null));
}
