import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderWithProfileDefaults } from '../lib/orderSubmission.mjs';

const session = { token: { uid: 'user-1' } };
const order = { id: 'order-1', customer: { name: 'Buyer', email: 'order@example.com', phone: '123', company: null, billingAddress: '' } };

test('Profile defaults save only after successful Order creation and use the Order snapshot', async () => {
  const calls = [];
  const result = await createOrderWithProfileDefaults({ saveToProfile: true }, session, {
    createOrder: async () => { calls.push('order'); return order; },
    saveProfileDefaults: async (uid, customer) => calls.push(['profile', uid, customer]),
  });
  assert.deepEqual(calls, ['order', ['profile', 'user-1', order.customer]]);
  assert.equal(result.profileSaved, true);
  assert.equal(result.order, order);
});

test('Order failure never saves Profile defaults', async () => {
  let profileSaveCalls = 0;
  await assert.rejects(createOrderWithProfileDefaults({ saveToProfile: true }, session, {
    createOrder: async () => { throw new Error('order failed'); },
    saveProfileDefaults: async () => { profileSaveCalls += 1; },
  }), /order failed/);
  assert.equal(profileSaveCalls, 0);
});

test('Profile save failure is non-fatal after Order success', async () => {
  const result = await createOrderWithProfileDefaults({ saveToProfile: true }, session, {
    createOrder: async () => order,
    saveProfileDefaults: async () => { throw new Error('profile unavailable'); },
  });
  assert.equal(result.order, order);
  assert.equal(result.profileSaved, false);
  assert.match(result.profileSaveError.message, /profile unavailable/);
});

test('unchecked save-to-profile leaves Profile untouched', async () => {
  let profileSaveCalls = 0;
  const result = await createOrderWithProfileDefaults({ saveToProfile: false }, session, {
    createOrder: async () => order,
    saveProfileDefaults: async () => { profileSaveCalls += 1; },
  });
  assert.equal(result.order, order);
  assert.equal(result.profileSaved, null);
  assert.equal(profileSaveCalls, 0);
});
