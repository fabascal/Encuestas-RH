import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong',
  secondary: 'bg-surface text-fg border border-border hover:bg-bg',
  ghost: 'bg-transparent text-fg hover:bg-bg',
  danger: 'bg-danger text-on-brand hover:bg-danger-strong',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'h-11 px-4 text-sm',
  sm: 'h-9 px-3 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading = false, disabled, className = '', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ].join(' ')}
      {...props}
    >
      {isLoading && <Spinner size="sm" className="text-current" />}
      {children}
    </button>
  );
});
