'use client';
import { useState } from 'react';
import AddToCartButton from './AddToCartButton';
import PartInquiryCard from './PartInquiryCard';
import styles from './CatalogPages.module.css';
import { resolveProductLine } from '../../../lib/commerce.mjs';
export default function ProductPurchase({ product, compatibleModelNames = [] }) {
  const [quantity, setQuantity] = useState(1);
  const purchasability = resolveProductLine({ ...product, status: 'active' }, 1, Object.hasOwn(product, 'wholesalePriceCents'));
  if (purchasability.unavailableReason === 'out_of_stock') return <PartInquiryCard source="product" product={product} compatibleModelNames={compatibleModelNames} showAvailabilityState={false} />;
  if (purchasability.unavailableReason === 'missing_price') return <p className={styles.purchaseState}>Price unavailable</p>;
  return <div className={styles.purchase}><label>Quantity<input type="number" min="1" max={product.stockQty} step="1" value={quantity} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1 && next <= product.stockQty) setQuantity(next); }} /></label><AddToCartButton product={product} quantity={quantity} /></div>;
}
