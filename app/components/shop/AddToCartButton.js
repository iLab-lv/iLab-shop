'use client';
import { resolveProductLine } from '../../../lib/commerce.mjs';
import { useCart } from './CartContext';
import styles from './AddToCartButton.module.css';
export default function AddToCartButton({ product, quantity = 1, className = '', label = 'Add to cart' }) {
  const { addItem, openCart, status } = useCart();
  const line = resolveProductLine({ ...product, status: 'active' }, quantity, Object.hasOwn(product, 'wholesalePriceCents'));
  const unavailableReason = line.purchasable ? '' : ({ missing_price: 'Price unavailable', out_of_stock: 'Out of stock', insufficient_stock: 'Not enough stock' })[line.unavailableReason] || 'Unavailable';
  return <button className={[styles.button, className].filter(Boolean).join(' ')} type="button" disabled={status === 'loading' || Boolean(unavailableReason)} aria-label={unavailableReason ? `${label} — ${unavailableReason.toLowerCase()}` : undefined} title={unavailableReason || undefined} onClick={() => { if (unavailableReason) return; addItem(product.id, quantity); openCart(); }}>{label}</button>;
}
