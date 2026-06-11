import React from 'react';

export const Switch = React.forwardRef(function Switch(
  { label, className = '', ...props },
  ref,
) {
  return (
    <label className={['tz-switch', className].filter(Boolean).join(' ')}>
      <input ref={ref} type="checkbox" {...props} />
      <span className="tz-switch__track"><span className="tz-switch__thumb" /></span>
      {label && <span>{label}</span>}
    </label>
  );
});
