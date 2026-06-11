import * as React from 'react';
/** Surface container. With `title`, renders a header row + padded body; otherwise a bare panel. */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional header title; enables the header/body layout. */
  title?: React.ReactNode;
  /** Right-aligned node in the header (button, menu, badge). */
  action?: React.ReactNode;
  /** Pad the card directly (only when no title). */
  pad?: boolean;
  /** Lift on hover — use for clickable cards. */
  hover?: boolean;
}
export function Card(props: CardProps): JSX.Element;
