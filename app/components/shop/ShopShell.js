'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CartProvider } from './CartContext';
import CartDrawer from './CartDrawer';
import ContactPanel from './ContactPanel';
import ShopCtaDock from './ShopCtaDock';
import ShopHeader from './ShopHeader';
import styles from './ShopShell.module.css';
export default function ShopShell({ children }) {
  const [contactOpen, setContactOpen] = useState(false);
  const contactTriggerRef = useRef(null);
  const closeContact = useCallback(() => setContactOpen(false), []);

  useEffect(() => {
    function closeMajorOverlay() { setContactOpen(false); }
    window.addEventListener('shop:close-major-overlays', closeMajorOverlay);
    return () => window.removeEventListener('shop:close-major-overlays', closeMajorOverlay);
  }, []);

  return <CartProvider><div className={styles.shell}><ShopHeader /><div className={styles.content}>{children}</div><ShopCtaDock contactOpen={contactOpen} onOpenContact={() => setContactOpen(true)} contactTriggerRef={contactTriggerRef} /><CartDrawer /><ContactPanel open={contactOpen} onClose={closeContact} returnFocusRef={contactTriggerRef} /></div></CartProvider>;
}
