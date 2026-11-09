'use client';

import Image from 'next/image';
import { useRef } from 'react';
import ShopModal from './ShopModal';
import ShopDrawer from './ShopDrawer';
import styles from './ShopFullscreenPanel.module.css';

export default function ShopFullscreenPanel({ id, title, open, onClose, returnFocusRef, initialFocusRef, variant = 'fullscreen', children }) {
  const closeRef = useRef(null);
  if (variant === 'drawer') return <ShopDrawer id={id} title={title} open={open} onClose={onClose} returnFocusRef={returnFocusRef} initialFocusRef={initialFocusRef}>{children}</ShopDrawer>;
  return <ShopModal id={id} open={open} onClose={onClose} returnFocusRef={returnFocusRef} initialFocusRef={initialFocusRef ?? closeRef} label={`${title} panel`}>
    <section className={`${styles.panel} ${variant === 'search' ? styles.searchPanel : ''}`} data-shop-modal-frame>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          {variant === 'search'
            ? <h2>Search<span aria-hidden="true"> / </span>Products, models or SKU</h2>
            : <Image src="/shop/brand/logo.svg" alt="iLab" width={102} height={40} priority />}
          <button ref={closeRef} type="button" onClick={onClose} aria-label={`Close ${title}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg></button>
        </div>
      </header>
      <div className={styles.body} data-shop-overlay-body>{children}</div>
    </section>
  </ShopModal>;
}
