import test from 'node:test';
import assert from 'node:assert/strict';
import { beginCheckoutAttempt, readCheckoutAttempt, forgetCheckoutAttempt } from '../lib/checkoutRecovery.mjs';
import { loadServerModule, memoryFirestore } from './helpers/load-server-module.mjs';

const id = '00000000-0000-4000-8000-000000000001';
const session = { token: { uid: 'owner' }, profile: { role: 'customer', status: 'active' } };
function storage() { const values = new Map(); return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key), values }; }

test('interrupted checkout reuses its durable ID after remount and isolates accounts without persisting buyer data', () => {
  const local = storage(); let allocations = 0;
  assert.equal(beginCheckoutAttempt(local, 'owner', () => { allocations++; return id; }), id);
  assert.equal(readCheckoutAttempt(local, 'owner'), id);
  assert.equal(beginCheckoutAttempt(local, 'owner', () => { throw new Error('must reuse'); }), id);
  assert.equal(readCheckoutAttempt(local, 'other'), null);
  assert.equal(allocations, 1);
  assert.deepEqual([...local.values.values()], [id]);
  forgetCheckoutAttempt(local, 'owner', 'different-attempt');
  assert.equal(readCheckoutAttempt(local, 'owner'), id);
  forgetCheckoutAttempt(local, 'owner', id);
  assert.equal(readCheckoutAttempt(local, 'owner'), null);
});

test('unavailable or corrupted durable storage fails before submitting an unprotected checkout', () => {
  assert.throws(() => beginCheckoutAttempt({ getItem: () => null, setItem: () => { throw new Error('storage blocked'); } }, 'owner', () => id), /storage blocked/);
  assert.throws(() => readCheckoutAttempt({ getItem: () => 'bad-reference' }, 'owner'), /needs review/);
});

async function service(rows) {
  const store = memoryFirestore(rows);
  const api = await loadServerModule('../../lib/shopOrders.js', {
    'server-only': {}, './firebaseAdmin': { db: store.db, firebaseStorageBucket: {}, serverTimestamp: () => new Date() },
    './invoices/invoiceService': { generateInvoicePdfSafely: async () => null },
  });
  return { ...api, ...store };
}
test('recovery looks up the committed snapshot only for its active owner and distinguishes deleted requests', async () => {
  const h = await service({ [`shopOrders/${id}`]: { userId: 'owner', items: [], totalCents: 121, orderStatus: 'new', paymentStatus: 'pending' } });
  const before = h.rows();
  assert.equal((await h.getCheckoutOrder(id, session)).totalCents, 121);
  assert.equal(await h.getCheckoutOrder(id, { ...session, token: { uid: 'other' } }), null);
  await assert.rejects(h.getCheckoutOrder(id, null), /authentication_required/);
  await assert.rejects(h.getCheckoutOrder(id, { ...session, profile: { role: 'customer', status: 'disabled' } }), /authentication_required/);
  assert.deepEqual(h.rows(), before);
  const deleted = await service({ [`shopOrderRequests/${id}`]: { userId: 'owner', status: 'deleted' } });
  await assert.rejects(deleted.getCheckoutOrder(id, session), /order_deleted/);
  assert.equal(await deleted.getCheckoutOrder(id, { ...session, token: { uid: 'other' } }), null);
});

test('deleted UUID cannot recreate an order or deduct stock after a delayed retry', async () => {
  const h = await service({ [`shopOrderRequests/${id}`]: { userId: 'owner', status: 'deleted' }, 'shopProducts/p': { stockQty: 5 } });
  const input = { requestId: id, saveToProfile: false, customer: { name: 'TEST', email: 'test@example.invalid', phone: '12345678', company: null, billingAddress: '' }, fulfillmentMethod: 'courier', delivery: { address: 'TEST address' }, paymentMethod: 'bank_transfer', items: [{ productId: 'p', quantity: 1 }], expectedTotalCents: 100 };
  const before = h.rows();
  await assert.rejects(h.createOrder(input, session), /order_deleted/);
  assert.deepEqual(h.rows(), before);
});

test('recovery API gives private controlled missing, expired and unavailable responses', async () => {
  let current = 'missing';
  const route = await loadServerModule('../../app/api/orders/[orderId]/route.js', {
    '../../../../lib/auth/sessionAuth': { getSessionUserProfile: async () => session },
    '../../../../lib/shopOrders': { getCheckoutOrder: async () => { if (current === 'missing') return null; throw new Error(current); } },
  });
  for (const [mode, status] of [['missing', 404], ['authentication_required', 401], ['order_deleted', 410], ['invalid_order', 400]]) {
    current = mode;
    const result = await route.GET(new Request('http://localhost/shop/api/orders/test'), { params: Promise.resolve({ orderId: id }) });
    assert.equal(result.status, status);
    assert.equal(result.headers.get('cache-control'), 'private, no-store');
  }
});
