import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertEmulatorConfiguration,
  clearEmulatorData,
  createAndVerifyIdentity,
  disableIdentityAndAssertSignInRejected,
  newTestIdentity,
  seedFirestore,
  startFirebaseEmulatorTest,
  stopFirebaseEmulatorTest,
  withActualFirebaseAdmin,
} from './support.mjs';

assertEmulatorConfiguration();

before(async () => { await startFirebaseEmulatorTest(); });
after(async () => { await stopFirebaseEmulatorTest(); });

const sessionFor = (identity) => ({ token: identity.token, profile: { uid: identity.uid, email: identity.identity.email, role: 'customer', status: 'active' } });
const product = (stockQty = 4) => ({ id: 'emulator-part', slug: 'emulator-part', name: 'Emulator test part', sku: 911001, status: 'active', stockQty, retailPriceCents: 2500, wholesalePriceCents: 2000, imagePaths: [] });
const requestId = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const checkout = (n, quantity = 1) => ({
  requestId: requestId(n), saveToProfile: false,
  customer: { name: 'Emulator Test Buyer', email: 'buyer@example.invalid', phone: '+37120000000', company: null, billingAddress: '' },
  fulfillmentMethod: 'courier', delivery: { address: 'Emulator test address' }, paymentMethod: 'bank_transfer',
  items: [{ productId: 'emulator-part', quantity }], expectedTotalCents: 2500 * quantity,
});

async function services() {
  const pdfCalls = [];
  const orders = await withActualFirebaseAdmin('../../lib/shopOrders.js', {
    './invoices/invoiceService': { generateInvoicePdfSafely: async (invoice) => { pdfCalls.push(invoice.id); } },
  });
  const carts = await withActualFirebaseAdmin('../../lib/shopAccountCart.js');
  return { orders, carts, pdfCalls };
}

test('Firebase Auth emulator creates, signs in and verifies a synthetic ID token without external credentials', async () => {
  await clearEmulatorData();
  const { identity, uid, token, idToken } = await createAndVerifyIdentity(newTestIdentity('auth'));
  assert.ok(identity.email.endsWith('@example.invalid'));
  assert.equal(token.uid, uid);
  assert.equal(typeof idToken, 'string');
  const { auth } = await startFirebaseEmulatorTest();
  await assert.rejects(auth.verifyIdToken('not-a-real-emulator-token', true));
  const disabled = await createAndVerifyIdentity(newTestIdentity('disabled'));
  await disableIdentityAndAssertSignInRejected(disabled);
});

test('real Admin SDK cart service persists owner cart and applies an idempotent max-quantity guest merge', async () => {
  await clearEmulatorData();
  const first = await createAndVerifyIdentity(newTestIdentity('cart-owner'));
  const other = await createAndVerifyIdentity(newTestIdentity('cart-other'));
  const { carts } = await services();
  const ownerSession = sessionFor(first);
  await carts.mutateAccountCart({ type: 'merge', operationId: '10000000-0000-4000-8000-000000000001', items: [{ productId: 'emulator-part', quantity: 2 }, { productId: 'second-part', quantity: 1 }] }, ownerSession);
  await carts.mutateAccountCart({ type: 'merge', operationId: '10000000-0000-4000-8000-000000000002', items: [{ productId: 'emulator-part', quantity: 5 }, { productId: 'second-part', quantity: 1 }] }, ownerSession);
  const repeated = await carts.mutateAccountCart({ type: 'merge', operationId: '10000000-0000-4000-8000-000000000002', items: [{ productId: 'emulator-part', quantity: 5 }] }, ownerSession);
  assert.deepEqual(repeated.items, [{ productId: 'emulator-part', quantity: 5 }, { productId: 'second-part', quantity: 1 }]);
  assert.equal((await carts.getAccountCart(ownerSession)).revision, 2);
  assert.deepEqual((await carts.getAccountCart(sessionFor(other))).items, []);

  const { db } = await startFirebaseEmulatorTest();
  const stored = await db.doc(`shopCarts/${first.uid}`).get();
  assert.equal(stored.get('items')[0].quantity, 5);
  assert.equal((await db.doc(`shopCarts/${other.uid}`).get()).exists, false);
});

