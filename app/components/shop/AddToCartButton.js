'use client';
import { applicableSellingPrice } from '../../../lib/commerce.mjs';
import { useCart } from './CartContext';
import styles from './AddToCartButton.module.css';
export default function AddToCartButton({ product, quantity = 1, className = '' }) {
  const { addItem, openCart } = useCart();
  const price = applicableSellingPrice(product, Object.hasOwn(product, 'wholesalePriceCents'));
  if (price.unitPriceCents === null) return <span className={className}>Price unavailable</span>;
  if (!(product.stockQty > 0)) return <span className={className}>Out of stock</span>;
  return <button className={[styles.button, className].filter(Boolean).join(' ')} type="button" onClick={() => { addItem(product.id, quantity); openCart(); }}>Add to cart</button>;
}
