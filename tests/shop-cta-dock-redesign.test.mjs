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

test('contact and cart drawers retain real settings, cart state, and accessible mechanics', async () => {
  const [contact, cart, cartStyles, panel, panelStyles] = await Promise.all([
    source('../app/components/shop/ContactPanel.js'),
    source('../app/components/shop/CartDrawer.js'),
    source('../app/components/shop/CartDrawer.module.css'),
    source('../app/components/shop/ShopFullscreenPanel.js'),
    source('../app/components/shop/ShopFullscreenPanel.module.css'),
  ]);
  assert.match(contact, /useShopSettings\(\)/);
  assert.match(contact, /settings\.pickupLocations/);
  assert.match(contact, /variant="drawer"/);
  assert.match(cart, /useCart\(\)/);
  assert.match(cart, /event\.key === 'Escape'/);
  assert.match(cart, /event\.key !== 'Tab'/);
  assert.match(cart, /previousFocus\.current\?\.focus/);
  assert.match(cartStyles, /width:\s*min\(560px,100%\)/);
  assert.match(panel, /event\.target === event\.currentTarget/);
  assert.match(panelStyles, /width:\s*min\(560px,100%\)/);
  assert.match(panelStyles, /max-width:\s*1023px/);
});
