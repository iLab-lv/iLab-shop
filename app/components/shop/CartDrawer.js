'use client';
import { useEffect, useRef } from 'react';
import { useCart } from './CartContext';
import styles from './CartDrawer.module.css';
export default function CartDrawer() {
  const { items, isOpen, closeCart } = useCart();
  const closeButton = useRef(null);
  const previousFocus = useRef(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    previousFocus.current = document.activeElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, width: body.style.width };
    Object.assign(body.style, { overflow: 'hidden', position: 'fixed', top: `-${scrollY}px`, width: '100%' });
    closeButton.current?.focus();
    function onKeyDown(event) {
      if (event.key === 'Escape') closeCart();
      if (event.key === 'Tab') {
        const focusable = document.querySelectorAll('#shop-cart-drawer button:not(:disabled), #shop-cart-drawer a[href]');
        if (!focusable.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); Object.assign(body.style, previous); window.scrollTo(0, scrollY); previousFocus.current?.focus?.(); };
  }, [isOpen, closeCart]);
  if (!isOpen) return null;
  return <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) closeCart(); }}><aside className={styles.drawer} id="shop-cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title"><header><h2 id="cart-title">Cart</h2><button ref={closeButton} type="button" onClick={closeCart} aria-label="Close cart">×</button></header><div className={styles.content}>{items.length === 0 ? <div className={styles.empty}><span aria-hidden="true">□</span><h3>Your cart is empty</h3><p>Products you add will appear here.</p><button type="button" onClick={closeCart}>Continue shopping</button></div> : null}</div><footer><div><span>Subtotal</span><strong>—</strong></div><button type="button" disabled={items.length === 0}>Proceed to checkout</button></footer></aside></div>;
}
