import test from 'node:test';
import assert from 'node:assert/strict';
import { loadServerModule, memoryFirestore } from './helpers/load-server-module.mjs';
import { PERMISSIONS } from '../lib/auth/roles.mjs';

const uid = 'fixture-customer';
const token = { uid, email: 'fixture@example.invalid', name: 'Fixture Buyer' };
const profile = (role = 'customer', status = 'active') => ({ uid, email: token.email, name: token.name, phone: '+37120000000', role, status, partnerStatus: 'none', discountPercent: 0 });
const request = (path, method = 'GET', body, origin = 'https://ilab.lv') => new Request(`https://ilab.lv/shop/api/${path}`, {
  method,
  headers: { Authorization: 'Bearer fixture-id-token', ...(origin === null ? {} : { Origin: origin }), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
function privateResponse(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
}
async function authHarness(initialProfile = profile()) {
  const state = { profile: initialProfile, tokenFailure: null, sessionFailure: null, cookie: 'fixture-session', cookieWrites: [], sessionCreates: 0 };
  const firebaseAuth = {
    async verifyIdToken(value, revoked) {
      assert.equal(value, 'fixture-id-token'); assert.equal(revoked, true);
      if (state.tokenFailure) throw state.tokenFailure;
      return token;
    },
    async verifySessionCookie(value, revoked) {
      assert.equal(value, 'fixture-session'); assert.equal(revoked, true);
      if (state.sessionFailure) throw state.sessionFailure;
      return token;
    },
    async createSessionCookie(value, options) {
      assert.equal(value, 'fixture-id-token'); assert.equal(options.expiresIn, 5 * 24 * 60 * 60 * 1000);
      state.sessionCreates++;
      return 'created-fixture-session';
    },
  };
  const cookies = async () => ({ get: () => state.cookie ? { value: state.cookie } : undefined, set: (...args) => state.cookieWrites.push(args) });
  const getUserProfile = async (target) => { assert.equal(target, uid); return state.profile; };
  const auth = await loadServerModule('../../lib/auth/serverAuth.js', {
    'server-only': {}, '../firebaseAdmin': { firebaseAuth }, './userProfiles': { getUserProfile },
  });
  const sessionAuth = await loadServerModule('../../lib/auth/sessionAuth.js', {
    'server-only': {}, 'next/headers': { cookies }, '../firebaseAdmin': { firebaseAuth }, './userProfiles': { getUserProfile },
  });
  const sessionRoute = await loadServerModule('../../app/api/auth/session/route.js', {
    'next/headers': { cookies }, '../../../../lib/firebaseAdmin': { firebaseAuth },
    '../../../../lib/auth/serverAuth': auth, '../../../../lib/auth/userProfiles': { getUserProfile },
  });
  return { state, auth, sessionAuth, sessionRoute };
}

test('real bearer authentication checks revocation and returns private 401 without internal Firebase details', async () => {
  const h = await authHarness();
  assert.equal((await h.auth.verifyFirebaseRequest(request('users/me'))).uid, uid);
  for (const code of ['auth/id-token-expired', 'auth/id-token-revoked', 'auth/user-disabled']) {
    h.state.tokenFailure = new Error(`private Firebase diagnostic: ${code}`);
    await assert.rejects(h.auth.verifyFirebaseRequest(request('users/me')), (error) => {
      const response = h.auth.authErrorResponse(error);
      privateResponse(response, 401);
      assert.doesNotMatch(error.message, /diagnostic|revoked|user-disabled/);
      return true;
    });
  }
  await assert.rejects(h.auth.verifyFirebaseRequest(new Request('https://ilab.lv/shop/api/users/me')), h.auth.AuthenticationError);
  assert.equal(h.auth.authErrorResponse(new Error('not an auth failure')), null);
});

test('real session and permission helpers reject expired/revoked cookies and enforce current active role', async () => {
  const h = await authHarness();
  for (const code of ['auth/session-cookie-expired', 'auth/session-cookie-revoked']) {
    h.state.sessionFailure = new Error(code);
    assert.equal(await h.sessionAuth.getSessionUserProfile(), null);
    assert.equal((await h.sessionAuth.getShopAdminSession()).authenticated, false);
  }
  h.state.sessionFailure = null;
  for (const role of ['customer', 'partner', 'staff', 'admin']) {
    for (const status of ['active', 'pending', 'disabled']) {
      h.state.profile = profile(role, status);
      const allowed = status === 'active' && ['staff', 'admin'].includes(role);
      assert.equal((await h.sessionAuth.getShopAdminSession()).authorized, allowed, `${role}/${status}`);
      if (allowed) assert.equal((await h.auth.requirePermission(request('admin/check'), PERMISSIONS.ACCESS_SHOP_ADMIN)).token.uid, uid);
      else await assert.rejects(h.auth.requirePermission(request('admin/check'), PERMISSIONS.ACCESS_SHOP_ADMIN), h.auth.AuthorizationError);
    }
  }
  h.state.profile = null;
  assert.equal(await h.sessionAuth.getSessionUserProfile(), null);
  await assert.rejects(h.auth.getCurrentUserProfile(request('users/me')), h.auth.AuthorizationError);
});

test('session set/clear require same origin before any cookie mutation; active login retains secure cookie options', async () => {
  const h = await authHarness();
  for (const origin of ['https://evil.example', null]) {
    privateResponse(await h.sessionRoute.POST(request('auth/session', 'POST', undefined, origin)), 403);
    privateResponse(await h.sessionRoute.DELETE(request('auth/session', 'DELETE', undefined, origin)), 403);
  }
  assert.equal(h.state.cookieWrites.length, 0);
  assert.equal(h.state.sessionCreates, 0);
  privateResponse(await h.sessionRoute.POST(request('auth/session', 'POST')), 200);
  assert.equal(h.state.cookieWrites[0][0], 'ilab_shop_session');
  assert.equal(h.state.cookieWrites[0][2].httpOnly, true);
  assert.equal(h.state.cookieWrites[0][2].sameSite, 'lax');
  assert.equal(h.state.cookieWrites[0][2].path, '/shop');
  assert.equal(h.state.cookieWrites[0][2].secure, process.env.NODE_ENV === 'production');
  privateResponse(await h.sessionRoute.DELETE(request('auth/session', 'DELETE')), 200);
  assert.equal(h.state.cookieWrites.at(-1)[2].maxAge, 0);
});

test('session creation denies missing/pending/disabled profiles, clears stale cookie and handles revoked bearer safely', async () => {
  const h = await authHarness();
  for (const [current, code] of [[null, 'missing-profile'], [profile('customer', 'pending'), 'account-pending'], [profile('customer', 'disabled'), 'account-disabled']]) {
    h.state.profile = current;
    const response = await h.sessionRoute.POST(request('auth/session', 'POST'));
    privateResponse(response, 403);
    assert.equal((await response.json()).code, code);
    assert.equal(h.state.cookieWrites.at(-1)[2].maxAge, 0);
  }
  assert.equal(h.state.sessionCreates, 0);
  h.state.tokenFailure = new Error('private revoked token information');
  privateResponse(await h.sessionRoute.POST(request('auth/session', 'POST')), 401);
});

async function profileHarness() {
  const store = memoryFirestore({ 'users/victim': { ...profile(), uid: 'victim', name: 'Private Other Buyer' } });
  const profiles = await loadServerModule('../../lib/auth/userProfiles.js', {
    'server-only': {}, '../firebaseAdmin': { db: store.db, serverTimestamp: () => 'fixture-timestamp' },
  });
  const auth = await loadServerModule('../../lib/auth/serverAuth.js', {
    'server-only': {}, '../firebaseAdmin': { firebaseAuth: { verifyIdToken: async () => token } }, './userProfiles': profiles,
  });
  const route = await loadServerModule('../../app/api/users/me/route.js', {
    '../../../../lib/auth/userProfiles': profiles, '../../../../lib/auth/serverAuth': auth,
  });
  return { ...store, route };
}

test('real registration/profile service ignores forged identity, role and entitlement fields and preserves other customer', async () => {
  const h = await profileHarness();
  const forged = { name: 'Fixture Buyer', phone: '+37120000000', uid: 'victim', email: 'forged@example.invalid', role: 'admin', status: 'active', partnerStatus: 'approved', discountPercent: 100 };
  const response = await h.route.POST(request('users/me', 'POST', forged));
  privateResponse(response, 200);
  const saved = h.rows()[`users/${uid}`];
  assert.equal(saved.uid, uid); assert.equal(saved.email, token.email);
  assert.equal(saved.role, 'customer'); assert.equal(saved.partnerStatus, 'none'); assert.equal(saved.discountPercent, 0);
  const changed = await h.route.PATCH(request('users/me', 'PATCH', { ...forged, name: 'Edited Fixture', billingAddress: 'Fixture address' }));
  privateResponse(changed, 200);
  assert.equal(h.rows()[`users/${uid}`].name, 'Edited Fixture');
  assert.equal(h.rows()[`users/${uid}`].role, 'customer');
  assert.equal(h.rows()[`users/${uid}`].email, token.email);
  assert.equal(h.rows()['users/victim'].name, 'Private Other Buyer');
  privateResponse(await h.route.GET(request('users/me')), 200);
  privateResponse(await h.route.PATCH(request('users/me', 'PATCH', forged, 'https://evil.example')), 403);
});

test('profile responses are private on missing record, invalid body, disabled account and connectivity failure', async (t) => {
  t.mock.method(console, 'error', () => {});
  const h = await profileHarness();
  privateResponse(await h.route.GET(request('users/me')), 404);
  for (const body of [null, [], 'invalid']) privateResponse(await h.route.POST(request('users/me', 'POST', body)), 400);
  const invalidJson = new Request('https://ilab.lv/shop/api/users/me', { method: 'POST', headers: { Authorization: 'Bearer fixture-id-token' }, body: '{' });
  privateResponse(await h.route.POST(invalidJson), 400);
  const auth = await authHarness(profile('customer', 'disabled'));
  const failing = await loadServerModule('../../app/api/users/me/route.js', {
    '../../../../lib/auth/serverAuth': auth.auth,
    '../../../../lib/auth/userProfiles': { getUserProfile: async () => profile('customer', 'disabled'), ensureCustomerProfile: async () => { throw new Error('private connection detail'); }, updateCustomerProfileDefaults: async () => {} },
  });
  privateResponse(await failing.GET(request('users/me')), 403);
  const failure = await failing.POST(request('users/me', 'POST', {}));
  privateResponse(failure, 500);
  assert.doesNotMatch(JSON.stringify(await failure.json()), /private connection/);
});

test('real admin order route checks current session permission before reading orders and keeps denials/errors private', async (t) => {
  t.mock.method(console, 'error', () => {});
  const h = await authHarness();
  let reads = 0;
  const route = await loadServerModule('../../app/api/admin/orders/route.js', {
    '../../../../lib/auth/sessionAuth': h.sessionAuth,
    '../../../../lib/shopOrders': { getAdminOrders: async () => { reads++; return [{ id: 'fixture-order' }]; } },
  });
  h.state.cookie = null;
  privateResponse(await route.GET(), 401);
  h.state.cookie = 'fixture-session';
  for (const current of [profile(), profile('partner'), profile('staff', 'disabled'), profile('admin', 'pending')]) {
    h.state.profile = current;
    privateResponse(await route.GET(), 403);
  }
  assert.equal(reads, 0);
  h.state.profile = profile('staff');
  privateResponse(await route.GET(), 200);
  assert.equal(reads, 1);
  const failed = await loadServerModule('../../app/api/admin/orders/route.js', {
    '../../../../lib/auth/sessionAuth': h.sessionAuth,
    '../../../../lib/shopOrders': { getAdminOrders: async () => { throw new Error('private Firestore diagnostics'); } },
  });
  const response = await failed.GET();
  privateResponse(response, 500);
  assert.doesNotMatch(JSON.stringify(await response.json()), /Firestore/);
});

test('cart resolution retains guest access and returns private controlled input/connectivity errors', async (t) => {
  t.mock.method(console, 'error', () => {});
  let fault = null;
  const route = await loadServerModule('../../app/api/cart/resolve/route.js', {
    '../../../../lib/auth/sessionAuth': { getSessionUserProfile: async () => null },
    '../../../../lib/shopOrders': { resolveCart: async (items, currentProfile) => { assert.equal(currentProfile, undefined); if (fault) throw fault; return { items }; } },
  });
  privateResponse(await route.POST(request('cart/resolve', 'POST', { items: [] })), 200);
  fault = new Error('Invalid cart item.');
  privateResponse(await route.POST(request('cart/resolve', 'POST', { items: [] })), 400);
  fault = new Error('private Firestore connectivity detail');
  const response = await route.POST(request('cart/resolve', 'POST', { items: [] }));
  privateResponse(response, 500);
  assert.doesNotMatch(JSON.stringify(await response.json()), /Firestore/);
});

test('real admin mutation guard blocks customer order status changes/deletion before service calls', async () => {
  const h = await authHarness();
  const guard = await loadServerModule('../../lib/auth/adminMutationAuth.js', {
    'server-only': {}, 'next/server': { NextResponse: Response }, './sessionAuth': h.sessionAuth,
  });
  let writes = 0;
  const route = await loadServerModule('../../app/api/admin/orders/[id]/route.js', {
    '../../../../../lib/auth/adminMutationAuth': guard,
    '../../../../../lib/shopOrders': { updateOrder: async () => { writes++; return {}; }, deleteOrder: async () => { writes++; } },
  });
  const context = { params: Promise.resolve({ id: 'fixture-order' }) };
  const patch = (origin = 'https://ilab.lv') => request('admin/orders/fixture-order', 'PATCH', { orderStatus: 'completed', totalCents: 1 }, origin);
  privateResponse(await route.PATCH(patch(), context), 403);
  privateResponse(await route.DELETE(request('admin/orders/fixture-order', 'DELETE', { restoreStock: true }), context), 403);
  h.state.cookie = null;
  privateResponse(await route.PATCH(patch(), context), 401);
  h.state.cookie = 'fixture-session'; h.state.profile = profile('admin');
  privateResponse(await route.PATCH(patch('https://evil.example'), context), 403);
  assert.equal(writes, 0);
  privateResponse(await route.PATCH(patch(), context), 200);
  assert.equal(writes, 1);
});

test('real account order query scopes history and invoice reconciliation to requested secure-session UID', async () => {
  const fixtureOrders = [
    { id: 'owned-order', userId: uid, totalCents: 1000, items: [], createdAt: new Date('2026-11-03T12:00:00Z') },
    { id: 'other-order', userId: 'victim', totalCents: 2000, items: [], createdAt: new Date('2026-11-03T12:00:00Z') },
  ];
  let whereArguments;
  const db = {
    doc: (key) => ({ key }),
    collection: (collection) => ({
      doc: (id) => ({ key: `${collection}/${id}` }),
      where: (...args) => {
        assert.equal(collection, 'shopOrders');
        whereArguments = args;
        return { get: async () => ({ docs: fixtureOrders.filter((row) => row[args[0]] === args[2]).map((row) => ({ id: row.id, data: () => row })) }) };
      },
    }),
    getAll: async (...references) => {
      assert.deepEqual(references.map((reference) => reference.key), ['shopInvoices/owned-order']);
      return references.map((reference) => ({ exists: true, id: reference.key.split('/').at(-1), data: () => ({ invoiceNumber: 'FIXTURE-1', sequenceYear: 2026, sequenceNumber: 1 }) }));
    },
  };
  const service = await loadServerModule('../../lib/shopOrders.js', {
    'server-only': {}, './firebaseAdmin': { db, firebaseStorageBucket: {}, serverTimestamp: () => 'fixture-time' },
    './invoices/invoiceService': { generateInvoicePdfSafely: async () => {} },
  });
  const history = await service.getUserOrders(uid);
  assert.deepEqual(whereArguments, ['userId', '==', uid]);
  assert.deepEqual(history.map((order) => order.id), ['owned-order']);
  assert.equal(history[0].invoice.number, 'FIXTURE-1');
});
