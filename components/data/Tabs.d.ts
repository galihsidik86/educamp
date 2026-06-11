import * as React from 'react';
export interface TabItem { value: string; label: React.ReactNode; }
/** Underline tab bar — controlled via value/onChange. */
export interface TabsProps {
  /** Array of {value,label} or plain strings. */
  tabs: (TabItem | string)[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
}
export function Tabs(props: TabsProps): JSX.Element;
