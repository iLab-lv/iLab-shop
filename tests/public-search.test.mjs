import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchIndex, normalizeSearchText, searchProducts } from '../lib/searchCatalog.mjs';

const index = buildSearchIndex({
  devices: [
    { id: 'apple', name: 'Apple', type: 'brand', parentId: null, order: 1 },
    { id: 'iphone', name: 'iPhone', type: 'series', parentId: 'apple', order: 1 },
    { id: 'iphone-15-pro', name: 'iPhone 15 Pro', type: 'model', parentId: 'iphone', order: 1 },
    { id: 'samsung', name: 'Samsung', type: 'brand', parentId: null, order: 2 },
  ],
  productTypes: [{ id: 'screens', name: 'Screens', slug: 'screens', order: 1 }],
  products: [
    { id: 'exact-sku', sku: 1234, slug: 'exact-sku', name: 'Premium display', productTypeId: 'screens', brandIds: ['apple'], seriesIds: ['iphone'], modelIds: ['iphone-15-pro'], primaryImagePath: null, retailPriceCents: 1000, stockQty: 2 },
    { id: 'name-match', sku: 9912, slug: 'name-match', name: '1234 display assembly', productTypeId: 'screens', brandIds: ['apple'], seriesIds: ['iphone'], modelIds: ['iphone-15-pro'], primaryImagePath: null, retailPriceCents: 2000, stockQty: 1 },
    { id: 'other-brand', sku: 7777, slug: 'other-brand', name: 'Samsung display', productTypeId: 'screens', brandIds: ['samsung'], seriesIds: [], modelIds: [], primaryImagePath: null, retailPriceCents: 3000, stockQty: 0 },
  ],
});

test('search normalization is case and diacritic insensitive', () => {
  assert.equal(normalizeSearchText('  ĀBOLU   Ekrāns '), 'abolu ekrans');
});

test('all query words must match across indexed catalog fields', () => {
  assert.deepEqual(searchProducts(index, { query: 'iphone premium' }).map((item) => item.id), ['exact-sku']);
});

test('an exact SKU outranks a name match', () => {
  assert.deepEqual(searchProducts(index, { query: '1234' }).map((item) => item.id), ['exact-sku', 'name-match']);
});

test('structured filters combine with text and product type', () => {
  assert.deepEqual(searchProducts(index, { query: 'display', brandId: 'apple', modelId: 'iphone-15-pro', productTypeId: 'screens' }).map((item) => item.id), ['name-match', 'exact-sku']);
  assert.deepEqual(searchProducts(index, { brandId: 'samsung' }).map((item) => item.id), ['other-brand']);
});
