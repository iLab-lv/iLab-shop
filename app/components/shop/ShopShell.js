'use client';
import { CartProvider } from './CartContext';
import CartDrawer from './CartDrawer';
import ShopCtaDock from './ShopCtaDock';
import ShopHeader from './ShopHeader';
import styles from './ShopShell.module.css';
export default function ShopShell({ children }) {
  return <CartProvider><div className={styles.shell}><ShopHeader /><div className={styles.content}>{children}</div><ShopCtaDock /><CartDrawer /></div></CartProvider>;
}
