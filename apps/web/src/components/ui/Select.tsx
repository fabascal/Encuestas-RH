import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { FieldLabel } from './FieldHint';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  tooltip?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, tooltip, options, placeholder, id, className = '', ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const tooltipId = tooltip ? `${selectId}-tip` : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <FieldLabel
          htmlFor={selectId}
          label={label}
          {...(tooltip && tooltipId ? { tooltip, tooltipId } : {})}
        />
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={tooltipId}
          className={[
            'h-11 w-full appearance-none rounded-control border bg-surface pl-3 pr-10 text-sm text-fg',
            'focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-60',
            error ? 'border-danger' : 'border-border',
            className,
          ].join(' ')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <CaretDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
          size={16}
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
});
