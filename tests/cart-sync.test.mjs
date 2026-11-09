import test from 'node:test';
import assert from 'node:assert/strict';
import { CART_STORAGE_KEY } from '../lib/commerce.mjs';
import { applyAccountCartOperation } from '../lib/accountCartModel.mjs';
import { createCartSync } from '../lib/cartSync.mjs';

const opId = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const accountKey = (uid) => `${CART_STORAGE_KEY}:account:${uid}`;

function harness({ guest = [], accounts = {}, getAccount, postOperation } = {}) {
  const values = new Map();
  if (guest.length) values.set(CART_STORAGE_KEY, JSON.stringify(guest));
  for (const [uid, items] of Object.entries(accounts)) values.set(accountKey(uid), JSON.stringify(items));
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const server = new Map();
  const writes = [];
  for (const [uid, items] of Object.entries(accounts)) server.set(uid, { items, revision: 0, appliedOperationIds: [] });
  const sync = createCartSync({
    storage,
    getAccount: getAccount ?? (async (uid) => ({ userId: uid, items: server.get(uid)?.items ?? [] })),
    postOperation: postOperation ?? (async (uid, operation) => {
      writes.push({ uid, operation: structuredClone(operation) });
      const next = applyAccountCartOperation(server.get(uid) ?? null, operation);
      const { repeated: _repeated, ...state } = next;
      server.set(uid, state);
      return { userId: uid, items: state.items };
    }),
    onChange: () => {},
    uuid: (() => { let n = 100; return () => opId(n++); })(),
  });
  return { sync, storage, values, server, writes };
}

test('guest cart survives hydration and is associated after sign in', async () => {
  const guest = [{ productId: 'guest-a', quantity: 2 }];
  const { sync, storage, writes } = harness({ guest });
  sync.hydrate();
  assert.deepEqual(sync.getSnapshot().items, guest);
  assert.equal(await sync.associate('user-a'), true);
  assert.deepEqual(sync.getSnapshot().items, guest);
  assert.deepEqual(writes[0].operation.items, guest);
  assert.deepEqual(JSON.parse(storage.getItem(CART_STORAGE_KEY)), []);
});

test('sign in merges overlapping quantities by max and keeps new stable product IDs', async () => {
  const guest = [{ productId: 'same', quantity: 4 }, { productId: 'guest-only', quantity: 2 }];
  const account = [{ productId: 'same', quantity: 7 }, { productId: 'account-only', quantity: 1 }];
  const { sync, writes } = harness({ guest, accounts: { 'user-a': account } });
  sync.hydrate();
  await sync.associate('user-a');
  assert.deepEqual(sync.getSnapshot().items, [
    { productId: 'same', quantity: 7 },
    { productId: 'account-only', quantity: 1 },
    { productId: 'guest-only', quantity: 2 },
  ]);
  assert.deepEqual(writes[0].operation.items, guest);
});

test('concurrent registration/sign-in association for one UID shares one account read and merge', async () => {
  let resolveGet;
  let reads = 0;
  const { sync, writes } = harness({
    guest: [{ productId: 'p', quantity: 1 }],
    getAccount: (uid) => { reads += 1; return new Promise((resolve) => { resolveGet = () => resolve({ userId: uid, items: [] }); }); },
  });
  sync.hydrate();
  const first = sync.associate('user-a');
  const concurrent = sync.associate('user-a');
  await Promise.resolve();
  resolveGet();
  assert.equal(await first, true);
  assert.equal(await concurrent, true);
  assert.equal(reads, 1);
  assert.equal(writes.length, 1);
});

test('repeated sign in does not duplicate guest items after the first merge', async () => {
  const guest = [{ productId: 'p', quantity: 3 }];
  const { sync, writes } = harness({ guest });
  sync.hydrate();
  await sync.associate('user-a');
  await sync.associate('user-a', { refresh: true });
  assert.equal(writes.length, 1);
  assert.deepEqual(sync.getSnapshot().items, guest);
});

test('account mirror remains separate from guest cart through sign out and account switch', async () => {
  const { sync, storage } = harness({ guest: [{ productId: 'guest', quantity: 1 }] });
  sync.hydrate();
  await sync.associate('user-a');
  assert.deepEqual(JSON.parse(storage.getItem(CART_STORAGE_KEY)), []);
  assert.deepEqual(JSON.parse(storage.getItem(accountKey('user-a'))), [{ productId: 'guest', quantity: 1 }]);
  sync.signOut();
  assert.equal(sync.getSnapshot().userId, null);
  assert.deepEqual(sync.getSnapshot().items, []);
  await sync.associate('user-b');
  assert.equal(sync.getSnapshot().userId, 'user-b');
  assert.deepEqual(sync.getSnapshot().items, []);
  sync.signOut();
  assert.deepEqual(JSON.parse(storage.getItem(accountKey('user-a'))), [{ productId: 'guest', quantity: 1 }]);
});

