import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUserProfile } from '../../../lib/auth/sessionAuth';
import { PARTNER_STATUSES, PERMISSIONS, ROLES, hasPermission, isActiveUser } from '../../../lib/auth/roles.mjs';
import AccountActions from './AccountActions';
import AccountProfileForm from './AccountProfileForm';
import styles from './account.module.css';
import { getUserOrders } from '../../../lib/shopOrders';
import { orderItemsSubtotalCents } from '../../../lib/fulfillment.mjs';
import { getOrderDisplayReference } from '../../../lib/orderDisplay.mjs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Account | iLab Shop' };

function Value({ label, children }) {
  return <div><dt>{label}</dt><dd>{children || '—'}</dd></div>;
}

function InvoiceActions({ orderId }) {
  const invoiceUrl = `/shop/api/invoices/${encodeURIComponent(orderId)}`;
  return <span className={styles.invoiceActions}><a href={`${invoiceUrl}?view=1`} target="_blank" rel="noreferrer">View invoice</a><a href={invoiceUrl}>Download invoice</a></span>;
}

export default async function AccountPage() {
  const session = await getSessionUserProfile();
  const profile = session?.profile;
  if (!isActiveUser(profile)) redirect('/');
  const orders = await getUserOrders(session.token.uid);

  const isPartner = profile.role === ROLES.PARTNER && profile.partnerStatus === PARTNER_STATUSES.APPROVED;
  const wholesaleStatus = isPartner ? 'Approved' : profile.partnerStatus === PARTNER_STATUSES.REJECTED ? 'Rejected' : 'Not enabled';

  return <main className={styles.page}>
    <header><p>Account</p><h1>My Account</h1></header>
    <div className={styles.grid}>
      <section className={styles.card} aria-labelledby="profile-heading"><h2 id="profile-heading">Profile</h2><AccountProfileForm requireCompany={isPartner} profile={{ name: profile.name ?? '', email: profile.email || session.token.email || '', phone: profile.phone ?? '', company: profile.company ?? null, billingAddress: profile.billingAddress ?? '' }} /></section>
      <section className={styles.card} aria-labelledby="wholesale-heading"><h2 id="wholesale-heading">Wholesale</h2><dl><Value label="Wholesale status">{wholesaleStatus}</Value>{isPartner ? <Value label="Discount">{profile.discountPercent ?? 0}%</Value> : null}</dl></section>
      <section id="orders" className={`${styles.card} ${styles.orders}`} aria-labelledby="orders-heading"><h2 id="orders-heading">Orders</h2>{orders.length ? <div>{orders.map((order) => <div className={styles.orderEntry} key={order.id}><details><summary><span><strong>{getOrderDisplayReference(order)}</strong>{order.invoice?<small>Invoice {order.invoice.number}</small>:null}<small>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB') : '—'} · {order.pickupLocation.name}</small></span><span>€{(order.totalCents / 100).toFixed(2)}<small>{order.orderStatus} · {order.paymentStatus}</small></span></summary><div><p>{order.pickupLocation.name}: {order.pickupLocation.address}</p>{order.items.map((item, index) => <p key={item.productId || `${item.name}-${index}`}>{item.name} × {item.quantity} <strong>€{(item.lineTotalCents / 100).toFixed(2)}</strong></p>)}<p>Products subtotal <strong>€{(orderItemsSubtotalCents(order) / 100).toFixed(2)}</strong></p>{Number.isSafeInteger(order.deliveryFeeCents) && order.deliveryFeeCents > 0 ? <p>Delivery <strong>€{(order.deliveryFeeCents / 100).toFixed(2)}</strong></p> : null}<p>Grand total <strong>€{(order.totalCents / 100).toFixed(2)}</strong></p></div></details>{order.invoice?<InvoiceActions orderId={order.id}/>:null}</div>)}</div> : <p className={styles.muted}>No orders yet.</p>}</section>
      <section className={`${styles.card} ${styles.actions}`} aria-labelledby="actions-heading"><h2 id="actions-heading">Account actions</h2><div>{hasPermission(profile, PERMISSIONS.ACCESS_SHOP_ADMIN) ? <Link className={styles.adminLink} href="/admin">Admin</Link> : null}<AccountActions /></div></section>
    </div>
  </main>;
}
