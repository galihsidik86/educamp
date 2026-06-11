import { type ReactNode, useEffect } from 'react';

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number };

export function Modal({ open, onClose, title, children, width = 560 }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: width }}
      >
        <div className="row modal-card__head">
          <h3 style={{ margin: 0, color: 'var(--text-strong)', fontSize: 'var(--text-lg)' }}>{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="modal-card__close">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
