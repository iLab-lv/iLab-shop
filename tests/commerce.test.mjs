import test from 'node:test';
import assert from 'node:assert/strict';
import { applicableSellingPrice, cartTotal, grossToNetCents, isValidSellingPrice, normalizeCartItems, resolveProductLine, splitVatInclusivePrice } from '../lib/commerce.mjs';

test('retail users require a retail price and null is not zero', () => {
  assert.deepEqual(applicableSellingPrice({ retailPriceCents: null, wholesalePriceCents: 1500 }, false), { unitPriceCents: null, priceSource: null });
});
test('wholesale users prefer wholesale and fall back to retail', () => {
  assert.deepEqual(applicableSellingPrice({ retailPriceCents: 2000, wholesalePriceCents: 1500 }, true), { unitPriceCents: 1500, priceSource: 'wholesale' });
  assert.deepEqual(applicableSellingPrice({ retailPriceCents: 2000, wholesalePriceCents: null }, true), { unitPriceCents: 2000, priceSource: 'retail' });
});

test('selling prices require positive safe integer cents and invalid wholesale falls back to retail', () => {
  for (const value of [undefined, null, 0, -1, 1.5, '2000', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(isValidSellingPrice(value), false, `invalid selling price: ${value}`);
    assert.deepEqual(applicableSellingPrice({ retailPriceCents: value }), { unitPriceCents: null, priceSource: null });
    assert.deepEqual(applicableSellingPrice({ retailPriceCents: 2000, wholesalePriceCents: value }, true), { unitPriceCents: 2000, priceSource: 'retail' });
  }
  assert.equal(isValidSellingPrice(1), true);
  assert.equal(isValidSellingPrice(Number.MAX_SAFE_INTEGER), true);
});

test('a valid retail price is required for every buyer even when wholesale exists', () => {
  for (const retailPriceCents of [undefined, null, 0, -1, 1.5, '2000', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    for (const canUseWholesale of [false, true]) {
      for (const stockQty of [0, 5]) {
        const line = resolveProductLine({ status: 'active', retailPriceCents, wholesalePriceCents: 1500, stockQty }, 1, canUseWholesale);
        assert.equal(line.purchasable, false);
        assert.equal(line.unavailableReason, 'missing_price');
      }
    }
  }
  assert.equal(resolveProductLine({ status: 'active', retailPriceCents: 2000, wholesalePriceCents: 1500, stockQty: 1 }, 1, true).purchasable, true);
});

test('inactive and missing products remain unavailable regardless of prices and stock', () => {
  assert.equal(resolveProductLine(null, 1, true).unavailableReason, 'missing_product');
  assert.equal(resolveProductLine({ status: 'inactive', retailPriceCents: 2000, wholesalePriceCents: 1500, stockQty: 2 }, 1, true).unavailableReason, 'inactive');
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
  const outOfStock = resolveProductLine({ status: 'active', stockQty: 0, retailPriceCents: 2000 }, 1);
  assert.equal(outOfStock.purchasable, false);
  assert.equal(outOfStock.unavailableReason, 'out_of_stock');
  assert.equal(resolveProductLine({ status: 'active', stockQty: 5, retailPriceCents: null }, 1).unavailableReason, 'missing_price');
});
test('VAT-inclusive prices split into integer net and VAT cents', () => {
  assert.deepEqual(splitVatInclusivePrice(12100, 21), { grossCents: 12100, netCents: 10000, vatCents: 2100 });
  assert.deepEqual(splitVatInclusivePrice(12000, 20), { grossCents: 12000, netCents: 10000, vatCents: 2000 });
  assert.equal(grossToNetCents(12100, 20), 10083);
  assert.deepEqual(splitVatInclusivePrice(101, 21), { grossCents: 101, netCents: 83, vatCents: 18 });
  assert.equal(splitVatInclusivePrice(null, 21), null);
  assert.equal(splitVatInclusivePrice(100, -1), null);
});
