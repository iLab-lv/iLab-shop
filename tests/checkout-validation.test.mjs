import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCheckoutInput } from '../lib/checkoutValidation.mjs';

const payload = (overrides = {}) => ({
  customer: {
    name: ' Askold ',
    email: 'invoice@example.com',
    phone: ' +371 20000000 ',
    company: { name: ' Example SIA ', registrationNumber: ' 4000 ', vatNumber: '' },
    billingAddress: ' Brīvības iela 1, Rīga ',
  },
  saveToProfile: true,
  fulfillmentMethod: 'pickup',
  pickupLocationId: 'store-1',
  paymentMethod: 'bank_transfer',
  items: [{ productId: 'product-1', quantity: 2 }],
  expectedTotalCents: 1000,
  requestId: '123e4567-e89b-42d3-a456-426614174000',
  ...overrides,
});

test('checkout validates editable order details and keeps billing address in the Order snapshot', () => {
  const checkout = validateCheckoutInput(payload());
  assert.deepEqual(checkout.customer, {
    name: 'Askold',
    email: 'invoice@example.com',
    phone: '+371 20000000',
    company: { name: 'Example SIA', registrationNumber: '4000', vatNumber: '' },
    billingAddress: 'Brīvības iela 1, Rīga',
  });
  assert.equal(checkout.saveToProfile, true);
});

test('checkout permits company-free Orders and an explicit choice not to save Profile defaults', () => {
  const checkout = validateCheckoutInput(payload({
    customer: { name: 'Private Buyer', email: 'order@example.com', phone: '123', company: {}, billingAddress: '' },
    saveToProfile: false,
  }));
  assert.equal(checkout.customer.company, null);
  assert.equal(checkout.saveToProfile, false);
});

test('checkout requires an explicit boolean saveToProfile choice and rejects invalid profile fields', () => {
  assert.throws(() => validateCheckoutInput(payload({ saveToProfile: 'true' })), { message: 'invalid_checkout' });
  assert.throws(() => validateCheckoutInput(payload({ customer: { ...payload().customer, billingAddress: 'x'.repeat(501) } })), { message: 'invalid_checkout' });
});

test('checkout validates method-specific delivery details', () => {
  assert.equal(validateCheckoutInput(payload({ fulfillmentMethod: 'courier', pickupLocationId: null, delivery: { address: '1 Main Street' } })).delivery.address, '1 Main Street');
  assert.deepEqual(validateCheckoutInput(payload({ fulfillmentMethod: 'omniva_parcel_machine', pickupLocationId: null, delivery: { city: 'Riga', address: 'Origo parcel terminal' } })).delivery, { city: 'Riga', address: 'Origo parcel terminal' });
  assert.throws(() => validateCheckoutInput(payload({ fulfillmentMethod: 'courier', pickupLocationId: null, delivery: {} })), { message: 'invalid_checkout' });
  assert.throws(() => validateCheckoutInput(payload({ fulfillmentMethod: 'omniva_parcel_machine', pickupLocationId: null, delivery: { city: '', address: 'Terminal' } })), { message: 'invalid_checkout' });
});
