import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanServiceLocaleParam, normalizeServiceLocale, resolveServiceLocale, serviceLocaleCookie, serviceLocaleFromReferrer } from '../lib/serviceLocale.mjs';

const origin = 'https://ilab.lv';

test('Service locale accepts only lv and ru and resolves query before cookie and referrer', () => {
  assert.equal(normalizeServiceLocale('ru'), 'ru');
  assert.equal(normalizeServiceLocale('lv'), 'lv');
  assert.equal(normalizeServiceLocale('RU'), null);
  assert.equal(resolveServiceLocale({ incoming: 'ru', cookie: 'lv', origin }), 'ru');
  assert.equal(resolveServiceLocale({ incoming: 'lv', cookie: 'ru', origin }), 'lv');
  assert.equal(resolveServiceLocale({ incoming: 'invalid', cookie: 'ru', origin }), 'ru');
  assert.equal(resolveServiceLocale({ cookie: 'lv', referrer: `${origin}/ru/remont-iphone`, origin }), 'lv');
  assert.equal(resolveServiceLocale({ incoming: 'invalid', origin }), 'lv');
  assert.equal(resolveServiceLocale({ incoming: 'invalid', cookie: 'invalid', origin }), 'lv');
});

test('referrer fallback trusts same-origin non-Shop Service pages only', () => {
  assert.equal(serviceLocaleFromReferrer(`${origin}/ru/remont-iphone`, origin), 'ru');
  assert.equal(serviceLocaleFromReferrer(`${origin}/ru`, origin), 'ru');
  assert.equal(serviceLocaleFromReferrer(`${origin}/iphone-remonts`, origin), 'lv');
  assert.equal(serviceLocaleFromReferrer(`${origin}/shop/iphone`, origin), null);
  assert.equal(serviceLocaleFromReferrer('https://external.example/ru/page', origin), null);
  assert.equal(serviceLocaleFromReferrer('not a url', origin), null);
});

test('serviceLocale query cleanup preserves unrelated query params and hash', () => {
  assert.equal(cleanServiceLocaleParam(`${origin}/shop/iphone?serviceLocale=ru`), '/shop/iphone');
  assert.equal(cleanServiceLocaleParam(`${origin}/shop?type=battery&serviceLocale=ru`), '/shop?type=battery');
  assert.equal(cleanServiceLocaleParam(`${origin}/shop?serviceLocale=ru&foo=bar#products`), '/shop?foo=bar#products');
  assert.equal(cleanServiceLocaleParam(`${origin}/shop?type=battery`), '/shop?type=battery');
});

test('locale cookie is first-party, root-scoped, functional, and accepts only supported values', () => {
  assert.equal(serviceLocaleCookie('ru'), 'ilab_service_locale=ru; Max-Age=31536000; Path=/; SameSite=Lax');
  assert.equal(serviceLocaleCookie('lv', { secure: true }), 'ilab_service_locale=lv; Max-Age=31536000; Path=/; SameSite=Lax; Secure');
  assert.equal(serviceLocaleCookie('invalid'), 'ilab_service_locale=lv; Max-Age=31536000; Path=/; SameSite=Lax');
});
