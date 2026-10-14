import test from 'node:test';
import assert from 'node:assert/strict';
import { fulfillmentFeeCents, orderDeliveryDescription, orderFulfillmentLabel, orderItemsSubtotalCents } from '../lib/fulfillment.mjs';

test('fulfillment fees map only to their configured delivery method', () => {
  const prices = { courierPriceCents: 450, omnivaParcelMachinePriceCents: 275 };
  assert.equal(fulfillmentFeeCents('pickup', prices), 0);
  assert.equal(fulfillmentFeeCents('courier', prices), 450);
  assert.equal(fulfillmentFeeCents('omniva_parcel_machine', prices), 275);
  assert.throws(() => fulfillmentFeeCents('unknown', prices), /invalid_checkout/);
});

test('fulfillment order labels and detail strings remain safe for delivery and legacy orders', () => {
  assert.equal(orderFulfillmentLabel({ fulfillmentMethod: 'courier' }), 'Courier delivery');
  assert.equal(orderDeliveryDescription({ fulfillmentMethod: 'courier', delivery: { address: 'Riga, Main Street 1' } }), 'Riga, Main Street 1');
  assert.equal(orderDeliveryDescription({ fulfillmentMethod: 'omniva_parcel_machine', delivery: { city: 'Riga', address: 'Origo' } }), 'Riga, Origo');
  assert.equal(orderDeliveryDescription({ pickupLocation: { name: 'Domina', address: 'Riga' } }), 'Domina, Riga');
  assert.equal(orderItemsSubtotalCents({ items: [{ lineTotalCents: 900 }] }), 900);
});
