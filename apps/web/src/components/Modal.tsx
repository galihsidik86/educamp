import { type ReactNode, useEffect, useState } from 'react';

type Props = { open: boolean; onClose: () => void; title: string; children: ReactNode; width?: number };

/** Durasi exit harus sesuai dgn keyframe modal-card-out di app.css. */
const EXIT_MS = 180;

export function Modal({ open, onClose, title, children, width = 560 }: Props) {
  const [render, setRender] = useState(open);
  const [closing, setClosing] = useState(false);

  // Sinkronisasi mount/unmount dgn animasi exit
  useEffect(() => {
    if (open) {
      setRender(true);
      setClosing(false);
    } else if (render) {
      setClosing(true);
      const t = setTimeout(() => {
        setRender(false);
        setClosing(false);
      }, EXIT_MS);
      return () => clearTimeout(t);
    }
  }, [open, render]);

  // Escape key — hanya saat open, sebelum proses closing
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!render) return null;

  return (
    <div
      className={`modal-overlay${closing ? ' modal-overlay--closing' : ''}`}
      onClick={onClose}
    >
      <div
        className={`modal-card${closing ? ' modal-card--closing' : ''}`}
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
