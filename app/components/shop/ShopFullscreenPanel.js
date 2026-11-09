'use client';

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import styles from './ShopFullscreenPanel.module.css';

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function ShopFullscreenPanel({ id, title, open, onClose, returnFocusRef, initialFocusRef, variant = 'fullscreen', children }) {
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const body = document.body;
    const returnFocusTarget = returnFocusRef?.current;
    const scrollY = window.scrollY;
    const previous = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width, paddingRight: body.style.paddingRight };
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    Object.assign(body.style, { overflow: 'hidden', position: 'fixed', top: `-${scrollY}px`, width: '100%' });
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    bodyRef.current.scrollTop = 0;
    requestAnimationFrame(() => { bodyRef.current?.scrollTo(0, 0); (initialFocusRef?.current ?? closeRef.current)?.focus(); });

    function handleKeyDown(event) {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...(panelRef.current?.querySelectorAll(FOCUSABLE) ?? [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      Object.assign(body.style, previous);
      window.scrollTo(0, scrollY);
      returnFocusTarget?.focus();
    };
  }, [open, onClose, returnFocusRef, initialFocusRef]);

  if (!open) return null;
  return createPortal(
    <div className={`${styles.backdrop} ${variant === 'drawer' ? styles.drawerBackdrop : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panelRef} className={`${styles.panel} ${variant === 'drawer' ? styles.drawer : ''} ${variant === 'search' ? styles.searchPanel : ''}`} id={id} role="dialog" aria-modal="true" aria-label={`${title} panel`}>
      <i className={styles.scanLine} aria-hidden="true" />
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          {variant === 'search'
            ? <h2>Search<span aria-hidden="true"> / </span>Products, models or SKU</h2>
            : variant === 'drawer' ? <h2>{title}</h2> : <Image src="/shop/brand/logo.svg" alt="iLab" width={102} height={40} priority />}
          <button ref={closeRef} type="button" onClick={onClose} aria-label={`Close ${title}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg></button>
        </div>
      </header>
      <div ref={bodyRef} className={styles.body}>{children}</div>
    </section></div>,
    document.body
  );
}
