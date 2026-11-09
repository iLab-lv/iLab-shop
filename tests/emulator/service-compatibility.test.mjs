import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import admin from 'firebase-admin';
import { loadServerModule } from '../helpers/load-server-module.mjs';
import {
  assertEmulatorConfiguration,
  clearEmulatorData,
  createAndVerifyIdentity,
  newTestIdentity,
  startFirebaseEmulatorTest,
  stopFirebaseEmulatorTest,
} from './support.mjs';

assertEmulatorConfiguration();

before(async () => { await startFirebaseEmulatorTest(); });
after(async () => { await stopFirebaseEmulatorTest(); });

// Read the authorized Service checkout without editing or booting it. Only Next's
// request-local cookie store and JSON response wrapper are adapted. Auth session
// cookies, user-profile lookup, policy, route bodies and Admin SDK writes are real.
const serviceFile = (relativePath) => pathToFileURL(`C:/Users/info/Desktop/website/iLab/${relativePath}`).href;
const request = (body) => new Request('http://127.0.0.1/api/admin/emulator-fixture', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const categoryBody = { item: { slug: 'emulator-phones', labels: { lv: 'Testa telefoni', ru: 'Test phones' } } };
const deviceBody = { item: { slug: 'emulator-model', categoryKey: 'emulator-phones', brandKey: 'fixture', name: 'Synthetic model' } };
const serviceBody = { action: 'save', docId: 'emulator-screen', isNew: true, item: {
  id: 'emulator-screen', categoryId: 'emulator-phones', order: 1, labels: { lv: 'Testa ekrans', ru: 'Test screen' }, isActive: true,
} };
const priceBody = { modelId: 'emulator-model', categoryId: 'emulator-phones', rows: [{ serviceId: 'emulator-screen', price: 42 }] };

async function serviceHarness() {
  const { db, auth } = await startFirebaseEmulatorTest();
  let cookie;
  const session = await loadServerModule(serviceFile('lib/auth/serviceAdminSession.js'), {
    'server-only': {},
    'next/headers': { cookies: async () => ({ get: (name) => name === 'ilab_service_admin_session' && cookie ? { value: cookie } : undefined }) },
    '@/lib/firebaseAdmin': { db, firebaseAuth: auth },
  });
  const routeMocks = {
    'firebase-admin': { default: admin },
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '@/lib/firebaseAdmin': { db },
    '@/lib/auth/serviceAdminSession': session,
  };
  const routes = {};
  for (const name of ['services', 'pricelist', 'categories', 'devices']) {
    routes[name] = await loadServerModule(serviceFile(`app/api/admin/${name}/route.js`), routeMocks);
  }
  return { db, auth, session, routes, setCookie: (value) => { cookie = value; } };
}

async function signInServiceAdmin(harness) {
  const identity = await createAndVerifyIdentity(newTestIdentity('service-admin'));
  await harness.db.doc(`users/${identity.uid}`).set({ uid: identity.uid, role: 'admin', status: 'active' });
  const cookie = await harness.auth.createSessionCookie(identity.idToken, { expiresIn: 5 * 24 * 60 * 60 * 1000 });
  harness.setCookie(cookie);
  assert.equal((await harness.auth.verifySessionCookie(cookie, true)).uid, identity.uid);
  return { ...identity, cookie };
}

test('actual Service Admin routes retain catalog, service and pricing mutations with proposed client-write denial', async () => {
  await clearEmulatorData();
  const harness = await serviceHarness();
  const { db, routes } = harness;
  const identity = await signInServiceAdmin(harness);
  const actualSession = await harness.session.getServiceAdminSession();
  assert.equal(actualSession.token.uid, identity.uid);
  assert.equal(actualSession.canAccessServiceAdmin, true);

  for (const [name, body] of [['categories', categoryBody], ['devices', deviceBody], ['services', serviceBody], ['pricelist', priceBody]]) {
    const result = await routes[name].POST(request(body));
    assert.equal(result.status, 200, `${name}: ${await result.text()}`);
  }
  assert.equal((await db.doc('categories/emulator-phones').get()).get('labels.lv'), 'Testa telefoni');
  assert.equal((await db.doc('devices/emulator-model').get()).get('name'), 'Synthetic model');
  assert.equal((await db.doc('services/emulator-screen').get()).get('categoryId'), 'emulator-phones');
  assert.equal((await db.doc('servicePricing/emulator-model__emulator-screen').get()).get('price'), 42);
  for (const name of ['categories', 'devices']) assert.equal((await routes[name].GET()).status, 200);

  assert.equal((await routes.services.POST(request({ ...serviceBody, isNew: false, item: { labels: { lv: 'Updated fixture' } } }))).status, 200);
  assert.equal((await routes.services.POST(request({ action: 'reorder', items: [{ docId: 'emulator-screen', order: 2 }] }))).status, 200);
  assert.equal((await db.doc('services/emulator-screen').get()).get('order'), 2);
  const pricingId = 'emulator-model__emulator-screen';
  assert.equal((await routes.pricelist.POST(request({ ...priceBody, rows: [{ serviceId: 'emulator-screen', docId: pricingId, price: 55 }] }))).status, 200);
  assert.equal((await db.doc(`servicePricing/${pricingId}`).get()).get('price'), 55);
  assert.equal((await routes.pricelist.POST(request({ ...priceBody, rows: [{ serviceId: 'emulator-screen', docId: pricingId, price: null }] }))).status, 200);
  assert.equal((await db.doc(`servicePricing/${pricingId}`).get()).exists, false);
  assert.equal((await routes.devices.POST(request({ originalSlug: 'emulator-model', item: { ...deviceBody.item, slug: 'emulator-renamed' } }))).status, 200);
  assert.equal((await db.doc('devices/emulator-model').get()).exists, false);
  assert.equal((await db.doc('devices/emulator-renamed').get()).exists, true);
  assert.equal((await routes.devices.DELETE(new Request('http://127.0.0.1/api/admin/devices?slug=emulator-renamed', { method: 'DELETE' }))).status, 200);
  assert.equal((await routes.services.DELETE(request({ docId: 'emulator-screen', remainingItems: [] }))).status, 200);
  assert.equal((await db.doc('devices/emulator-renamed').get()).exists, false);
  assert.equal((await db.doc('services/emulator-screen').get()).exists, false);
});

test('actual Service session/profile policy denies customer, staff, inactive and missing sessions before any emulator mutation', async () => {
  await clearEmulatorData();
  const harness = await serviceHarness();
  const identity = await signInServiceAdmin(harness);
  const profileRef = harness.db.doc(`users/${identity.uid}`);
  const assertDenied = async (expectedStatus, label) => {
    for (const [name, body] of [['categories', categoryBody], ['devices', deviceBody], ['services', serviceBody], ['pricelist', priceBody]]) {
      // Body privilege claims do not replace verified session/profile authorization.
      const result = await harness.routes[name].POST(request({ ...body, role: 'admin', uid: identity.uid }));
      assert.equal(result.status, expectedStatus, `${label} ${name}`);
    }
    for (const name of ['categories', 'devices']) assert.equal((await harness.routes[name].GET()).status, expectedStatus, `${label} ${name} GET`);
    assert.equal((await harness.routes.services.DELETE(request({ docId: 'emulator-screen' }))).status, expectedStatus, `${label} services DELETE`);
    assert.equal((await harness.routes.devices.DELETE(new Request('http://127.0.0.1/api/admin/devices?slug=emulator-model', { method: 'DELETE' }))).status, expectedStatus, `${label} devices DELETE`);
    for (const collection of ['categories', 'devices', 'services', 'servicePricing', 'modelServices']) {
      assert.equal((await harness.db.collection(collection).get()).empty, true, `${label}: no ${collection} mutations`);
    }
  };
  for (const [role, status] of [['customer', 'active'], ['staff', 'active'], ['partner', 'active'], ['admin', 'disabled'], ['admin', 'pending']]) {
    await profileRef.set({ uid: identity.uid, role, status });
    await assertDenied(403, `${status} ${role}`);
  }
  await profileRef.delete();
  await assertDenied(403, 'missing profile');
  harness.setCookie(undefined);
  await assertDenied(401, 'missing session');
  harness.setCookie('invalid-session-cookie');
  await assertDenied(401, 'invalid session');
  await profileRef.set({ uid: identity.uid, role: 'admin', status: 'active' });
  harness.setCookie(identity.cookie);
  await harness.auth.updateUser(identity.uid, { disabled: true });
  await assertDenied(401, 'Auth-disabled account');
});
