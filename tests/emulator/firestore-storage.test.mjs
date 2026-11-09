import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import {
  assertEmulatorConfiguration,
  assertFails,
  assertSucceeds,
  clientFirestore,
  clientStorage,
  clearEmulatorData,
  seedFirestore,
  startFirebaseEmulatorTest,
  stopFirebaseEmulatorTest,
} from './support.mjs';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

assertEmulatorConfiguration();

before(async () => {
  await startFirebaseEmulatorTest();
  await clearEmulatorData();
});

after(async () => {
  await stopFirebaseEmulatorTest();
});

test('proposed rules allow public reads from the five Service collections and deny every client write', async () => {
  const collections = ['modelServices', 'servicePricing', 'services', 'categories', 'devices'];
  await seedFirestore(Object.fromEntries(collections.map((name) => [`${name}/fixture`, { title: `${name} fixture`, active: true }])));
  const identities = [
    ['anonymous', clientFirestore()],
    ['customer', clientFirestore(null, { uid: 'customer-fixture' })],
    ['other customer', clientFirestore(null, { uid: 'other-fixture' })],
    ['admin', clientFirestore(null, { uid: 'admin-fixture', claims: { role: 'admin', admin: true } })],
  ];

  for (const name of collections) {
    for (const [role, db] of identities) {
      assert.equal((await assertSucceeds(getDoc(doc(db, `${name}/fixture`)))).exists(), true, `${name} ${role} get`);
      assert.equal((await assertSucceeds(getDocs(collection(db, name)))).size, 1, `${name} ${role} list`);
      await assertFails(setDoc(doc(db, `${name}/new-fixture`), { title: 'created' }));
      await assertFails(updateDoc(doc(db, `${name}/fixture`), { title: 'changed' }));
      await assertFails(deleteDoc(doc(db, `${name}/fixture`)));
      await assertFails(getDoc(doc(db, `${name}/fixture/private/nested`)));
    }
  }
});

test('shop, customer, order, cart, invoice and nested private documents deny direct client reads and writes for every role', async () => {
  const fixtures = {
    'shopProducts/p1': { name: 'Private fixture product' },
    'shopCarts/customer-a': { items: [{ productId: 'p1', quantity: 1 }] },
    'shopOrders/order-a': { userId: 'customer-a', totalCents: 1000 },
    'shopInvoices/order-a': { userId: 'customer-a', invoiceNumber: 'fixture' },
    'shopOrderRequests/deleted-a': { userId: 'customer-a', status: 'deleted' },
    'settings/site': { locations: [] },
    'places/fixture': { rating: 5 },
    'shopSettings/general': { contactEmail: 'private@example.invalid' },
    'shopInvoiceSequences/2026': { lastNumber: 1 },
    'users/customer-a': { role: 'customer', status: 'active' },
    'shopOrders/order-a/events/created': { internal: true },
    'users/customer-a/addresses/home': { address: 'Private fixture address' },
  };
  await seedFirestore(fixtures);

  const identities = [
    clientFirestore(),
    clientFirestore(null, { uid: 'customer-a' }),
    clientFirestore(null, { uid: 'customer-b' }),
    clientFirestore(null, { uid: 'admin-fixture', claims: { role: 'admin', admin: true } }),
  ];
  for (const db of identities) {
    for (const [path, value] of Object.entries(fixtures)) {
      await assertFails(getDoc(doc(db, path)));
      await assertFails(setDoc(doc(db, path), { ...value, forged: true }));
      await assertFails(deleteDoc(doc(db, path)));
    }
    await assertFails(getDocs(collection(db, 'shopOrders')));
    await assertFails(getDocs(collection(db, 'shopCarts')));
  }
});

test('Storage permits public product image reads and denies all client writes and private invoice access', async () => {
  const { environment } = await startFirebaseEmulatorTest();
  await environment.withSecurityRulesDisabled(async (context) => {
    const storage = context.storage();
    await uploadBytes(ref(storage, 'shop/products/emulator-fixture.txt'), new TextEncoder().encode('public fixture only'), { contentType: 'text/plain' });
    await uploadBytes(ref(storage, 'shop/invoices/emulator-fixture.pdf'), new TextEncoder().encode('%PDF fixture'), { contentType: 'application/pdf' });
  });

  const publicStorage = clientStorage();
  const customerStorage = clientStorage(null, { uid: 'customer-a' });
  const otherStorage = clientStorage(null, { uid: 'customer-b' });
  const adminStorage = clientStorage(null, { uid: 'admin-fixture', claims: { role: 'admin', admin: true } });
  assert.equal(Buffer.from(await getBytes(ref(publicStorage, 'shop/products/emulator-fixture.txt'))).toString(), 'public fixture only');
  for (const storage of [publicStorage, customerStorage, otherStorage, adminStorage]) {
    await assertSucceeds(getBytes(ref(storage, 'shop/products/emulator-fixture.txt')));
    await assertFails(uploadBytes(ref(storage, 'shop/products/client-write.txt'), new Uint8Array([1, 2, 3])));
    await assertFails(uploadBytes(ref(storage, 'shop/products/emulator-fixture.txt'), new Uint8Array([4, 5, 6])));
    await assertFails(deleteObject(ref(storage, 'shop/products/emulator-fixture.txt')));
    await assertFails(getBytes(ref(storage, 'shop/invoices/emulator-fixture.pdf')));
    await assertFails(uploadBytes(ref(storage, 'shop/invoices/client-write.pdf'), new Uint8Array([1, 2, 3])));
    await assertFails(deleteObject(ref(storage, 'shop/invoices/emulator-fixture.pdf')));
  }
});
