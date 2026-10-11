import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  deriveAdminProducts,
  getAdminDeviceFilterOptions,
  getAdminModelFilterSelection,
  getAdminProductsPage,
} from '../lib/adminProductCatalog.mjs';
import { buildModelSearchIndex, searchModels } from '../lib/searchCatalog.mjs';

const products = [
  { id: 'iphone_se_camera', sku: 20002, slug: 'iphone-se-camera', name: 'Camera Pro', description: 'Rear camera', status: 'active', productTypeId: 'cameras', purchasePriceCents: 300, createdAt: '2026-09-23T06:28:18.078Z', brandIds: ['iphone'], seriesIds: ['iphone_se'], modelIds: ['iphone_se_2022'] },
  { id: 'battery_12', sku: 20000, slug: 'battery-for-iphone-12', name: 'iPhone 12 Battery', description: 'Replacement battery', status: 'active', productTypeId: 'batteries', purchasePriceCents: 100, createdAt: '2026-09-21T06:28:18.078Z', brandIds: ['iphone'], seriesIds: ['iphone_12'], modelIds: ['iphone_12'] },
  { id: 'port_12', sku: 20001, slug: 'charging-port-iphone-12', name: 'Charging Port', description: 'For Apple phone', status: 'inactive', productTypeId: 'connectors', purchasePriceCents: 200, createdAt: '2026-09-22T06:28:18.078Z', brandIds: ['iphone'], seriesIds: ['iphone_12'], modelIds: ['iphone_12'] },
];

const baseQuery = { search: '', productType: '', brand: '', series: '', model: '', status: '', sort: 'nameAsc' };
const devices = [{ id: 'iphone', name: 'iPhone', type: 'brand' }, { id: 'iphone_12', name: 'iPhone 12 Pro', type: 'model' }, { id: 'iphone_se', name: 'SE', type: 'series' }, { id: 'iphone_se_2022', name: 'iPhone SE 2022', type: 'model' }];
const productTypes = [{ id: 'batteries', name: 'Batteries', order: 0 }, { id: 'cameras', name: 'Cameras', order: 1 }, { id: 'connectors', name: 'Connectors', order: 2 }];

test('admin catalog search is case-insensitive substring matching across name, id, slug, and SKU', () => {
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: 'IPHONE 12' }, productTypes, devices).map((p) => p.id), ['port_12', 'battery_12']);
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

test('admin global search matches authoritative model and Product Type names before filters narrow results', () => {
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: 'iphone 12 pro' }, productTypes, devices).map((p) => p.id), ['port_12', 'battery_12']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: 'connectors' }, productTypes, devices).map((p) => p.id), ['port_12']);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: '20001', status: 'active' }, productTypes, devices), []);
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: '20001' }, productTypes, devices).map((p) => p.id), ['port_12']);
});

test('admin Model autocomplete ranks hierarchy records and selection creates explicit filters', () => {
  const hierarchy = [
    { id: 'apple', name: 'Apple', slug: 'apple', type: 'brand', parentId: null, order: 0 },
    { id: 'iphone-14-series', name: 'iPhone 14 Series', slug: 'iphone-14-series', type: 'series', parentId: 'apple', order: 0 },
    { id: 'iphone-14', name: 'iPhone 14', slug: 'iphone-14', type: 'model', parentId: 'iphone-14-series', order: 0 },
    { id: 'iphone-14-plus', name: 'iPhone 14 Plus', slug: 'iphone-14-plus', type: 'model', parentId: 'iphone-14-series', order: 1 },
    { id: 'iphone-14-pro', name: 'iPhone 14 Pro', slug: 'iphone-14-pro', type: 'model', parentId: 'iphone-14-series', order: 2 },
    { id: 'iphone-14-pro-max', name: 'iPhone 14 Pro Max', slug: 'iphone-14-pro-max', type: 'model', parentId: 'iphone-14-series', order: 3 },
  ];
  const suggestions = searchModels({ models: buildModelSearchIndex(hierarchy) }, 'iphone 14 pro');
  assert.deepEqual(suggestions.slice(0, 2).map((model) => model.id), ['iphone-14-pro', 'iphone-14-pro-max']);
  assert.deepEqual(getAdminModelFilterSelection(suggestions[0]), { search: '', brand: 'apple', series: 'iphone-14-series', model: 'iphone-14-pro', page: 1 });
});

test('follow-up admin Search stays inside an explicitly selected Model scope', () => {
  assert.deepEqual(deriveAdminProducts(products, { ...baseQuery, search: 'battery', brand: 'iphone', series: 'iphone_12', model: 'iphone_12' }, productTypes, devices).map((product) => product.id), ['battery_12']);
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

test('Admin Products presents Search separately from explicit removable Filters', async () => {
  const source = await readFile(new URL('../app/admin/products/ProductsManager.js', import.meta.url), 'utf8');
  assert.match(source, /styles\.searchGroup/);
  assert.match(source, /styles\.filterGroup/);
  assert.match(source, /Clear search/);
  assert.match(source, /change\(\{search:''\}\)/);
  assert.match(source, /Clear filters/);
  assert.match(source, /change\(\{brand:'',series:'',model:'',productType:'',status:''\}\)/);
  assert.match(source, /styles\.activeFilters/);
  assert.match(source, /Search products, SKU or model/);
  assert.match(source, /aria-controls="admin-model-autocomplete"/);
  assert.match(source, /getAdminModelFilterSelection\(model\)/);
  assert.match(source, /event\.key==='Escape'/);
  assert.match(source, /addEventListener\('pointerdown',closeOnOutsidePointer\)/);
});
