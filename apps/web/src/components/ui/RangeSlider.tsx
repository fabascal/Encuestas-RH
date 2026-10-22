import { useId } from 'react';

export interface RangeSliderProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  disabled?: boolean;
}

export function RangeSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  formatValue = (v) => `${v}`,
  disabled = false,
}: RangeSliderProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-sm font-medium text-fg">
            {label}
          </label>
          <span className="text-sm font-semibold text-brand">{formatValue(value)}</span>
        </div>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full cursor-pointer accent-brand disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}
