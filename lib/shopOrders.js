import 'server-only';
import { db, serverTimestamp } from './firebaseAdmin';
import { canViewWholesalePrices } from './auth/roles.mjs';
import { SHOP_CONTACT } from '../app/components/shop/contactData';
import { cartTotal, normalizeCartItems, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, resolveProductLine } from './commerce.mjs';

const products = db.collection('shopProducts');
const orders = db.collection('shopOrders');

function productData(snapshot) {
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  return { id: data.id ?? snapshot.id, sku: Number.isInteger(data.sku) ? data.sku : null, slug: data.slug ?? '', name: data.name ?? '', primaryImagePath: Array.isArray(data.imagePaths) ? data.imagePaths[0] ?? null : null, status: data.status ?? 'inactive', stockQty: Number.isInteger(data.stockQty) ? data.stockQty : 0, retailPriceCents: Number.isInteger(data.retailPriceCents) ? data.retailPriceCents : null, wholesalePriceCents: Number.isInteger(data.wholesalePriceCents) ? data.wholesalePriceCents : null };
}

export async function resolveCart(rawItems, profile = null) {
  const items = normalizeCartItems(rawItems);
  if (!items.length) return { lines: [], totalCents: 0, currency: 'EUR', valid: true };
  const snapshots = await db.getAll(...items.map((item) => products.doc(item.productId)));
  const canUseWholesale = canViewWholesalePrices(profile);
  const lines = items.map((item, index) => {
    const product = productData(snapshots[index]);
    return { productId: item.productId, sku: product?.sku ?? null, slug: product?.slug ?? '', name: product?.name ?? 'Product no longer available', primaryImagePath: product?.primaryImagePath ?? null, quantity: item.quantity, retailPriceCents: product?.retailPriceCents ?? null, ...(canUseWholesale ? { wholesalePriceCents: product?.wholesalePriceCents ?? null } : {}), ...resolveProductLine(product, item.quantity, canUseWholesale) };
  });
  return { lines, totalCents: cartTotal(lines), currency: 'EUR', valid: lines.every((line) => line.purchasable) };
}

function cleanText(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max) throw new Error('invalid_checkout');
  const result = value.trim();
  if (required && !result) throw new Error('invalid_checkout');
  return result;
}

export function validateCheckoutInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_checkout');
  const name = cleanText(input.customer?.name, 160, true);
  const email = cleanText(input.customer?.email, 254, true).toLowerCase();
  const phone = cleanText(input.customer?.phone, 40, true);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('invalid_checkout');
  const companyName = cleanText(input.customer?.company?.name ?? '', 200);
  const company = companyName ? { name: companyName, registrationNumber: cleanText(input.customer?.company?.registrationNumber ?? '', 80), vatNumber: cleanText(input.customer?.company?.vatNumber ?? '', 80) } : null;
  const pickup = SHOP_CONTACT.locations.find((location) => location.id === input.pickupLocationId);
  if (!pickup || !PAYMENT_METHODS.includes(input.paymentMethod)) throw new Error('invalid_checkout');
  return { customer: { name, email, phone, company }, pickupLocation: { id: pickup.id, name: pickup.name, address: pickup.address }, paymentMethod: input.paymentMethod, items: normalizeCartItems(input.items), expectedTotalCents: Number.isInteger(input.expectedTotalCents) && input.expectedTotalCents >= 0 ? input.expectedTotalCents : null, requestId: typeof input.requestId === 'string' && /^[a-f0-9-]{36}$/i.test(input.requestId) ? input.requestId : null };
}

