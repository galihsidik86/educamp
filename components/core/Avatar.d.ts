import * as React from 'react';
/** User avatar — photo or auto-generated initials for mahasiswa/dosen. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  /** Full name — used for initials fallback and alt text. */
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}
export function Avatar(props: AvatarProps): JSX.Element;
