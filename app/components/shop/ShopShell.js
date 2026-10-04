'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CartProvider, useCart } from './CartContext';
import CartDrawer from './CartDrawer';
import ContactPanel from './ContactPanel';
import ShopCtaDock from './ShopCtaDock';
import ShopHeader from './ShopHeader';
import SearchPanel from './SearchPanel';
import { SearchProvider } from './SearchContext';
import styles from './ShopShell.module.css';
export default function ShopShell({ children }) {
  return <CartProvider><SearchProvider><ShopShellFrame>{children}</ShopShellFrame></SearchProvider></CartProvider>;
}

function ShopShellFrame({ children }) {
  const [contactOpen, setContactOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const contactTriggerRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const { closeCart } = useCart();
  const closeContact = useCallback(() => setContactOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openSearch = useCallback(() => { closeCart(); setContactOpen(false); setSearchOpen(true); }, [closeCart]);
  const openContact = useCallback(() => { setSearchOpen(false); setContactOpen(true); }, []);

  useEffect(() => {
    function closeMajorOverlay() { setContactOpen(false); setSearchOpen(false); }
    window.addEventListener('shop:close-major-overlays', closeMajorOverlay);
    return () => window.removeEventListener('shop:close-major-overlays', closeMajorOverlay);
  }, []);

  return <div className={styles.shell}><ShopHeader searchOpen={searchOpen} onOpenSearch={openSearch} searchTriggerRef={searchTriggerRef} /><div className={styles.content}>{children}</div><ShopCtaDock contactOpen={contactOpen} onOpenContact={openContact} contactTriggerRef={contactTriggerRef} /><CartDrawer /><ContactPanel open={contactOpen} onClose={closeContact} returnFocusRef={contactTriggerRef} /><SearchPanel open={searchOpen} onClose={closeSearch} returnFocusRef={searchTriggerRef} /></div>;
}
