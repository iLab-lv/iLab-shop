'use client';

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';
import styles from './ShopFullscreenPanel.module.css';

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

export default function ShopFullscreenPanel({ id, title, open, onClose, returnFocusRef, initialFocusRef, children }) {
  const panelRef = useRef(null);
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
    requestAnimationFrame(() => (initialFocusRef?.current ?? closeRef.current)?.focus());

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
  const titleId = `${id}-title`;
  return createPortal(
    <section ref={panelRef} className={styles.panel} id={id} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Image src="/shop/brand/logo.svg" alt="iLab" width={102} height={40} priority />
          <h2 id={titleId}>{title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={`Close ${title}`}>×</button>
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </section>,
    document.body
  );
}
