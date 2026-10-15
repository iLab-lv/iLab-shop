import { orderFulfillmentLabel } from './fulfillment.mjs';

export function formatOrderReference(year, number) {
  if (!Number.isInteger(year) || !Number.isInteger(number) || number < 1) return null;
  return `#${year}-${String(number).padStart(6, '0')}`;
}

export function getOrderDisplayReference(order) {
  if (typeof order?.orderReference === 'string' && order.orderReference.trim()) return order.orderReference.trim();
  const year = order?.orderSequenceYear ?? order?.sequenceYear ?? order?.invoice?.sequenceYear;
  const number = order?.orderSequenceNumber ?? order?.sequenceNumber ?? order?.invoice?.sequenceNumber;
  return formatOrderReference(year, number) ?? `#${String(order?.id ?? '').slice(0, 8) || 'unknown'}`;
}

export function getOrderCustomerLabels(order) {
  const company = typeof order?.customer?.company?.name === 'string' ? order.customer.company.name.trim() : '';
  const name = typeof order?.customer?.name === 'string' ? order.customer.name.trim() : '';
  return { primary: company || name || order?.customer?.email || 'Guest', secondary: company && name ? name : '' };
}

export function getOrderFulfillmentSummary(order) {
  const method = order?.fulfillmentMethod;
  if (method === 'courier') return 'Courier';
  if (method === 'omniva_parcel_machine') return 'Omniva';
  if (method === 'pickup' || (!method && order?.pickupLocation)) return 'Pickup';
  return orderFulfillmentLabel(order);
}

export function formatOrderDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Riga', day: 'numeric', month: 'short' }).formatToParts(date);
  const fields = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${fields.day} ${fields.month}`;
}

export function filterAdminOrders(orders, { search = '', orderStatus = 'all', paymentStatus = 'all' } = {}) {
  const query = search.trim().toLocaleLowerCase();
  return orders.filter((order) => {
    if (orderStatus !== 'all' && order.orderStatus !== orderStatus) return false;
    if (paymentStatus !== 'all' && order.paymentStatus !== paymentStatus) return false;
    if (!query) return true;
    const searchable = [
      getOrderDisplayReference(order), order.id, order.invoice?.number,
      order.customer?.name, order.customer?.company?.name, order.customer?.email,
    ].filter(Boolean).join(' ').toLocaleLowerCase();
    return searchable.includes(query);
  });
}
