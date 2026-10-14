import 'server-only';
import { db, serverTimestamp } from './firebaseAdmin';
import { canViewWholesalePrices, isActiveUser } from './auth/roles.mjs';
import { cartTotal, normalizeCartItems, ORDER_STATUSES, PAYMENT_STATUSES, resolveProductLine } from './commerce.mjs';
import { validateCheckoutInput } from './checkoutValidation.mjs';
import { normalizeShopSettings } from './shopSettingsModel.mjs';
import { buildInvoiceSnapshot, INVOICE_SEQUENCE_COLLECTION, rigaYear } from './invoices/invoiceModel.mjs';
import { generateInvoicePdfSafely } from './invoices/invoiceService';
import { fulfillmentFeeCents } from './fulfillment.mjs';
import { orderDeliveryDescription, orderFulfillmentLabel } from './fulfillment.mjs';

const products = db.collection('shopProducts');
const orders = db.collection('shopOrders');
const invoices = db.collection('shopInvoices');
const settingsReference = db.doc('shopSettings/general');

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

export async function createOrder(input, session) {
  const checkout = validateCheckoutInput(input);
  if (!checkout.items.length || !checkout.requestId) throw new Error('invalid_checkout');
  if (!session?.token?.uid || !isActiveUser(session.profile)) throw new Error('authentication_required');
  const settingsSnapshot=await settingsReference.get(),settings=normalizeShopSettings(settingsSnapshot.exists?settingsSnapshot.data():null);
  const orderRef = orders.doc(checkout.requestId);
  const invoiceRef = invoices.doc(checkout.requestId);
  let result;
  let issuedInvoice;
  let shouldGeneratePdf=false;
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(orderRef);
    if (existing.exists) {
      const data = existing.data();
      if (data.userId !== session.token.uid) throw new Error('duplicate_request');
      result = { id: existing.id, ...data, repeated: true };
      const existingInvoice=await transaction.get(invoiceRef);if(existingInvoice.exists){issuedInvoice={id:existingInvoice.id,...existingInvoice.data()};shouldGeneratePdf=issuedInvoice.pdf?.status!=='ready';}
      return;
    }
    const pickup = checkout.fulfillmentMethod === 'pickup' ? settings.pickupLocations.find((location) => location.id === checkout.pickupLocationId && location.status === 'active') : null;
    if (checkout.fulfillmentMethod === 'pickup' && !pickup) throw new Error('invalid_pickup_location');
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
    const itemsSubtotalCents = cartTotal(lines);
    const deliveryFeeCents = fulfillmentFeeCents(checkout.fulfillmentMethod, settings.delivery);
    const totalCents = itemsSubtotalCents + deliveryFeeCents;
    if (checkout.expectedTotalCents === null || checkout.expectedTotalCents !== totalCents) { const error = new Error('price_changed'); error.currentTotalCents = totalCents; throw error; }
    const issuedAt=new Date(),sequenceYear=rigaYear(issuedAt),sequenceRef=db.collection(INVOICE_SEQUENCE_COLLECTION).doc(String(sequenceYear)),sequenceSnapshot=await transaction.get(sequenceRef),sequenceNumber=(Number.isInteger(sequenceSnapshot.get('lastNumber'))?sequenceSnapshot.get('lastNumber'):0)+1;
    const orderBase = { userId: session.token.uid, customer: checkout.customer, fulfillmentMethod: checkout.fulfillmentMethod, pickupLocation: pickup ? { id: pickup.id, name: pickup.name, address: pickup.address } : null, delivery: checkout.delivery, itemsSubtotalCents, deliveryFeeCents, paymentMethod: checkout.paymentMethod, paymentStatus: checkout.paymentMethod === 'bank_transfer' ? 'pending' : 'unpaid', orderStatus: 'new', items: lines, totalCents, currency: settings.currency, tax: settings.tax, stockRestoredAt: null };
    issuedInvoice=buildInvoiceSnapshot({order:orderBase,orderId:orderRef.id,userId:session.token.uid,settings:settings.invoicing,sequenceYear,sequenceNumber,issuedAt});
    shouldGeneratePdf=true;
    const order = { ...orderBase, invoice:{id:invoiceRef.id,number:issuedInvoice.invoiceNumber}, createdAt: issuedAt, updatedAt: issuedAt };
    transaction.create(orderRef, order);
    transaction.create(invoiceRef,issuedInvoice);
    transaction.set(sequenceRef,{year:sequenceYear,lastNumber:sequenceNumber,updatedAt:issuedAt},{merge:true});
    checkout.items.forEach((item, index) => transaction.update(refs[index], { stockQty: productData(snapshots[index]).stockQty - item.quantity, updatedAt: serverTimestamp() }));
    result = { id: orderRef.id, ...order };
  });
  if(issuedInvoice&&shouldGeneratePdf)await generateInvoicePdfSafely(issuedInvoice);
  return result;
}

function dateValue(value) { return value?.toDate ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : null; }
export function serializeOrder(snapshotOrData, id) { const data = snapshotOrData?.data ? snapshotOrData.data() : snapshotOrData; return { id: id ?? snapshotOrData.id, ...data, pickupLocation: data.pickupLocation ?? { name: orderFulfillmentLabel(data), address: orderDeliveryDescription(data) }, createdAt: dateValue(data.createdAt), updatedAt: dateValue(data.updatedAt), stockRestoredAt: dateValue(data.stockRestoredAt) }; }
async function reconcileInvoiceReferences(orderList) {
  if (!orderList.length) return orderList;
  const invoiceSnapshots = await db.getAll(...orderList.map((order) => invoices.doc(order.id)));
  return orderList.map((order, index) => {
    if (order.invoice?.number || !invoiceSnapshots[index].exists) return order;
    const invoiceNumber = invoiceSnapshots[index].get('invoiceNumber');
    return typeof invoiceNumber === 'string' && invoiceNumber ? { ...order, invoice: { id: invoiceSnapshots[index].id, number: invoiceNumber } } : order;
  });
}
export async function getAdminOrders() { const snapshot = await orders.orderBy('createdAt', 'desc').limit(250).get(); return reconcileInvoiceReferences(snapshot.docs.map((doc) => serializeOrder(doc))); }
export async function getUserOrders(uid) { const snapshot = await orders.where('userId', '==', uid).get(); const result=await reconcileInvoiceReferences(snapshot.docs.map((doc) => serializeOrder(doc))); return result.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')); }

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
