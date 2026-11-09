// Run with `node tests/browser/shop-overlays.cjs`. No live Firebase/API access.
// PLAYWRIGHT_MODULE and CHROME_PATH can override the local browser installation.
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const assert = require('node:assert/strict');
const webpack = require('next/dist/compiled/webpack/webpack').webpack;
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/info/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, '.local-tools/overlay-browser');
const fixture = name => path.join(__dirname, `overlay-harness-${name}.js`);
const build = () => new Promise((resolve, reject) => webpack({
  mode: 'development', devtool: false, entry: fixture('entry'), output: { path: output, filename: 'bundle.js' },
  resolve: { extensions: ['.js', '.mjs'], alias: {
    'next/link$': path.join(__dirname, 'checkout-harness-link.js'), 'next/image$': fixture('image'),
    'next/navigation$': fixture('services'), 'firebase/auth$': fixture('services'),
    [path.join(root, 'lib/firebaseClient.js')]: fixture('services'),
    [path.join(root, 'app/components/ProductImage.js')]: fixture('image'),
  } },
  module: { rules: [{ test: /\.(js|mjs|css)$/, exclude: /node_modules/, use: path.join(__dirname, 'overlay-harness-loader.cjs') }] },
}, (error, stats) => error ? reject(error) : stats.hasErrors() ? reject(Error(stats.toString({ all: false, errors: true }))) : resolve()));
const tokens = fs.readFileSync(path.join(root, 'app/styles/tokens.css'), 'utf8');
const globals = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8').replace('@import "./styles/tokens.css";', '');
const font = fs.readFileSync(path.join(root, 'node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2')).toString('base64');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,${font})} :root{--font-inter:Inter} ${tokens} ${globals}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>`;
const server = http.createServer((req, res) => {
  if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'application/javascript'); fs.createReadStream(path.join(output, 'bundle.js')).pipe(res); }
  else if (req.url === '/shop/brand/logo.svg') { res.setHeader('Content-Type', 'image/svg+xml'); fs.createReadStream(path.join(root, 'public/brand/logo.svg')).pipe(res); }
  else { res.setHeader('Content-Type', 'text/html'); res.end(html); }
});
let browser;
const results = [];
const account = page => page.getByRole('dialog', { name: 'Account', exact: true });
const settleClosed = page => page.waitForFunction(() => !document.querySelector('dialog[open]'));
async function openAccount(page, width, preserveScroll = false) {
  const activate = locator => preserveScroll ? locator.evaluate(node => { node.focus({ preventScroll: true }); node.click(); }) : locator.click();
  if (width < 1024) {
    await activate(page.getByRole('button', { name: 'Open shop menu', exact: true }));
    await page.getByRole('dialog', { name: 'Shop navigation', exact: true }).getByRole('button', { name: 'Login', exact: true }).click();
  } else await activate(page.getByRole('button', { name: 'Login', exact: true }));
  await account(page).waitFor();
  await page.waitForFunction(() => document.querySelector('dialog[open][data-state="open"]')?.contains(document.activeElement));
}
async function run(name, viewport, check, options = {}) {
  if (process.env.OVERLAY_TEST_FILTER && !name.includes(process.env.OVERLAY_TEST_FILTER)) return;
  const context = await browser.newContext({ viewport, hasTouch: viewport.width < 1024, reducedMotion: options.reducedMotion || 'no-preference' });
  const requests = [], errors = [];
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === base && !url.pathname.startsWith('/shop/api/')) return route.continue();
    assert.equal(url.origin, base, 'No external service is allowed in this fixture');
    const body = request.postDataJSON();
    requests.push({ path: url.pathname, method: request.method(), body });
    let result;
    if (url.pathname === '/shop/api/cart/resolve') result = { currency: 'EUR', lines: body.items.map(item => ({ productId: item.productId, name: 'Fixture screen', slug: 'fixture-screen', sku: 123, stockQty: 10, applicableUnitPriceCents: 1000, unavailableReason: null, primaryImagePath: null })) };
    else if (url.pathname === '/shop/api/cart/account') result = { userId: 'fixture-user', items: body?.items || [], revision: 1 };
    else if (url.pathname === '/shop/api/catalog/search-data') result = { devices: [{ id: 'apple', name: 'Apple', slug: 'apple', type: 'brand' }, { id: 'series', name: 'Phones', type: 'series', parentId: 'apple' }, { id: 'phone', name: 'Fixture phone', slug: 'fixture-phone', type: 'model', parentId: 'series' }], productTypes: [], products: [{ id: 'fixture-product', name: 'Fixture screen', slug: 'fixture-screen', sku: 123, brandIds: ['apple'], seriesIds: ['series'], modelIds: ['phone'], stockQty: 0, retailPriceCents: null }] };
    else if (url.pathname === '/shop/api/users/me') result = { profile: { uid: 'fixture-user', role: 'customer', status: 'active', name: 'Fixture Customer', email: 'fixture@example.invalid', phone: '12345678' } };
    else if (url.pathname === '/shop/api/auth/session' || url.pathname === '/shop/api/inquiries') result = { ok: true };
    else throw Error(`Unexpected fixture request: ${url.pathname}`);
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(result) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(`${base}/?serviceLocale=lv`);
    await page.getByRole('button', { name: 'Open catalog search' }).waitFor();
    await check(page, requests);
    assert.deepEqual(errors, [], 'Browser runtime errors');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Horizontal overflow');
    results.push({ name, ...viewport, passed: true, requests: requests.length });
    console.log(`PASS ${name} ${viewport.width}x${viewport.height}`);
  } catch (error) {
    await page.screenshot({ path: path.join(output, 'failure.png') });
    console.error(await page.locator('body').innerText());
    console.error(errors);
    throw error;
  } finally { await context.close(); }
}
let base;
(async () => {
  fs.mkdirSync(output, { recursive: true });
  await build();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  for (const width of [1920, 1440, 1280, 1279, 768, 390]) {
    await run('footer stays between navigation rulers', { width, height: 900 }, async page => {
      const footer = page.getByRole('contentinfo');
      await footer.scrollIntoViewIfNeeded();
      const rect = await footer.boundingBox();
      const content = await page.locator('[data-shop-content]').boundingBox();
      assert.equal(rect.x, content.x, 'Footer shares the page content boundary');
      assert.equal(rect.width, content.width);
      const inset = width >= 1280 ? 96 : 0;
      assert.equal(rect.x, inset);
      assert.equal(rect.x + rect.width, width - inset, 'Footer background ends before the right ruler');
      const outside = await footer.evaluate(node => {
        const frame = node.getBoundingClientRect();
        return [...node.querySelectorAll('a,button,address,p')].some(child => {
          const rect = child.getBoundingClientRect();
          return rect.left < frame.left || rect.right > frame.right;
        });
      });
      assert.equal(outside, false, 'Footer content stays within its boundary');
      if (width === 1440 || width === 390) await page.screenshot({ path: path.join(output, `footer-${width}.png`) });
    });
  }
  for (const width of [1440, 1280, 1024, 768, 390, 375, 320]) {
    await run('fixed topbar and labeled Service switcher', { width, height: 900 }, async page => {
      const header = page.locator('[data-shop-header]');
      const switcher = header.getByRole('link', { name: 'Serviss', exact: true });
      await switcher.waitFor();
      assert.equal(await switcher.evaluate(node => node.parentElement.contains(document.querySelector('[aria-label="iLab Shop home"]'))), true, 'Logo and switcher share the brand group');
      const content = await page.locator('[data-shop-content]').boundingBox();
      assert.equal(content.y, 72, 'Page content clears the fixed topbar');
      for (const scroll of [0, 450, 1300]) {
        await page.evaluate(y => scrollTo(0, y), scroll);
        const rect = await header.boundingBox();
        assert.equal(rect.y, 0, 'Topbar remains at the viewport top during scroll');
        assert.equal(rect.height, 72);
        assert.equal(rect.width, width);
        assert.equal(await header.evaluate(node => node.scrollWidth > node.clientWidth), false, 'Header controls fit without overflow');
        if (width >= 1024) {
          const lastBrandEdge = await header.getByRole('navigation').evaluate(node => Math.max(...[...node.querySelector('ul').children].map(item => item.getBoundingClientRect().right)));
          const login = await header.getByRole('button', { name: 'Login', exact: true }).boundingBox();
          assert.ok(lastBrandEdge < login.x, 'Brand links fit between the brand group and actions');
        }
        const label = await switcher.locator('span').last().boundingBox();
        assert.ok(label && label.width > 0 && label.x >= 0 && label.x + label.width <= width, 'Switcher text stays visible');
        const search = await header.getByRole('button', { name: 'Open catalog search' }).boundingBox();
        assert.ok(label.x + label.width < search.x, 'Switcher does not overlap the action controls');
      }
      await page.getByRole('button', { name: 'Open catalog search' }).click();
      await page.getByRole('dialog', { name: 'Search panel' }).waitFor();
      await page.keyboard.press('Escape'); await settleClosed(page);
      assert.equal(await page.evaluate(() => scrollY), 1300, 'Closing an overlay preserves the scrolled fixed-header layout');
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(output, `topbar-${width}.png`) });
    });
  }
  for (const [width, height] of [[1440, 900], [1280, 720], [768, 900], [390, 844], [375, 667], [390, 360]]) {
    await run('register scrolling and focus', { width, height }, async page => {
      await page.evaluate(() => scrollTo(0, 450));
      const originalScroll = await page.evaluate(() => scrollY);
      await openAccount(page, width, true);
      const dialog = account(page), close = dialog.getByRole('button', { name: 'Close account panel' });
      await dialog.getByRole('button', { name: 'Register', exact: true }).first().click();
      await dialog.locator('[name=companyName]').fill('Fixture company');
      const body = dialog.locator('[data-shop-overlay-body]');
      const geometry = await dialog.locator('[data-shop-drawer]').evaluate(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }));
      assert.equal(geometry.width, Math.min(560, width));
      assert.equal(geometry.height, height);
      assert.equal(await page.evaluate(() => document.body.style.position), 'fixed');
      assert.equal(await page.locator('input[type=range]').isVisible(), false, 'Navigation ruler stays hidden during modality');
      await page.locator('#background-action').evaluate(node => node.focus());
      assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true, 'Native modality blocks background focus');
      await body.hover(); await page.mouse.wheel(0, 2000);
      await page.waitForFunction(() => [...document.querySelectorAll('dialog[open] [data-shop-overlay-body]')].some(node => node.scrollTop > 0));
      const submit = dialog.locator('button[type=submit]');
      await submit.scrollIntoViewIfNeeded();
      const bottom = await submit.boundingBox();
      assert.ok(bottom.y >= 0 && bottom.y + bottom.height <= height + 1, 'Submit is reachable');
      const closeRect = await close.boundingBox(); assert.ok(closeRect.y >= 0 && closeRect.y + closeRect.height <= height);
      await submit.focus(); await page.keyboard.press('Tab');
      assert.equal(await close.evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('Shift+Tab'); assert.equal(await submit.evaluate(node => node === document.activeElement), true);
      await page.keyboard.press('Shift+Tab'); assert.equal(await dialog.locator('[name=confirmPassword]').evaluate(node => node === document.activeElement), true);
      if (width === 375 || width === 1440) await page.screenshot({ path: path.join(output, `register-${width}.png`) });
      await page.keyboard.press('Escape'); await settleClosed(page);
      assert.equal(await page.evaluate(() => scrollY), originalScroll);
      const trigger = width < 1024 ? page.getByRole('button', { name: 'Open shop menu', exact: true }) : page.getByRole('button', { name: 'Login', exact: true });
      assert.equal(await trigger.evaluate(node => node === document.activeElement), true);
      for (let cycle = 0; cycle < 2; cycle++) { await openAccount(page, width, true); await page.keyboard.press('Escape'); await settleClosed(page); }
      assert.equal(await page.evaluate(() => document.body.style.position), '');
      assert.equal(await page.evaluate(() => scrollY), originalScroll);
    });
  }
  await run('auth validation, recovery and busy guard', { width: 1280, height: 720 }, async page => {
    await openAccount(page, 1280);
    const dialog = account(page);
    await dialog.locator('[name=email]').fill('fixture@example.invalid');
    await dialog.getByRole('button', { name: /Aizmirs/ }).click();
    assert.equal(await dialog.locator('input[type=email]').inputValue(), 'fixture@example.invalid');
    await dialog.locator('button[type=submit]').click();
    await dialog.getByRole('status').waitFor();
    assert.equal(await page.evaluate(() => window.__authCalls.at(-1).kind), 'recovery');
    await dialog.getByRole('button', { name: /Atpaka/ }).click();
    await dialog.locator('[name=password]').fill('fixture-password');
    await page.evaluate(() => { window.__authFail = true; window.__authDelay = 500; });
    await dialog.locator('button[type=submit]').click();
    await page.keyboard.press('Escape'); assert.equal(await dialog.isVisible(), true);
    await dialog.getByRole('alert').waitFor();
    assert.match(await dialog.getByRole('alert').innerText(), /incorrect/);
    await dialog.getByRole('button', { name: 'Register', exact: true }).first().click();
    await dialog.locator('[name=name]').fill('Fixture Customer'); await dialog.locator('[name=phone]').fill('12345678');
    await dialog.locator('[name=password]').fill('fixture-password'); await dialog.locator('[name=confirmPassword]').fill('different');
    await dialog.locator('button[type=submit]').click();
    assert.match(await dialog.getByRole('alert').innerText(), /Passwords do not match/);
    await dialog.locator('[name=confirmPassword]').fill('fixture-password');
    await page.evaluate(() => { window.__authFail = false; window.__authDelay = 0; });
    await dialog.locator('button[type=submit]').click(); await settleClosed(page);
    await page.getByRole('banner').getByRole('link', { name: 'My account', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__authCalls.at(-1).kind), 'register');
  });
  await run('cart quantities and checkout authentication', { width: 1280, height: 720 }, async page => {
    await page.locator('#background-action').click();
    const cart = page.getByRole('dialog', { name: 'Cart', exact: true });
    await cart.getByRole('button', { name: 'Increase Fixture screen quantity' }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('ilab_shop_cart_v1'))[0].quantity === 2);
    await cart.getByRole('button', { name: 'Decrease Fixture screen quantity' }).click();
    await cart.getByRole('link', { name: 'Proceed to checkout' }).click();
    await account(page).waitFor();
    await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 1);
    assert.match(await account(page).innerText(), /return to checkout/);
    await account(page).locator('[name=email]').fill('fixture@example.invalid');
    await account(page).locator('[name=password]').fill('fixture-password');
    await account(page).locator('button[type=submit]').click(); await settleClosed(page);
    assert.equal(await page.evaluate(() => window.__navigation), '/checkout');
  });
  await run('search to inquiry, contact and backdrop', { width: 1440, height: 900 }, async (page, requests) => {
    const searchTrigger = page.getByRole('button', { name: 'Open catalog search' });
    await searchTrigger.click();
    const search = page.getByRole('dialog', { name: 'Search panel' });
    const input = search.getByRole('searchbox');
    await page.waitForFunction(() => document.activeElement?.id === 'catalog-search');
    await input.fill('fixture');
    await search.getByRole('link', { name: /Fixture phone/ }).waitFor();
    await search.getByRole('button', { name: 'Clear search' }).click();
    assert.equal(await input.evaluate(node => node === document.activeElement), true);
    await input.fill('fixture');
    await search.getByRole('button', { name: 'Send an inquiry about Fixture screen' }).click();
    const inquiry = page.getByRole('dialog', { name: 'Part inquiry panel' }); await inquiry.waitFor();
    await page.waitForFunction(() => document.querySelectorAll('dialog[open]').length === 1);
    await inquiry.getByLabel('Name', { exact: false }).fill('Fixture Customer');
    await inquiry.getByLabel('Email', { exact: true }).fill('fixture@example.invalid');
    await inquiry.getByRole('button', { name: 'Send Inquiry', exact: true }).click();
    await inquiry.getByRole('status').waitFor();
    assert.equal(requests.find(request => request.path === '/shop/api/inquiries').body.productId, 'fixture-product');
    await page.keyboard.press('Escape'); await settleClosed(page);
    assert.equal(await searchTrigger.evaluate(node => node === document.activeElement), true);
    await page.getByRole('complementary', { name: 'Quick actions' }).getByRole('button', { name: 'Contact us', exact: true }).click();
    const contact = page.getByRole('dialog', { name: 'Contacts', exact: true });
    await contact.getByRole('tab', { name: 'Spice Life' }).click();
    assert.equal(await contact.getByRole('tab', { name: 'Spice Life' }).getAttribute('aria-selected'), 'true');
    await page.screenshot({ path: path.join(output, 'contact-1440.png') });
    const frame = await contact.locator('[data-shop-drawer]').boundingBox();
    await page.mouse.move(frame.x + 10, 300); await page.mouse.down(); await page.mouse.move(10, 300); await page.mouse.up();
    assert.equal(await contact.isVisible(), true, 'Dragging out of a drawer does not close it');
    await page.mouse.click(10, 300); await settleClosed(page);
    assert.equal(await page.getByRole('complementary', { name: 'Quick actions' }).getByRole('button', { name: 'Contact us', exact: true }).evaluate(node => node === document.activeElement), true);
    assert.equal(await page.locator('input[type=range]').isVisible(), true, 'Ruler returns after close');
    assert.equal(await page.evaluate(() => document.body.style.position), '');
  });
  await run('touch scrolling and rapid overlay replacement', { width: 390, height: 667 }, async page => {
    await openAccount(page, 390);
    const dialog = account(page);
    await dialog.getByRole('button', { name: 'Register', exact: true }).first().click();
    const body = dialog.locator('[data-shop-overlay-body]');
    const rect = await body.boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const x = rect.x + rect.width / 2, start = rect.y + rect.height - 30;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: start }] });
    for (let step = 1; step <= 8; step++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: start - step * 35 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => document.querySelector('dialog[open] [data-shop-overlay-body]').scrollTop > 0);
    await page.keyboard.press('Escape'); await settleClosed(page);
    await page.evaluate(() => {
      scrollTo(0, 450);
      const contact = document.querySelector('[aria-controls="shop-contact-panel"]');
      const cart = document.querySelector('[aria-controls="shop-cart-drawer"]');
      contact.click();
      setTimeout(() => cart.click(), 60);
      setTimeout(() => { contact.click(); window.__overlayReplacementComplete = true; }, 120);
    });
    const contact = page.getByRole('dialog', { name: 'Contacts', exact: true });
    await contact.waitFor();
    await page.waitForFunction(() => window.__overlayReplacementComplete && document.querySelectorAll('dialog[open]').length === 1 && document.querySelector('dialog[open]').id === 'shop-contact-panel');
    await page.keyboard.press('Escape'); await settleClosed(page);
    assert.equal(await page.evaluate(() => document.body.style.position), '');
    assert.equal(await page.evaluate(() => scrollY), 450);
  });
  await run('mobile navigation, viewport resize and reduced motion', { width: 390, height: 844 }, async page => {
    await page.getByRole('button', { name: 'Open shop menu', exact: true }).click();
    const menu = page.getByRole('dialog', { name: 'Shop navigation', exact: true });
    await menu.getByRole('button', { name: 'Close shop menu' }).focus(); await page.keyboard.press('Shift+Tab');
    assert.equal(await menu.getByRole('button', { name: 'Login', exact: true }).evaluate(node => node === document.activeElement), true);
    await page.setViewportSize({ width: 1280, height: 720 }); await settleClosed(page);
    await openAccount(page, 1280); await account(page).getByRole('button', { name: 'Register', exact: true }).first().click();
    await account(page).locator('[name=confirmPassword]').focus();
    await page.setViewportSize({ width: 390, height: 360 });
    await page.waitForFunction(() => { const rect = document.activeElement.getBoundingClientRect(); return rect.bottom <= innerHeight && rect.top >= 0; });
    await page.keyboard.press('Escape'); await settleClosed(page);
    assert.equal(await page.evaluate(() => document.body.style.position), '');
  }, { reducedMotion: 'reduce' });
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log(`${results.length} browser scenarios passed; screenshots: ${output}`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); server.close(); });
