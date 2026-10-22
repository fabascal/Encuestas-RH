import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-overlay"
        onClick={onClose}
        type="button"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={[
          'relative z-10 flex max-h-[90vh] w-full flex-col rounded-t-card bg-surface shadow-xl sm:m-4 sm:rounded-card',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        ].join(' ')}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 id="modal-title" className="text-base font-semibold text-fg">
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
        <div className="overflow-y-auto p-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border p-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
