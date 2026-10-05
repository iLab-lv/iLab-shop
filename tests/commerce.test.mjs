import test from 'node:test';
import assert from 'node:assert/strict';
import { applicableSellingPrice, cartTotal, normalizeCartItems, resolveProductLine } from '../lib/commerce.mjs';

test('retail users require a retail price and null is not zero', () => {
  assert.deepEqual(applicableSellingPrice({ retailPriceCents: null, wholesalePriceCents: 1500 }, false), { unitPriceCents: null, priceSource: null });
});
test('wholesale users prefer wholesale and fall back to retail', () => {
  assert.deepEqual(applicableSellingPrice({ retailPriceCents: 2000, wholesalePriceCents: 1500 }, true), { unitPriceCents: 1500, priceSource: 'wholesale' });
  assert.deepEqual(applicableSellingPrice({ retailPriceCents: 2000, wholesalePriceCents: null }, true), { unitPriceCents: 2000, priceSource: 'retail' });
});
test('cart validation accepts positive integers and merges duplicate ids', () => {
  assert.deepEqual(normalizeCartItems([{ productId: 'a', quantity: 1 }, { productId: 'a', quantity: 2 }]), [{ productId: 'a', quantity: 3 }]);
  assert.throws(() => normalizeCartItems([{ productId: 'a', quantity: 0 }]));
  assert.throws(() => normalizeCartItems([{ productId: 'a', quantity: 1.5 }]));
});
test('resolution detects stock and calculates final-price totals', () => {
  const line = resolveProductLine({ status: 'active', stockQty: 5, retailPriceCents: 2000, wholesalePriceCents: 1500 }, 2, true);
  assert.equal(line.purchasable, true); assert.equal(line.lineTotalCents, 3000);
  assert.equal(cartTotal([line]), 3000);
  assert.equal(resolveProductLine({ status: 'active', stockQty: 1, retailPriceCents: 2000 }, 2).unavailableReason, 'insufficient_stock');
  assert.equal(resolveProductLine({ status: 'active', stockQty: 5, retailPriceCents: null }, 1).unavailableReason, 'missing_price');
});
