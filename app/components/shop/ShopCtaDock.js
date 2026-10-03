'use client';
import { useCart } from './CartContext';
import styles from './ShopCtaDock.module.css';
export default function ShopCtaDock({ contactOpen, onOpenContact, contactTriggerRef }) {
  const { itemCount, isOpen, openCart, closeCart } = useCart();
  function openContact() { closeCart(); onOpenContact(); }
  return <aside className={styles.dock} aria-label="Quick actions"><button ref={contactTriggerRef} className={styles.contact} type="button" onClick={openContact} aria-expanded={contactOpen} aria-controls="shop-contact-panel">Contact us</button><button className={styles.cart} type="button" onClick={openCart} aria-expanded={isOpen} aria-controls="shop-cart-drawer"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>Cart{itemCount > 0 ? ` · ${itemCount}` : ''}</button></aside>;
}