export async function createOrder(input, session) {
  const checkout = validateCheckoutInput(input);
  if (!checkout.items.length || !checkout.requestId) throw new Error('invalid_checkout');
  const orderRef = orders.doc(checkout.requestId);
  let result;
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(orderRef);
    if (existing.exists) {
      const data = existing.data();
      if ((data.userId ?? null) !== (session?.token?.uid ?? null)) throw new Error('duplicate_request');
      result = { id: existing.id, ...data, repeated: true };
      return;
    }
    const refs = checkout.items.map((item) => products.doc(item.productId));
    const snapshots = [];
    for (const reference of refs) snapshots.push(await transaction.get(reference));
    const canUseWholesale = canViewWholesalePrices(session?.profile);
    const lines = checkout.items.map((item, index) => {
      const product = productData(snapshots[index]);
      const resolution = resolveProductLine(product, item.quantity, canUseWholesale);
      if (!resolution.purchasable) { const error = new Error('cart_changed'); error.details = [{ productId: item.productId, reason: resolution.unavailableReason, stockQty: resolution.stockQty }]; throw error; }
      return { productId: item.productId, sku: product.sku, slug: product.slug, name: product.name, primaryImagePath: product.primaryImagePath, quantity: item.quantity, unitPriceCents: resolution.applicableUnitPriceCents, priceSource: resolution.priceSource, lineTotalCents: resolution.lineTotalCents };
    });
    const totalCents = cartTotal(lines);
    if (checkout.expectedTotalCents === null || checkout.expectedTotalCents !== totalCents) { const error = new Error('price_changed'); error.currentTotalCents = totalCents; throw error; }
    const order = { userId: session?.token?.uid ?? null, customer: checkout.customer, fulfillmentMethod: 'pickup', pickupLocation: checkout.pickupLocation, paymentMethod: checkout.paymentMethod, paymentStatus: checkout.paymentMethod === 'bank_transfer' ? 'pending' : 'unpaid', orderStatus: 'new', items: lines, totalCents, currency: 'EUR', stockRestoredAt: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    transaction.create(orderRef, order);
    checkout.items.forEach((item, index) => transaction.update(refs[index], { stockQty: productData(snapshots[index]).stockQty - item.quantity, updatedAt: serverTimestamp() }));
    result = { id: orderRef.id, ...order };
  });
  return result;
}

function dateValue(value) { return value?.toDate ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : null; }
export function serializeOrder(snapshotOrData, id) { const data = snapshotOrData?.data ? snapshotOrData.data() : snapshotOrData; return { id: id ?? snapshotOrData.id, ...data, createdAt: dateValue(data.createdAt), updatedAt: dateValue(data.updatedAt), stockRestoredAt: dateValue(data.stockRestoredAt) }; }
export async function getAdminOrders() { const snapshot = await orders.orderBy('createdAt', 'desc').limit(250).get(); return snapshot.docs.map((doc) => serializeOrder(doc)); }
export async function getUserOrders(uid) { const snapshot = await orders.where('userId', '==', uid).get(); return snapshot.docs.map((doc) => serializeOrder(doc)).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')); }

export async function updateOrder(id, input) {
  if (typeof id !== 'string' || !id || id.includes('/')) throw new Error('invalid_order');
  const orderStatus = input?.orderStatus, paymentStatus = input?.paymentStatus;
  if (orderStatus !== undefined && !ORDER_STATUSES.includes(orderStatus)) throw new Error('invalid_order');
  if (paymentStatus !== undefined && !PAYMENT_STATUSES.includes(paymentStatus)) throw new Error('invalid_order');
  const reference = orders.doc(id);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new Error('order_not_found');
    const order = snapshot.data();
    if (order.orderStatus === 'cancelled' && orderStatus && orderStatus !== 'cancelled') throw new Error('cancelled_terminal');
    const restore = orderStatus === 'cancelled' && order.orderStatus !== 'cancelled' && !order.stockRestoredAt;
    let itemRefs = [], productSnapshots = [];
    if (restore) { itemRefs = order.items.map((item) => products.doc(item.productId)); for (const ref of itemRefs) productSnapshots.push(await transaction.get(ref)); }
    if (restore) itemRefs.forEach((ref, index) => { if (productSnapshots[index].exists) transaction.update(ref, { stockQty: (Number.isInteger(productSnapshots[index].get('stockQty')) ? productSnapshots[index].get('stockQty') : 0) + order.items[index].quantity, updatedAt: serverTimestamp() }); });
    transaction.update(reference, { ...(orderStatus ? { orderStatus } : {}), ...(paymentStatus ? { paymentStatus } : {}), ...(restore ? { stockRestoredAt: serverTimestamp() } : {}), updatedAt: serverTimestamp() });
  });
  return serializeOrder(await reference.get());
}