test('real order transaction recalculates from Firestore, subtracts cart once, snapshots invoice and permits owner reads only', async () => {
  await clearEmulatorData();
  const owner = await createAndVerifyIdentity(newTestIdentity('order-owner'));
  const other = await createAndVerifyIdentity(newTestIdentity('order-other'));
  await seedFirestore({
    'shopProducts/emulator-part': product(),
    [`shopCarts/${owner.uid}`]: { items: [{ productId: 'emulator-part', quantity: 3 }, { productId: 'other-part', quantity: 1 }], revision: 4, appliedOperationIds: [] },
  });
  const { orders, pdfCalls } = await services();
  const input = { ...checkout(11), totalCents: 1, items: [{ productId: 'emulator-part', quantity: 1, unitPriceCents: 1 }] };
  const created = await orders.createOrder(input, sessionFor(owner));
  assert.equal(created.userId, owner.uid);
  assert.equal(created.totalCents, 2500);
  assert.equal(created.items[0].unitPriceCents, 2500);
  assert.equal(created.items[0].quantity, 1);
  assert.equal(pdfCalls.length, 1);
  const firstInvoice = (await (await startFirebaseEmulatorTest()).db.doc(`shopInvoices/${created.id}`).get()).data();
  assert.equal(firstInvoice.buyer.email, input.customer.email);
  assert.equal(firstInvoice.totals.grossCents, 2500);

  const repeated = await orders.createOrder(input, sessionFor(owner));
  assert.equal(repeated.repeated, true);
  const { db } = await startFirebaseEmulatorTest();
  assert.equal((await db.doc('shopProducts/emulator-part').get()).get('stockQty'), 3);
  assert.deepEqual((await db.doc(`shopCarts/${owner.uid}`).get()).get('items'), [{ productId: 'emulator-part', quantity: 2 }, { productId: 'other-part', quantity: 1 }]);
  assert.equal((await db.collection('shopInvoices').get()).size, 1);
  assert.equal(pdfCalls.length, 2, 'retry may run the existing PDF recovery path, while invoice/order/stock remain idempotent');
  assert.ok(await orders.getCheckoutOrder(created.id, sessionFor(owner)));
  assert.equal(await orders.getCheckoutOrder(created.id, sessionFor(other)), null);
});

test('real Firestore transactions serialize the last available unit and cancellation restores inventory once', async () => {
  await clearEmulatorData();
  const owner = await createAndVerifyIdentity(newTestIdentity('stock-owner'));
  await seedFirestore({ 'shopProducts/emulator-part': product(1) });
  const { orders } = await services();
  const results = await Promise.allSettled([
    orders.createOrder(checkout(21), sessionFor(owner)),
    orders.createOrder(checkout(22), sessionFor(owner)),
  ]);
  const succeeded = results.filter((result) => result.status === 'fulfilled');
  const failed = results.filter((result) => result.status === 'rejected');
  assert.equal(succeeded.length, 1);
  assert.equal(failed.length, 1);
  assert.match(failed[0].reason.message, /cart_changed/);

  const created = succeeded[0].value;
  const { db } = await startFirebaseEmulatorTest();
  assert.equal((await db.doc('shopProducts/emulator-part').get()).get('stockQty'), 0);
  await Promise.all([orders.updateOrder(created.id, { orderStatus: 'cancelled' }), orders.updateOrder(created.id, { orderStatus: 'cancelled' })]);
  assert.equal((await db.doc('shopProducts/emulator-part').get()).get('stockQty'), 1);
  assert.ok((await db.doc(`shopOrders/${created.id}`).get()).get('stockRestoredAt'));
});

test('real order service rejects stale and missing retail prices without committing stock, invoices or orders', async () => {
  await clearEmulatorData();
  const owner = await createAndVerifyIdentity(newTestIdentity('price-owner'));
  const { orders } = await services();
  const { db } = await startFirebaseEmulatorTest();
  await seedFirestore({ 'shopProducts/emulator-part': product(2) });

  await db.doc('shopProducts/emulator-part').update({ retailPriceCents: 2700 });
  await assert.rejects(orders.createOrder(checkout(31), sessionFor(owner)), /price_changed/);
  assert.equal((await db.doc('shopProducts/emulator-part').get()).get('stockQty'), 2);
  await db.doc('shopProducts/emulator-part').update({ retailPriceCents: 2500 });

  for (const [index, retailPriceCents] of [null, 0, -1, 2.5].entries()) {
    await db.doc('shopProducts/emulator-part').update({ retailPriceCents, wholesalePriceCents: 2000 });
    await assert.rejects(orders.createOrder(checkout(32 + index), { ...sessionFor(owner), profile: { uid: owner.uid, role: 'partner', status: 'active', partnerStatus: 'approved' } }), /cart_changed/);
    assert.equal((await db.doc('shopProducts/emulator-part').get()).get('stockQty'), 2);
  }
  assert.equal((await db.collection('shopOrders').get()).size, 0);
  assert.equal((await db.collection('shopInvoices').get()).size, 0);
});

