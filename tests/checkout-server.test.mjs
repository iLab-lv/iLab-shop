import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServerModule, memoryFirestore } from './helpers/load-server-module.mjs';

const uid = 'test-customer';
const session = { token: { uid }, profile: { role: 'customer', status: 'active' } };
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const product = { id: 'p', slug: 'part', name: 'Part', sku: 1, status: 'active', stockQty: 1, retailPriceCents: 1000, wholesalePriceCents: 800 };
const payload = (n = 1) => ({
  requestId: uuid(n), saveToProfile: false,
  customer: { name: 'Test Buyer', email: 'buyer@example.test', phone: '+37120000000', company: null, billingAddress: '' },
  fulfillmentMethod: 'courier', delivery: { address: 'Test address' }, paymentMethod: 'bank_transfer',
  items: [{ productId: 'p', quantity: 1 }], expectedTotalCents: 1000,
});
async function ordersHarness(overrides = {}) {
  const store = memoryFirestore({
    'shopProducts/p': { ...product, ...overrides },
    [`shopCarts/${uid}`]: { items: [{ productId: 'p', quantity: 3 }, { productId: 'other', quantity: 1 }], revision: 2 },
  });
  let pdfAttempts = 0;
  const api = await loadServerModule('../../lib/shopOrders.js', {
    'server-only': {}, './firebaseAdmin': { db: store.db, firebaseStorageBucket: {}, serverTimestamp: () => new Date('2026-11-03T12:00:00Z') },
    './invoices/invoiceService': { generateInvoicePdfSafely: async () => { pdfAttempts += 1; } },
  });
  return { ...store, ...api, pdfAttempts: () => pdfAttempts };
}

test('real order transaction recalculates price, snapshots invoice and subtracts only purchased account quantities', async () => {
  const h = await ordersHarness();
  const input = { ...payload(), userId: 'attacker', totalCents: 1, unitPriceCents: 1, stockQty: 999 };
  const order = await h.createOrder(input, session);
  assert.equal(order.userId, uid);
  assert.equal(order.totalCents, 1000);
  assert.equal(order.items[0].unitPriceCents, 1000);
  assert.equal(h.rows()['shopProducts/p'].stockQty, 0);
  assert.deepEqual(h.rows()[`shopCarts/${uid}`].items, [{ productId: 'p', quantity: 2 }, { productId: 'other', quantity: 1 }]);
  assert.equal(Object.keys(h.rows()).filter((key) => key.startsWith('shopInvoices/')).length, 1);
  assert.equal(h.pdfAttempts(), 1);
});

test('concurrent last-unit purchases only commit one order in the isolated transactional double', async () => {
  const h = await ordersHarness();
  const results = await Promise.allSettled([h.createOrder(payload(1), session), h.createOrder(payload(2), session)]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.find((result) => result.status === 'rejected').reason.message, 'cart_changed');
  assert.equal(h.rows()['shopProducts/p'].stockQty, 0);
  assert.equal(Object.keys(h.rows()).filter((key) => key.startsWith('shopOrders/')).length, 1);
});

test('same UUID retry does not deduct stock/account cart or allocate invoice twice; another owner is rejected', async () => {
  const h = await ordersHarness({ stockQty: 5 });
  const first = await h.createOrder(payload(), session);
  const repeated = await h.createOrder(payload(), session);
  assert.equal(repeated.repeated, true);
  assert.equal(repeated.invoice.number, first.invoice.number);
  assert.equal(h.rows()['shopProducts/p'].stockQty, 4);
  assert.equal(h.rows()[`shopCarts/${uid}`].items[0].quantity, 2);
  await assert.rejects(h.createOrder(payload(), { ...session, token: { uid: 'someone-else' } }), /duplicate_request/);
});

test('missing or invalid retail cannot be bought even with wholesale eligibility and forged client prices', async () => {
  for (const retailPriceCents of [null, 0, -1, 1.5]) {
    const h = await ordersHarness({ retailPriceCents });
    const input = { ...payload(), expectedTotalCents: 800, retailPriceCents: 1000 };
    await assert.rejects(h.createOrder(input, { ...session, profile: { role: 'partner', status: 'active', partnerStatus: 'approved' } }), /cart_changed/);
    assert.equal(h.rows()['shopProducts/p'].stockQty, 1);
    assert.equal(Object.keys(h.rows()).some((key) => key.startsWith('shopOrders/')), false);
  }
});

