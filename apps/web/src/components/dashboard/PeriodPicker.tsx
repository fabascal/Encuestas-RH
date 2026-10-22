import { CaretLeft, CaretRight } from '@phosphor-icons/react';

export interface PeriodPickerProps {
  period: string;
  onChange: (period: string) => void;
}

const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function shiftPeriod(period: string, deltaMonths: number): string {
  const [year, month] = period.split('-').map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1 + deltaMonths, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function formatPeriod(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return `${MONTH_LABELS[(month ?? 1) - 1]} ${year}`;
}

export function PeriodPicker({ period, onChange }: PeriodPickerProps) {
  return (
    <div className="flex items-center gap-1 rounded-control border border-border bg-surface p-1">
      <button
        type="button"
        aria-label="Periodo anterior"
        onClick={() => onChange(shiftPeriod(period, -1))}
        className="flex h-9 w-9 items-center justify-center rounded-control text-muted hover:bg-bg"
      >
        <CaretLeft size={16} />
      </button>
      <span className="min-w-[9rem] text-center text-sm font-medium text-fg">{formatPeriod(period)}</span>
      <button
        type="button"
        aria-label="Periodo siguiente"
        onClick={() => onChange(shiftPeriod(period, 1))}
        className="flex h-9 w-9 items-center justify-center rounded-control text-muted hover:bg-bg"
      >
        <CaretRight size={16} />
      </button>
    </div>
  );
}
