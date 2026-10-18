import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeServiceLink, resolveProductServiceLinks, resolveShopServiceLink, serviceLinkFromTarget, servicePathForLocale, buildServiceTargets, SERVICE_HOME_LINK } from '../lib/shopServiceLinks.mjs';
import { CatalogError, validateDeviceCreate, validateDeviceUpdate } from '../lib/adminCatalogValidation.mjs';

const link = (type, identity, lv, ru) => ({ type, ...identity, paths: { lv, ru } });

test('Shop Service-link resolver prefers exact Model then Brand then bilingual homepage', () => {
  const brand = { serviceLink: link('brand', { categoryKey: 'telefonu-remonts', brandKey: 'samsung' }, '/telefonu-remonts/samsung', '/ru/remont-telefonov/samsung') };
  const modelLink = link('device', { targetId: 's24' }, '/telefonu-remonts/samsung/s24', '/ru/remont-telefonov/samsung/s24');
  assert.deepEqual(resolveShopServiceLink({ brand }).serviceLink.paths, brand.serviceLink.paths);
  assert.deepEqual(resolveShopServiceLink({ model: { serviceLink: modelLink }, brand }).serviceLink, modelLink);
  assert.deepEqual(resolveShopServiceLink({}).serviceLink, SERVICE_HOME_LINK);
});

test('Service path validation rejects external, Shop-prefixed, malformed, and wrong-locale paths', () => {
  for (const paths of [
    { lv: 'https://ilab.lv/x', ru: '/ru/x' },
    { lv: '/shop/foo', ru: '/ru/foo' },
    { lv: '//other.test', ru: '/ru/foo' },
    { lv: '/foo?bar', ru: '/ru/foo' },
    { lv: '/foo/%2f', ru: '/ru/foo' },
    { lv: '/ru/foo', ru: '/ru/foo' },
    { lv: '/foo', ru: '/foo' },
  ]) assert.equal(normalizeServiceLink({ type: 'category', categoryKey: 'foo', paths }), null);
  assert.equal(normalizeServiceLink({ type: 'device', targetId: 'x', paths: { lv: '/shop/foo', ru: '/ru/foo' } }), null);
  assert.equal(normalizeServiceLink({ type: 'category', categoryKey: 'foo', path: 'https://external.example/' }), null);
});

test('legacy paths remain safe while canonical home, category and brand links expose both locales', () => {
  assert.deepEqual(normalizeServiceLink({ type: 'home', path: '/' }), SERVICE_HOME_LINK);
  assert.deepEqual(normalizeServiceLink({ type: 'category', categoryKey: 'iphone-remonts', path: '/iphone-remonts' }), link('category', { categoryKey: 'iphone-remonts' }, '/iphone-remonts', '/ru/remont-iphone'));
  assert.deepEqual(normalizeServiceLink({ type: 'brand', categoryKey: 'telefonu-remonts', brandKey: 'samsung', path: '/telefonu-remonts/samsung' }), link('brand', { categoryKey: 'telefonu-remonts', brandKey: 'samsung' }, '/telefonu-remonts/samsung', '/ru/remont-telefonov/samsung'));
  const legacyDevice = normalizeServiceLink({ type: 'device', targetId: 'iphone-15-pro', path: '/iphone-remonts/iphone-15-pro' });
  assert.deepEqual(legacyDevice.paths, { lv: '/iphone-remonts/iphone-15-pro' });
  assert.equal(servicePathForLocale(legacyDevice, 'ru'), '/iphone-remonts/iphone-15-pro');
});

test('Service path selection honors locale and uses safe language-specific fallbacks', () => {
  const exact = link('device', { targetId: 'iphone-15-pro' }, '/iphone-remonts/iphone-15-pro', '/ru/remont-iphone/iphone-15-pro');
  assert.equal(servicePathForLocale(exact, 'lv'), '/iphone-remonts/iphone-15-pro');
  assert.equal(servicePathForLocale(exact, 'ru'), '/ru/remont-iphone/iphone-15-pro');
  assert.equal(servicePathForLocale({ type: 'device', targetId: 'old', paths: { lv: '/safe-lv' } }, 'ru'), '/safe-lv');
  assert.equal(servicePathForLocale(null, 'lv'), '/');
  assert.equal(servicePathForLocale(null, 'ru'), '/ru');
});

