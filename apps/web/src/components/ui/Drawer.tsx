import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Stays visible above the scrolling content. */
  banner?: ReactNode;
  footer?: ReactNode;
}

/** Full-height panel that slides in from the right. */
export function Drawer({ open, onClose, title, children, banner, footer }: DrawerProps) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => setShown(true));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar"
        className={[
          'absolute inset-0 bg-overlay transition-opacity duration-200 motion-reduce:transition-none',
          shown ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={[
          'relative z-10 flex h-full w-full flex-col bg-surface shadow-xl transition-transform duration-200 motion-reduce:transition-none sm:w-[40rem]',
          shown ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="drawer-title" className="text-base font-semibold text-fg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 items-center justify-center rounded-control text-muted hover:bg-bg"
          >
            <X size={20} />
          </button>
        </div>
        {banner && <div className="border-b border-border px-5 py-4">{banner}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
