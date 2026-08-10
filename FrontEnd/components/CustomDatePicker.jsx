import React from 'react';

export default function CustomDatePicker({ value, onChange, style, className, name }) {
  return (
    <input
      type="date"
      name={name}
      value={value || ''}
      onChange={onChange}
      className={className}
      style={style}
      aria-label={name || 'Seleccionar fecha'}
    />
  );
}
