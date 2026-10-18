import test from 'node:test';
import assert from 'node:assert/strict';
import { planServiceLinkBackfill, serviceLinksEqual } from '../lib/serviceLinkBackfill.mjs';

const categories = [
  { id: 'phones', slug: 'telefonu-remonts', name: 'Phones', brands: [{ key: 'samsung', name: 'Samsung' }, { key: 'apple', name: 'Apple', route: { preferDedicatedHub: true, dedicatedHubPath: '/iphone-remonts' } }] },
  { id: 'iphone', slug: 'iphone-remonts', name: 'iPhone', brands: [] },
];
const serviceDevices = [
  { id: 'iphone-15-pro', slug: 'iphone-15-pro', name: 'iPhone 15 Pro', categoryKey: 'telefonu-remonts', brandKey: 'apple' },
  { id: 'sam-a54', slug: 'sam-a54', name: 'Galaxy A54', categoryKey: 'telefonu-remonts', brandKey: 'samsung' },
];
const shop = [
  { id: 'iphone', name: 'iPhone', slug: 'iphone', type: 'brand', serviceLink: { type: 'home', path: '/' } },
  { id: 'samsung', name: 'Samsung', slug: 'samsung', type: 'brand', serviceLink: { type: 'brand', categoryKey: 'telefonu-remonts', brandKey: 'samsung', path: '/telefonu-remonts/samsung' } },
  { id: 'series', name: 'Series', type: 'series', parentId: 'samsung', serviceLink: { type: 'home', path: '/' } },
  { id: 'm1', name: 'iPhone 15 Pro', slug: 'iphone-15-pro', type: 'model', parentId: 'series' },
  { id: 'm2', name: 'Galaxy A54', slug: 'different-slug', type: 'model', parentId: 'series' },
  { id: 'm3', name: 'Unmatched', slug: 'none', type: 'model', parentId: 'series', serviceLink: { type: 'device', targetId: 'deleted-target', path: '/telefonu-remonts/samsung/deleted-target' } },
];

test('backfill upgrades legacy home, Brand, and exact Model links with actual LV/RU routes', () => {
  const plan = planServiceLinkBackfill(shop, categories, serviceDevices);
  assert.deepEqual(plan.brandLinks.get('iphone').paths, { lv: '/', ru: '/ru' });
  assert.deepEqual(plan.brandLinks.get('samsung').paths, { lv: '/telefonu-remonts/samsung', ru: '/ru/remont-telefonov/samsung' });
  assert.deepEqual(plan.modelLinks.get('m1').paths, { lv: '/iphone-remonts/iphone-15-pro', ru: '/ru/remont-iphone/iphone-15-pro' });
  assert.deepEqual(plan.modelLinks.get('m2').paths, { lv: '/telefonu-remonts/samsung/sam-a54', ru: '/ru/remont-telefonov/samsung/sam-a54' });
  assert.equal(plan.report.models.slug, 1);
  assert.equal(plan.report.models.name, 1);
  assert.equal(plan.report.brands.homeUpgraded, 1);
  assert.equal(plan.report.brands.upgraded, 2);
  assert.equal(plan.report.models.unmatched, 1);
  assert.equal(plan.modelClears.has('m3'), true);
  assert.equal(plan.seriesIds.includes('series'), true);
  assert.equal(Object.hasOwn(plan.brandLinks.get('samsung'), 'path'), false);
});

test('migration is idempotent and reports already-localized records unchanged', () => {
  const first = planServiceLinkBackfill(shop, categories, serviceDevices);
  const linked = shop.map((item) => {
    if (first.brandLinks.has(item.id)) return { ...item, serviceLink: first.brandLinks.get(item.id) };
    if (first.modelLinks.has(item.id)) return { ...item, serviceLink: first.modelLinks.get(item.id) };
    return item;
  }).filter((item) => item.id !== 'm3');
  const second = planServiceLinkBackfill(linked, categories, serviceDevices);
  assert.equal(second.report.brands.alreadyCorrect, 2);
  assert.equal(second.report.brands.upgraded, 0);
  assert.equal(second.report.models.alreadyCorrect, 2);
  assert.equal(second.report.models.upgraded, 0);
  assert.equal(serviceLinksEqual(linked[0].serviceLink, first.brandLinks.get('iphone')), true);
});

test('ambiguous and unmatched mappings are not guessed; Series records are not planned', () => {
  const ambiguousServices = [...serviceDevices, { id: 'other', slug: 'other', name: 'iPhone 15 Pro', categoryKey: 'telefonu-remonts', brandKey: 'apple' }];
  const ambiguousShop = shop.map((item) => item.id === 'm1' ? { ...item, slug: 'not-an-exact-slug' } : item);
  const ambiguous = planServiceLinkBackfill(ambiguousShop, categories, ambiguousServices);
  assert.ok(ambiguous.report.ambiguous.some((entry) => entry.type === 'model' && entry.name === 'iPhone 15 Pro'));
  assert.equal(ambiguous.modelLinks.has('m1'), false);
  assert.equal(ambiguous.brandLinks.has('series'), false);
});