test('refresh replays an acknowledged but unconfirmed outbox write with the same UUID', async () => {
  const seen = [];
  const server = new Map();
  let loseResponse = false;
  const postOperation = async (uid, operation) => {
    seen.push(operation.operationId);
    const next = applyAccountCartOperation(server.get(uid) ?? null, operation);
    const { repeated: _repeated, ...state } = next;
    server.set(uid, state);
    if (loseResponse) { loseResponse = false; throw new Error('response lost after server applied operation'); }
    return { userId: uid, items: state.items };
  };
  const { sync, storage } = harness({
    getAccount: async (uid) => ({ userId: uid, items: server.get(uid)?.items ?? [] }),
    postOperation,
  });
  sync.hydrate();
  await sync.associate('user-a');
  loseResponse = true;
  assert.equal(await sync.mutate('add', { productId: 'p', quantity: 2 }), false);
  const pendingBefore = JSON.parse(storage.getItem(`${accountKey('user-a')}:pending`));
  assert.equal(pendingBefore.length, 1);
  const refreshed = createCartSync({
    storage,
    getAccount: async (uid) => ({ userId: uid, items: server.get(uid)?.items ?? [] }),
    postOperation,
    onChange: () => {},
    uuid: () => opId(999),
  });
  refreshed.hydrate();
  await refreshed.associate('user-a');
  const pendingAfter = JSON.parse(storage.getItem(`${accountKey('user-a')}:pending`));
  assert.deepEqual(pendingAfter, []);
  assert.equal(seen.length, 2);
  assert.equal(seen[0], seen[1]);
  assert.deepEqual(refreshed.getSnapshot().items, [{ productId: 'p', quantity: 2 }]);
});

test('account response with a different UID is rejected and guest cart stays available', async () => {
  const guest = [{ productId: 'p', quantity: 1 }];
  const { sync } = harness({ guest, getAccount: async () => ({ userId: 'somebody-else', items: [] }) });
  sync.hydrate();
  assert.equal(await sync.associate('user-a'), false);
  assert.equal(sync.getSnapshot().userId, 'user-a');
  assert.deepEqual(sync.getSnapshot().items, guest);
  assert.equal(sync.getSnapshot().status, 'error');
});

test('failed account sync keeps guest items and checkout can observe that sync is not ready', async () => {
  const guest = [{ productId: 'p', quantity: 2 }];
  const { sync } = harness({ guest, postOperation: async () => { throw new Error('offline'); } });
  sync.hydrate();
  assert.equal(await sync.associate('user-a'), false);
  assert.deepEqual(sync.getSnapshot().items, guest);
  assert.equal(sync.getSnapshot().status, 'error');
});

test('late account response after sign out cannot replace the guest UI state', async () => {
  let resolveGet;
  const guest = [{ productId: 'guest', quantity: 1 }];
  const { sync, storage, writes } = harness({
    guest,
    getAccount: (uid) => new Promise((resolve) => { resolveGet = () => resolve({ userId: uid, items: [{ productId: 'account', quantity: 3 }] }); }),
  });
  sync.hydrate();
  const pending = sync.associate('user-a');
  await Promise.resolve();
  sync.signOut();
  resolveGet();
  await pending;
  assert.equal(sync.getSnapshot().userId, null);
  assert.deepEqual(sync.getSnapshot().items, guest);
  assert.equal(sync.getSnapshot().status, 'ready');
  assert.deepEqual(writes, []);
  assert.deepEqual(JSON.parse(storage.getItem(CART_STORAGE_KEY)), guest);
});

test('guest retry clears a rejected local edit without losing the existing basket', async () => {
  const guest = [{ productId: 'p', quantity: 99 }];
  const { sync } = harness({ guest });
  sync.hydrate();
  assert.equal(await sync.mutate('add', { productId: 'p', quantity: 1 }), false);
  assert.ok(sync.getSnapshot().error);
  await sync.retry();
  assert.equal(sync.getSnapshot().error, '');
  assert.deepEqual(sync.getSnapshot().items, guest);
});
