import { spawn, spawnSync } from 'node:child_process';
import { createServer, connect as connectTcp } from 'node:net';
import { generateKeyPairSync } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'demo-ilab-shop-s3a-visual';
const FIRESTORE_PORT = 8080;
const AUTH_PORT = 9099;
const NEXT_PORT = 3000;
const SCREENSHOT_DIR = path.join(ROOT, 'docs', 'shop-s3a', 'evidence');
const ADMIN_EMAIL = 's3a-visual-admin@example.invalid';
const ADMIN_PASSWORD = 'Visual-Only-S3A-2026!';
const children = [];
let cdp;
let chromeProfile;

function delay(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function logChild(child, label) {
  child.stdout?.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr?.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  children.push(child);
  child.on('error', (error) => console.error(`[${label}] ${error.message}`));
  return child;
}

function assertNoUnsafeFirebaseEnvironment() {
  const projectValues = ['FIREBASE_PROJECT_ID', 'GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT']
    .map((key) => process.env[key]).filter(Boolean);
  if (projectValues.some((value) => !value.startsWith('demo-'))) {
    throw new Error('Refusing visual QA: process Firebase project variables must be unset or a demo project.');
  }
}

function visualEnvironment() {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(FIREBASE_|NEXT_PUBLIC_FIREBASE_|GOOGLE_APPLICATION_CREDENTIALS$|GCLOUD_PROJECT$|GOOGLE_CLOUD_PROJECT$|STORAGE_EMULATOR_HOST$)/.test(key)) delete env[key];
  }
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  const bucket = `${PROJECT}.appspot.com`;
  Object.assign(env, {
    CI: 'true',
    GCLOUD_PROJECT: PROJECT,
    GOOGLE_CLOUD_PROJECT: PROJECT,
    FIREBASE_PROJECT_ID: PROJECT,
    FIREBASE_CLIENT_EMAIL: `visual-only@${PROJECT}.iam.gserviceaccount.com`,
    FIREBASE_PRIVATE_KEY: privateKey.replaceAll('\n', '\\n'),
    FIREBASE_STORAGE_BUCKET: bucket,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT,
    NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${PROJECT}.firebaseapp.com`,
    NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: bucket,
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL: `http://127.0.0.1:${AUTH_PORT}`,
    FIRESTORE_EMULATOR_HOST: `127.0.0.1:${FIRESTORE_PORT}`,
    FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${AUTH_PORT}`,
    FIREBASE_EMULATORS_PATH: path.join(ROOT, '.local-tools', 'firebase-emulators'),
    FIREBASE_CONFIG: JSON.stringify({ projectId: PROJECT, storageBucket: bucket }),
    XDG_CONFIG_HOME: path.join(ROOT, '.local-tools', 'firebase-config'),
  });
  delete env.FIREBASE_TOKEN;
  delete env.GOOGLE_APPLICATION_CREDENTIALS;
  return env;
}

async function assertPortAvailable(port) {
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', (error) => error.code === 'EADDRINUSE'
      ? reject(new Error(`Port ${port} is already in use; stop that process before visual QA.`))
      : reject(error));
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
}

async function waitForPort(port, child, timeoutMs = 120_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`Process exited before port ${port} became ready.`);
    const connected = await new Promise((resolve) => {
      const socket = connectTcp({ host: '127.0.0.1', port });
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => resolve(false));
    });
    if (connected) return;
    await delay(400);
  }
  throw new Error(`Timed out waiting for local port ${port}.`);
}

async function seedVisualData(env) {
  console.log('[visual-qa] Seeding isolated Firestore and Auth fixtures.');
  const [{ initializeApp, cert, deleteApp }, { getFirestore, FieldValue }, { getAuth }] = await Promise.all([
    import('firebase-admin/app'), import('firebase-admin/firestore'), import('firebase-admin/auth'),
  ]);
  const app = initializeApp({
    projectId: PROJECT,
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
    credential: cert({ projectId: PROJECT, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replaceAll('\\n', '\n') }),
  }, `shop-visual-seed-${process.pid}`);
  const db = getFirestore(app);
  const auth = getAuth(app);
  console.log('[visual-qa] Admin SDK initialized for emulator seeding.');
  try {
    const now = FieldValue.serverTimestamp();
    const brands = [
      ['iphone', 'iPhone'], ['ipad', 'iPad'], ['macbook', 'MacBook'], ['apple-watch', 'Apple Watch'],
      ['samsung', 'Samsung'], ['xiaomi', 'Xiaomi'], ['huawei', 'Huawei'],
    ];
    const batch = db.batch();
    batch.set(db.doc('shopSettings/general'), {
      currency: 'EUR', tax: { pricesIncludeVat: true, vatRatePercent: 21 },
      delivery: { courierPriceCents: 0, omnivaParcelMachinePriceCents: 0 },
      contact: { email: 'visual-shop@example.invalid', phone: '+371 20000000' },
      pickupLocations: [{ id: 'visual-location', name: 'Visual QA pickup', address: 'Test street 1, Riga', phone: '+371 20000000', email: 'visual-shop@example.invalid', whatsapp: 'https://wa.me/37120000000', directions: 'https://maps.google.com/?q=Riga', hours: ['Mon–Fri 10:00–18:00'], status: 'active', order: 0 }],
      updatedAt: now,
    });
    for (const [order, [id, name]] of brands.entries()) {
      batch.set(db.doc(`shopDevices/${id}`), { id, name, slug: id, type: 'brand', status: 'active', order, serviceLink: { type: 'home', paths: { lv: '/', ru: '/ru' } } });
      const seriesId = `series-${id}`;
      const modelId = `model-${id}-visual`;
      batch.set(db.doc(`shopDevices/${seriesId}`), { id: seriesId, name: `${name} test series`, slug: seriesId, type: 'series', status: 'active', parentId: id, order: 0 });
      batch.set(db.doc(`shopDevices/${modelId}`), { id: modelId, name: id === 'iphone' ? 'iPhone 15' : `${name} test model`, slug: modelId, type: 'model', status: 'active', parentId: seriesId, order: 0, serviceLink: { type: 'home', paths: { lv: '/', ru: '/ru' } } });
    }
    batch.set(db.doc('shopProductTypes/screen-repair'), { id: 'screen-repair', name: 'Screens', slug: 'screens', status: 'active', order: 0 });
    batch.set(db.doc('shopProducts/visual-screen-assembly'), {
      id: 'visual-screen-assembly', sku: 990001, slug: 'visual-screen-assembly', name: 'Visual Test Screen Assembly',
      description: 'Synthetic catalog fixture for local layout verification.', retailPriceCents: 4990,
      productTypeId: 'screen-repair', modelIds: ['model-iphone-visual'], seriesIds: ['series-iphone'], brandIds: ['iphone'],
      imagePaths: [], stockQty: 4, status: 'active', createdAt: now, updatedAt: now,
    });
    console.log('[visual-qa] Committing synthetic Firestore documents.');
    await batch.commit();
    console.log('[visual-qa] Firestore fixtures ready.');

    await auth.createUser({ uid: 's3a-visual-admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, displayName: 'S3A Visual Admin' });
    console.log('[visual-qa] Synthetic Admin Auth user ready.');
    await db.doc('users/s3a-visual-admin').set({
      uid: 's3a-visual-admin', email: ADMIN_EMAIL, name: 'S3A Visual Admin', phone: '+371 20000000',
      role: 'admin', status: 'active', partnerStatus: 'none', discountPercent: 0, billingAddress: '',
      createdAt: now, updatedAt: now,
    });
  } finally {
    await deleteApp(app);
  }
}

class DevTools {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    this.listeners = new Map();
    socket.addEventListener('message', async ({ data }) => {
      const raw = typeof data === 'string' ? data : data instanceof Blob ? await data.text() : String(data);
      const message = JSON.parse(raw);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else {
        for (const listener of this.listeners.get(message.method) ?? []) listener(message.params);
      }
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return new DevTools(socket);
  }

  send(method, params = {}, timeoutMs = 20_000) {
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`DevTools timed out: ${method}`)); }, timeoutMs);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(listener);
  }

  once(method, timeoutMs = 30_000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.listeners.get(method)?.delete(listener); reject(new Error(`Timed out waiting for ${method}`)); }, timeoutMs);
      const listener = (params) => { clearTimeout(timer); this.listeners.get(method)?.delete(listener); resolve(params); };
      this.on(method, listener);
    });
  }

  async evaluate(expression) {
    const result = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Browser evaluation failed.');
    return result.result?.value;
  }

  async clickSelector(selector) {
    const point = await this.evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      element.scrollIntoViewIfNeeded?.();
      const rect = element.getBoundingClientRect();
      return rect.width && rect.height ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null;
    })()`);
    if (!point) throw new Error(`Browser control is missing or hidden: ${selector}`);
    await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
    await delay(250);
  }

  async navigate(url, width, height = 900) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: height });
    const loaded = this.once('Page.loadEventFired');
    const nav = await this.send('Page.navigate', { url });
    if (nav.errorText) throw new Error(`Navigation failed: ${nav.errorText}`);
    await loaded;
    await delay(600);
    return this.evaluate(`(() => {
      const shopTypographyNode = document.querySelector('[class*="ShopShell_shell"]') || document.querySelector('header') || document.body;
      return ({
      url: location.href, title: document.title, readyState: document.readyState,
      innerWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      shell: Boolean(document.querySelector('header') && document.querySelector('footer')),
      header: Boolean(document.querySelector('header')),
      footer: Boolean(document.querySelector('footer')),
      shopFont: getComputedStyle(shopTypographyNode).fontFamily,
      monoFont: [...document.querySelectorAll('footer h2')].map((node) => getComputedStyle(node).fontFamily)[0] || '',
      shopFontFaces: [...document.fonts].filter((face) => /Geologica|IBM Plex Mono/i.test(face.family)).map((face) => ({ family: face.family, status: face.status })),
    }); })()`);
  }

  async screenshot(file) {
    const layout = await this.send('Page.getLayoutMetrics');
    const size = layout.cssContentSize ?? layout.contentSize;
    const height = Math.max(1, Math.min(12_000, Math.ceil(size.height)));
    const result = await this.send('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: Math.ceil(size.width), height, scale: 1 },
    });
    await writeFile(file, Buffer.from(result.data, 'base64'));
  }
}

