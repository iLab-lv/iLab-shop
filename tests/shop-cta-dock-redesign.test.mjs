import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('shop dock uses the approved 1024px action layout without replacing checkout behavior', async () => {
  const [component, styles] = await Promise.all([
    source('../app/components/shop/ShopCtaDock.js'),
    source('../app/components/shop/ShopCtaDock.module.css'),
  ]);
  assert.match(styles, /max-width:\s*1023px/);
  assert.match(styles, /min-width:\s*1280px/);
  assert.match(styles, /grid-template-columns:\s*1fr 1fr/);
  assert.match(component, /type="submit" form=\{CHECKOUT_FORM_ID\}/);
  assert.match(component, /status === 'loading' \|\| !valid \|\| items\.length === 0/);
  assert.doesNotMatch(component, /fetch\(|api\/orders/);
});

test('contact and cart drawers retain real settings and cart state through the shared shell', async () => {
  const [contact, cart, panel] = await Promise.all([
    source('../app/components/shop/ContactPanel.js'),
    source('../app/components/shop/CartDrawer.js'),
    source('../app/components/shop/ShopFullscreenPanel.js'),
  ]);
  assert.match(contact, /useShopSettings\(\)/);
  assert.match(contact, /settings\.pickupLocations/);
  assert.match(contact, /variant="drawer"/);
  assert.match(cart, /useCart\(\)/);
  assert.match(cart, /<ShopDrawer/);
  assert.match(panel, /variant === 'drawer'.*<ShopDrawer/);
  // Focus, backdrop, viewport scrolling and locking are exercised in browser/shop-overlays.cjs.
});
