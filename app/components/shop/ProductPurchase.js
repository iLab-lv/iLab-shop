'use client';
import { useState } from 'react';
import AddToCartButton from './AddToCartButton';
import PartInquiryCard from './PartInquiryCard';
import styles from './CatalogPages.module.css';
import { MAX_CART_QUANTITY, resolveProductLine } from '../../../lib/commerce.mjs';
export default function ProductPurchase({ product, compatibleModelNames = [] }) {
  const [quantity, setQuantity] = useState(1);
  const purchasability = resolveProductLine({ ...product, status: 'active' }, 1, Object.hasOwn(product, 'wholesalePriceCents'));
  if (purchasability.unavailableReason === 'out_of_stock' || purchasability.unavailableReason === 'missing_price') return <PartInquiryCard source="product" product={product} compatibleModelNames={compatibleModelNames} showAvailabilityState={false} />;
  return <div className={styles.purchase}><label>Quantity<input type="number" min="1" max={Math.min(product.stockQty, MAX_CART_QUANTITY)} step="1" value={quantity} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next >= 1 && next <= Math.min(product.stockQty, MAX_CART_QUANTITY)) setQuantity(next); }} /></label><AddToCartButton product={product} quantity={quantity} /></div>;
}

