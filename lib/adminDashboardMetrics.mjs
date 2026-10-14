export const DASHBOARD_TIME_ZONE = 'Europe/Riga';

function zonedParts(date, timeZone = DASHBOARD_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]));
}

function zonedDateTimeToUtc(year, month, day, timeZone = DASHBOARD_TIME_ZONE) {
  const target = Date.UTC(year, month - 1, day);
  let result = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = zonedParts(new Date(result), timeZone);
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    result += target - represented;
  }
  return new Date(result);
}

function shiftMonth(year, month, delta) {
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 };
}

export function getDashboardMonthWindow(now = new Date()) {
  const current = zonedParts(now);
  const previous = shiftMonth(current.year, current.month, -1);
  const next = shiftMonth(current.year, current.month, 1);
  const label = (value) => new Intl.DateTimeFormat('en-GB', { timeZone: DASHBOARD_TIME_ZONE, month: 'long', year: 'numeric' }).format(value);
  const currentStart = zonedDateTimeToUtc(current.year, current.month, 1);
  const previousStart = zonedDateTimeToUtc(previous.year, previous.month, 1);
  const nextStart = zonedDateTimeToUtc(next.year, next.month, 1);
  return { previousStart, currentStart, nextStart, currentLabel: label(currentStart), previousLabel: label(previousStart), daysInCurrentMonth: new Date(Date.UTC(current.year, current.month, 0)).getUTCDate() };
}

function timestamp(value) { const parsed = value instanceof Date ? value.getTime() : Date.parse(value); return Number.isFinite(parsed) ? parsed : null; }
function inRange(value, start, end) { const time = timestamp(value); return time !== null && time >= start.getTime() && time < end.getTime(); }
function orderMetrics(orders) { const included = orders.filter((order) => order.orderStatus !== 'cancelled'); const salesCents = included.reduce((sum, order) => sum + (Number.isInteger(order.totalCents) ? order.totalCents : 0), 0); return { salesCents, orderCount: included.length, averageOrderCents: included.length ? Math.round(salesCents / included.length) : 0 }; }

export function calculateComparison(current, previous) {
  if (previous === 0) return current === 0 ? { kind: 'neutral', percent: null } : { kind: 'new', percent: null };
  return { kind: 'percent', percent: ((current - previous) / previous) * 100 };
}

export function customerDisplayName(order) { return order?.customer?.company?.name || order?.customer?.name || order?.customer?.email || 'Guest'; }

export function aggregateDashboardData({ orders, users, pendingApplications, pendingApplicationCount, newOrders, newOrderCount, recentOrders, now = new Date() }) {
  const month = getDashboardMonthWindow(now);
  const currentOrders = orders.filter((order) => inRange(order.createdAt, month.currentStart, month.nextStart));
  const previousOrders = orders.filter((order) => inRange(order.createdAt, month.previousStart, month.currentStart));
  const current = orderMetrics(currentOrders), previous = orderMetrics(previousOrders);
  const eligibleCustomer = (user) => !['staff', 'admin'].includes(user.role);
  const currentCustomers = users.filter((user) => eligibleCustomer(user) && inRange(user.createdAt, month.currentStart, month.nextStart)).length;
  const previousCustomers = users.filter((user) => eligibleCustomer(user) && inRange(user.createdAt, month.previousStart, month.currentStart)).length;
  const dailySales = Array.from({ length: month.daysInCurrentMonth }, (_, index) => ({ day: index + 1, salesCents: 0 }));
  for (const order of currentOrders) { if (order.orderStatus === 'cancelled') continue; const day = zonedParts(new Date(order.createdAt)).day; if (dailySales[day - 1]) dailySales[day - 1].salesCents += Number.isInteger(order.totalCents) ? order.totalCents : 0; }
  const breakdown = { retailCents: 0, wholesaleCents: 0, deliveryCents: 0, unclassifiedCents: 0 };
  for (const order of currentOrders) { if (order.orderStatus === 'cancelled') continue; let classifiedCents = 0; for (const item of Array.isArray(order.items) ? order.items : []) { const amount = Number.isInteger(item.lineTotalCents) ? item.lineTotalCents : 0; if (item.priceSource === 'retail') { breakdown.retailCents += amount; classifiedCents += amount; } else if (item.priceSource === 'wholesale') { breakdown.wholesaleCents += amount; classifiedCents += amount; } } const deliveryCents=Number.isInteger(order.deliveryFeeCents)?Math.max(0,order.deliveryFeeCents):0; breakdown.deliveryCents+=deliveryCents; classifiedCents+=deliveryCents; breakdown.unclassifiedCents += Math.max(0, (Number.isInteger(order.totalCents) ? order.totalCents : 0) - classifiedCents); }
  const newest = (a, b) => (timestamp(b.createdAt) ?? 0) - (timestamp(a.createdAt) ?? 0);
  const applications = [...pendingApplications].filter((user) => user.partnerStatus === 'pending').sort(newest);
  const attentionOrders = [...newOrders].filter((order) => order.orderStatus === 'new').sort(newest);
  return { month, kpis: { sales: { value: current.salesCents, comparison: calculateComparison(current.salesCents, previous.salesCents) }, orders: { value: current.orderCount, comparison: calculateComparison(current.orderCount, previous.orderCount) }, average: { value: current.averageOrderCents, comparison: calculateComparison(current.averageOrderCents, previous.averageOrderCents) }, customers: { value: currentCustomers, comparison: calculateComparison(currentCustomers, previousCustomers) } }, currentSummary: current, dailySales, breakdown, pendingApplications: { count: pendingApplicationCount ?? applications.length, preview: applications.slice(0, 5) }, newOrders: { count: newOrderCount ?? attentionOrders.length, preview: attentionOrders.slice(0, 5) }, recentOrders: [...recentOrders].sort(newest).slice(0, 10) };
}
