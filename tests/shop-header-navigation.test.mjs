import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildHeaderBrandNavigation, isBrandPathActive } from '../lib/shopHeaderNavigation.mjs';

const brands = Array.from({ length: 7 }, (_, index) => ({
  id: `brand-${index + 1}`,
  name: `Brand ${index + 1}`,
  slug: `brand-${index + 1}`,
  status: 'active',
  order: index,
}));

test('first five valid active brands are direct and the rest overflow in canonical input order', () => {
  const navigation = buildHeaderBrandNavigation(brands);
  assert.deepEqual(navigation.direct.map((brand) => brand.slug), brands.slice(0, 5).map((brand) => brand.slug));
  assert.deepEqual(navigation.overflow.map((brand) => brand.slug), brands.slice(5).map((brand) => brand.slug));
});

test('More is unnecessary with five or fewer brands', () => {
  assert.equal(buildHeaderBrandNavigation(brands.slice(0, 5)).overflow.length, 0);
});

test('inactive, missing-slug, and duplicate brands cannot create header links', () => {
  const navigation = buildHeaderBrandNavigation([
    ...brands.slice(0, 2),
    { id: 'inactive', name: 'Hidden', slug: 'hidden', status: 'inactive' },
    { id: 'broken', name: 'Broken', slug: '', status: 'active' },
    { id: 'duplicate', name: 'Duplicate', slug: 'brand-1', status: 'active' },
  ]);
  assert.deepEqual(navigation.all.map((brand) => brand.slug), ['brand-1', 'brand-2']);
});

test('brand active state supports Shop basePath and nested Model pages', () => {
  assert.equal(isBrandPathActive('/samsung', 'samsung'), true);
  assert.equal(isBrandPathActive('/shop/samsung/galaxy-s24', 'samsung'), true);
  assert.equal(isBrandPathActive('/product/screen', 'samsung'), false);
});

test('header source keeps the logo home link and removes Catalog navigation', async () => {
  const source = await readFile(new URL('../app/components/shop/ShopHeader.js', import.meta.url), 'utf8');
  assert.match(source, /className=\{styles\.logo\} href="\/"/);
  assert.doesNotMatch(source, /label:\s*['"]Catalog['"]/);
  assert.match(source, /navigation\.all\.map/);
  assert.match(source, /event\.key !== 'Escape'/);
  assert.match(source, /onClick=\{\(\) => setMoreOpen\(false\)\}/);
});
