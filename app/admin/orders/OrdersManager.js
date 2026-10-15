'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../../../lib/commerce.mjs';
import { FULFILLMENT_LABELS } from '../../../lib/fulfillment.mjs';
import { filterAdminOrders, formatOrderDate, getOrderCustomerLabels, getOrderDisplayReference, getOrderFulfillmentSummary } from '../../../lib/orderDisplay.mjs';
import AdminAccordionRow from '../components/AdminAccordionRow';
import AdminButton from '../components/AdminButton';
import AdminStatusBadge from '../components/AdminStatusBadge';
import ConfirmationDialog from '../components/ConfirmationDialog';
import useConfirmationDialog from '../components/useConfirmationDialog';
import styles from './orders.module.css';

const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const paymentLabels = { bank_transfer: 'Bank transfer', cash_on_pickup: 'Cash on pickup' };
const titleCase = (value) => String(value ?? 'Unknown').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function InvoiceActions({ orderId }) {
  const invoiceUrl = `/shop/api/invoices/${encodeURIComponent(orderId)}`;
  return <span className={styles.invoiceActions}><a href={`${invoiceUrl}?view=1`} target="_blank" rel="noreferrer">View invoice</a><a href={invoiceUrl}>Download invoice</a></span>;
}

function OrderSummary({ order }) {
  const customer = getOrderCustomerLabels(order);
  return <div className={styles.summary}>
    <span className={styles.orderColumn}><small>Order</small><strong>{getOrderDisplayReference(order)}</strong></span>
    <span className={styles.dateColumn}><small>Date</small><strong>{formatOrderDate(order.createdAt)}</strong></span>
    <span className={styles.customerColumn}><small>Customer</small><strong>{customer.primary}</strong>{customer.secondary ? <em>{customer.secondary}</em> : null}</span>
    <span className={styles.fulfillmentColumn}><small>Fulfillment</small><strong>{getOrderFulfillmentSummary(order)}</strong></span>
    <span className={styles.paymentColumn}><small>Payment</small><AdminStatusBadge status={order.paymentStatus}>{titleCase(order.paymentStatus)}</AdminStatusBadge></span>
    <span className={styles.statusColumn}><small>Status</small><AdminStatusBadge status={order.orderStatus}>{titleCase(order.orderStatus)}</AdminStatusBadge></span>
    <span className={styles.totalColumn}><small>Total</small><strong>{money.format((Number.isSafeInteger(order.totalCents) ? order.totalCents : 0) / 100)}</strong></span>
  </div>;
}

function CustomerGroup({ customer = {} }) {
  const company = typeof customer.company?.name === 'string' ? customer.company.name.trim() : '';
  return <section className={styles.infoGroup} aria-label="Customer">
    <h3>Customer</h3>
    {company ? <><strong className={styles.companyName}>{company}</strong>{customer.company?.registrationNumber ? <p>Reg. Nr. {customer.company.registrationNumber}</p> : null}{customer.company?.vatNumber ? <p>PVN Nr. {customer.company.vatNumber}</p> : null}{customer.name ? <p className={styles.contactName}>{customer.name}</p> : null}</> : <strong>{customer.name || 'Customer details unavailable'}</strong>}
    {customer.email ? <p>{customer.email}</p> : null}
    {customer.phone ? <p>{customer.phone}</p> : null}
    {customer.billingAddress ? <p><span className={styles.inlineLabel}>Billing address</span>{customer.billingAddress}</p> : null}
  </section>;
}

function FulfillmentGroup({ order }) {
  const method = order.fulfillmentMethod;
  const legacyPickup = !method && order.pickupLocation;
  const label = method === 'pickup' || legacyPickup ? 'Self pickup' : FULFILLMENT_LABELS[method] ?? 'Fulfillment';
  const details = method === 'courier'
    ? [order.delivery?.address]
    : method === 'omniva_parcel_machine'
      ? [order.delivery?.city, order.delivery?.address]
      : [order.pickupLocation?.name, order.pickupLocation?.address];
  return <section className={styles.infoGroup} aria-label="Fulfillment"><h3>Fulfillment</h3><strong>{label}</strong>{details.filter(Boolean).map((detail, index) => <p key={`${detail}-${index}`}>{detail}</p>)}</section>;
}

