import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AccountCartInputError,
  applyAccountCartOperation,
  normalizeAccountCartState,
  subtractPurchasedCartItems,
} from '../lib/accountCartModel.mjs';

const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

test('account cart merge unions stable product IDs and keeps the larger quantity for matches', () => {
  const result = applyAccountCartOperation(
    { items: [{ productId: 'sku-a', quantity: 2 }, { productId: 'sku-b', quantity: 1 }], revision: 7 },
    { type: 'merge', operationId: id(1), items: [{ productId: 'sku-a', quantity: 5 }, { productId: 'sku-c', quantity: 3 }] },
  );
  assert.deepEqual(result.items, [
    { productId: 'sku-a', quantity: 5 },
    { productId: 'sku-b', quantity: 1 },
    { productId: 'sku-c', quantity: 3 },
  ]);
  assert.equal(result.revision, 8);
});

test('an operation UUID replay is idempotent and does not advance revision', () => {
  const first = applyAccountCartOperation(null, { type: 'add', operationId: id(2), productId: 'p', quantity: 2 });
  const replay = applyAccountCartOperation(first, { type: 'add', operationId: id(2), productId: 'p', quantity: 2 });
  assert.deepEqual(replay.items, first.items);
  assert.equal(replay.revision, first.revision);
  assert.deepEqual(replay.appliedOperationIds, first.appliedOperationIds);
  assert.equal(replay.repeated, true);
});

test('add, set, remove and clear update cart lines and revision deterministically', () => {
  let state = applyAccountCartOperation(null, { type: 'add', operationId: id(3), productId: 'p', quantity: 2 });
  state = applyAccountCartOperation(state, { type: 'add', operationId: id(4), productId: 'p', quantity: 3 });
  assert.deepEqual(state.items, [{ productId: 'p', quantity: 5 }]);
  state = applyAccountCartOperation(state, { type: 'set', operationId: id(5), productId: 'p', quantity: 4 });
  assert.deepEqual(state.items, [{ productId: 'p', quantity: 4 }]);
  state = applyAccountCartOperation(state, { type: 'remove', operationId: id(6), productId: 'p' });
  assert.deepEqual(state.items, []);
  state = applyAccountCartOperation(state, { type: 'add', operationId: id(7), productId: 'q', quantity: 1 });
  state = applyAccountCartOperation(state, { type: 'clear', operationId: id(8) });
  assert.deepEqual(state.items, []);
  assert.equal(state.revision, 6);
});

test('invalid operations and line or cart limits fail without mutating their input', () => {
  const original = { items: [{ productId: 'p', quantity: 99 }], revision: 4, appliedOperationIds: [id(9)] };
  const before = structuredClone(original);
  assert.throws(() => applyAccountCartOperation(original, { type: 'add', operationId: id(10), productId: 'p', quantity: 1 }), AccountCartInputError);
  assert.throws(() => applyAccountCartOperation(original, { type: 'set', operationId: id(10), productId: 'p', quantity: 100 }), AccountCartInputError);
  assert.throws(() => applyAccountCartOperation(original, { type: 'merge', operationId: id(10), items: Array.from({ length: 101 }, (_, i) => ({ productId: `p${i}`, quantity: 1 })) }), AccountCartInputError);
  assert.throws(() => applyAccountCartOperation(original, { type: 'bogus', operationId: id(10) }), AccountCartInputError);
  assert.deepEqual(original, before);
  assert.deepEqual(normalizeAccountCartState(original), before);
});

test('subtracting purchased quantities preserves later additions and unrelated lines', () => {
  const currentCart = [
    { productId: 'p', quantity: 5 },
    { productId: 'q', quantity: 2 },
  ];
  const before = structuredClone(currentCart);
  assert.deepEqual(subtractPurchasedCartItems(currentCart, [{ productId: 'p', quantity: 2 }, { productId: 'q', quantity: 2 }]), [
    { productId: 'p', quantity: 3 },
  ]);
  assert.deepEqual(currentCart, before);
});

test('account cart rejects malformed operation UUIDs', () => {
  assert.throws(() => applyAccountCartOperation(null, { type: 'clear', operationId: 'repeat-me' }), AccountCartInputError);
});
