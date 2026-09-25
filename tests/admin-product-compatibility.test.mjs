import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveCompatibilitySelection,
  getCompatibilityEditorOptions,
} from '../lib/adminProductCompatibility.mjs';

const devices = [
  { id: 'samsung', name: 'Samsung', type: 'brand', parentId: null, order: 2, status: 'active' },
  { id: 'apple', name: 'Apple', type: 'brand', parentId: null, order: 1, status: 'active' },
  { id: 'iphone', name: 'iPhone', type: 'series', parentId: 'apple', order: 1, status: 'active' },
  { id: 'ipad', name: 'iPad', type: 'series', parentId: 'apple', order: 2, status: 'inactive' },
  { id: 'iphone-15', name: 'iPhone 15', type: 'model', parentId: 'iphone', order: 2, status: 'active' },
  { id: 'iphone-14', name: 'iPhone 14', type: 'model', parentId: 'iphone', order: 1, status: 'active' },
  { id: 'ipad-pro', name: 'iPad Pro', type: 'model', parentId: 'ipad', order: 1, status: 'inactive' },
];

test('existing model IDs derive their Brand and Series from the first valid model', () => {
  assert.deepEqual(deriveCompatibilitySelection(['iphone-15', 'iphone-14'], devices), {
    brandId: 'apple',
    seriesId: 'iphone',
    inconsistentModelIds: [],
    invalidModelIds: [],
  });
});

test('inconsistent and invalid legacy models remain identifiable', () => {
  const result = deriveCompatibilitySelection(['iphone-15', 'ipad-pro', 'missing'], devices);
  assert.equal(result.brandId, 'apple');
  assert.equal(result.seriesId, 'iphone');
  assert.deepEqual(result.inconsistentModelIds, ['ipad-pro']);
  assert.deepEqual(result.invalidModelIds, ['missing']);
});

test('options cascade by parent, sort by order, and hide inactive new choices', () => {
  const root = getCompatibilityEditorOptions(devices, 'apple', 'iphone');
  assert.deepEqual(root.brands.map(({ id }) => id), ['apple', 'samsung']);
  assert.deepEqual(root.series.map(({ id }) => id), ['iphone']);
  assert.deepEqual(root.models.map(({ id }) => id), ['iphone-14', 'iphone-15']);
});

test('inactive existing selections remain available for editing', () => {
  const options = getCompatibilityEditorOptions(devices, 'apple', 'ipad', ['ipad-pro']);
  assert.deepEqual(options.series.map(({ id }) => id), ['iphone', 'ipad']);
  assert.deepEqual(options.models.map(({ id }) => id), ['ipad-pro']);
});
