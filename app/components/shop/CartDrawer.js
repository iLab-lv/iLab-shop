'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import ProductImage from '../ProductImage';
import { useCart } from './CartContext';
import styles from './CartDrawer.module.css';
import WholesaleNetPrice from './WholesaleNetPrice';
import PartInquiryCard from './PartInquiryCard';
import { useShopSettings } from './ShopSettingsContext';
import ShopDrawer from './ShopDrawer';
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const unavailable = { missing_product: 'Product no longer available', inactive: 'Product no longer available', missing_price: 'Price unavailable', out_of_stock: 'Out of stock' };
export default function CartDrawer() {
  const settings = useShopSettings();
  const { items, lines, totalCents, valid, status, error, notice, accountUserId, isOpen, closeCart, removeItem, increment, decrement, resolve, retry } = useCart();
  useEffect(() => { if (isOpen) void resolve(); }, [isOpen, resolve]);
  const footer = items.length ? <div className={styles.footer}><div className={styles.total}><span>Total</span><strong>{money.format(totalCents / 100)}</strong></div>{valid ? <Link className={styles.checkout} href="/checkout" onClick={(event) => { closeCart(); if (!accountUserId) { event.preventDefault(); window.dispatchEvent(new Event('shop:checkout-auth')); } }}>Proceed to checkout</Link> : <button type="button" disabled>{status === 'loading' ? 'Checking cart…' : 'Proceed to checkout'}</button>}</div> : null;
  return <ShopDrawer id="shop-cart-drawer" title="Cart" closeLabel="Close cart" open={isOpen} onClose={closeCart} footer={footer}><div className={styles.content}>
    {!items.length ? <div className={styles.empty}><span aria-hidden="true">□</span><h3>Your cart is empty</h3><p>Products you add will appear here.</p><button type="button" onClick={closeCart}>Continue shopping</button></div> : null}
    {status === 'loading' && items.length ? <p role="status">Refreshing cart…</p> : null}{error ? <p className={styles.error} role="alert">{error} <button type="button" onClick={() => retry()}>Retry</button></p> : null}
    <p className={styles.notice} role="status">{notice}</p><div className={styles.lines}>{lines.map((line) => <article className={styles.line} key={line.productId}><div className={styles.thumb}><ProductImage imagePath={line.primaryImagePath} productName={line.name} /></div><div className={styles.lineBody}>{line.slug ? <Link href={`/product/${line.slug}`} onClick={closeCart}><strong>{line.name}</strong></Link> : <strong>{line.name}</strong>}{line.sku !== null ? <small>SKU {line.sku}</small> : null}<span>{line.applicableUnitPriceCents === null ? 'Price unavailable' : money.format(line.applicableUnitPriceCents / 100)}</span>{line.priceSource === 'wholesale' ? <WholesaleNetPrice grossCents={line.applicableUnitPriceCents} vatRatePercent={settings.tax.vatRatePercent} /> : null}{!line.purchasable ? <p className={styles.unavailable}>{line.unavailableReason === 'insufficient_stock' ? `Only ${line.stockQty} available` : unavailable[line.unavailableReason]}</p> : null}{['missing_price', 'out_of_stock'].includes(line.unavailableReason) ? <PartInquiryCard source="product" product={{ ...line, id: line.productId }} showAvailabilityState={false} /> : null}<div className={styles.lineActions}><div><button type="button" aria-label={`Decrease ${line.name} quantity`} disabled={status === 'loading' || line.quantity <= 1} onClick={() => decrement(line.productId)}>−</button><span>{line.quantity}</span><button type="button" aria-label={`Increase ${line.name} quantity`} disabled={status === 'loading' || line.quantity >= line.stockQty} onClick={() => increment(line.productId)}>+</button></div><button type="button" disabled={status === 'loading'} onClick={() => removeItem(line.productId)}>Remove</button><strong>{line.lineTotalCents === null ? '—' : money.format(line.lineTotalCents / 100)}</strong></div></div></article>)}</div>
  </div></ShopDrawer>;
}

