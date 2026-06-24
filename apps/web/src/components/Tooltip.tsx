import { type ReactElement, cloneElement } from 'react';

type Placement = 'top' | 'bottom' | 'left' | 'right';

type Props = {
  /** Konten tooltip (teks pendek). Kalau falsy, tidak render tooltip. */
  label: string | null | undefined;
  placement?: Placement;
  /** Elemen anak — di-wrap dengan span ber-data-attribute. */
  children: ReactElement;
};

/**
 * Tooltip CSS-only via data-tip attribute. Tidak butuh portal/JS positioning.
 * Cocok untuk icon-only button. Auto-hide saat label kosong.
 *
 * @example
 * <Tooltip label="Hapus pertemuan">
 *   <button onClick={del}><Trash2 size={14} /></button>
 * </Tooltip>
 */
export function Tooltip({ label, placement = 'top', children }: Props) {
  if (!label) return children;
  // Bungkus child dgn span supaya data-attribute dan style sticky ke parent
  return (
    <span
      className="tz-tip"
      data-tip={label}
      data-tip-placement={placement}
    >
      {cloneElement(children, {
        'aria-label': children.props['aria-label'] ?? label,
      } as object)}
    </span>
  );
}
