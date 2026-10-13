'use client';
import { useCallback, useEffect, useState } from 'react';
import AdminAccordionRow from '../components/AdminAccordionRow';
import AdminStatusBadge from '../components/AdminStatusBadge';
import styles from './orders.module.css';

const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const orderStatuses = ['new', 'processing', 'ready', 'completed', 'cancelled'];
const paymentStatuses = ['pending', 'unpaid', 'paid'];
const paymentLabels = { bank_transfer: 'Bank transfer', cash_on_pickup: 'Cash on pickup' };

function InvoiceActions({ orderId }) {
  const invoiceUrl = `/shop/api/invoices/${encodeURIComponent(orderId)}`;
  return <span className={styles.invoiceActions}><a href={`${invoiceUrl}?view=1`} target="_blank" rel="noreferrer">View invoice</a><a href={invoiceUrl}>Download invoice</a></span>;
}

function OrderSummary({ order }) {
  return <div className={styles.summary}>
    <span><small>Reference</small><strong>{order.id.slice(0, 8)}</strong>{order.invoice ? <em>{order.invoice.number}</em> : null}</span>
    <span><small>Date</small><strong>{order.createdAt ? new Date(order.createdAt).toLocaleString('en-GB') : '—'}</strong></span>
    <span><small>Customer</small><strong>{order.customer.name}</strong><em>{order.customer.email}</em></span>
    <span><small>Pickup</small><strong>{order.pickupLocation.name}</strong></span>
    <span><small>Payment</small><strong>{paymentLabels[order.paymentMethod]}</strong><em>{order.paymentStatus}</em></span>
    <span><small>Status</small><AdminStatusBadge status={order.orderStatus} /></span>
    <span><small>Total</small><strong>{money.format(order.totalCents / 100)}</strong></span>
  </div>;
}

function OrderDetail({ order, saving, update }) {
  return <div className={styles.detail}>
    <div className={styles.detailHead}><div><h2>Order {order.id}</h2><p>{order.customer.name} · {order.customer.email} · {order.customer.phone}</p>{order.customer.company ? <p>{order.customer.company.name} · {order.customer.company.registrationNumber || 'No registration number'} · {order.customer.company.vatNumber || 'No VAT number'}</p> : null}{order.customer.billingAddress ? <p>Billing address: {order.customer.billingAddress}</p> : null}<p>{order.pickupLocation.name}, {order.pickupLocation.address}</p>{order.invoice ? <p className={styles.invoice}>Invoice: <strong>{order.invoice.number}</strong><InvoiceActions orderId={order.id} /></p> : null}</div><div className={styles.controls}><label>Order status<select disabled={saving === order.id || order.orderStatus === 'cancelled'} value={order.orderStatus} onChange={(event) => update(order.id, { orderStatus: event.target.value })}>{orderStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Payment status<select disabled={saving === order.id} value={order.paymentStatus} onChange={(event) => update(order.id, { paymentStatus: event.target.value })}>{paymentStatuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div></div>
    <div className={styles.itemsTable}><table><thead><tr><th>SKU</th><th>Product</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.productId}><td>{item.sku ?? '—'}</td><td>{item.name}</td><td>{item.quantity}</td><td>{money.format(item.unitPriceCents / 100)}</td><td>{money.format(item.lineTotalCents / 100)}</td></tr>)}</tbody><tfoot><tr><th colSpan="4">Total</th><th>{money.format(order.totalCents / 100)}</th></tr></tfoot></table></div>
    {saving === order.id ? <p role="status">Saving…</p> : null}{order.stockRestoredAt ? <p>Stock restored {new Date(order.stockRestoredAt).toLocaleString('en-GB')}</p> : null}
  </div>;
}

export default function OrdersManager() {
  const [orders, setOrders] = useState([]), [status, setStatus] = useState('loading'), [error, setError] = useState(''), [open, setOpen] = useState(null), [saving, setSaving] = useState(null);
  const load = useCallback(async () => { setStatus('loading'); setError(''); try { const response = await fetch('/shop/api/admin/orders', { cache: 'no-store' }), result = await response.json(); if (!response.ok) throw new Error(result.error); setOrders(result.orders); setStatus('ready'); } catch (loadError) { setError(loadError.message || 'Unable to load orders.'); setStatus('error'); } }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);
  async function update(id, change) { setSaving(id); setError(''); try { const response = await fetch(`/shop/api/admin/orders/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(change) }), result = await response.json(); if (!response.ok) throw new Error(result.error); setOrders((current) => current.map((order) => order.id === id ? result.order : order)); } catch (updateError) { setError(updateError.message || 'Unable to update order.'); } finally { setSaving(null); } }
  if (status === 'loading') return <p className={styles.state} role="status">Loading orders…</p>;
  if (status === 'error') return <div className={styles.state} role="alert"><p>{error}</p><button type="button" onClick={load}>Retry</button></div>;
  if (!orders.length) return <p className={styles.state}>No orders yet.</p>;
  return <div className={styles.manager}>{error ? <p className={styles.error} role="alert">{error}</p> : null}<div className={styles.orderList}>{orders.map((order) => <AdminAccordionRow key={order.id} id={`order-${order.id}`} expanded={open === order.id} onToggle={() => setOpen(open === order.id ? null : order.id)} ariaLabel={`${open === order.id ? 'Collapse' : 'Expand'} order ${order.id}`} summary={<OrderSummary order={order} />}><OrderDetail order={order} saving={saving} update={update} /></AdminAccordionRow>)}</div></div>;
}
