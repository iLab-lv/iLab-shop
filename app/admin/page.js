import Link from 'next/link';
import { getAdminDashboardData } from '../../lib/adminDashboard';
import { customerDisplayName } from '../../lib/adminDashboardMetrics.mjs';
import { getOrderDisplayReference } from '../../lib/orderDisplay.mjs';
import AdminPageHeader from './components/AdminPageHeader';
import AdminStatusBadge from './components/AdminStatusBadge';
import styles from './admin.module.css';

const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const dateTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Riga', dateStyle: 'medium', timeStyle: 'short' });
const formatMoney = (cents) => money.format(cents / 100);
const formatDate = (value) => value ? dateTime.format(new Date(value)) : '—';
const customer = customerDisplayName;
function comparisonText(comparison, previousLabel) { if (comparison.kind === 'new') return `New vs ${previousLabel}`; if (comparison.kind === 'neutral') return `— vs ${previousLabel}`; return `${comparison.percent > 0 ? '+' : ''}${comparison.percent.toFixed(1)}% vs ${previousLabel}`; }
function KpiCard({ label, value, comparison, previousLabel, hint }) { return <article className={styles.kpiCard}><span>{label}</span><strong>{value}</strong><small>{comparisonText(comparison, previousLabel)}</small>{hint ? <p>{hint}</p> : null}</article>; }
function SalesChart({ data, summary, monthLabel }) {
  const max = Math.max(...data.map((item) => item.salesCents), 1);
  if (!summary.salesCents) return <div className={styles.chartEmpty}><p>No sales yet this month.</p><span>{monthLabel} · 0 orders</span></div>;
  return <figure className={styles.chart} aria-label={`${monthLabel} sales ${formatMoney(summary.salesCents)} across ${summary.orderCount} orders`}><div className={styles.chartPlot} style={{ '--days': data.length }}>{data.map((item) => <div className={styles.barSlot} key={item.day} title={`Day ${item.day}: ${formatMoney(item.salesCents)}`}><span style={{ height: `${Math.max(item.salesCents ? 4 : 0, (item.salesCents / max) * 100)}%` }} /></div>)}</div><figcaption><span>1</span><span>{Math.ceil(data.length / 2)}</span><span>{data.length}</span></figcaption><p className={styles.chartSummary}>{formatMoney(summary.salesCents)} from {summary.orderCount} non-cancelled {summary.orderCount === 1 ? 'order' : 'orders'}.</p></figure>;
}

