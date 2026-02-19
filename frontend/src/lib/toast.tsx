import { createContext, useCallback, useContext, useState, useMemo, ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;
function nextId() {
  return `toast-${++toastId}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = nextId();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

function ToastContainer() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  const { toasts, removeToast } = ctx;
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-md w-full px-4"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`
            flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-card-hover
            duration-300
            ${t.type === 'success' ? 'bg-sentra-primary text-white' : ''}
            ${t.type === 'error' ? 'bg-sentra-high text-white' : ''}
            ${t.type === 'info' ? 'bg-sentra-primary/90 text-white' : ''}
          `}
        >
          <span className="text-sm font-medium">{t.message}</span>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            className="opacity-80 hover:opacity-100 p-1 rounded"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
