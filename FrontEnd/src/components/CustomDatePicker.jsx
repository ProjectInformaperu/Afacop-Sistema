import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

function toValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat('es-PE').format(date) : 'dd/mm/aaaa';
}

export default function CustomDatePicker({ value, onChange, style, className = '', name, id, required, disabled, min, max }) {
  const selectedDate = parseDate(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const rootRef = useRef(null);

  useEffect(() => { if (selectedDate) setViewDate(selectedDate); }, [value]);
  useEffect(() => {
    const close = event => { if (rootRef.current && !rootRef.current.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: count }, (_, index) => new Date(year, month, index + 1, 12))];
  }, [viewDate]);

  const chooseDate = date => {
    onChange?.({ target: { name, value: toValue(date) } });
    setOpen(false);
  };

  return (
    <div className="custom-date-picker" style={{ width: style?.width }} ref={rootRef}>
      <button id={id} type="button" style={style} className={`${className} custom-date-trigger${open ? ' is-open' : ''}`.trim()}
        aria-haspopup="dialog" aria-expanded={open} aria-label={name || 'Seleccionar fecha'} disabled={disabled}
        onClick={() => setOpen(current => !current)}>
        <span className={selectedDate ? '' : 'is-placeholder'}>{formatDate(value)}</span>
        <CalendarDays size={16} aria-hidden="true" />
      </button>
      {required && <input tabIndex="-1" aria-hidden="true" required value={value || ''} onChange={() => {}} className="custom-date-required" />}
      {open && (
        <div className="custom-date-popover" role="dialog" aria-label="Seleccionar fecha">
          <div className="custom-date-header">
            <button type="button" aria-label="Mes anterior" onClick={() => setViewDate(date => new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft size={17} /></button>
            <strong>{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</strong>
            <button type="button" aria-label="Mes siguiente" onClick={() => setViewDate(date => new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight size={17} /></button>
          </div>
          <div className="custom-date-weekdays">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
          <div className="custom-date-grid">
            {days.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />;
              const dayValue = toValue(date);
              const unavailable = (min && dayValue < min) || (max && dayValue > max);
              return <button type="button" key={dayValue} disabled={unavailable}
                className={dayValue === value ? 'is-selected' : dayValue === toValue(new Date()) ? 'is-today' : ''}
                onClick={() => chooseDate(date)}>{date.getDate()}</button>;
            })}
          </div>
          <div className="custom-date-footer">
            <button type="button" onClick={() => { onChange?.({ target: { name, value: '' } }); setOpen(false); }}>Limpiar</button>
            <button type="button" onClick={() => chooseDate(new Date())}>Hoy</button>
          </div>
        </div>
      )}
    </div>
  );
}