async function waitForHttp(url, child, timeoutMs = 120_000) {
  const end = Date.now() + timeoutMs;
  let last = 'no response';
  while (Date.now() < end) {
    if (child.exitCode !== null) throw new Error(`Shop dev server exited early (${child.exitCode}).`);
    try {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10_000) });
      if (response.status === 200) return;
      last = `HTTP ${response.status}`;
      if (response.status >= 500) {
        const body = (await response.text()).slice(0, 600);
        throw new Error(`Local Shop route failed: HTTP ${response.status}. ${body}`);
      }
    } catch (error) {
      if (error.message.startsWith('Local Shop route failed:')) throw error;
      last = error.message;
    }
    await delay(700);
  }
  throw new Error(`Timed out waiting for the local Shop route (${last}).`);
}

async function assertPortFree(port) { return assertPortAvailable(port); }

async function captureAndCheckBrowser() {
  const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  if (!existsSync(chromePath)) throw new Error('Chrome not found. Set CHROME_PATH to a local Chrome/Chromium executable.');
  chromeProfile = await mkdtemp(path.join(os.tmpdir(), 'ilab-shop-s3a-chrome-'));
  const chrome = logChild(spawn(chromePath, [
    '--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--disable-background-networking', '--disable-sync', '--disable-gpu', '--no-sandbox',
    '--remote-allow-origins=*', '--remote-debugging-port=0', `--user-data-dir=${chromeProfile}`, 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true }), 'chrome');

  const activePortPath = path.join(chromeProfile, 'DevToolsActivePort');
  let devtoolsPort;
  const portEnd = Date.now() + 20_000;
  while (Date.now() < portEnd) {
    if (chrome.exitCode !== null) throw new Error('Chrome exited before enabling its local DevTools endpoint.');
    try { devtoolsPort = Number((await readFile(activePortPath, 'utf8')).split(/\r?\n/)[0]); if (devtoolsPort) break; } catch {}
    await delay(200);
  }
  if (!devtoolsPort) throw new Error('Chrome did not expose its isolated DevTools endpoint.');

  const targets = await (await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`)).json();
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('Chrome did not create a page target.');
  cdp = await DevTools.connect(page.webSocketDebuggerUrl);
  const browserErrors = [];
  const failedRequests = [];
  const requestUrls = new Map();
  cdp.on('Runtime.exceptionThrown', (event) => browserErrors.push(event.exceptionDetails?.text || 'Uncaught browser exception'));
  cdp.on('Log.entryAdded', ({ entry }) => { if (entry.level === 'error') browserErrors.push(entry.text); });
  cdp.on('Network.requestWillBeSent', (event) => requestUrls.set(event.requestId, event.request.url));
  cdp.on('Network.loadingFailed', (event) => failedRequests.push({ url: requestUrls.get(event.requestId) || event.requestId, error: event.errorText }));
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Log.enable');

  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const pages = [];
  for (const [width, name] of [[375, 'shop-mobile-375.png'], [1024, 'shop-breakpoint-1024.png'], [1440, 'shop-desktop-1440.png']]) {
    console.log(`[visual-qa] Capturing public Shop at ${width}px.`);
    const pageResult = await cdp.navigate(`http://127.0.0.1:${NEXT_PORT}/shop`, width);
    if (pageResult.scrollWidth > pageResult.innerWidth) throw new Error(`Horizontal overflow at ${width}px (${pageResult.scrollWidth}px document).`);
    if (!pageResult.header || !pageResult.footer) throw new Error(`Shop shell elements missing at ${width}px: ${JSON.stringify(pageResult)}.`);
    await cdp.evaluate(`(() => document.querySelectorAll('nextjs-portal').forEach((node) => { node.style.display = 'none'; }))()`);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, name));
    pages.push({ ...pageResult, screenshot: name });

    const serviceLink = await cdp.evaluate(`(() => [...document.querySelectorAll('a')].find((a) => /Repair service|Serviss/.test(a.textContent))?.href || '')()`);
    if (!serviceLink.startsWith('https://ilab.lv/')) throw new Error(`Service destination missing or incorrect at ${width}px.`);
    const legalLink = await cdp.evaluate(`(() => [...document.querySelectorAll('a')].find((a) => a.textContent.includes('Terms & privacy'))?.href || '')()`);
    if (legalLink !== 'https://ilab.lv/noteikumi') throw new Error(`Footer terms destination is incorrect at ${width}px.`);
  }

  await cdp.navigate(`http://127.0.0.1:${NEXT_PORT}/shop`, 375);
  console.log('[visual-qa] Checking mobile menu and account entry.');
  await cdp.clickSelector('button[aria-label="Open shop menu"]');
  const settledMenuCheck = await cdp.evaluate(`(() => {
    const menu = document.querySelector('[role="dialog"][aria-label="Shop navigation"]');
    const hasLogin = Boolean(menu && [...menu.querySelectorAll('button')].some((candidate) => candidate.textContent.trim() === 'Login'));
    const service = menu?.querySelector('a[href^="https://ilab.lv/"]');
    return { ok: Boolean(menu && hasLogin && service), menu: Boolean(menu), hasLogin, service: service?.href || '' };
  })()`);
  if (!settledMenuCheck.ok) throw new Error(`Mobile menu verification failed: ${JSON.stringify(settledMenuCheck)}.`);
  await cdp.clickSelector('[role="dialog"][aria-label="Shop navigation"] button');
  await delay(150);
  const authModal = await cdp.evaluate(`(() => Boolean(document.querySelector('[role="dialog"][aria-labelledby="auth-title"]')))`);
  if (!authModal) throw new Error('Mobile Login did not open its authentication dialog.');
  await cdp.navigate(`http://127.0.0.1:${NEXT_PORT}/shop`, 375);
  await cdp.clickSelector('button[aria-label="Open shop menu"]');
  const menuCanReopen = await cdp.evaluate(`(() => Boolean(document.querySelector('[role="dialog"][aria-label="Shop navigation"]')))`);
  if (!menuCanReopen) throw new Error('Mobile navigation did not reopen after returning from Login.');
  await cdp.clickSelector('button[aria-label="Close shop menu"]');

  console.log('[visual-qa] Checking cart, contact, and search entry points.');
  await cdp.clickSelector('aside[aria-label="Quick actions"] button:nth-child(2)');
  const cartOpen = await cdp.evaluate(`(() => Boolean(document.querySelector('#shop-cart-drawer[role="dialog"]')))`);
  if (!cartOpen) throw new Error('Cart dock did not open the Cart drawer.');
  await cdp.clickSelector('#shop-cart-drawer button[aria-label="Close cart"]');
  const cartClosedByButton = !(await cdp.evaluate(`(() => Boolean(document.querySelector('#shop-cart-drawer')))`));

  await cdp.clickSelector('aside[aria-label="Quick actions"] button:first-child');
  const contactOpen = await cdp.evaluate(`(() => Boolean(document.querySelector('#shop-contact-panel[role="dialog"]')))`);
  if (!contactOpen) throw new Error('Contact action did not open the Contact panel.');
  const cartClosedByContact = !(await cdp.evaluate(`(() => Boolean(document.querySelector('#shop-cart-drawer')))`));
  await cdp.clickSelector('#shop-contact-panel button[aria-label="Close Contacts"]');

  await cdp.clickSelector('button[aria-label="Open catalog search"]');
  const searchOpen = await cdp.evaluate(`(() => Boolean(document.querySelector('#shop-search-panel[role="dialog"]')))`);
  if (!searchOpen) throw new Error('Search entry did not open the Search panel.');
  await cdp.clickSelector('#shop-search-panel button[aria-label="Close Search"]');

  console.log('[visual-qa] Checking isolated Admin login and dashboard.');
  await cdp.navigate(`http://127.0.0.1:${NEXT_PORT}/shop/admin`, 1440);
  const adminLogin = await cdp.evaluate(`(() => Boolean(document.querySelector('#admin-email') && document.querySelector('#admin-password')))`);
  if (!adminLogin) throw new Error('Unauthenticated Admin route did not show its isolated login screen.');
  await cdp.evaluate(`(() => {
    const email = document.querySelector('#admin-email');
    const password = document.querySelector('#admin-password');
    const set = (input, value) => { input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); };
    set(email, ${JSON.stringify(ADMIN_EMAIL)}); set(password, ${JSON.stringify(ADMIN_PASSWORD)});
    email.form.requestSubmit();
  })()`);
  const adminEnd = Date.now() + 30_000;
  let adminState;
  while (Date.now() < adminEnd) {
    await delay(350);
    adminState = await cdp.evaluate(`(() => ({
      title: document.querySelector('h1')?.textContent?.trim() || '',
      dashboard: document.querySelector('h1')?.textContent?.trim() === 'Dashboard' && document.body.innerText.includes('Sales this month'),
      loginError: document.querySelector('[role="alert"]')?.textContent || '',
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      font: getComputedStyle(document.querySelector('h1') || document.body).fontFamily,
      shopHeader: Boolean(document.querySelector('a[aria-label="iLab Shop home"]')),
      shopFooter: Boolean(document.querySelector('a[href="https://ilab.lv/noteikumi"]')),
      navText: document.querySelector('nav')?.innerText || '',
    }))()`);
    if (adminState.dashboard || adminState.loginError) break;
  }
  if (!adminState?.dashboard) throw new Error(`Synthetic Admin sign-in did not reach the dashboard: ${JSON.stringify(adminState)}.`);
  if (adminState.scrollWidth > adminState.width) throw new Error(`Admin horizontal overflow at 1440px (${adminState.scrollWidth}px).`);
  if (!adminState.font.toLowerCase().includes('inter')) throw new Error(`Admin typography changed from Inter: ${adminState.font}.`);
  if (adminState.shopHeader || adminState.shopFooter) throw new Error('Public Shop header or footer leaked into Admin.');
  if (!/catalog/i.test(adminState.navText)) throw new Error('Admin navigation did not render.');
  await cdp.evaluate(`(() => document.querySelectorAll('nextjs-portal').forEach((node) => { node.style.display = 'none'; }))()`);
  await cdp.screenshot(path.join(SCREENSHOT_DIR, 'admin-dashboard-1440.png'));

  const consoleErrors = [...new Set(browserErrors)];
  const blockedFontRequests = failedRequests.filter(({ url }) => /^https:\/\/fonts\.(googleapis|gstatic)\.com\//i.test(url));
  const significantConsoleErrors = consoleErrors.filter((error) => !(blockedFontRequests.length && /Failed to load resource: net::ERR_NETWORK_ACCESS_DENIED/i.test(error)));
  const significantFailedRequests = failedRequests.filter(({ url }) => !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//i.test(url));
  if (significantConsoleErrors.length) throw new Error(`Browser console errors: ${significantConsoleErrors.join(' | ')}`);
  if (significantFailedRequests.length) throw new Error(`Browser requests failed: ${JSON.stringify(significantFailedRequests)}`);
  return {
    pages,
    interactions: { mobileMenu: settledMenuCheck, authModalOpens: true, mobileMenuReopens: true, cartOpens: true, cartCloseButtonClosed: cartClosedByButton, contactOpens: true, contactClosesCart: cartClosedByContact, searchOpensAndCloses: true },
    admin: adminState,
    consoleErrors: significantConsoleErrors,
    failedRequests: significantFailedRequests.slice(0, 20),
    blockedFontRequests,
  };
}

async function verifyNoSyntheticCommerceWrites(env) {
  const [{ initializeApp, cert, deleteApp }, { getFirestore }] = await Promise.all([
    import('firebase-admin/app'), import('firebase-admin/firestore'),
  ]);
  const app = initializeApp({ projectId: PROJECT, credential: cert({ projectId: PROJECT, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey: env.FIREBASE_PRIVATE_KEY.replaceAll('\\n', '\n') }) }, `shop-visual-check-${process.pid}`);
  try {
    const db = getFirestore(app);
    const [orders, inquiries, products] = await Promise.all([
      db.collection('shopOrders').get(), db.collection('shopInquiries').get(), db.collection('shopProducts').get(),
    ]);
    if (orders.size || inquiries.size || products.size !== 1) throw new Error('Unexpected data change detected in the isolated visual emulator.');
    return { orders: orders.size, inquiries: inquiries.size, products: products.size };
  } finally { await deleteApp(app); }
}

async function stopProcess(child) {
  if (process.platform === 'win32' && child.pid) {
    if (child.exitCode !== null) return;
    child.kill('SIGINT');
    await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(1_000)]);
    if (child.exitCode === null) {
      try { process.kill(child.pid); } catch { /* The process may exit during cleanup. */ }
    }
    return;
  }
  if (child.exitCode !== null || child.killed) return;
  child.kill('SIGINT');
  await Promise.race([new Promise((resolve) => child.once('exit', resolve)), delay(6_000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

function stopTestPortListeners() {
  if (process.platform !== 'win32') return;
  const result = spawnSync('netstat.exe', ['-ano', '-p', 'tcp'], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) return;
  const testPorts = new Set([FIRESTORE_PORT, AUTH_PORT, 4400, 4500, 9150, NEXT_PORT]);
  const pids = new Set();
  for (const line of result.stdout.split(/\r?\n/)) {
    const match = /^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i.exec(line);
    if (match && testPorts.has(Number(match[1]))) pids.add(match[2]);
  }
  for (const pid of pids) {
    try { process.kill(Number(pid)); } catch { /* The process may exit during cleanup. */ }
  }
}

async function main() {
  assertNoUnsafeFirebaseEnvironment();
  for (const port of [FIRESTORE_PORT, AUTH_PORT, 4400, NEXT_PORT]) await assertPortFree(port);
  const env = visualEnvironment();
  const javaHome = path.join(ROOT, '.local-tools', 'java21', 'jdk-21.0.13+9-jre');
  if (existsSync(path.join(javaHome, 'bin', 'java.exe'))) {
    env.JAVA_HOME = javaHome;
    env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${env.PATH ?? env.Path ?? ''}`;
    delete env.Path;
  }
  // Admin SDK seeding runs in this process, so it needs the same guarded
  // emulator endpoints as the child processes. Never carry ambient Firebase
  // project or credentials into that SDK instance.
  for (const key of Object.keys(process.env)) {
    if (/^(FIREBASE_|NEXT_PUBLIC_FIREBASE_|GOOGLE_APPLICATION_CREDENTIALS$|GCLOUD_PROJECT$|GOOGLE_CLOUD_PROJECT$|STORAGE_EMULATOR_HOST$)/.test(key)) delete process.env[key];
  }
  for (const key of ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_STORAGE_BUCKET', 'FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']) {
    process.env[key] = env[key];
  }
  await mkdir(path.join(ROOT, '.local-tools', 'firebase-config'), { recursive: true });
  const firebaseCli = path.join(ROOT, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js');
  const emulator = logChild(spawn(process.execPath, [firebaseCli, 'emulators:start', '--config', 'firebase.emulators.json', '--project', PROJECT, '--only', 'auth,firestore'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }), 'firebase-emulators');
  await Promise.all([waitForPort(FIRESTORE_PORT, emulator), waitForPort(AUTH_PORT, emulator)]);
  console.log('[visual-qa] Emulator endpoints ready.');
  await seedVisualData(env);

  const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
  const server = logChild(spawn(process.execPath, [nextBin, 'dev', '--hostname', '127.0.0.1', '--port', String(NEXT_PORT)], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }), 'shop-dev');
  await waitForHttp(`http://127.0.0.1:${NEXT_PORT}/shop`, server);
  const browser = await captureAndCheckBrowser();
  const emulatorData = await verifyNoSyntheticCommerceWrites(env);
  const networkLimitations = browser.blockedFontRequests.length
    ? ['Google Fonts stylesheet denied by restricted network; Geologica and IBM Plex Mono files were not loaded']
    : [];
  const result = { project: PROJECT, productionAccess: false, pages: browser.pages, interactions: browser.interactions, admin: browser.admin, consoleErrors: browser.consoleErrors, failedRequests: browser.failedRequests, blockedFontRequests: browser.blockedFontRequests, networkLimitations, emulatorData, screenshots: SCREENSHOT_DIR };
  await writeFile(path.join(SCREENSHOT_DIR, 'verification.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(`Visual QA failed: ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  if (cdp) {
    try { await cdp.send('Browser.close', {}, 2_000); } catch { /* Chrome may already be exiting. */ }
    cdp.socket.close();
  }
  for (const child of children.reverse()) await stopProcess(child);
  stopTestPortListeners();
  if (chromeProfile && path.resolve(chromeProfile).startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(chromeProfile).startsWith('ilab-shop-s3a-chrome-')) {
    try { await rm(chromeProfile, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 }); } catch { /* Chrome may still hold transient crash-report files. */ }
  }
}
