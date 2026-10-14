import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isCheckoutRoute } from '../lib/checkoutNavigation.mjs';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('only the internal Checkout route selects the Place order dock action', () => {
  assert.equal(isCheckoutRoute('/checkout'), true);
  assert.equal(isCheckoutRoute('/'), false);
  assert.equal(isCheckoutRoute('/account'), false);
  assert.equal(isCheckoutRoute('/shop/checkout'), false);
});

test('fixed dock submits the existing native Checkout form and shares only submitting state', async () => {
  const dock = await source('../app/components/shop/ShopCtaDock.js');
  const checkout = await source('../app/(shop)/checkout/CheckoutClient.js');
  const shell = await source('../app/components/shop/ShopShell.js');
  assert.match(dock, /usePathname\(\)/);
  assert.match(dock, /type="submit" form=\{CHECKOUT_FORM_ID\}/);
  assert.match(dock, /Placing order…/);
  assert.match(dock, /status === 'loading' \|\| !valid \|\| items\.length === 0/);
  assert.match(checkout, /id=\{CHECKOUT_FORM_ID\}[^>]*onSubmit=\{submit\}/);
  assert.match(checkout, /setOrder\(\{ \.\.\.result\.order, profileSaveFailed: result\.profileSaved === false \}\)/);
  assert.match(checkout, /View invoice/);
  assert.match(checkout, /Download invoice/);
  assert.match(checkout, /href="\/account#orders"/);
  assert.doesNotMatch(checkout, /router\.replace|router\.refresh/);
  assert.match(checkout, /cart\.clearCart\(\)/);
  assert.match(dock, /isCheckout && orderPlaced \? null/);
  assert.match(shell, /ShopCheckoutActionProvider/);
  assert.doesNotMatch(dock, /fetch\(|api\/orders/);
});

test('Account Orders stays in its normal state without confirmation query highlighting', async () => {
  const account = await source('../app/(shop)/account/page.js');
  assert.match(account, /id="orders"/);
  assert.doesNotMatch(account, /searchParams|confirmedOrder|selectedOrder|highlighted/);
});

test('Checkout keeps the summary submit button and current payment descriptions', async () => {
  const checkout = await source('../app/(shop)/checkout/CheckoutClient.js');
  assert.match(checkout, /className=\{styles\.summary\}[\s\S]*?<button type="submit" disabled=\{submitting \|\| !cart\.valid\}/);
  assert.match(checkout, /Your invoice will be available immediately after placing the order\./);
  assert.match(checkout, /Pay when collecting the order\./);
  assert.doesNotMatch(checkout, /provided separately/);
});
