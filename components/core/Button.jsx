import React from 'react';

export function Button({ variant = 'primary', size = 'md', block = false, leftIcon, rightIcon, children, className = '', ...props }) {
  const cls = ['tz-btn', `tz-btn--${variant}`, size !== 'md' && `tz-btn--${size}`, block && 'tz-btn--block', className].filter(Boolean).join(' ');
  return (
    <button className={cls} {...props}>
      {leftIcon && <span className="tz-btn__icon">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="tz-btn__icon">{rightIcon}</span>}
    </button>
  );
}
