import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

type Variant = 'success' | 'danger' | 'warning' | 'info';
type ToastItem = {
  id: number;
  variant: Variant;
  title?: string;
  message: string;
  closing?: boolean;
};
type ShowOpts = { title?: string; durationMs?: number };

type Ctx = {
  show: (variant: Variant, message: string, opts?: ShowOpts) => void;
  success: (message: string, opts?: ShowOpts) => void;
  danger: (message: string, opts?: ShowOpts) => void;
  warning: (message: string, opts?: ShowOpts) => void;
  info: (message: string, opts?: ShowOpts) => void;
  dismiss: (id: number) => void;
};

const ToastCtx = createContext<Ctx | null>(null);
const DEFAULT_MS = 4000;
const EXIT_MS = 200;

const ICONS: Record<Variant, ReactNode> = {
  success: <CheckCircle2 size={18} />,
  danger:  <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info:    <Info size={18} />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((arr) => arr.map((t) => (t.id === id ? { ...t, closing: true } : t)));
    setTimeout(() => {
      setItems((arr) => arr.filter((t) => t.id !== id));
    }, EXIT_MS);
  }, []);

  const show = useCallback((variant: Variant, message: string, opts?: ShowOpts) => {
    const id = Date.now() + Math.random();
    const item: ToastItem = { id, variant, message, title: opts?.title };
    setItems((arr) => [...arr, item]);
    const ms = opts?.durationMs ?? DEFAULT_MS;
    if (ms > 0) setTimeout(() => dismiss(id), ms);
  }, [dismiss]);

  const value: Ctx = {
    show,
    success: (m, o) => show('success', m, o),
    danger:  (m, o) => show('danger', m, o),
    warning: (m, o) => show('warning', m, o),
    info:    (m, o) => show('info', m, o),
    dismiss,
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifikasi" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.variant}${t.closing ? ' toast--closing' : ''}`}
            role={t.variant === 'danger' ? 'alert' : 'status'}
          >
            <span className="toast__icon">{ICONS[t.variant]}</span>
            <div className="toast__body">
              {t.title && <div className="toast__title">{t.title}</div>}
              <div className="toast__msg">{t.message}</div>
            </div>
            <button
              type="button"
              className="toast__close"
              aria-label="Tutup notifikasi"
              onClick={() => dismiss(t.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