test('stale prices, stock/status, quantities and anonymous orders fail without mutation', async () => {
  const h = await ordersHarness();
  await assert.rejects(h.createOrder({ ...payload(), expectedTotalCents: 999 }, session), /price_changed/);
  await assert.rejects(h.createOrder({ ...payload(), items: [{ productId: 'p', quantity: 0 }] }, session), /Invalid cart/);
  await assert.rejects(h.createOrder(payload(), null), /authentication_required/);
  for (const fields of [{ stockQty: 0 }, { status: 'inactive' }]) {
    const inactive = await ordersHarness(fields);
    await assert.rejects(inactive.createOrder(payload(), session), /cart_changed/);
  }
  assert.equal(h.rows()['shopProducts/p'].stockQty, 1);
  assert.equal(Object.keys(h.rows()).some((key) => key.startsWith('shopOrders/')), false);
});

test('Order route independently rejects unauthenticated requests, cross-origin requests and malformed cart input', async () => {
  let currentSession = null, createCount = 0;
  const route = await loadServerModule('../../app/api/orders/route.js', {
    '../../../lib/auth/sessionAuth': { getSessionUserProfile: async () => currentSession },
    '../../../lib/shopOrders': { createOrder: async () => { createCount++; throw new Error('Invalid cart item.'); }, serializeOrder: (value) => value },
    '../../../lib/auth/userProfiles': { updateCustomerProfileDefaults: async () => {} },
  });
  const request = (origin = 'https://ilab.lv') => new Request('https://ilab.lv/shop/api/orders', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload()) });
  const anonymous = await route.POST(request());
  assert.equal(anonymous.status, 401);
  assert.match(anonymous.headers.get('cache-control'), /private, no-store/);
  assert.equal(createCount, 0);
  currentSession = session;
  assert.equal((await route.POST(request('https://other.example'))).status, 403);
  const invalid = await route.POST(request());
  assert.equal(invalid.status, 400);
  assert.match(invalid.headers.get('cache-control'), /private, no-store/);
});

test('account cart route binds UID to active session and rejects queued writes after account switch', async () => {
  let currentSession = null, writes = 0;
  const route = await loadServerModule('../../app/api/cart/account/route.js', {
    '../../../../lib/auth/sessionAuth': { getSessionUserProfile: async () => currentSession },
    '../../../../lib/shopAccountCart': { getAccountCart: async () => ({ items: [], revision: 0 }), mutateAccountCart: async () => { writes++; return { items: [], revision: 1 }; } },
  });
  assert.equal((await route.GET()).status, 401);
  currentSession = session;
  assert.equal((await route.GET()).status, 200);
  const post = (expectedUid, origin = 'https://ilab.lv') => route.POST(new Request('https://ilab.lv/shop/api/cart/account', { method: 'POST', headers: { Origin: origin }, body: JSON.stringify({ operationId: uuid(1), type: 'clear', expectedUid, userId: 'victim' }) }));
  assert.equal((await post('previous-user')).status, 409);
  assert.equal((await post(uid, 'https://evil.example')).status, 403);
  assert.equal(writes, 0);
  const valid = await post(uid);
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).userId, uid);
  assert.equal(writes, 1);
});

test('real account-cart service persists only identity under session owner, atomically replays and leaves other carts untouched', async () => {
  const store = memoryFirestore({ 'shopCarts/victim': { items: [{ productId: 'private-item', quantity: 2 }], revision: 1 } });
  const service = await loadServerModule('../../lib/shopAccountCart.js', {
    'server-only': {}, './firebaseAdmin': { db: store.db, serverTimestamp: () => new Date() },
  });
  await assert.rejects(service.getAccountCart(null), /authentication_required/);
  assert.deepEqual(await service.getAccountCart(session), { items: [], revision: 0 });
  assert.equal(Object.hasOwn(store.rows(), `shopCarts/${uid}`), false);
  const operation = { type: 'add', operationId: uuid(8), productId: 'p', quantity: 2, userId: 'victim', unitPriceCents: 1 };
  await Promise.all([service.mutateAccountCart(operation, session), service.mutateAccountCart(operation, session)]);
  const saved = await service.getAccountCart(session);
  assert.deepEqual(saved, { items: [{ productId: 'p', quantity: 2 }], revision: 1 });
  assert.equal(store.rows()['shopCarts/victim'].items[0].productId, 'private-item');
  assert.equal(JSON.stringify(store.rows()[`shopCarts/${uid}`]).includes('unitPriceCents'), false);
});
