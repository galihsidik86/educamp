import * as React from 'react';
/**
 * Primary call-to-action button for SIAKAD actions (Simpan KRS, Login, Cetak).
 * @startingPoint section="Core" subtitle="Buttons: primary, accent, secondary, ghost, danger" viewport="700x140"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default 'primary' */
  variant?: 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
  /** Control height. @default 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to full container width. */
  block?: boolean;
  /** Show spinner in place of the label and block interaction (implies disabled). */
  loading?: boolean;
  /** Icon node rendered before the label (e.g. a Lucide <i>). */
  leftIcon?: React.ReactNode;
  /** Icon node rendered after the label. */
  rightIcon?: React.ReactNode;
}
export function Button(props: ButtonProps): JSX.Element;
