import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildHeaderBrandNavigation, isBrandPathActive } from '../lib/shopHeaderNavigation.mjs';

const brands = Array.from({ length: 7 }, (_, index) => ({
  id: `brand-${index + 1}`,
  name: `Brand ${index + 1}`,
  slug: `brand-${index + 1}`,
  status: 'active',
  order: index,
}));

test('first five valid active brands are direct and the rest overflow in canonical input order', () => {
  const navigation = buildHeaderBrandNavigation(brands);
  assert.deepEqual(navigation.direct.map((brand) => brand.slug), brands.slice(0, 5).map((brand) => brand.slug));
  assert.deepEqual(navigation.overflow.map((brand) => brand.slug), brands.slice(5).map((brand) => brand.slug));
});

test('More is unnecessary with five or fewer brands', () => {
  assert.equal(buildHeaderBrandNavigation(brands.slice(0, 5)).overflow.length, 0);
});

test('inactive, missing-slug, and duplicate brands cannot create header links', () => {
  const navigation = buildHeaderBrandNavigation([
    ...brands.slice(0, 2),
    { id: 'inactive', name: 'Hidden', slug: 'hidden', status: 'inactive' },
    { id: 'broken', name: 'Broken', slug: '', status: 'active' },
    { id: 'duplicate', name: 'Duplicate', slug: 'brand-1', status: 'active' },
  ]);
  assert.deepEqual(navigation.all.map((brand) => brand.slug), ['brand-1', 'brand-2']);
});

test('brand active state supports Shop basePath and nested Model pages', () => {
  assert.equal(isBrandPathActive('/samsung', 'samsung'), true);
  assert.equal(isBrandPathActive('/shop/samsung/galaxy-s24', 'samsung'), true);
  assert.equal(isBrandPathActive('/product/screen', 'samsung'), false);
});

test('header source keeps the logo home link and removes Catalog navigation', async () => {
  const source = await readFile(new URL('../app/components/shop/ShopHeader.js', import.meta.url), 'utf8');
  assert.match(source, /className=\{styles\.logo\} href="\/"/);
  assert.doesNotMatch(source, /label:\s*['"]Catalog['"]/);
  assert.match(source, /navigation\.all\.map/);
  assert.match(source, /event\.key !== 'Escape'/);
  assert.match(source, /onClick=\{\(\) => setMoreOpen\(false\)\}/);
});

test('Shop header follows Service hierarchy with one responsive Service switch', async () => {
  const [source, styles, shell, authStyles] = await Promise.all([
    readFile(new URL('../app/components/shop/ShopHeader.js', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/shop/ShopHeader.module.css', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/shop/ShopShell.module.css', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/AuthControl.module.css', import.meta.url), 'utf8'),
  ]);
  const innerRules = styles.match(/\.inner\s*\{([^}]+)\}/)?.[1] || '';
  assert.match(source, /className=\{styles\.brand\}[\s\S]*?<SiteSwitcher className=\{styles\.siteSwitcher\}/);
  assert.match(source, /className=\{styles\.desktopNav\}/);
  assert.equal((source.match(/<SiteSwitcher\b/g) || []).length, 1);
  assert.ok(source.indexOf('className={styles.logo}') < source.indexOf('<SiteSwitcher'));
  assert.ok(source.indexOf('<SiteSwitcher') < source.indexOf('className={styles.desktopNav}'));
  assert.match(source, /Image src="\/shop\/brand\/logo\.svg"/);
  const [switcher, switchStyles] = await Promise.all([
    readFile(new URL('../app/components/shop/SiteSwitcher.js', import.meta.url), 'utf8'),
    readFile(new URL('../app/components/shop/SiteSwitcher.module.css', import.meta.url), 'utf8'),
  ]);
  assert.match(switcher, /href=\{targetHref\}/);
  assert.match(switcher, /<span className=\{styles\.track\}/);
  assert.match(switcher, /<span>\{label\}<\/span>/);
  assert.match(switcher, /servicePathForLocale\(SERVICE_HOME_LINK, locale\)/);
  assert.match(switchStyles, /\.switcher[\s\S]*?\.track/);
  assert.match(switchStyles, /height:\s*44px/);
  assert.match(switchStyles, /width:\s*38px[\s\S]*?height:\s*20px[\s\S]*?border:\s*1px solid #47c6e2/);
  assert.match(innerRules, /width:\s*100%/);
  assert.doesNotMatch(innerRules, /max-width/);
  assert.match(styles, /background:\s*#070a0d/);
  const heroCss = await readFile(new URL('../app/components/shop/HomepageHero.module.css', import.meta.url), 'utf8');
  assert.match(heroCss, /background:\s*var\(--color-shop-paper\)/);
  assert.match(heroCss, /@media\s*\(min-width:\s*1280px\)[\s\S]*?\.hero\s*\{\s*margin-inline:\s*0/);
  assert.match(shell, /@media\s*\(min-width:\s*1280px\)\s*\{\s*\.content\s*\{\s*margin-inline:\s*96px/);
  assert.match(authStyles, /\.headerVariant \.primaryButton\s*\{[^}]*color:\s*#f2f5f7/);
  assert.match(styles, /@media\s*\(min-width:\s*1024px\)[\s\S]*?\.desktopNav\s*\{\s*display:\s*flex/s);
  assert.match(styles, /@media\s*\(max-width:\s*1023px\)/);
  // Fixed positioning, content clearance and always-visible labels are checked in browser/shop-overlays.cjs.
});
