import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-card border border-border bg-surface p-4 shadow-sm sm:p-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`mb-4 flex items-center justify-between gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', icon, ...props }: CardProps & { icon?: ReactNode }) {
  return (
    <h3 className={`flex items-center gap-2 text-base font-semibold text-fg ${className}`} {...props}>
      {icon}
      {children}
    </h3>
  );
}
