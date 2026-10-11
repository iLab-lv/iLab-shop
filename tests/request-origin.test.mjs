import assert from 'node:assert/strict';
import test from 'node:test';
import { isSameOriginRequest } from '../lib/auth/requestOrigin.mjs';

function request(url, headers = {}) {
  return { url, headers: new Headers(headers) };
}

test('accepts a direct same-origin mutation request', () => {
  assert.equal(isSameOriginRequest(request('http://localhost:3000/shop/api/admin/products/1', {
    origin: 'http://localhost:3000',
    host: 'localhost:3000',
  })), true);
});

test('accepts the public origin supplied by a trusted reverse proxy', () => {
  assert.equal(isSameOriginRequest(request('http://internal:3000/shop/api/admin/products/1', {
    origin: 'https://shop.ilab.lv',
    host: 'internal:3000',
    'x-forwarded-host': 'shop.ilab.lv',
    'x-forwarded-proto': 'https',
  })), true);
});

test('rejects absent, malformed, non-http, and cross-origin values', () => {
  const url = 'http://internal:3000/shop/api/admin/users/1';
  const proxyHeaders = { host: 'internal:3000', 'x-forwarded-host': 'shop.ilab.lv', 'x-forwarded-proto': 'https' };
  assert.equal(isSameOriginRequest(request(url, proxyHeaders)), false);
  assert.equal(isSameOriginRequest(request(url, { ...proxyHeaders, origin: 'not a URL' })), false);
  assert.equal(isSameOriginRequest(request(url, { ...proxyHeaders, origin: 'file:///tmp/test' })), false);
  assert.equal(isSameOriginRequest(request(url, { ...proxyHeaders, origin: 'https://attacker.example' })), false);
});

test('uses only the first forwarded value and rejects protocol mismatches', () => {
  const url = 'http://internal:3000/shop/api/admin/products/1';
  assert.equal(isSameOriginRequest(request(url, {
    origin: 'https://shop.ilab.lv',
    'x-forwarded-host': 'shop.ilab.lv, attacker.example',
    'x-forwarded-proto': 'https, http',
  })), true);
  assert.equal(isSameOriginRequest(request(url, {
    origin: 'http://shop.ilab.lv',
    'x-forwarded-host': 'shop.ilab.lv',
    'x-forwarded-proto': 'https',
  })), false);
});
