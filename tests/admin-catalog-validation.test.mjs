import test from 'node:test';
import assert from 'node:assert/strict';
import { CatalogError, assertCatalogDeletionAllowed, assertCatalogStatusChangeAllowed, assertDeviceParentType, assertImmutableDeviceFields, moveCatalogItem, slugifyCatalogName, validateCatalogFields, validateCompleteOrder, validateDeviceCreate, validateDeviceSiblingOrder, validateDeviceUpdate } from '../lib/adminCatalogValidation.mjs';

test('catalog fields trim and validate the persisted allowlist', () => assert.deepEqual(validateCatalogFields({ name: ' Cases ', slug: 'cases', status: 'active', ignored: true }), { name: 'Cases', slug: 'cases', status: 'active' }));
test('catalog fields reject invalid status and slug', () => { assert.throws(() => validateCatalogFields({ name: 'X', slug: 'Bad slug', status: 'active' }), CatalogError); assert.throws(() => validateCatalogFields({ name: 'X', slug: 'x', status: 'draft' }), CatalogError); });
test('device hierarchy requires valid parent shapes', () => { assert.equal(validateDeviceCreate({ name: 'Apple', slug: 'apple', status: 'active', type: 'brand', parentId: null }).parentId, null); assert.throws(() => validateDeviceCreate({ name: 'iPhone', slug: 'iphone', status: 'active', type: 'series', parentId: null }), CatalogError); });
test('Brands receive automatic SEO defaults and update those defaults when renamed', () => {
  const brand = validateDeviceCreate({ name: 'Apple', slug: 'apple', status: 'active', type: 'brand', parentId: null });
  assert.equal(brand.metaTitle, 'Apple | iLab Shop');
  assert.equal(brand.metaDescription, 'Browse Apple repair parts and components at iLab Shop.');
  assert.equal(brand.metaTitleManual, false);
  assert.equal(validateDeviceUpdate({ name: 'Apple Parts', slug: 'apple-parts', status: 'active' }, brand).metaTitle, 'Apple Parts | iLab Shop');
});
test('manual Brand SEO remains stable across name changes and validates server input', () => {
  const brand = { type: 'brand', name: 'Apple', metaTitle: 'Apple components', metaDescription: '', metaTitleManual: true, metaDescriptionManual: false };
  const updated = validateDeviceUpdate({ name: 'Apple Parts', slug: 'apple-parts', status: 'active', metaTitle: ' Apple components ', metaDescription: '', metaTitleManual: true, metaDescriptionManual: false }, brand);
  assert.equal(updated.metaTitle, 'Apple components');
  assert.equal(updated.metaDescription, 'Browse Apple Parts repair parts and components at iLab Shop.');
  assert.throws(() => validateDeviceUpdate({ name: 'Apple', slug: 'apple', status: 'active', metaTitle: 'x'.repeat(201) }, brand), CatalogError);
  assert.throws(() => validateDeviceUpdate({ name: 'Apple', slug: 'apple', status: 'active', metaTitleManual: 'yes' }, brand), CatalogError);
});
test('SEO input never becomes Series or Model fields', () => {
  const series = validateDeviceCreate({ name: 'Series', slug: 'series', status: 'active', type: 'series', parentId: 'brand', metaTitle: 'ignored' });
  assert.equal(Object.hasOwn(series, 'metaTitle'), false);
  assert.equal(Object.hasOwn(validateDeviceUpdate({ name: 'Series', slug: 'series', status: 'active', metaTitle: 'ignored' }, { type: 'series' }), 'metaTitle'), false);
});
test('series and model creation require the correct existing parent type', () => { assert.equal(assertDeviceParentType('series', 'brand'), true); assert.equal(assertDeviceParentType('model', 'series'), true); assert.throws(() => assertDeviceParentType('model', 'brand'), CatalogError); });
test('device identity fields are immutable', () => assert.throws(() => assertImmutableDeviceFields({ type: 'model' }, { id: 'a', type: 'brand', parentId: null }), CatalogError));
test('device IDs and parents cannot be reassigned', () => { const current = { id: 'iphone', type: 'series', parentId: 'apple' }; assert.throws(() => assertImmutableDeviceFields({ id: 'other' }, current), CatalogError); assert.throws(() => assertImmutableDeviceFields({ parentId: 'samsung' }, current), CatalogError); });
test('deletion permits unreferenced leaves and blocks children or product references', () => { assert.equal(assertCatalogDeletionAllowed({}), true); assert.throws(() => assertCatalogDeletionAllowed({ childCount: 1 }), CatalogError); assert.throws(() => assertCatalogDeletionAllowed({ referenceCount: 1 }), CatalogError); });
test('deactivation is blocked only while active products reference the entry', () => { assert.equal(assertCatalogStatusChangeAllowed('active', 'inactive', 0), true); assert.throws(() => assertCatalogStatusChangeAllowed('active', 'inactive', 1), CatalogError); });
test('complete order rejects duplicates, omissions, and stale IDs', () => { assert.deepEqual(validateCompleteOrder(['b', 'a'], ['a', 'b']), ['b', 'a']); assert.throws(() => validateCompleteOrder(['a', 'a'], ['a', 'b']), CatalogError); assert.throws(() => validateCompleteOrder(['a'], ['a', 'b']), CatalogError); });
test('device order accepts only a complete, single sibling group', () => {
  const siblings = [{ id: 'a', type: 'series', parentId: 'iphone' }, { id: 'b', type: 'series', parentId: 'iphone' }];
  assert.deepEqual(validateDeviceSiblingOrder({ type: 'series', parentId: 'iphone', ids: ['b', 'a'] }, siblings), { type: 'series', parentId: 'iphone', ids: ['b', 'a'] });
  assert.throws(() => validateDeviceSiblingOrder({ type: 'series', parentId: 'ipad', ids: ['b', 'a'] }, siblings), CatalogError);
  assert.throws(() => validateDeviceSiblingOrder({ type: 'series', parentId: 'iphone', ids: ['a'] }, siblings), CatalogError);
  assert.throws(() => validateDeviceSiblingOrder({ type: 'model', parentId: 'iphone', ids: ['b', 'a'] }, siblings), CatalogError);
});
test('moveCatalogItem is immutable and normalizes order', () => { const source = [{ id: 'a', order: 0 }, { id: 'b', order: 1 }]; const moved = moveCatalogItem(source, 'b', 'a'); assert.deepEqual(moved.map((x) => x.id), ['b', 'a']); assert.deepEqual(source.map((x) => x.id), ['a', 'b']); });
test('slug generation is explicit and stable', () => assert.equal(slugifyCatalogName('Ābols & Cases'), 'abols-cases'));
