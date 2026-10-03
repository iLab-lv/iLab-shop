'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './AdminEditing.module.css';

export default function AdminCombobox({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  clearable = true,
  emptyMessage = 'No matching options.',
}) {
  const generatedId = useId();
  const listboxId = `${id || generatedId}-listbox`;
  const rootRef = useRef(null);
  const selected = options.find((option) => option.id === value) ?? null;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = options.filter((option) =>
    !normalizedQuery || option.name.toLocaleLowerCase().includes(normalizedQuery)
  );

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  function openMenu() {
    if (disabled) return;
    setOpen(true);
    setActiveIndex(0);
  }

  function choose(option) {
    onChange(option.id);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(event) {
    if (disabled) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return openMenu();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((current) => Math.max(0, Math.min(filtered.length - 1, current + direction)));
    } else if (event.key === 'Enter' && open && filtered[activeIndex]) {
      event.preventDefault();
      choose(filtered[activeIndex]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div className={styles.comboField} ref={rootRef}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.comboControl}>
        <input
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && filtered[activeIndex] ? `${listboxId}-${filtered[activeIndex].id}` : undefined}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={open ? query : selected?.name ?? ''}
          onFocus={openMenu}
          onClick={openMenu}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
        />
        {clearable && value && !disabled ? (
          <button type="button" className={styles.comboClear} aria-label={`Clear ${label}`}
            onClick={() => { onChange(''); setQuery(''); setOpen(false); }}>&times;</button>
        ) : null}
        <span className={styles.comboChevron} aria-hidden="true" />
      </div>
      {open ? (
        <div className={styles.comboMenu} id={listboxId} role="listbox">
          {filtered.length ? filtered.map((option, index) => (
            <button
              id={`${listboxId}-${option.id}`}
              type="button"
              role="option"
              aria-selected={option.id === value}
              className={index === activeIndex ? styles.comboOptionActive : undefined}
              key={option.id}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
            >
              <span>{option.name}</span>
              {option.status !== 'active' ? <small>Inactive</small> : null}
            </button>
          )) : <p className={styles.comboEmpty}>{emptyMessage}</p>}
        </div>
      ) : null}
    </div>
  );
}
