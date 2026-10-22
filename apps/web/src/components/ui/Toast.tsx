import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, WarningCircle, XCircle, Info } from '@phosphor-icons/react';

type ToastTone = 'success' | 'warning' | 'danger' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TONE_ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle size={20} weight="fill" className="text-success" />,
  warning: <WarningCircle size={20} weight="fill" className="text-warning" />,
  danger: <XCircle size={20} weight="fill" className="text-danger" />,
  info: <Info size={20} weight="fill" className="text-brand" />,
};

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, tone, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:right-4 sm:left-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className="flex w-full max-w-sm items-start gap-3 rounded-control border border-border bg-surface p-4 shadow-lg"
            >
              {TONE_ICONS[toast.tone]}
              <p className="text-sm text-fg">{toast.message}</p>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
