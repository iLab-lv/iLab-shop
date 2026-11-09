import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBreadcrumbStructuredData, buildProductStructuredData, buildShopPageMetadata, serializeJsonLd, shopCanonicalUrl } from '../lib/shopSeo.mjs';
import { createShopSitemapHandler } from '../lib/shopSitemapResponse.mjs';
import nextConfig from '../next.config.mjs';

test('canonical URL generation always uses the public host and exactly one /shop prefix', () => {
  assert.equal(shopCanonicalUrl('/'), 'https://ilab.lv/shop');
  assert.equal(shopCanonicalUrl('/iphone/iphone-15'), 'https://ilab.lv/shop/iphone/iphone-15');
  assert.equal(shopCanonicalUrl('/shop/product/display'), 'https://ilab.lv/shop/product/display');
  assert.throws(() => shopCanonicalUrl('/product?a=1'), /without query/);
  const metadata = buildShopPageMetadata({ title: 'Parts', description: 'Factual description.', path: '/iphone' });
  assert.equal(metadata.alternates.canonical, 'https://ilab.lv/shop/iphone');
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
  assert.equal(metadata.robots, undefined);
  assert.deepEqual(buildShopPageMetadata({ title: 'Account', description: 'Private.', path: '/account', noindex: true }).robots, { index: false, follow: true });
});

test('Shop API responses receive noindex headers under the configured basePath', async () => {
  const headers = await nextConfig.headers();
  assert.equal(nextConfig.basePath, '/shop');
  assert.deepEqual(headers[0].headers, [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]);
});

test('Product data publishes only supported facts and excludes Offer for missing or invalid retail prices', () => {
  const noPrice = buildProductStructuredData({ name: 'Display', description: 'Replacement display.', sku: 50201, retailPriceCents: null, stockQty: 8 }, '/product/display');
  assert.equal(noPrice.url, 'https://ilab.lv/shop/product/display');
  assert.equal(noPrice.sku, '50201');
  assert.equal(noPrice.offers, undefined);

  for (const retailPriceCents of [0, -100, 1.5, Number.NaN]) {
    assert.equal(buildProductStructuredData({ name: 'Display', retailPriceCents }, '/product/display').offers, undefined);
  }
  const available = buildProductStructuredData({ name: 'Display', retailPriceCents: 1234, stockQty: 2 }, '/product/display');
  assert.deepEqual(available.offers, { '@type': 'Offer', url: 'https://ilab.lv/shop/product/display', priceCurrency: 'EUR', price: '12.34', availability: 'https://schema.org/InStock' });
  const soldOut = buildProductStructuredData({ name: 'Display', retailPriceCents: 1234, stockQty: 0 }, '/product/display');
  assert.equal(soldOut.offers.availability, 'https://schema.org/OutOfStock');
  const unknownStock = buildProductStructuredData({ name: 'Display', retailPriceCents: 1234, stockQty: 0, stockQtyKnown: false }, '/product/display');
  assert.equal(unknownStock.offers.availability, undefined);
  assert.equal(buildProductStructuredData({ name: '<img onerror=alert(1)>', imagePaths: ['gs://bucket/image.jpg', 'https://storage.example/image.jpg'] }, '/product/display').image.length, 1);
});

test('BreadcrumbList follows the visible Shop-to-brand-to-model route and JSON-LD is script-safe', () => {
  const schema = buildBreadcrumbStructuredData([{ label: 'iPhone', href: '/iphone' }, { label: 'iPhone 15' }], '/iphone/iphone-15');
  assert.deepEqual(schema.itemListElement.map(({ name, item }) => [name, item]), [
    ['Shop', 'https://ilab.lv/shop'],
    ['iPhone', 'https://ilab.lv/shop/iphone'],
    ['iPhone 15', 'https://ilab.lv/shop/iphone/iphone-15'],
  ]);
  assert.equal(buildBreadcrumbStructuredData([{ label: 'Account' }], null), null);
  assert.equal(serializeJsonLd({ text: '</script>&' }), '{"text":"\\u003c/script\\u003e\\u0026"}');
});

test('sitemap handler returns unique public XML and a cacheable hourly response', async () => {
  let reads = 0;
  let time = 0;
  const handler = createShopSitemapHandler({
    now: () => time,
    getData: async () => { reads++; return { devices: [{ id: 'b', type: 'brand', slug: 'iphone', status: 'active' }], products: [{ slug: 'display', status: 'active', updatedAt: '2026-10-01T00:00:00Z' }] }; },
  });
  const first = await handler();
  assert.equal(first.status, 200);
  assert.match(first.headers.get('content-type'), /application\/xml/);
  assert.match(first.headers.get('cache-control'), /s-maxage=3600/);
  const xml = await first.text();
  assert.match(xml, /https:\/\/ilab\.lv\/shop\/product\/display/);
  assert.match(xml, /<lastmod>2026-10-01T00:00:00.000Z<\/lastmod>/);
  assert.equal((xml.match(/<loc>/g) || []).length, 3);
  await handler();
  assert.equal(reads, 1);
});

test('temporary Firestore errors serve a bounded stale sitemap or an explicit 503, never an empty success', async () => {
  let time = 0;
  let failing = false;
  const handler = createShopSitemapHandler({
    now: () => time,
    getData: async () => {
      if (failing) throw new Error('Firestore unavailable');
      return { devices: [{ id: 'b', type: 'brand', slug: 'iphone', status: 'active' }], products: [] };
    },
  });
  const good = await handler();
  failing = true;
  time = 60 * 60 * 1000 + 1;
  const stale = await handler();
  assert.equal(stale.status, 200);
  assert.equal(stale.headers.get('x-shop-sitemap-cache'), 'stale');
  assert.equal(stale.headers.get('cache-control'), 'no-store');
  assert.match(await stale.text(), /\/shop\/iphone/);

  time = 25 * 60 * 60 * 1000;
  const unavailable = await handler();
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get('retry-after'), '300');
  assert.equal(unavailable.headers.get('cache-control'), 'no-store');
  assert.match(await unavailable.text(), /temporarily unavailable/);
  assert.ok(good);
});

test('sitemap refuses empty or invalid catalog results instead of publishing a false empty catalog', async () => {
  const handler = createShopSitemapHandler({ getData: async () => ({ devices: [], products: [] }) });
  const response = await handler();
  assert.equal(response.status, 503);
});

test('large catalogs split into a sitemap index and numbered query sections below 50,000 URLs', async () => {
  const products = Array.from({ length: 50001 }, (_, index) => ({ slug: `part-${index}`, status: 'active' }));
  const handler = createShopSitemapHandler({ getData: async () => ({ devices: [], products }) });
  const request = (part) => new Request(`https://ilab.lv/shop/sitemap.xml${part === null ? '' : `?part=${part}`}`);
  const index = await handler(request(null));
  const indexXml = await index.text();
  assert.match(indexXml, /<sitemapindex/);
  assert.match(indexXml, /https:\/\/ilab\.lv\/shop\/sitemap\.xml\?part=0/);
  assert.match(indexXml, /https:\/\/ilab\.lv\/shop\/sitemap\.xml\?part=1/);

  const first = await handler(request('0'));
  const second = await handler(request('1'));
  assert.equal((await first.text()).match(/<url>/g).length, 50000);
  assert.equal((await second.text()).match(/<url>/g).length, 2);
  assert.equal((await handler(request('2'))).status, 404);
});
