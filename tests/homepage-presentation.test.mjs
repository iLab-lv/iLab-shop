import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogPageState, productTypeThumbnail, resolveHomepageBrands, resolveProductTypeSelection } from '../lib/homepagePresentation.mjs';

const brands = [
  { id: 'b-iphone', name: 'iPhone', slug: 'actual-iphone' },
  { id: 'b-ipad', name: 'iPad', slug: 'actual-ipad' },
  { id: 'b-mac', name: 'MacBook', slug: 'actual-macbook' },
  { id: 'b-watch', name: 'Apple Watch', slug: 'actual-watch' },
  { id: 'b-samsung', name: 'Samsung', slug: 'actual-samsung' },
  { id: 'b-xiaomi', name: 'Xiaomi', slug: 'actual-xiaomi' },
  { id: 'b-huawei', name: 'Huawei', slug: 'actual-huawei' },
];

test('Apple presentation group resolves active records and their actual slugs', () => { const result = resolveHomepageBrands(brands); assert.deepEqual(result.apple.map(({ slug }) => slug), ['actual-iphone', 'actual-ipad', 'actual-macbook', 'actual-watch']); });
test('missing or unusable Brand records do not create broken homepage links', () => { const result = resolveHomepageBrands(brands.filter((brand) => !['iPad', 'Apple Watch'].includes(brand.name)).concat({ id: 'bad', name: 'Apple Watch', slug: '' })); assert.deepEqual(result.apple.map(({ name }) => name), ['iPhone', 'MacBook']); });
test('secondary Brand cards resolve only real Samsung, Xiaomi and Huawei records', () => { assert.deepEqual(resolveHomepageBrands(brands).secondary.map(({ slug }) => slug), ['actual-samsung', 'actual-xiaomi', 'actual-huawei']); });
test('Product Type URL selection accepts active IDs and rejects invalid values', () => { const types = [{ id: 'display-id', name: 'Displays' }, { id: 'battery-id', name: 'Batteries' }]; assert.equal(resolveProductTypeSelection('battery-id', types), 'battery-id'); assert.equal(resolveProductTypeSelection('missing', types), ''); assert.equal(resolveProductTypeSelection(['battery-id'], types), ''); });
test('Product Type thumbnails map known names and safely omit unknown types', () => { assert.equal(productTypeThumbnail({ id: 'display-id', name: 'Displays' }), '/shop/images/part_type_thumbnails/displays.webp'); assert.equal(productTypeThumbnail({ id: 'new-type', name: 'Unknown Part' }), null); });
test('filter changes replace the Product set and reset Load More pagination state', () => { const filtered = catalogPageState({ products: [{ id: 'battery' }], nextCursor: 'battery-cursor', hasMore: false }, 'battery-id'); assert.deepEqual(filtered, { products: [{ id: 'battery' }], cursor: 'battery-cursor', hasMore: false, activeType: 'battery-id' }); const cleared = catalogPageState({ products: [{ id: 'all-first' }], nextCursor: 'all-cursor', hasMore: true }, ''); assert.deepEqual(cleared, { products: [{ id: 'all-first' }], cursor: 'all-cursor', hasMore: true, activeType: '' }); });
