'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '../../components/shop/CartContext';
import { CHECKOUT_FORM_ID, useShopCheckoutAction } from '../../components/shop/ShopCheckoutActionContext';
import styles from './checkout.module.css';
import WholesaleNetPrice from '../../components/shop/WholesaleNetPrice';
import { useShopSettings } from '../../components/shop/ShopSettingsContext';
import { getOrderDisplayReference } from '../../../lib/orderDisplay.mjs';
import { FULFILLMENT_METHODS, fulfillmentFeeCents } from '../../../lib/fulfillment.mjs';
import { beginCheckoutAttempt, readCheckoutAttempt, forgetCheckoutAttempt } from '../../../lib/checkoutRecovery.mjs';
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
export default function CheckoutClient({ accountUid, initialCustomer, locations }) {
  const settings = useShopSettings();
  const cart = useCart();
  const { submitting, setSubmitting, setOrderPlaced } = useShopCheckoutAction();
  const { closeCart, resolve } = cart;
  const [customer, setCustomer] = useState(initialCustomer), [saveToProfile, setSaveToProfile] = useState(true), [fulfillmentMethod, setFulfillment] = useState(''), [pickupLocationId, setPickup] = useState(locations.length === 1 ? locations[0].id : ''), [courierAddress, setCourierAddress] = useState(''), [useBillingAddress, setUseBillingAddress] = useState(true), [omnivaCity, setOmnivaCity] = useState(''), [omnivaAddress, setOmnivaAddress] = useState(''), [paymentMethod, setPayment] = useState(''), [error, setError] = useState(''), [order, setOrder] = useState(null);
  const activeCourierAddress = useBillingAddress ? customer.billingAddress : courierAddress;
  const delivery = fulfillmentMethod === 'courier' ? { address: activeCourierAddress } : fulfillmentMethod === 'omniva_parcel_machine' ? { city: omnivaCity, address: omnivaAddress } : null;
  const deliveryFeeCents = fulfillmentMethod ? fulfillmentFeeCents(fulfillmentMethod, settings.delivery) : 0;
  const totalCents = cart.totalCents + deliveryFeeCents;
  const requestId = useRef(null), submitLock = useRef(false);
  const [recovery, setRecovery] = useState('checking');
  const { completeOrder } = cart;
  const recover = useCallback(async (signal) => {
    try {
      const saved = readCheckoutAttempt(window.localStorage, accountUid);
      requestId.current = saved;
      if (!saved) { if (!signal?.aborted) setRecovery('ready'); return; }
      const response = await fetch(`/shop/api/orders/${encodeURIComponent(saved)}`, { cache: 'no-store', signal });
      const result = await response.json();
      if (signal?.aborted) return;
      if (response.status === 404) { setRecovery('ready'); return; }
      if (!response.ok) { setRecovery(response.status === 410 ? 'deleted' : 'error'); setError(result.error || 'Unable to check your previous order. Retry before placing another order.'); return; }
      if (!result.order?.id || result.order.userId !== accountUid) throw new Error('Your account changed. Sign in again to recover checkout.');
      setOrder(result.order); setOrderPlaced(true); setRecovery('ready');
    } catch (failure) {
      if (!signal?.aborted) { setRecovery('error'); setError(failure instanceof TypeError ? 'Unable to connect. Check your connection, then check your previous order again.' : failure.message || 'Unable to check your previous order.'); }
    }
  }, [accountUid, setOrderPlaced]);
  useEffect(() => {
    const controller = new AbortController();
    // Hydrate browser storage after mount; cancelled mounts must not start recovery.
    void Promise.resolve().then(() => { if (!controller.signal.aborted) return recover(controller.signal); });
    return () => controller.abort();
  }, [recover]);
  useEffect(() => { if (order && cart.accountUserId === accountUid) void completeOrder(); }, [order, cart.accountUserId, accountUid, completeOrder]);
  async function startAnotherOrder() {
    try {
      forgetCheckoutAttempt(window.localStorage, accountUid, requestId.current);
      requestId.current = null; setOrder(null); setError(''); setRecovery('ready'); setOrderPlaced(false);
      await completeOrder();
    } catch { setError('Unable to clear the saved checkout reference. Check Account orders before continuing.'); }
  }
  useEffect(() => { closeCart(); resolve(); }, [closeCart, resolve]);
  useEffect(() => {
    if (!order) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'instant' : 'smooth' });
  }, [order]);
  function field(name, value) { setCustomer((current) => ({ ...current, [name]: value })); }
  function companyField(name, value) { setCustomer((current) => ({ ...current, company: { ...current.company, [name]: value } })); }
  function selectFulfillment(method) { setFulfillment(method); setError(''); }
  async function submit(event) {
    event.preventDefault(); if (submitting || submitLock.current || recovery !== 'ready') return; setError('');
    if (!customer.name.trim() || !customer.email.trim() || !customer.phone.trim() || !fulfillmentMethod || (fulfillmentMethod === 'pickup' && !pickupLocationId) || (fulfillmentMethod === 'courier' && !activeCourierAddress.trim()) || (fulfillmentMethod === 'omniva_parcel_machine' && (!omnivaCity.trim() || !omnivaAddress.trim())) || !paymentMethod) { setError('Complete all required fields.'); return; }
    if (!cart.valid) { setError('Review the cart before placing the order.'); return; }
    submitLock.current = true; setSubmitting(true);
    let orderCreated = false;
    try {
      if (cart.accountUserId !== accountUid) throw new Error('Your account changed. Sign in again before placing an order.');
      const begin = () => beginCheckoutAttempt(window.localStorage, accountUid, () => crypto.randomUUID());
      requestId.current = navigator.locks ? await navigator.locks.request(`ilab-checkout:${accountUid}`, begin) : begin();
      const response = await fetch('/shop/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer, saveToProfile, fulfillmentMethod, pickupLocationId: fulfillmentMethod === 'pickup' ? pickupLocationId : null, delivery, paymentMethod, items: cart.items, expectedTotalCents: totalCents, requestId: requestId.current, expectedUid: accountUid }) });
      const result = await response.json();
      if (!response.ok) { if (response.status === 409) await cart.resolve(); if (response.status === 401 || response.status === 410) setRecovery(response.status === 410 ? 'deleted' : 'error'); throw new Error(result.error || 'Unable to place the order.'); }
      if (!result.order?.id) throw new Error('The order response was incomplete. Please contact support before retrying.');
      setOrder({ ...result.order, profileSaveFailed: result.profileSaved === false });
      setOrderPlaced(true);
      orderCreated = true;
      await cart.completeOrder();
    } catch (submitError) { setError(submitError instanceof TypeError ? 'We could not confirm your order. Check your connection and retry; your saved checkout reference will prevent a duplicate order.' : submitError.message || 'Unable to place the order.'); }
    finally { submitLock.current = false; setSubmitting(false); if (!orderCreated) setOrderPlaced(false); }
  }
  if (recovery === 'checking') return <main className={styles.page}><p role="status">Checking your previous checkout…</p></main>;
  if (recovery === 'error' || recovery === 'deleted') return <main className={styles.page}><section className={styles.recovery}><h1>Check your order</h1><p role="alert">{error}</p><div className={styles.confirmationActions}><button type="button" onClick={() => void recover()}>Check again</button><Link href="/account#orders">Sign in / view Account orders</Link>{recovery === 'deleted' ? <button type="button" onClick={() => void startAnotherOrder()}>Start a new checkout</button> : null}</div></section></main>;
  if (order) { const invoiceUrl=`/shop/api/invoices/${encodeURIComponent(order.id)}`; return <main className={styles.page}><header><p>Checkout</p><h1>{order.orderStatus === 'cancelled' ? 'Order cancelled' : 'Order placed'}</h1></header><section className={styles.confirmation} role="status"><div><strong>Order {order.orderStatus}</strong><small>Order {getOrderDisplayReference(order)} is saved. Payment status: {order.paymentStatus}.</small>{order.invoice?<small>Invoice {order.invoice.number}</small>:null}</div>{order.profileSaveFailed?<p>Your order was placed, but your reusable account details could not be saved. You can update them in Profile.</p>:null}{order.paymentMethod==='bank_transfer'&&order.invoice?<p>Use the invoice number as the payment reference.</p>:null}<div className={styles.confirmationActions}>{order.invoice?<><a href={`${invoiceUrl}?view=1`} target="_blank" rel="noreferrer">View invoice</a><a href={invoiceUrl}>Download invoice</a></>:null}<Link href="/account#orders">View orders in Account</Link><button type="button" onClick={() => void startAnotherOrder()}>Start another order</button></div></section></main>; }
  if (cart.status === 'loading') return <main className={styles.page}><p role="status">Checking cart…</p></main>;
  if (!cart.items.length) return <main className={styles.page}><section className={styles.empty}><h1>Your cart is empty</h1><p>Add products before checking out.</p><Link href="/">Browse the catalog</Link></section></main>;
  return <main className={styles.page}><header><p>Secure checkout</p><h1>Checkout</h1></header><form id={CHECKOUT_FORM_ID} className={styles.layout} onSubmit={submit} aria-busy={submitting}><div className={styles.forms}>
    <section><h2>Customer details</h2><div className={styles.fields}><label>Name *<input name="name" required maxLength={160} autoComplete="name" value={customer.name} onChange={(e) => field('name', e.target.value)} /></label><label>Email for this order *<input name="email" required maxLength={254} type="email" autoComplete="email" value={customer.email} onChange={(e) => field('email', e.target.value)} /></label><label>Phone *<input name="phone" required maxLength={40} type="tel" autoComplete="tel" value={customer.phone} onChange={(e) => field('phone', e.target.value)} /></label></div><h3>Company / invoice details (optional)</h3><div className={styles.fields}><label>Company name<input name="companyName" maxLength={200} autoComplete="organization" value={customer.company.name} onChange={(e) => companyField('name', e.target.value)} /></label><label>Registration number<input name="registrationNumber" maxLength={80} value={customer.company.registrationNumber} onChange={(e) => companyField('registrationNumber', e.target.value)} /></label><label>VAT number<input name="vatNumber" maxLength={80} value={customer.company.vatNumber} onChange={(e) => companyField('vatNumber', e.target.value)} /></label><label>Legal / billing address<textarea name="billingAddress" maxLength={500} rows={3} autoComplete="street-address" value={customer.billingAddress} onChange={(e) => field('billingAddress', e.target.value)} /></label></div><label className={styles.saveProfile}><input type="checkbox" name="saveToProfile" checked={saveToProfile} onChange={(event) => setSaveToProfile(event.target.checked)} /><span><strong>Save these details to my account for future orders</strong><small>Name, phone and company/invoice details will be saved. Account email will not be changed.</small></span></label></section>
    <section><h2>How would you like to receive your order? *</h2><div className={styles.fulfillments}>{FULFILLMENT_METHODS.map((method) => { const fee = fulfillmentFeeCents(method, settings.delivery); const selected = fulfillmentMethod === method; return <div className={`${styles.fulfillment} ${selected ? styles.selected : ''}`} key={method}><label className={styles.fulfillmentChoice}><input type="radio" name="fulfillment" required value={method} checked={selected} onChange={() => selectFulfillment(method)} /><span><strong>{method === 'pickup' ? 'Pickup' : method === 'courier' ? 'Courier delivery' : 'Omniva parcel machine'}</strong><small>{method === 'pickup' ? 'Collect from an iLab location' : method === 'courier' ? 'Delivered to your address' : 'Send to a parcel machine'}</small></span><b>{fee === 0 ? 'Free' : money.format(fee / 100)}</b></label>{selected ? <div className={styles.fulfillmentDetails}>{method === 'pickup' ? <div className={styles.options}>{locations.map((location) => <label key={location.id}><input type="radio" name="pickup" required value={location.id} checked={pickupLocationId === location.id} onChange={(e) => setPickup(e.target.value)} /><span><strong>{location.name}</strong><small>{location.address}</small></span></label>)}</div> : method === 'courier' ? <><label className={styles.sameAddress}><input type="checkbox" name="useBillingAddress" checked={useBillingAddress} onChange={(event) => { if (event.target.checked) setCourierAddress(activeCourierAddress); else if (!courierAddress) setCourierAddress(customer.billingAddress); setUseBillingAddress(event.target.checked); }} /><span>Use the billing address above</span></label>{useBillingAddress ? <p className={styles.addressPreview}>{customer.billingAddress || 'Enter a billing address above.'}</p> : <label className={styles.addressField}>Delivery address *<textarea name="deliveryAddress" required maxLength={500} rows={3} autoComplete="shipping street-address" value={courierAddress} onChange={(event) => setCourierAddress(event.target.value)} /></label>}</> : <div className={styles.fields}><label>City *<input name="omnivaCity" autoComplete="address-level2" required maxLength={120} value={omnivaCity} onChange={(event) => setOmnivaCity(event.target.value)} /></label><label>Parcel machine / address *<input name="omnivaAddress" required maxLength={300} value={omnivaAddress} onChange={(event) => setOmnivaAddress(event.target.value)} /></label></div>}</div> : null}</div>; })}</div></section>
    <section><h2>Payment method *</h2><div className={styles.options}><label><input type="radio" name="payment" required value="bank_transfer" checked={paymentMethod === 'bank_transfer'} onChange={(e) => setPayment(e.target.value)} /><span><strong>Bank transfer</strong><small>Your invoice will be available immediately after placing the order.</small></span></label><label><input type="radio" name="payment" required value="cash_on_pickup" checked={paymentMethod === 'cash_on_pickup'} onChange={(e) => setPayment(e.target.value)} /><span><strong>Cash on pickup</strong><small>Pay when collecting the order.</small></span></label></div></section>
  </div><aside className={styles.summary}><h2>Order summary</h2>{cart.lines.map((line) => <div className={styles.summaryLine} key={line.productId}><span>{line.name} × {line.quantity}{line.priceSource === 'wholesale' ? <WholesaleNetPrice grossCents={line.applicableUnitPriceCents} vatRatePercent={settings.tax.vatRatePercent} /> : null}</span><strong>{line.lineTotalCents === null ? '—' : money.format(line.lineTotalCents / 100)}</strong></div>)}<div className={styles.summaryLine}><span>Products subtotal</span><strong>{money.format(cart.totalCents / 100)}</strong></div>{fulfillmentMethod ? <div className={styles.summaryLine}><span>{fulfillmentMethod === 'courier' ? 'Courier delivery' : fulfillmentMethod === 'omniva_parcel_machine' ? 'Omniva parcel machine delivery' : 'Pickup'}</span><strong>{deliveryFeeCents === 0 ? 'Free' : money.format(deliveryFeeCents / 100)}</strong></div> : null}<div className={styles.total}><span>Total</span><strong>{money.format(totalCents / 100)}</strong></div>{!cart.valid ? <p role="alert">The cart changed. Please fix unavailable items before ordering.</p> : null}{error ? <p role="alert">{error}</p> : null}<button type="submit" disabled={submitting || !cart.valid}>{submitting ? 'Placing order…' : 'Place order'}</button></aside></form></main>;
}