export default async function AdminPage() {
  let dashboard;
  try { dashboard = await getAdminDashboardData(); }
  catch (error) { console.error('Unable to load Admin Dashboard.', error); return <><AdminPageHeader title="Dashboard" description="Operational overview" /><div className={styles.loadError} role="alert">Dashboard data could not be loaded. Please refresh and try again.</div></>; }
  const previous = dashboard.month.previousLabel;
  const classifiedTotal = dashboard.breakdown.retailCents + dashboard.breakdown.wholesaleCents + dashboard.breakdown.deliveryCents + dashboard.breakdown.unclassifiedCents;
  const percent = (value) => classifiedTotal ? `${((value / classifiedTotal) * 100).toFixed(1)}%` : '0%';
  return <>
    <AdminPageHeader title="Dashboard" description={`${dashboard.month.currentLabel} operational overview`} />
    <section className={styles.kpiGrid} aria-label="Current month key performance indicators">
      <KpiCard label="Sales this month" value={formatMoney(dashboard.kpis.sales.value)} comparison={dashboard.kpis.sales.comparison} previousLabel={previous} hint="Non-cancelled order value, VAT included" />
      <KpiCard label="Orders this month" value={dashboard.kpis.orders.value} comparison={dashboard.kpis.orders.comparison} previousLabel={previous} />
      <KpiCard label="New customers" value={dashboard.kpis.customers.value} comparison={dashboard.kpis.customers.comparison} previousLabel={previous} hint="New non-administrative accounts" />
    </section>
    <section className={styles.section} aria-labelledby="attention-heading"><div className={styles.sectionHeading}><div><p>Operations</p><h2 id="attention-heading">Needs attention</h2></div></div><div className={styles.attentionGrid}>
      <article className={styles.panel}><header><div><h3>Wholesale applications</h3><p>Accounts awaiting review</p></div><span className={styles.count}>{dashboard.pendingApplications.count}</span></header>{dashboard.pendingApplications.preview.length ? <ul className={styles.itemList}>{dashboard.pendingApplications.preview.map((user) => <li key={user.uid}><Link href="/admin/users"><span><strong>{user.company?.name || user.name || user.email}</strong><small>{user.company?.registrationNumber || user.email || 'No registration number'} · {formatDate(user.createdAt)}</small></span><span aria-hidden="true">→</span></Link></li>)}</ul> : <p className={styles.empty}>No pending applications.</p>}<Link className={styles.viewAll} href="/admin/users">View all users →</Link></article>
      <article className={styles.panel}><header><div><h3>New inquiries</h3><p>Customer requests awaiting review</p></div><span className={styles.count}>{dashboard.newInquiriesCount}</span></header><p className={styles.empty}>{dashboard.newInquiriesCount ? `${dashboard.newInquiriesCount} ${dashboard.newInquiriesCount === 1 ? 'inquiry' : 'inquiries'} need attention.` : 'No new inquiries.'}</p><Link className={styles.viewAll} href="/admin/inquiries">View inquiries →</Link></article>
    </div></section>
    <section className={styles.section} aria-labelledby="recent-heading"><div className={styles.sectionHeading}><div><p>Activity</p><h2 id="recent-heading">Recent orders</h2></div><Link href="/admin/orders">View all orders →</Link></div>{dashboard.recentOrders.length ? <div className={styles.tableWrap}><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th /></tr></thead><tbody>{dashboard.recentOrders.map((order) => <tr key={order.id}><td><code>{getOrderDisplayReference(order)}</code></td><td>{customer(order)}</td><td>{formatMoney(order.totalCents)}</td><td><AdminStatusBadge status={order.paymentStatus} /></td><td><AdminStatusBadge status={order.orderStatus} /></td><td>{formatDate(order.createdAt)}</td><td><Link href="/admin/orders" aria-label={`View order ${getOrderDisplayReference(order)}`}>View</Link></td></tr>)}</tbody></table></div> : <p className={styles.emptyPanel}>No orders yet.</p>}</section>
    <section className={styles.section} aria-labelledby="month-heading"><div className={styles.sectionHeading}><div><p>Performance</p><h2 id="month-heading">This month</h2></div><span>{dashboard.month.currentLabel}</span></div><div className={styles.reportGrid}>
      <article className={`${styles.panel} ${styles.chartPanel}`}><header><div><h3>Sales by day</h3><p>VAT-inclusive non-cancelled order value</p></div></header><SalesChart data={dashboard.dailySales} summary={dashboard.currentSummary} monthLabel={dashboard.month.currentLabel} /></article>
      <article className={styles.panel}><header><div><h3>Sales breakdown</h3><p>Applied line price source and delivery charges</p></div></header><dl className={styles.breakdown}><div><dt><span>Retail-priced</span><small>{percent(dashboard.breakdown.retailCents)}</small></dt><dd>{formatMoney(dashboard.breakdown.retailCents)}</dd></div><div><dt><span>Wholesale-priced</span><small>{percent(dashboard.breakdown.wholesaleCents)}</small></dt><dd>{formatMoney(dashboard.breakdown.wholesaleCents)}</dd></div>{dashboard.breakdown.deliveryCents ? <div><dt><span>Delivery</span><small>{percent(dashboard.breakdown.deliveryCents)}</small></dt><dd>{formatMoney(dashboard.breakdown.deliveryCents)}</dd></div> : null}{dashboard.breakdown.unclassifiedCents ? <div><dt><span>Unclassified</span><small>{percent(dashboard.breakdown.unclassifiedCents)}</small></dt><dd>{formatMoney(dashboard.breakdown.unclassifiedCents)}</dd></div> : null}</dl>{dashboard.breakdown.unclassifiedCents ? <p className={styles.legacyNote}>Legacy value without a reliable applied price source remains unclassified.</p> : null}</article>
    </div></section>
  </>;
}
