import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdminDeviceHierarchy,
  compareAdminDevices,
  countAdminDevices,
  searchAdminDeviceHierarchy,
} from '../lib/adminDeviceTree.mjs';

const devices = [
  { id: 'apple', name: 'Apple', slug: 'apple', type: 'brand', parentId: null, order: 0, status: 'active' },
  { id: 'iphone', name: 'iPhone', slug: 'iphone', type: 'series', parentId: 'apple', order: 0, status: 'active' },
  { id: 'iphone_12', name: 'iPhone 12', slug: 'iphone-12', type: 'model', parentId: 'iphone', order: 2, status: 'active' },
  { id: 'iphone_2', name: 'iPhone 2', slug: 'iphone-2', type: 'model', parentId: 'iphone', order: 2, status: 'inactive' },
  { id: 'ipad', name: 'iPad', slug: 'ipad', type: 'series', parentId: 'apple', order: 1, status: 'active' },
  { id: 'samsung', name: 'Samsung', slug: 'samsung', type: 'brand', parentId: null, order: 1, status: 'active' },
];

test('device hierarchy uses parentId and sorts each sibling group by order then natural name', () => {
  const { tree, orphans } = buildAdminDeviceHierarchy(devices);
  assert.deepEqual(tree.map((item) => item.device.id), ['apple', 'samsung']);
  assert.deepEqual(tree[0].series.map((item) => item.device.id), ['iphone', 'ipad']);
  assert.deepEqual(tree[0].series[0].models.map((item) => item.id), ['iphone_2', 'iphone_12']);
  assert.equal(tree[0].modelCount, 2);
  assert.deepEqual(orphans, []);
});

test('deep model search retains only its required series and brand ancestors', () => {
  const { tree } = buildAdminDeviceHierarchy(devices);
  const result = searchAdminDeviceHierarchy(tree, 'IPHONE-12');
  assert.equal(result.length, 1);
  assert.equal(result[0].device.id, 'apple');
  assert.deepEqual(result[0].series.map((item) => item.device.id), ['iphone']);
  assert.deepEqual(result[0].series[0].models.map((item) => item.id), ['iphone_12']);
});

test('brand and series matches include all descendants', () => {
  const { tree } = buildAdminDeviceHierarchy(devices);
  assert.equal(searchAdminDeviceHierarchy(tree, 'apple')[0].series.length, 2);
  assert.deepEqual(searchAdminDeviceHierarchy(tree, 'iphone')[0].series[0].models.map((item) => item.id), ['iphone_2', 'iphone_12']);
});

test('invalid parents and unknown types are returned as warnings instead of discarded', () => {
  const invalid = [
    ...devices,
    { id: 'bad-series', name: 'Bad Series', type: 'series', parentId: 'missing', order: 0 },
    { id: 'bad-model', name: 'Bad Model', type: 'model', parentId: 'apple', order: 0 },
    { id: 'bad-type', name: 'Bad Type', type: 'family', parentId: null, order: 0 },
    { id: 'bad-brand', name: 'Bad Brand', type: 'brand', parentId: 'unexpected', order: 0 },
    { id: 'child-of-bad-brand', name: 'Child of Bad Brand', type: 'series', parentId: 'bad-brand', order: 0 },
    { id: 'child-of-bad-series', name: 'Child of Bad Series', type: 'model', parentId: 'bad-series', order: 0 },
  ];
  const { tree, orphans } = buildAdminDeviceHierarchy(invalid);
  const accountedFor = tree.reduce((total, brand) => total + 1 + brand.series.reduce((sum, item) => sum + 1 + item.models.length, 0), 0) + orphans.length;
  assert.equal(accountedFor, invalid.length);
  assert.deepEqual(orphans.map((item) => item.device.id), ['bad-brand', 'bad-model', 'bad-series', 'bad-type', 'child-of-bad-brand', 'child-of-bad-series']);
});

test('counts include all recognized document types and missing order sorts last', () => {
  assert.deepEqual(countAdminDevices(devices), { brands: 2, series: 2, models: 2 });
  assert.ok(compareAdminDevices({ id: 'b', name: 'B', order: null }, { id: 'a', name: 'A', order: 2 }) > 0);
});
