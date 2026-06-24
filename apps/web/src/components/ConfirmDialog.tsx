import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

type Variant = 'primary' | 'danger' | 'warning';

export type ConfirmOptions = {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
};

type Ctx = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<Ctx | null>(null);
const EXIT_MS = 180;

const ICONS: Record<Variant, ReactNode> = {
  primary: <Info size={22} />,
  danger:  <AlertCircle size={22} />,
  warning: <AlertTriangle size={22} />,
};

const BTN_VARIANT: Record<Variant, 'primary' | 'danger' | 'accent'> = {
  primary: 'primary',
  danger:  'danger',
  warning: 'accent',
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [closing, setClosing] = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback<Ctx>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...opts, resolve });
      setClosing(false);
    });
  }, []);

  const finish = useCallback((ok: boolean) => {
    if (!pending) return;
    setClosing(true);
    pending.resolve(ok);
    setTimeout(() => {
      setPending(null);
      setClosing(false);
    }, EXIT_MS);
  }, [pending]);

  // Focus confirm button + Escape handler
  useEffect(() => {
    if (!pending || closing) return;
    const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter' && document.activeElement === confirmBtnRef.current) {
        // already handled by button click
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [pending, closing, finish]);

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className={`modal-overlay${closing ? ' modal-overlay--closing' : ''}`}
          onClick={() => finish(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div
            className={`modal-card confirm-dialog confirm-dialog--${pending.variant ?? 'primary'}${closing ? ' modal-card--closing' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480 }}
          >
            <div className="confirm-dialog__head">
              <div className="confirm-dialog__icon">{ICONS[pending.variant ?? 'primary']}</div>
              <h3 className="confirm-dialog__title" id="confirm-title">{pending.title}</h3>
            </div>
            {pending.message && (
              <div className="confirm-dialog__msg">{pending.message}</div>
            )}
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="tz-btn tz-btn--ghost tz-btn--sm"
                onClick={() => finish(false)}
              >
                {pending.cancelLabel ?? 'Batal'}
              </button>
              <button
                ref={confirmBtnRef}
                type="button"
                className={`tz-btn tz-btn--${BTN_VARIANT[pending.variant ?? 'primary']} tz-btn--sm`}
                onClick={() => finish(true)}
              >
                {pending.confirmLabel ?? 'Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  );
}

/**
 * Hook untuk konfirmasi user dengan dialog branded.
 * Pakai sebagai pengganti window.confirm() — return Promise<boolean>.
 *
 * @example
 * const confirm = useConfirm();
 * if (await confirm({ title: 'Hapus pertemuan?', variant: 'danger' })) {
 *   await del();
 * }
 */
export function useConfirm(): Ctx {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