test('Product Service destinations resolve through Models and deduplicate by target identity', () => {
  const devices = [
    { id: 'brand', type: 'brand', name: 'iPhone', status: 'active', serviceLink: link('category', { categoryKey: 'iphone-remonts' }, '/iphone-remonts', '/ru/remont-iphone') },
    { id: 'series', type: 'series', parentId: 'brand', status: 'active' },
    { id: 'm1', type: 'model', name: 'iPhone 14', parentId: 'series', status: 'active' },
    { id: 'm2', type: 'model', name: 'iPhone 14 Plus', parentId: 'series', status: 'active' },
    { id: 'm3', type: 'model', name: 'iPhone 15 Pro', parentId: 'series', status: 'active', serviceLink: link('device', { targetId: 'iphone-15-pro' }, '/iphone-remonts/iphone-15-pro', '/ru/remont-iphone/iphone-15-pro') },
    { id: 'm4', type: 'model', name: 'iPhone 15', parentId: 'series', status: 'active', serviceLink: link('device', { targetId: 'iphone-15' }, '/iphone-remonts/iphone-15', '/ru/remont-iphone/iphone-15') },
  ];
  assert.deepEqual(resolveProductServiceLinks(['m1', 'm2', 'stale'], devices).map((item) => item.serviceLink.type), ['category']);
  assert.deepEqual(resolveProductServiceLinks(['m1', 'm3'], devices).map((item) => item.serviceLink.paths.ru), ['/ru/remont-iphone', '/ru/remont-iphone/iphone-15-pro']);
  assert.deepEqual(resolveProductServiceLinks(['m3', 'm4'], devices).map((item) => item.serviceLink.targetId), ['iphone-15-pro', 'iphone-15']);
  assert.deepEqual(resolveProductServiceLinks(['stale'], devices)[0].serviceLink, SERVICE_HOME_LINK);
});

test('target resolver uses actual translated category slugs and dedicated iPhone hub routing', () => {
  const targets = buildServiceTargets([
    { id: 'phones', slug: 'telefonu-remonts', name: 'Phones', brands: [{ key: 'apple', name: 'Apple', route: { preferDedicatedHub: true, dedicatedHubPath: '/iphone-remonts' } }, { key: 'samsung', name: 'Samsung' }] },
    { id: 'iphone', slug: 'iphone-remonts', name: 'iPhone repairs', brands: [] },
  ], [{ id: 'iphone-15', slug: 'iphone-15', name: 'iPhone 15', categoryKey: 'telefonu-remonts', brandKey: 'apple' }, { id: 'service-s24-record', slug: 's24', name: 'S24', categoryKey: 'telefonu-remonts', brandKey: 'samsung' }]);
  const iphoneHub = targets.brandTargets.find((target) => target.name === 'Apple repair');
  const samsung = targets.brandTargets.find((target) => target.name === 'Samsung repair');
  const iphone = targets.deviceTargets.find((target) => target.targetId === 'iphone-15');
  const galaxy = targets.deviceTargets.find((target) => target.slug === 's24');
  assert.deepEqual(serviceLinkFromTarget(iphoneHub), link('category', { categoryKey: 'iphone-remonts' }, '/iphone-remonts', '/ru/remont-iphone'));
  assert.equal(samsung.paths.ru, '/ru/remont-telefonov/samsung');
  assert.equal(iphone.paths.ru, '/ru/remont-iphone/iphone-15');
  assert.equal(galaxy.paths.ru, '/ru/remont-telefonov/samsung/s24');
  assert.equal(galaxy.targetId, 'service-s24-record');
  assert.equal(serviceLinkFromTarget(galaxy).targetId, 'service-s24-record');
});

test('Admin validation defaults new Brands to bilingual Service home and accepts canonical exact Model links', () => {
  assert.deepEqual(validateDeviceCreate({ name: 'New', slug: 'new', status: 'active', type: 'brand', parentId: null }).serviceLink, SERVICE_HOME_LINK);
  const device = link('device', { targetId: 's24' }, '/telefonu-remonts/samsung/s24', '/ru/remont-telefonov/samsung/s24');
  assert.deepEqual(validateDeviceCreate({ name: 'S24', slug: 's24', status: 'active', type: 'model', parentId: 'series', serviceLink: device }).serviceLink, device);
  assert.equal(Object.hasOwn(validateDeviceCreate({ name: 'Series', slug: 'series', status: 'active', type: 'series', parentId: 'brand', serviceLink: device }), 'serviceLink'), false);
  assert.throws(() => validateDeviceCreate({ name: 'Bad', slug: 'bad', status: 'active', type: 'brand', parentId: null, serviceLink: device }), CatalogError);
  assert.throws(() => validateDeviceCreate({ name: 'Bad', slug: 'bad', status: 'active', type: 'model', parentId: 'series', serviceLink: { type: 'device', targetId: 'x', paths: { lv: 'https://ilab.lv/x', ru: '/ru/x' } } }), CatalogError);
  assert.equal(validateDeviceUpdate({ name: 'S24', slug: 's24', status: 'active', serviceLink: null }, { type: 'model' }).serviceLink, null);
});
