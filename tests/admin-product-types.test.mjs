import test from 'node:test';
import assert from 'node:assert/strict';
import { arrayMove } from '@dnd-kit/sortable';
import { sortAdminProductTypes } from '../lib/adminProductTypeCatalog.mjs';

test('product types sort by manual order then natural name without mutating the source', () => {
  const productTypes = [
    { id: 'twelve', name: 'Type 12', order: 2 },
    { id: 'ten', name: 'Type 10', order: 2 },
    { id: 'first', name: 'First', order: 0 },
    { id: 'unordered', name: 'Unordered', order: null },
  ];
  assert.deepEqual(sortAdminProductTypes(productTypes).map((item) => item.id), ['first', 'ten', 'twelve', 'unordered']);
  assert.deepEqual(productTypes.map((item) => item.id), ['twelve', 'ten', 'first', 'unordered']);
});

test('dnd-kit reorder produces a complete immutable Product Type sequence', () => {
  const ids = ['batteries', 'displays', 'cameras'];
  assert.deepEqual(arrayMove(ids, 2, 0), ['cameras', 'batteries', 'displays']);
  assert.deepEqual(ids, ['batteries', 'displays', 'cameras']);
});
