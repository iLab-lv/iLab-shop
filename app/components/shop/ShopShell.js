'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CartProvider, useCart } from './CartContext';
import CartDrawer from './CartDrawer';
import ContactPanel from './ContactPanel';
import ShopCtaDock from './ShopCtaDock';
import { ShopCheckoutActionProvider } from './ShopCheckoutActionContext';
import ShopHeader from './ShopHeader';
import SearchPanel from './SearchPanel';
import { SearchProvider } from './SearchContext';
import { ShopSettingsProvider } from './ShopSettingsContext';
import ServiceLocaleProvider from './ServiceLocaleProvider';
import PartInquiryContext from './PartInquiryContext';
import PartInquiryCard from './PartInquiryCard';
import styles from './ShopShell.module.css';
export default function ShopShell({ children, settings, brands }) {
  return <ShopSettingsProvider settings={settings}><ServiceLocaleProvider><CartProvider><SearchProvider><ShopShellFrame brands={brands}>{children}</ShopShellFrame></SearchProvider></CartProvider></ServiceLocaleProvider></ShopSettingsProvider>;
}

function ShopShellFrame({ children, brands }) {
  const [contactOpen, setContactOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [inquiryRequest, setInquiryRequest] = useState(null);
  const contactTriggerRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const inquiryTriggerRef = useRef(null);
  const { closeCart } = useCart();
  const closeContact = useCallback(() => setContactOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const closeInquiry = useCallback(() => setInquiryRequest(null), []);
  const openSearch = useCallback(() => { closeCart(); setContactOpen(false); closeInquiry(); setSearchOpen(true); }, [closeCart, closeInquiry]);
  const openContact = useCallback(() => { setSearchOpen(false); closeInquiry(); setContactOpen(true); }, [closeInquiry]);
  const openInquiry = useCallback((request, trigger) => {
    closeCart();
    setContactOpen(false);
    if (trigger?.closest('#shop-search-panel')) { setSearchOpen(false); inquiryTriggerRef.current = searchTriggerRef.current; }
    else inquiryTriggerRef.current = trigger;
    setInquiryRequest(request);
  }, [closeCart]);

  useEffect(() => {
    function closeMajorOverlay() { setContactOpen(false); setSearchOpen(false); setInquiryRequest(null); }
    window.addEventListener('shop:close-major-overlays', closeMajorOverlay);
    return () => window.removeEventListener('shop:close-major-overlays', closeMajorOverlay);
  }, []);

  const inquiryKey = inquiryRequest?.product?.id ?? inquiryRequest?.model?.id ?? inquiryRequest?.brand?.id ?? inquiryRequest?.source ?? 'inquiry';
  return <ShopCheckoutActionProvider><PartInquiryContext.Provider value={{ openInquiry }}><div className={styles.shell}><ShopHeader brands={brands} searchOpen={searchOpen} onOpenSearch={openSearch} searchTriggerRef={searchTriggerRef} /><div className={styles.content}>{children}</div><ShopCtaDock contactOpen={contactOpen} onOpenContact={openContact} contactTriggerRef={contactTriggerRef} /><CartDrawer /><ContactPanel open={contactOpen} onClose={closeContact} returnFocusRef={contactTriggerRef} /><SearchPanel open={searchOpen} onClose={closeSearch} returnFocusRef={searchTriggerRef} />{inquiryRequest ? <PartInquiryCard key={inquiryKey} {...inquiryRequest} panel panelOpen onPanelClose={closeInquiry} returnFocusRef={inquiryTriggerRef} /> : null}</div></PartInquiryContext.Provider></ShopCheckoutActionProvider>;
}
