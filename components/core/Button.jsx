import React from 'react';

export function Button({ variant = 'primary', size = 'md', block = false, loading = false, disabled, leftIcon, rightIcon, children, className = '', ...props }) {
  const cls = ['tz-btn', `tz-btn--${variant}`, size !== 'md' && `tz-btn--${size}`, block && 'tz-btn--block', loading && 'tz-btn--loading', className].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {leftIcon && <span className="tz-btn__icon">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="tz-btn__icon">{rightIcon}</span>}
    </button>
  );
}
