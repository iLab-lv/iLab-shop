'use client';
import { useCart } from './CartContext';
import styles from './ShopCtaDock.module.css';
export default function ShopCtaDock() {
  const { itemCount, isOpen, openCart } = useCart();
  return <aside className={styles.dock} aria-label="Quick actions"><a className={styles.contact} href="https://ilab.lv/#kontakti">Contact us</a><button className={styles.cart} type="button" onClick={openCart} aria-expanded={isOpen} aria-controls="shop-cart-drawer"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6"/><circle cx="10" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>Cart{itemCount > 0 ? ` · ${itemCount}` : ''}</button></aside>;
}
