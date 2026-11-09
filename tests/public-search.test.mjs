import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildSearchIndex, normalizeSearchText, searchModels, searchProducts } from '../lib/searchCatalog.mjs';

const index = buildSearchIndex({
  devices: [
    { id: 'apple', name: 'Apple', slug: 'iphone', type: 'brand', parentId: null, order: 1 },
    { id: 'iphone', name: 'iPhone', slug: 'iphone-series', type: 'series', parentId: 'apple', order: 1 },
    { id: 'iphone-15-pro', name: 'iPhone 15 Pro', slug: 'iphone-15-pro', type: 'model', parentId: 'iphone', order: 1 },
    { id: 'iphone-15-pro-max', name: 'iPhone 15 Pro Max', slug: 'iphone-15-pro-max', type: 'model', parentId: 'iphone', order: 2 },
    { id: 'samsung', name: 'Samsung', slug: 'samsung', type: 'brand', parentId: null, order: 2 },
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

test('model suggestions use valid hierarchy routes and rank exact names before prefixes', () => {
  const models = searchModels(index, 'iphone 15 pro');
  assert.deepEqual(models.map((item) => item.id), ['iphone-15-pro', 'iphone-15-pro-max']);
  assert.equal(models[0].href, '/iphone/iphone-15-pro');
  assert.equal(models[0].seriesName, 'iPhone');
  assert.equal(models[0].brandName, 'Apple');
});

test('model suggestions tolerate an extra product term without becoming product filters', () => {
  assert.deepEqual(searchModels(index, 'iphone 15 battery').map((item) => item.id), ['iphone-15-pro', 'iphone-15-pro-max']);
  assert.deepEqual(searchProducts(index, { query: 'iphone 15 screens' }).map((item) => item.id), ['name-match', 'exact-sku']);
});

test('empty query returns no model suggestions', () => {
  assert.deepEqual(searchModels(index, ''), []);
});

test('structured filters combine with text and product type', () => {
  assert.deepEqual(searchProducts(index, { query: 'display', brandId: 'apple', modelId: 'iphone-15-pro', productTypeId: 'screens' }).map((item) => item.id), ['name-match', 'exact-sku']);
  assert.deepEqual(searchProducts(index, { brandId: 'samsung' }).map((item) => item.id), ['other-brand']);
});

test('public Search UI presents independently ranked Models and Products results', async () => {
  const source = await readFile(new URL('../app/components/shop/SearchPanel.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /<select|brandId|seriesId|modelId|productTypeId/);
  assert.match(source, /aria-labelledby="model-results-title"/);
  assert.match(source, /aria-labelledby="product-results-title"/);
  assert.match(source, /searchModels\(index, query, 8\)/);
  assert.match(source, /searchProducts\(index, \{ query \}\)/);
  assert.match(source, /href=\{model\.href\}/);
  assert.match(source, /href=\{`\/product\/\$\{product\.slug\}`\}/);
  assert.match(source, /visibleProducts\.map/);
  assert.match(source, />Show more</);
  assert.match(source, /Matching parts will appear here as you type\./);
});

test('Search opens focused, clears in place, and delegates lifecycle to the shared modal', async () => {
  const [source, panel] = await Promise.all([
    readFile(new URL('../app/components/shop/SearchPanel.js', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/shop/ShopFullscreenPanel.js', import.meta.url), 'utf8'),
  ]);
  assert.match(source, /variant="search"/);
  assert.match(source, /initialFocusRef=\{inputRef\}/);
  assert.match(source, /changeQuery\(''\); inputRef\.current\?\.focus\(\)/);
  assert.match(source, /aria-label="Clear search"/);
  assert.match(panel, /<ShopModal/);
  // Keyboard containment and focus restoration are covered by the real-browser fixture.
});

test('Search layout uses the immersive dark surface and compact responsive model/product columns', async () => {
  const [panel, css, shellCss] = await Promise.all([
    readFile(new URL('../app/components/shop/SearchPanel.js', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/shop/SearchPanel.module.css', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/shop/ShopFullscreenPanel.module.css', import.meta.url), 'utf8'),
  ]);
  assert.match(panel, /<div className=\{styles\.searchLayout\}>/);
  assert.match(css, /minmax\(0, 3fr\) minmax\(0, 9fr\)/);
  assert.match(css, /grid-template-columns: 72px minmax\(0, 1fr\) auto/);
  assert.match(css, /@media \(max-width: 767px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(shellCss, /\.searchPanel \{[^}]*--color-dark-surface-1/s);
});
