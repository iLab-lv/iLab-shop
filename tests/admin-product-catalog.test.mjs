import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  deriveAdminProducts,
  getAdminDeviceFilterOptions,
  getAdminProductsPage,
} from '../lib/adminProductCatalog.mjs';

const products = [
  { id: 'iphone_se_camera', sku: 20002, slug: 'iphone-se-camera', name: 'Camera Pro', description: 'Rear camera', productTypeId: 'cameras', purchasePriceCents: 300, createdAt: '2026-09-23T06:28:18.078Z', brandIds: ['iphone'], seriesIds: ['iphone_se'], modelIds: ['iphone_se_2022'] },
  { id: 'battery_12', sku: 20000, slug: 'battery-for-iphone-12', name: 'iPhone 12 Battery', description: 'Replacement battery', productTypeId: 'batteries', purchasePriceCents: 100, createdAt: '2026-09-21T06:28:18.078Z', brandIds: ['iphone'], seriesIds: ['iphone_12'], modelIds: ['iphone_12'] },
  { id: 'port_12', sku: 20001, slug: 'charging-port-iphone-12', name: 'Charging Port', description: 'For Apple phone', productTypeId: 'connectors', purchasePriceCents: 200, createdAt: '2026-09-22T06:28:18.078Z', brandIds: ['iphone'], seriesIds: ['iphone_12'], modelIds: ['iphone_12'] },
];

const baseQuery = { search: '', productType: '', brand: '', series: '', model: '', sort: 'nameAsc' };

test('admin catalog search is case-insensitive substring matching across name, id, slug, and SKU', () => {
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: 'IPHONE 12' }).map((p) => p.id), ['battery_12']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: 'iphone_se' }).map((p) => p.id), ['iphone_se_camera']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: 'charging-port' }).map((p) => p.id), ['port_12']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: '20002' }).map((p) => p.id), ['iphone_se_camera']);
});

test('admin catalog uses current product type and compatibility arrays', () => {
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, productType: 'batteries' }).map((p) => p.id), ['battery_12']);
  assert.equal(deriveAdminProducts(products, { ...baseQuery, brand: 'iphone' }).length, 3);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, series: 'iphone_se' }).map((p) => p.id), ['iphone_se_camera']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, model: 'iphone_12' }).map((p) => p.id), ['port_12', 'battery_12']);
});

test('admin catalog supports name, purchase-price, and timestamp sorting', () => {
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, sort: 'nameDesc' }).map((p) => p.id), ['battery_12', 'port_12', 'iphone_se_camera']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, sort: 'priceAsc' }).map((p) => p.id), ['battery_12', 'port_12', 'iphone_se_camera']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, sort: 'priceDesc' }).map((p) => p.id), ['iphone_se_camera', 'port_12', 'battery_12']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, sort: 'newest' }).map((p) => p.id), ['iphone_se_camera', 'port_12', 'battery_12']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, sort: 'oldest' }).map((p) => p.id), ['battery_12', 'port_12', 'iphone_se_camera']);
});

test('default sorting follows Product Type order then natural product name', () => {
  const products = [
    { id: 'display', name: 'Display 2', productTypeId: 'displays', brandIds: [], seriesIds: [], modelIds: [] },
    { id: 'battery-10', name: 'Battery 10', productTypeId: 'batteries', brandIds: [], seriesIds: [], modelIds: [] },
    { id: 'battery-2', name: 'Battery 2', productTypeId: 'batteries', brandIds: [], seriesIds: [], modelIds: [] },
    { id: 'unknown', name: 'Adapter', productTypeId: 'missing', brandIds: [], seriesIds: [], modelIds: [] },
  ];
  const types = [{ id: 'batteries', order: 0 }, { id: 'displays', order: 1 }];
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, sort: 'default' }, types).map((item) => item.id), ['battery-2', 'battery-10', 'display', 'unknown']);
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
