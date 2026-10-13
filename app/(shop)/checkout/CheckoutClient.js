'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../components/shop/CartContext';
import styles from './checkout.module.css';
import WholesaleNetPrice from '../../components/shop/WholesaleNetPrice';
import { useShopSettings } from '../../components/shop/ShopSettingsContext';
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const paymentLabels = { bank_transfer: 'Bank transfer', cash_on_pickup: 'Cash on pickup' };
export default function CheckoutClient({ initialCustomer, locations }) {
  const settings = useShopSettings();
  const cart = useCart();
  const { closeCart, resolve } = cart;
  const [customer, setCustomer] = useState(initialCustomer), [saveToProfile, setSaveToProfile] = useState(true), [pickupLocationId, setPickup] = useState(''), [paymentMethod, setPayment] = useState(''), [submitting, setSubmitting] = useState(false), [error, setError] = useState(''), [order, setOrder] = useState(null);
  const requestId = useRef(null);
  useEffect(() => { closeCart(); resolve(); }, [closeCart, resolve]);
  function field(name, value) { setCustomer((current) => ({ ...current, [name]: value })); }
  function companyField(name, value) { setCustomer((current) => ({ ...current, company: { ...current.company, [name]: value } })); }
  async function submit(event) {
    event.preventDefault(); if (submitting) return; setError('');
    if (!customer.name.trim() || !customer.email.trim() || !customer.phone.trim() || !pickupLocationId || !paymentMethod) { setError('Complete all required fields.'); return; }
    if (!cart.valid) { setError('Review the cart before placing the order.'); return; }
    setSubmitting(true); requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/shop/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer, saveToProfile, pickupLocationId, paymentMethod, items: cart.items, expectedTotalCents: cart.totalCents, requestId: requestId.current }) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) await cart.resolve(); throw new Error(result.error || 'Unable to place the order.'); }
      setOrder({ ...result.order, profileSaveFailed: result.profileSaved === false }); cart.clearCart();
    } catch (submitError) { setError(submitError.message || 'Unable to place the order.'); }
    finally { setSubmitting(false); }
  }
  if (order) { const invoiceUrl=`/shop/api/invoices/${encodeURIComponent(order.id)}`; return <main className={styles.page}><section className={styles.success}><p>Order received</p><h1>Thank you for your order</h1>{order.profileSaveFailed?<p role="status" className={styles.profileSaveWarning}>Your order was placed, but your account details could not be saved. You can update them in your Account Profile.</p>:null}<dl><div><dt>Order reference</dt><dd>{order.id}</dd></div>{order.invoice?<div><dt>Invoice</dt><dd>{order.invoice.number}</dd></div>:null}<div><dt>Pickup</dt><dd>{order.pickupLocation.name}<br />{order.pickupLocation.address}</dd></div><div><dt>Payment</dt><dd>{paymentLabels[order.paymentMethod]}</dd></div></dl>{order.paymentMethod==='bank_transfer'&&order.invoice?<p>Use the invoice number as the payment reference.</p>:null}{order.invoice?<div className={styles.invoiceActions}><a href={`${invoiceUrl}?view=1`} target="_blank" rel="noreferrer">View invoice</a><a href={invoiceUrl}>Download invoice</a></div>:null}<Link className={styles.accountLink} href={`/account?order=${encodeURIComponent(order.id)}`}>View order in account</Link></section></main>; }
  if (cart.status === 'loading') return <main className={styles.page}><p role="status">Checking cart…</p></main>;
  if (!cart.items.length) return <main className={styles.page}><section className={styles.empty}><h1>Your cart is empty</h1><p>Add products before checking out.</p><Link href="/">Browse the catalog</Link></section></main>;
  return <main className={styles.page}><header><p>Secure checkout</p><h1>Checkout</h1></header><form className={styles.layout} onSubmit={submit}><div className={styles.forms}>
    <section><h2>Customer details</h2><div className={styles.fields}><label>Name *<input required maxLength={160} autoComplete="name" value={customer.name} onChange={(e) => field('name', e.target.value)} /></label><label>Email for this order *<input required maxLength={254} type="email" autoComplete="email" value={customer.email} onChange={(e) => field('email', e.target.value)} /></label><label>Phone *<input required maxLength={40} type="tel" autoComplete="tel" value={customer.phone} onChange={(e) => field('phone', e.target.value)} /></label></div><h3>Company / invoice details (optional)</h3><div className={styles.fields}><label>Company name<input maxLength={200} autoComplete="organization" value={customer.company.name} onChange={(e) => companyField('name', e.target.value)} /></label><label>Registration number<input maxLength={80} value={customer.company.registrationNumber} onChange={(e) => companyField('registrationNumber', e.target.value)} /></label><label>VAT number<input maxLength={80} value={customer.company.vatNumber} onChange={(e) => companyField('vatNumber', e.target.value)} /></label><label>Legal / billing address<textarea maxLength={500} rows={3} autoComplete="street-address" value={customer.billingAddress} onChange={(e) => field('billingAddress', e.target.value)} /></label></div><label className={styles.saveProfile}><input type="checkbox" checked={saveToProfile} onChange={(event) => setSaveToProfile(event.target.checked)} /><span><strong>Save these details to my account for future orders</strong><small>Name, phone and company/invoice details will be saved. Account email will not be changed.</small></span></label></section>
    <section><h2>Pickup location *</h2><div className={styles.options}>{locations.map((location) => <label key={location.id}><input type="radio" name="pickup" required value={location.id} checked={pickupLocationId === location.id} onChange={(e) => setPickup(e.target.value)} /><span><strong>{location.name}</strong><small>{location.address}</small></span></label>)}</div></section>
    <section><h2>Payment method *</h2><div className={styles.options}><label><input type="radio" name="payment" required value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={(e) => setPayment(e.target.value)} /><span><strong>Bank transfer</strong><small>Payment details or an invoice will be provided separately.</small></span></label><label><input type="radio" name="payment" required value="cash_on_pickup" checked={paymentMethod === 'cash_on_pickup'} onChange={(e) => setPayment(e.target.value)} /><span><strong>Cash on pickup</strong><small>Pay when collecting the order.</small></span></label></div></section>
  </div><aside className={styles.summary}><h2>Order summary</h2>{cart.lines.map((line) => <div className={styles.summaryLine} key={line.productId}><span>{line.name} × {line.quantity}{line.priceSource === 'wholesale' ? <WholesaleNetPrice grossCents={line.applicableUnitPriceCents} vatRatePercent={settings.tax.vatRatePercent} /> : null}</span><strong>{line.lineTotalCents === null ? '—' : money.format(line.lineTotalCents / 100)}</strong></div>)}<div className={styles.total}><span>Total</span><strong>{money.format(cart.totalCents / 100)}</strong></div>{!cart.valid ? <p role="alert">The cart changed. Please fix unavailable items before ordering.</p> : null}{error ? <p role="alert">{error}</p> : null}<button type="submit" disabled={submitting || !cart.valid}>{submitting ? 'Placing order…' : 'Place order'}</button></aside></form></main>;
}
