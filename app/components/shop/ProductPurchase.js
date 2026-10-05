'use client';
import { useState } from 'react';
import AddToCartButton from './AddToCartButton';
import styles from './CatalogPages.module.css';
import { applicableSellingPrice } from '../../../lib/commerce.mjs';
export default function ProductPurchase({ product }) {
  const [quantity, setQuantity] = useState(1);
  if (applicableSellingPrice(product, Object.hasOwn(product, 'wholesalePriceCents')).unitPriceCents === null) return <p className={styles.purchaseState}>Price unavailable</p>;
  if (!(product.stockQty > 0)) return <p className={styles.purchaseState}>Out of stock</p>;
  return <div className={styles.purchase}><label>Quantity<input type="number" min="1" max={product.stockQty} step="1" value={quantity} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1 && next <= product.stockQty) setQuantity(next); }} /></label><AddToCartButton product={product} quantity={quantity} /></div>;
}
