'use client';
import { useCart } from './CartContext';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { isCheckoutRoute } from '../../../lib/checkoutNavigation.mjs';
import { CHECKOUT_FORM_ID, useShopCheckoutAction } from './ShopCheckoutActionContext';
import styles from './ShopCtaDock.module.css';
export default function ShopCtaDock({ contactOpen, onOpenContact, contactTriggerRef }) {
  const { itemCount, isOpen, openCart, closeCart, valid, status, items } = useCart();
  const { submitting, setSubmitting, orderPlaced, setOrderPlaced } = useShopCheckoutAction();
  const pathname = usePathname() || '/';
  const isCheckout = isCheckoutRoute(pathname);
  useEffect(() => { if (!isCheckout && (submitting || orderPlaced)) { setSubmitting(false); setOrderPlaced(false); } }, [isCheckout, orderPlaced, setOrderPlaced, setSubmitting, submitting]);
  function openContact() { closeCart(); onOpenContact(); }
  return <aside className={`${styles.dock} ${isCheckout && orderPlaced ? styles.singleAction : ''}`} aria-label="Quick actions"><button ref={contactTriggerRef} className={styles.contact} type="button" onClick={openContact} aria-expanded={contactOpen} aria-controls="shop-contact-panel">Contact us</button>{isCheckout && orderPlaced ? null : isCheckout ? <button className={styles.cart} type="submit" form={CHECKOUT_FORM_ID} disabled={submitting || status === 'loading' || !valid || items.length === 0}>{submitting ? 'Placing order…' : 'Place order'}</button> : <button className={styles.cart} type="button" onClick={openCart} aria-expanded={isOpen} aria-controls="shop-cart-drawer"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>Cart{itemCount > 0 ? ` · ${itemCount}` : ''}</button>}</aside>;
}
