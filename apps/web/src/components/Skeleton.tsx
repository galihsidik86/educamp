import type { CSSProperties } from 'react';

type Variant = 'text' | 'circle' | 'card' | 'block';
type Props = {
  variant?: Variant;
  width?: number | string;
  height?: number | string;
  /** Jumlah skeleton stacked (untuk list). Default 1. */
  count?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Skeleton loader — placeholder berdenyut untuk konten yang loading.
 * Lebih informatif daripada teks "Memuat…" karena memberi hint layout.
 */
export function Skeleton({
  variant = 'block', width, height, count = 1, className = '', style,
}: Props) {
  const baseClass = ['skeleton', variant !== 'block' && `skeleton--${variant}`, className]
    .filter(Boolean).join(' ');
  const css: CSSProperties = {
    width: width ?? (variant === 'text' ? '100%' : undefined),
    height: height ?? (variant === 'circle' ? width : undefined),
    ...style,
  };
  if (count === 1) return <span className={baseClass} style={css} aria-hidden="true">&nbsp;</span>;
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 6 }} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={baseClass} style={css}>&nbsp;</span>
      ))}
    </span>
  );
}
