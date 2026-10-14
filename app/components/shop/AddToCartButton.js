'use client';
import { applicableSellingPrice } from '../../../lib/commerce.mjs';
import { useCart } from './CartContext';
import styles from './AddToCartButton.module.css';
export default function AddToCartButton({ product, quantity = 1, className = '' }) {
  const { addItem, openCart } = useCart();
  const price = applicableSellingPrice(product, Object.hasOwn(product, 'wholesalePriceCents'));
  const unavailableReason = price.unitPriceCents === null ? 'Price unavailable' : !(product.stockQty > 0) ? 'Out of stock' : '';
  return <button className={[styles.button, className].filter(Boolean).join(' ')} type="button" disabled={Boolean(unavailableReason)} aria-label={unavailableReason ? `Add to cart — ${unavailableReason.toLowerCase()}` : undefined} title={unavailableReason || undefined} onClick={() => { if (unavailableReason) return; addItem(product.id, quantity); openCart(); }}>Add to cart</button>;
}