function PaymentGroup({ order }) {
  return <section className={styles.infoGroup} aria-label="Payment"><h3>Payment</h3><strong>{paymentLabels[order.paymentMethod] || titleCase(order.paymentMethod) || 'Payment method unavailable'}</strong><p><AdminStatusBadge status={order.paymentStatus}>{titleCase(order.paymentStatus)}</AdminStatusBadge></p></section>;
}

function OrderDetail({ order, saving, update, onDelete }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsSubtotal = Number.isSafeInteger(order.itemsSubtotalCents) ? order.itemsSubtotalCents : items.reduce((sum, item) => sum + (Number.isSafeInteger(item.lineTotalCents) ? item.lineTotalCents : 0), 0);
  const deliveryFee = Number.isSafeInteger(order.deliveryFeeCents) ? order.deliveryFeeCents : null;
  const showFulfillmentLine = deliveryFee !== null;
  const fulfillmentName = order.fulfillmentMethod === 'pickup' || (!order.fulfillmentMethod && order.pickupLocation)
    ? 'Self pickup'
    : FULFILLMENT_LABELS[order.fulfillmentMethod] || 'Delivery';

  return <div className={styles.detail}>
    <header className={styles.detailHeader}>
      <div><p className={styles.eyebrow}>Order</p><h2>{getOrderDisplayReference(order)}</h2><code className={styles.internalId}>{order.id}</code></div>
      <div className={styles.controls}>
        <label>Order status<select disabled={saving || order.orderStatus === 'cancelled'} value={order.orderStatus || 'new'} onChange={(event) => update(order.id, { orderStatus: event.target.value })}>{ORDER_STATUSES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
        <label>Payment status<select disabled={saving} value={order.paymentStatus || 'unpaid'} onChange={(event) => update(order.id, { paymentStatus: event.target.value })}>{PAYMENT_STATUSES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
      </div>
    </header>

    <div className={styles.infoGrid}>
      <CustomerGroup customer={order.customer} />
      <FulfillmentGroup order={order} />
      <PaymentGroup order={order} />
      <section className={styles.infoGroup} aria-label="Invoice"><h3>Invoice</h3>{order.invoice?.number ? <><strong>{order.invoice.number}</strong><InvoiceActions orderId={order.id} /></> : <p>No invoice on record.</p>}</section>
    </div>

    <div className={styles.itemsTable}><table><thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>{items.map((item, index) => <tr key={item.productId || `${item.name}-${index}`}><td>{item.sku ?? '—'}</td><td>{item.name || 'Product'}</td><td>{item.quantity ?? 0}</td><td>{money.format((Number.isSafeInteger(item.unitPriceCents) ? item.unitPriceCents : 0) / 100)}</td><td>{money.format((Number.isSafeInteger(item.lineTotalCents) ? item.lineTotalCents : 0) / 100)}</td></tr>)}</tbody><tfoot>
      <tr><th colSpan="4">Products subtotal</th><th>{money.format(itemsSubtotal / 100)}</th></tr>
      {showFulfillmentLine ? <tr><th colSpan="4">{fulfillmentName}</th><th>{deliveryFee > 0 ? money.format(deliveryFee / 100) : 'Free'}</th></tr> : null}
      <tr className={styles.grandTotal}><th colSpan="4">Grand total</th><th>{money.format((Number.isSafeInteger(order.totalCents) ? order.totalCents : itemsSubtotal + Math.max(0, deliveryFee || 0)) / 100)}</th></tr>
    </tfoot></table></div>

    {order.stockRestoredAt ? <p className={styles.stockNote}>Stock restored {new Date(order.stockRestoredAt).toLocaleString('en-GB')}</p> : null}
    <div className={styles.deleteActions}><AdminButton type="button" variant="destructive" size="small" disabled={saving} onClick={() => onDelete(order)}>Delete order</AdminButton></div>
  </div>;
}

export default function OrdersManager() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [saving, setSaving] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('all');
  const confirmation = useConfirmationDialog();

  const load = useCallback(async () => {
    setStatus('loading'); setError('');
    try {
      const response = await fetch('/shop/api/admin/orders', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setOrders(result.orders); setStatus('ready');
    } catch (loadError) { setError(loadError.message || 'Unable to load orders.'); setStatus('error'); }
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const visibleOrders = useMemo(() => filterAdminOrders(orders, { search, orderStatus, paymentStatus }), [orders, search, orderStatus, paymentStatus]);
  const hasFilters = Boolean(search.trim() || orderStatus !== 'all' || paymentStatus !== 'all');
  function clearFilters() { setSearch(''); setOrderStatus('all'); setPaymentStatus('all'); }

  async function update(id, change) {
    setSaving(id); setError('');
    try {
      const response = await fetch(`/shop/api/admin/orders/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setOrders((current) => current.map((order) => order.id === id ? result.order : order));
    } catch (updateError) { setError(updateError.message || 'Unable to update order.'); }
    finally { setSaving(null); }
  }

  async function removeOrder(order) {
    const restoreStock = await confirmation.choose({ title: `Delete order ${getOrderDisplayReference(order)}?`, description: `This permanently removes the order, its issued invoice and stored PDF. Choose whether to restore the ordered quantities to inventory. Stock already restored by cancellation will not be added again.`, cancelLabel: 'Keep order', choices: [{ label: 'Delete & restore stock', value: true, destructive: true }, { label: 'Delete without restoring', value: false, destructive: true }] });
    if (restoreStock === null) return;
    setDeleting(order.id); setError('');
    try {
      const response = await fetch(`/shop/api/admin/orders/${encodeURIComponent(order.id)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restoreStock }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to delete order.');
      setOrders((current) => current.filter((item) => item.id !== order.id));
      setOpen((current) => current === order.id ? null : current);
    } catch (deleteError) { setError(deleteError.message || 'Unable to delete order.'); }
    finally { setDeleting(null); }
  }

  if (status === 'loading') return <p className={styles.state} role="status">Loading orders…</p>;
  if (status === 'error') return <div className={styles.state} role="alert"><p>{error}</p><button type="button" onClick={load}>Retry</button></div>;

  return <div className={styles.manager}>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <div className={styles.toolbar}>
      <label className={styles.searchField}>Search orders<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Order, invoice, customer or email" /></label>
      <label>Status<select value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}><option value="all">All statuses</option>{ORDER_STATUSES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
      <label>Payment<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option value="all">All payments</option>{PAYMENT_STATUSES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
      {hasFilters ? <AdminButton type="button" variant="ghost" size="small" onClick={clearFilters}>Clear filters</AdminButton> : null}
    </div>
    {!visibleOrders.length ? <p className={styles.state}>{orders.length ? 'No orders match these filters.' : 'No orders yet.'}</p> : <div className={styles.orderList}>{visibleOrders.map((order) => <AdminAccordionRow key={order.id} id={`order-${order.id}`} expanded={open === order.id} onToggle={() => setOpen(open === order.id ? null : order.id)} ariaLabel={`${open === order.id ? 'Collapse' : 'Expand'} order ${getOrderDisplayReference(order)}`} summary={<OrderSummary order={order} />}><OrderDetail order={order} saving={saving === order.id || deleting === order.id} update={update} onDelete={removeOrder} /></AdminAccordionRow>)}</div>}
    <ConfirmationDialog {...confirmation.dialogProps} loading={Boolean(deleting)} />
  </div>;
}
