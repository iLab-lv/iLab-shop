'use client';

import { useId, useRef } from 'react';
import ShopModal from './ShopModal';
import styles from './ShopDrawer.module.css';

export default function ShopDrawer({ id, title, closeLabel = `Close ${title}`, eyebrow, open, onClose, returnFocusRef, initialFocusRef, closeDisabled = false, footer, className = '', children }) {
  const closeRef = useRef(null);
  const generatedId = useId();
  const drawerId = id ?? `shop-drawer-${generatedId}`;
  const titleId = `${drawerId}-title`;
  return (
    <ShopModal open={open} onClose={onClose} returnFocusRef={returnFocusRef} initialFocusRef={initialFocusRef ?? closeRef} closeDisabled={closeDisabled} id={drawerId} labelledBy={titleId}>
      <section className={`${styles.drawer} ${className}`} data-shop-modal-frame="" data-shop-drawer="">
        <header className={styles.header} data-shop-overlay-header="">
          <div className={styles.heading}>
            {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button ref={closeRef} className={styles.close} type="button" aria-label={closeLabel} onClick={onClose} disabled={closeDisabled}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 5 14 14M19 5 5 19" /></svg>
          </button>
        </header>
        <div className={styles.body} data-shop-overlay-body="">{children}</div>
        {footer && <footer className={styles.footer} data-shop-overlay-footer="">{footer}</footer>}
      </section>
    </ShopModal>
  );
}
