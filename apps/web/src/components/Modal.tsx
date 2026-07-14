import { type ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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

  // Portal ke document.body — .modal-overlay pakai position:fixed dan HARUS
  // dipusatkan relatif ke viewport, bukan ke ancestor manapun. Kalau dirender
  // di tempat (nested di dalam .route-transition, yang punya `transform` di
  // keyframe animasinya), transform pada ancestor itu diam-diam membuat
  // ancestor tsb jadi containing block untuk elemen fixed — modal jadi
  // ter-center relatif ke tinggi seluruh konten halaman (termasuk tabel
  // panjang), bukan ke viewport yang terlihat. Portal menghindari masalah
  // ini sepenuhnya, untuk ancestor manapun sekarang atau nanti.
  return createPortal(
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
    </div>,
    document.body,
  );
}
