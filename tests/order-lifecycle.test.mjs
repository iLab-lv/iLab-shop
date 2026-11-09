import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServerModule, memoryFirestore } from './helpers/load-server-module.mjs';

const owner = 'lifecycle-customer';
const session = { token: { uid: owner }, profile: { role: 'customer', status: 'active' } };
const product = { id: 'p', slug: 'part', name: 'Part', sku: 12, status: 'active', stockQty: 5, retailPriceCents: 12100, wholesalePriceCents: 9000 };
const order = (overrides = {}) => ({ userId: owner, orderStatus: 'new', paymentStatus: 'pending', fulfillmentMethod: 'courier', items: [{ productId: 'p', quantity: 2 }], stockRestoredAt: null, ...overrides });
const invoice = (overrides = {}) => ({ pdf: { status: 'ready', storagePath: null }, invoiceNumber: 'SH - 2026 - 000001', ...overrides });

async function harness({ rows = {}, timestamp = () => new Date('2026-11-03T12:00:00Z'), pdfDelete = async () => {} } = {}) {
  const store = memoryFirestore({ 'shopProducts/p': product, 'shopOrders/o': order(), 'shopInvoices/o': invoice(), ...rows });
  const api = await loadServerModule('../../lib/shopOrders.js', {
    'server-only': {},
    './firebaseAdmin': { db: store.db, firebaseStorageBucket: { file: () => ({ delete: pdfDelete }) }, serverTimestamp: timestamp },
    './invoices/invoiceService': { generateInvoicePdfSafely: async () => {} },
  });
  return { ...store, ...api };
}

test('cancelling concurrently restores inventory exactly once and keeps cancellation terminal', async () => {
  const h = await harness();
  await Promise.all([h.updateOrder('o', { orderStatus: 'cancelled' }), h.updateOrder('o', { orderStatus: 'cancelled' })]);
  assert.equal(h.rows()['shopProducts/p'].stockQty, 7);
  assert.ok(h.rows()['shopOrders/o'].stockRestoredAt);
  await assert.rejects(h.updateOrder('o', { orderStatus: 'processing' }), /cancelled_terminal/);
  assert.equal(h.rows()['shopProducts/p'].stockQty, 7);
});

test('status and payment updates leave the issued invoice snapshot unchanged', async () => {
  const original = invoice({ buyer: { name: 'Original buyer' }, totals: { grossCents: 24200 }, status: 'issued' });
  const h = await harness({ rows: { 'shopInvoices/o': original } });
  await h.updateOrder('o', { orderStatus: 'processing', paymentStatus: 'paid' });
  assert.equal(h.rows()['shopOrders/o'].orderStatus, 'processing');
  assert.equal(h.rows()['shopOrders/o'].paymentStatus, 'paid');
  assert.deepEqual(h.rows()['shopInvoices/o'], original);
});

test('delete restore choice is honored, already-restored stock is not added twice, and invoice sequence remains', async () => {
  for (const [name, options, expectedStock, restored] of [
    ['restore', { restoreStock: true }, 7, false],
    ['leave stock deducted', { restoreStock: false }, 5, false],
    ['already cancelled', { restoreStock: true, orderStatus: 'cancelled', stockRestoredAt: new Date('2026-11-02T00:00:00Z') }, 7, true],
  ]) {
    const h = await harness({ rows: {
      'shopOrders/o': order({ orderStatus: options.orderStatus ?? 'new', stockRestoredAt: options.stockRestoredAt ?? null }),
      ...(options.orderStatus === 'cancelled' ? { 'shopProducts/p': { ...product, stockQty: 7 } } : {}),
      'shopInvoiceSequences/2026': { year: 2026, lastNumber: 41 },
    } });
    await h.deleteOrder('o', { restoreStock: options.restoreStock });
    assert.equal(h.rows()['shopProducts/p'].stockQty, options.orderStatus === 'cancelled' ? 7 : expectedStock, name);
    assert.equal(Object.hasOwn(h.rows(), 'shopOrders/o'), false, name);
    assert.equal(Object.hasOwn(h.rows(), 'shopInvoices/o'), false, name);
    assert.deepEqual(h.rows()['shopInvoiceSequences/2026'], { year: 2026, lastNumber: 41 }, name);
    assert.deepEqual(h.rows()['shopOrderRequests/o'], { userId: owner, status: 'deleted', deletedAt: new Date('2026-11-03T12:00:00Z') }, name);
    assert.equal(restored, options.orderStatus === 'cancelled');
  }
});

test('concurrent deletion restores stock once and leaves one consumed-request receipt', async () => {
  const h = await harness();
  const attempts = await Promise.allSettled([h.deleteOrder('o', { restoreStock: true }), h.deleteOrder('o', { restoreStock: true })]);
  assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1);
  assert.match(attempts.find((attempt) => attempt.status === 'rejected').reason.message, /order_not_found/);
  assert.equal(h.rows()['shopProducts/p'].stockQty, 7);
  assert.equal(h.rows()['shopOrders/o'], undefined);assert.equal(h.rows()['shopInvoices/o'], undefined);
  assert.equal(h.rows()['shopOrderRequests/o'].userId, owner);
});

