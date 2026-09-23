import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  deriveAdminProducts,
  getAdminDeviceFilterOptions,
  getAdminProductsPage,
} from '../lib/adminProductCatalog.mjs';

const products = [
  { id: 'iphone_se_camera', slug: 'iphone-se-camera', name: 'Camera Pro', description: 'Rear camera', productTypeId: 'cameras', priceCents: 300, brandIds: ['iphone'], seriesIds: ['iphone_se'], modelIds: ['iphone_se_2022'] },
  { id: 'battery_12', slug: 'battery-for-iphone-12', name: 'iPhone 12 Battery', description: 'Replacement battery', productTypeId: 'batteries', priceCents: 100, brandIds: ['iphone'], seriesIds: ['iphone_12'], modelIds: ['iphone_12'] },
  { id: 'port_12', slug: 'charging-port-iphone-12', name: 'Charging Port', description: 'For Apple phone', productTypeId: 'connectors', priceCents: 200, brandIds: ['iphone'], seriesIds: ['iphone_12'], modelIds: ['iphone_12'] },
];

const baseQuery = { search: '', productType: '', brand: '', series: '', model: '', sort: 'nameAsc' };

test('admin catalog search is case-insensitive substring matching across name, id, and slug', () => {
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: 'IPHONE 12' }).map((p) => p.id), ['battery_12']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: 'iphone_se' }).map((p) => p.id), ['iphone_se_camera']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: 'charging-port' }).map((p) => p.id), ['port_12']);
});

test('admin catalog uses current product type and compatibility arrays', () => {
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, productType: 'batteries' }).map((p) => p.id), ['battery_12']);
  assert.equal(deriveAdminProducts(products, { ...baseQuery, brand: 'iphone' }).length, 3);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, series: 'iphone_se' }).map((p) => p.id), ['iphone_se_camera']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, model: 'iphone_12' }).map((p) => p.id), ['port_12', 'battery_12']);
});

test('admin catalog supports name and transitional-price sorting', () => {
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, sort: 'nameDesc' }).map((p) => p.id), ['battery_12', 'port_12', 'iphone_se_camera']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, sort: 'priceAsc' }).map((p) => p.id), ['battery_12', 'port_12', 'iphone_se_camera']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, sort: 'priceDesc' }).map((p) => p.id), ['iphone_se_camera', 'port_12', 'battery_12']);
});

test('admin catalog pagination returns at most 25 products after derivation', () => {
  const manyProducts = Array.from({ length: 61 }, (_, index) => ({ ...products[0], id: `product-${index}`, name: `Product ${String(index).padStart(2, '0')}` }));
  const derived = deriveAdminProducts(manyProducts, baseQuery);
  assert.equal(getAdminProductsPage(derived, 1).length, ADMIN_PRODUCTS_PAGE_SIZE);
  assert.equal(getAdminProductsPage(derived, 2).length, ADMIN_PRODUCTS_PAGE_SIZE);
  assert.equal(getAdminProductsPage(derived, 3).length, 11);
});

test('device filter options cascade through parentId while remaining complete when unselected', () => {
  const devices = [
    { id: 'iphone', name: 'iPhone', type: 'brand', parentId: null, order: 0 },
    { id: 'ipad', name: 'iPad', type: 'brand', parentId: null, order: 1 },
    { id: 'iphone_12', name: '12 Series', type: 'series', parentId: 'iphone', order: 0 },
    { id: 'ipad_air', name: 'Air', type: 'series', parentId: 'ipad', order: 0 },
    { id: 'iphone_12_pro', name: 'iPhone 12 Pro', type: 'model', parentId: 'iphone_12', order: 0 },
    { id: 'ipad_air_5', name: 'iPad Air 5', type: 'model', parentId: 'ipad_air', order: 0 },
  ];
  assert.equal(getAdminDeviceFilterOptions(devices, '', '').series.length, 2);
  assert.equal(getAdminDeviceFilterOptions(devices, '', '').models.length, 2);
  assert.deepEqual(getAdminDeviceFilterOptions(devices, 'iphone', '').series.map((item) => item.id), ['iphone_12']);
  assert.deepEqual(getAdminDeviceFilterOptions(devices, 'iphone', '').models.map((item) => item.id), ['iphone_12_pro']);
  assert.deepEqual(getAdminDeviceFilterOptions(devices, 'iphone', 'iphone_12').models.map((item) => item.id), ['iphone_12_pro']);
});
