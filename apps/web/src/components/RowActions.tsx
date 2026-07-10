import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';

export type RowAction = {
  label: string;
  icon?: ReactNode;
  /** Salah satu: onClick (aksi langsung) atau to (navigasi). */
  onClick?: () => void;
  to?: string;
  danger?: boolean;
  disabled?: boolean;
};

/**
 * Menu overflow ("...") untuk baris tabel dengan >3 aksi — dipakai supaya
 * tabel tetap ringkas di layar sempit alih-alih menumpuk banyak Button
 * ghost berdampingan (lihat UI-AUDIT.md #8). Untuk ≤3 aksi, tetap pakai
 * Button ghost langsung — tidak perlu disembunyikan di balik menu.
 */
export function RowActions({ actions, label = 'Aksi lainnya' }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="row-actions" ref={ref}>
      <button
        type="button"
        className="row-actions__trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div className="row-actions__menu" role="menu">
          {actions.map((a, i) => {
            const cls = ['row-actions__item', a.danger && 'row-actions__item--danger'].filter(Boolean).join(' ');
            if (a.to && !a.disabled) {
              return (
                <Link key={i} to={a.to} role="menuitem" className={cls} onClick={() => setOpen(false)}>
                  {a.icon}{a.label}
                </Link>
              );
            }
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                className={cls}
                disabled={a.disabled}
                onClick={() => { setOpen(false); a.onClick?.(); }}
              >
                {a.icon}{a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
