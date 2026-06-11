import React from 'react';

export const Checkbox = React.forwardRef(function Checkbox(
  { label, className = '', ...props },
  ref,
) {
  return (
    <label className={['tz-check', className].filter(Boolean).join(' ')}>
      <input ref={ref} type="checkbox" {...props} />
      <span className="tz-check__box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
      </span>
      {label && <span>{label}</span>}
    </label>
  );
});
