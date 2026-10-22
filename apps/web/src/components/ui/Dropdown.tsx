import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
}

export function Dropdown({ trigger, items, align = 'right' }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button type="button" onClick={() => setOpen((prev) => !prev)} aria-expanded={open}>
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={[
            'absolute z-20 mt-2 w-48 overflow-hidden rounded-control border border-border bg-surface shadow-lg',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className={[
                'flex w-full items-center px-4 py-3 text-left text-sm hover:bg-bg disabled:cursor-not-allowed disabled:opacity-60',
                item.tone === 'danger' ? 'text-danger' : 'text-fg',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