test('deleting a legacy order whose canonical invoice is missing remains safe', async () => {
  const h = await harness();
  await h.db.runTransaction(async (tx) => tx.delete(h.db.collection('shopInvoices').doc('o')));
  await h.deleteOrder('o', { restoreStock: true });
  assert.equal(h.rows()['shopProducts/p'].stockQty, 7);assert.equal(h.rows()['shopOrders/o'], undefined);
  assert.equal(h.rows()['shopOrderRequests/o'].status, 'deleted');
});

test('a failed cancellation transaction commits no order or inventory changes', async () => {
  const before = {
    'shopProducts/p': product,
    'shopOrders/o': order(),
    'shopInvoices/o': invoice(),
  };
  const h = await harness({ rows: { 'shopOrders/o': order({ items: [{ productId: 'p', quantity: 2 }] }) }, timestamp: () => { throw new Error('simulated_write_failure'); } });
  await assert.rejects(h.updateOrder('o', { orderStatus: 'cancelled' }), /simulated_write_failure/);
  const after = h.rows();
  assert.equal(after['shopProducts/p'].stockQty, before['shopProducts/p'].stockQty);
  assert.equal(after['shopOrders/o'].orderStatus, before['shopOrders/o'].orderStatus);
  assert.equal(after['shopOrders/o'].stockRestoredAt, before['shopOrders/o'].stockRestoredAt);
  assert.deepEqual(after['shopInvoices/o'], before['shopInvoices/o']);
});

test('all fulfillment methods snapshot authoritative configured fees and VAT; a changed fee rejects stale checkout total', async () => {
  const feeSettings = {
    tax: { vatRatePercent: 12.5 },
    delivery: { courierPriceCents: 700, omnivaParcelMachinePriceCents: 350 },
  };
  const methods = [
    ['pickup', { pickupLocationId: 'domina' }, 0],
    ['courier', { delivery: { address: 'Fixture street 1' } }, 700],
    ['omniva_parcel_machine', { delivery: { city: 'Riga', address: 'Fixture terminal' } }, 350],
  ];
  for (const [fulfillmentMethod, extras, fee] of methods) {
    const h = await harness({ rows: { 'shopSettings/general': feeSettings, 'shopInvoiceSequences/2026': { year: 2026, lastNumber: 0 } } });
    const result = await h.createOrder({
      requestId: `00000000-0000-4000-8000-${String(methods.indexOf(methods.find((entry) => entry[0] === fulfillmentMethod)) + 11).padStart(12, '0')}`,
      saveToProfile: false,
      customer: { name: 'Fixture Buyer', email: 'buyer@example.invalid', phone: '+37120000000', company: null, billingAddress: '' },
      fulfillmentMethod, ...extras, paymentMethod: 'bank_transfer', items: [{ productId: 'p', quantity: 1 }], expectedTotalCents: 12100 + fee,
    }, session);
    assert.equal(result.deliveryFeeCents, fee, fulfillmentMethod);
    assert.equal(result.totalCents, 12100 + fee, fulfillmentMethod);
    assert.deepEqual(result.tax, { pricesIncludeVat: true, vatRatePercent: 12.5 }, fulfillmentMethod);
    const savedInvoice = h.rows()[`shopInvoices/${result.id}`];
    assert.equal(savedInvoice.tax.vatRatePercent, 12.5, fulfillmentMethod);
    assert.equal(savedInvoice.totals.grossCents, 12100 + fee, fulfillmentMethod);
  }

  const changed = await harness({ rows: {
    'shopSettings/general': { ...feeSettings, delivery: { courierPriceCents: 701, omnivaParcelMachinePriceCents: 350 } },
  } });
  const staleInput = {
    requestId: '00000000-0000-4000-8000-000000000099', saveToProfile: false,
    customer: { name: 'Fixture Buyer', email: 'buyer@example.invalid', phone: '+37120000000', company: null, billingAddress: '' },
    fulfillmentMethod: 'courier', delivery: { address: 'Fixture street 1' }, paymentMethod: 'bank_transfer',
    items: [{ productId: 'p', quantity: 1 }], expectedTotalCents: 12800,
  };
  await assert.rejects(changed.createOrder(staleInput, session), /price_changed/);
  assert.equal(changed.rows()['shopProducts/p'].stockQty, 5);
  assert.equal(Object.hasOwn(changed.rows(), 'shopOrders/00000000-0000-4000-8000-000000000099'), false);
});

test('concurrent account-cart merges preserve the maximum quantity for matching product lines', async () => {
  const store = memoryFirestore({ 'shopCarts/lifecycle-customer': { items: [{ productId: 'p', quantity: 3 }], revision: 1 } });
  const service = await loadServerModule('../../lib/shopAccountCart.js', {
    'server-only': {}, './firebaseAdmin': { db: store.db, serverTimestamp: () => new Date('2026-11-03T12:00:00Z') },
  });
  const merge = (operationId, quantity) => service.mutateAccountCart({ type: 'merge', operationId, items: [{ productId: 'p', quantity }] }, session);
  await Promise.all([
    merge('00000000-0000-4000-8000-000000000101', 2),
    merge('00000000-0000-4000-8000-000000000102', 7),
    merge('00000000-0000-4000-8000-000000000103', 4),
  ]);
  assert.deepEqual(store.rows()['shopCarts/lifecycle-customer'].items, [{ productId: 'p', quantity: 7 }]);
});