test('real invoice service records a failed PDF attempt without undoing the committed order or leaving an upload', async (t) => {
  t.mock.method(console, 'error', () => {});
  await clearEmulatorData();
  const owner = await createAndVerifyIdentity(newTestIdentity('pdf-owner'));
  await seedFirestore({ 'shopProducts/emulator-part': product(2) });
  const { db, bucket } = await startFirebaseEmulatorTest();
  const pdfService = await withActualFirebaseAdmin('../../lib/invoices/invoiceService.js', {
    '../firebaseAdmin': { db, firebaseStorageBucket: bucket },
    './invoicePdf': { renderInvoicePdf: async () => { throw new Error('synthetic_render_failure'); } },
  });
  const orders = await withActualFirebaseAdmin('../../lib/shopOrders.js', {
    './invoices/invoiceService': { generateInvoicePdfSafely: pdfService.generateInvoicePdfSafely },
  });
  const created = await orders.createOrder(checkout(41), sessionFor(owner));
  const invoiceSnapshot = await db.doc(`shopInvoices/${created.id}`).get();
  assert.equal(invoiceSnapshot.get('pdf.status'), 'failed');
  assert.equal(invoiceSnapshot.get('pdf.generationId'), null);
  assert.equal((await db.doc(`shopOrders/${created.id}`).get()).exists, true);
  assert.equal((await db.doc('shopProducts/emulator-part').get()).get('stockQty'), 1);
  assert.equal((await bucket.file(invoiceSnapshot.get('pdf.storagePath')).exists())[0], false);
});

test('real invoice service uploads private Storage bytes, finalizes emulator timestamps, and deletion leaves an idempotency tombstone', async () => {
  await clearEmulatorData();
  const owner = await createAndVerifyIdentity(newTestIdentity('invoice-owner'));
  await seedFirestore({ 'shopProducts/emulator-part': product(2) });
  const { db, bucket } = await startFirebaseEmulatorTest();
  const pdfBytes = Buffer.from('%PDF-1.7\nsynthetic emulator invoice\n%%EOF\n');
  const pdfService = await withActualFirebaseAdmin('../../lib/invoices/invoiceService.js', {
    '../firebaseAdmin': { db, firebaseStorageBucket: bucket },
    './invoicePdf': { renderInvoicePdf: async () => pdfBytes },
  });
  const orders = await withActualFirebaseAdmin('../../lib/shopOrders.js', {
    './invoices/invoiceService': pdfService,
  });
  const input = checkout(42);
  const created = await orders.createOrder(input, sessionFor(owner));
  const invoiceSnapshot = await db.doc(`shopInvoices/${created.id}`).get();
  const pdf = invoiceSnapshot.get('pdf');
  assert.equal(pdf.status, 'ready');
  assert.equal(pdf.generationId, null);
  assert.equal(pdf.generationStartedAt, null);
  assert.ok(pdf.generatedAt?.toDate instanceof Function);
  assert.match(pdf.storagePath, /^shop\/invoices\/\d{4}\/.+\/.+\.pdf$/);
  assert.equal(pdf.cleanupPaths.length, 0);
  const storedFile = bucket.file(pdf.storagePath);
  const [savedBytes] = await storedFile.download();
  assert.deepEqual(savedBytes, pdfBytes);
  const [metadata] = await storedFile.getMetadata();
  assert.equal(metadata.contentType, 'application/pdf');
  assert.match(metadata.cacheControl, /no-store/);
  const recovered = await pdfService.getInvoicePdf(created.id);
  assert.deepEqual(recovered.buffer, pdfBytes);

  await orders.deleteOrder(created.id, { restoreStock: true });
  assert.equal((await db.doc(`shopOrders/${created.id}`).get()).exists, false);
  assert.equal((await db.doc(`shopInvoices/${created.id}`).get()).exists, false);
  assert.equal((await db.doc('shopProducts/emulator-part').get()).get('stockQty'), 2);
  assert.equal((await db.doc(`shopOrderRequests/${created.id}`).get()).get('status'), 'deleted');
  assert.equal((await storedFile.exists())[0], false);
  await assert.rejects(orders.createOrder(input, sessionFor(owner)), /order_deleted/);
  assert.equal((await db.collection('shopOrders').get()).size, 0);
});
