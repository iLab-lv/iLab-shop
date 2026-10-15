import test from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../next.config.mjs';
import { buildShopSitemap, normalizeSitemapLastModified, SHOP_SITEMAP_ORIGIN } from '../lib/shopSitemap.mjs';

const urls = (entries) => entries.map(({ url }) => url);

test('Shop sitemap includes its canonical home exactly once and basePath is /shop', () => {
  const entries = buildShopSitemap();
  assert.equal(nextConfig.basePath, '/shop');
  assert.deepEqual(urls(entries), [`${SHOP_SITEMAP_ORIGIN}/shop`]);
});

test('sitemap contains active Brands and valid active Model routes, but no Series URLs', () => {
  const entries = buildShopSitemap({ devices: [
    { id: 'brand', type: 'brand', slug: 'iphone', status: 'active' },
    { id: 'inactive-brand', type: 'brand', slug: 'inactive', status: 'inactive' },
    { id: 'series', type: 'series', slug: '15-series', parentId: 'brand', status: 'active' },
    { id: 'inactive-series', type: 'series', parentId: 'brand', status: 'inactive' },
    { id: 'model', type: 'model', slug: 'iphone-15', parentId: 'series', status: 'active' },
    { id: 'inactive-model', type: 'model', slug: 'iphone-14', parentId: 'series', status: 'inactive' },
    { id: 'orphan', type: 'model', slug: 'orphan-model', parentId: 'missing', status: 'active' },
    { id: 'inactive-parent-model', type: 'model', slug: 'hidden-model', parentId: 'inactive-series', status: 'active' },
  ] });
  assert.deepEqual(urls(entries), [
    `${SHOP_SITEMAP_ORIGIN}/shop`,
    `${SHOP_SITEMAP_ORIGIN}/shop/iphone`,
    `${SHOP_SITEMAP_ORIGIN}/shop/iphone/iphone-15`,
  ]);
});

test('sitemap includes active products, excludes invalid or inactive slugs, and deduplicates canonical URLs', () => {
  const entries = buildShopSitemap({ products: [
    { slug: 'display-for-iphone-15', status: 'active' },
    { slug: 'display-for-iphone-15', status: 'active' },
    { slug: 'hidden-product', status: 'inactive' },
    { slug: '', status: 'active' },
    { slug: 'query?type=display', status: 'active' },
  ] });
  assert.deepEqual(urls(entries), [
    `${SHOP_SITEMAP_ORIGIN}/shop`,
    `${SHOP_SITEMAP_ORIGIN}/shop/product/display-for-iphone-15`,
  ]);
  assert.ok(entries.every(({ url }) => url.startsWith('https://ilab.lv/shop/') || url === 'https://ilab.lv/shop'));
  assert.ok(entries.every(({ url }) => !url.includes('/shop/shop') && !url.includes('?')));
});

test('lastModified accepts Firestore Timestamp and valid legacy strings, omitting invalid or missing values', () => {
  const timestamp = { toDate: () => new Date('2026-10-14T12:30:00.000Z') };
  assert.equal(normalizeSitemapLastModified(timestamp).toISOString(), '2026-10-14T12:30:00.000Z');
  assert.equal(normalizeSitemapLastModified('2026-10-13T10:00:00.000Z').toISOString(), '2026-10-13T10:00:00.000Z');
  assert.equal(normalizeSitemapLastModified('not-a-date'), undefined);
  assert.equal(normalizeSitemapLastModified(undefined), undefined);
  const entries = buildShopSitemap({ products: [
    { slug: 'with-date', status: 'active', updatedAt: timestamp },
    { slug: 'without-date', status: 'active' },
  ] });
  assert.equal(entries[1].lastModified.toISOString(), '2026-10-14T12:30:00.000Z');
  assert.equal(Object.hasOwn(entries[2], 'lastModified'), false);
});
