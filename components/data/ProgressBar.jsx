import React from 'react';

export function ProgressBar({ value = 0, max = 100, variant = 'primary', label, showValue = true, className = '', ...props }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={['tz-progress', className].filter(Boolean).join(' ')} {...props}>
      {(label || showValue) && (
        <div className="tz-progress__meta">
          <span>{label}</span>
          {showValue && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="tz-progress__track">
        <div className={['tz-progress__bar', variant !== 'primary' && `tz-progress__bar--${variant}`].filter(Boolean).join(' ')} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}
