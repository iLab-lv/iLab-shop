import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUserProfile } from '../../../lib/auth/sessionAuth';
import { PARTNER_STATUSES, PERMISSIONS, ROLES, hasPermission, isActiveUser } from '../../../lib/auth/roles.mjs';
import AccountActions from './AccountActions';
import styles from './account.module.css';
import { getUserOrders } from '../../../lib/shopOrders';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Account | iLab Shop' };

function Value({ label, children }) {
  return <div><dt>{label}</dt><dd>{children || '—'}</dd></div>;
}

function InvoiceActions({ orderId }) {
  const invoiceUrl = `/shop/api/invoices/${encodeURIComponent(orderId)}`;
  return <span className={styles.invoiceActions}><a href={`${invoiceUrl}?view=1`} target="_blank" rel="noreferrer">View invoice</a><a href={invoiceUrl}>Download invoice</a></span>;
}

export default async function AccountPage({ searchParams }) {
  const session = await getSessionUserProfile();
  const profile = session?.profile;
  if (!isActiveUser(profile)) redirect('/');
  const orders = await getUserOrders(session.token.uid);
  const params=await searchParams;
  const selectedOrder=typeof params?.order==='string'?params.order:'';
  const confirmedOrder=params?.confirmed==='1'?orders.find((order)=>order.id===selectedOrder):null;

  const company = profile.company;
  const isPartner = profile.role === ROLES.PARTNER && profile.partnerStatus === PARTNER_STATUSES.APPROVED;
  const wholesaleStatus = isPartner ? 'Approved' : profile.partnerStatus === PARTNER_STATUSES.REJECTED ? 'Rejected' : 'Not enabled';

  return <main className={styles.page}>
    <header><p>Account</p><h1>My Account</h1></header>
    <div className={styles.grid}>
      <section className={styles.card} aria-labelledby="profile-heading"><h2 id="profile-heading">Profile</h2><dl><Value label="Name">{profile.name}</Value><Value label="Email">{profile.email || session.token.email}</Value><Value label="Phone">{profile.phone}</Value></dl></section>
      {company ? <section className={styles.card} aria-labelledby="company-heading"><h2 id="company-heading">Company</h2><dl><Value label="Company name">{company.name}</Value><Value label="Registration number">{company.registrationNumber}</Value>{company.vatNumber ? <Value label="VAT number">{company.vatNumber}</Value> : null}</dl></section> : null}
      <section className={styles.card} aria-labelledby="wholesale-heading"><h2 id="wholesale-heading">Wholesale</h2><dl><Value label="Wholesale status">{wholesaleStatus}</Value>{isPartner ? <Value label="Discount">{profile.discountPercent ?? 0}%</Value> : null}</dl></section>
      <section className={`${styles.card} ${styles.orders}`} aria-labelledby="orders-heading"><h2 id="orders-heading">Orders</h2>{confirmedOrder?<div className={styles.confirmation} role="status"><span><strong>Order confirmed</strong><small>Your order {confirmedOrder.id.slice(0,8)} has been placed.</small>{confirmedOrder.invoice?<small>Invoice {confirmedOrder.invoice.number}</small>:null}</span>{confirmedOrder.invoice?<InvoiceActions orderId={confirmedOrder.id}/>:null}</div>:null}{orders.length ? <div>{orders.map((order) => <details className={selectedOrder===order.id?styles.highlighted:undefined} open={selectedOrder===order.id} key={order.id}><summary><span><strong>{order.id.slice(0, 8)}</strong><small>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : '—'} · {order.pickupLocation.name}</small></span><span>€{(order.totalCents / 100).toFixed(2)}<small>{order.orderStatus} · {order.paymentStatus}</small></span></summary><div>{order.items.map((item) => <p key={item.productId}>{item.name} × {item.quantity} <strong>€{(item.lineTotalCents / 100).toFixed(2)}</strong></p>)}{order.invoice?<div className={styles.invoice}><span><small>Invoice</small><strong>{order.invoice.number}</strong>{order.paymentMethod==='bank_transfer'?<small>Use the invoice number as the payment reference.</small>:null}</span><InvoiceActions orderId={order.id}/></div>:null}</div></details>)}</div> : <p className={styles.muted}>No orders yet.</p>}</section>
      <section className={`${styles.card} ${styles.actions}`} aria-labelledby="actions-heading"><h2 id="actions-heading">Account actions</h2><div>{hasPermission(profile, PERMISSIONS.ACCESS_SHOP_ADMIN) ? <Link className={styles.adminLink} href="/admin">Admin</Link> : null}<AccountActions /></div></section>
    </div>
  </main>;
}
