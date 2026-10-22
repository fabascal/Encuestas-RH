import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { FieldLabel } from './FieldHint';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  tooltip?: string;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, tooltip, icon, id, className = '', ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const tooltipId = tooltip ? `${inputId}-tip` : undefined;
  const describedBy =
    [error ? `${inputId}-error` : hint ? `${inputId}-hint` : null, tooltipId].filter(Boolean).join(' ') ||
    undefined;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label && (
        <FieldLabel
          htmlFor={inputId}
          label={label}
          {...(tooltip && tooltipId ? { tooltip, tooltipId } : {})}
        />
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={[
            'h-11 w-full rounded-control border bg-surface px-3 text-sm text-fg placeholder:text-muted',
            'focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-60',
            icon ? 'pl-11' : '',
            error ? 'border-danger' : 'border-border',
            className,
          ].join(' ')}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
