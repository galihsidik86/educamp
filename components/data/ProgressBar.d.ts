import * as React from 'react';
/** Linear progress — SKS tempuh, kelengkapan profil, progress pembayaran. */
export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'primary' | 'accent' | 'success';
  label?: React.ReactNode;
  showValue?: boolean;
}
export function ProgressBar(props: ProgressBarProps): JSX.Element;
