import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('public product cards use a 3/3/2 responsive image-first grid', async () => {
  const css = await source('../app/page.module.css');
  const cardCss = css.slice(css.indexOf('/* S3R.3.2:'));
  assert.match(css, /\.grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /@media\s*\(max-width:\s*1023px\)\s*\{\s*\.grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/s);
  assert.doesNotMatch(css, /@media\s*\(max-width:\s*(?:600|580|390)px\)\s*\{[^}]*\.grid\s*\{[^}]*grid-template-columns:\s*(?:minmax\(0,\s*1fr\)|repeat\(1,)/s);
  assert.match(cardCss, /\.cardMedia\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5/s);
  assert.match(cardCss, /\.productImage,\.imagePlaceholder\s*\{[^}]*height:\s*100%[^}]*object-fit:\s*contain/s);
  assert.match(cardCss, /\.card\s*\{[^}]*display:\s*grid[^}]*align-content:\s*start[^}]*gap:\s*14px[^}]*padding:\s*clamp\(18px,\s*2vw,\s*30px\)/s);
  assert.match(cardCss, /\.card\s*\{[^}]*background:\s*var\(--color-shop-paper\)/s);
  assert.match(cardCss, /\.cardMedia\s*\{[^}]*background:\s*var\(--color-surface\)/s);
  assert.doesNotMatch(cardCss, /\.card\s*\{[^}]*height:\s*100%/s);
  assert.match(cardCss, /\.card\s*\{[^}]*height:\s*auto/s);
  assert.match(cardCss, /\.grid\s*\{[^}]*width:\s*min\(100%,\s*calc\(100vw - 40px\)\)[^}]*max-width:\s*1248px[^}]*gap:\s*1px[^}]*background:\s*var\(--color-border\)[^}]*border-inline:\s*0/s);
  assert.match(cardCss, /@media\s*\(min-width:\s*768px\)\s*\{\s*\.grid\s*\{[^}]*100vw - 80px/s);
  assert.match(cardCss, /@media\s*\(min-width:\s*1280px\)\s*\{\s*\.grid\s*\{[^}]*100vw - 192px/s);
});

test('product cards expose one resolver-backed purchase or contextual inquiry action', async () => {
  const [card, inquiry, inquiryCss, addToCart, pageCss] = await Promise.all([
    source('../app/components/ProductCard.js'),
    source('../app/components/shop/PartInquiryCard.js'),
    source('../app/components/shop/PartInquiryCard.module.css'),
    source('../app/components/shop/AddToCartButton.js'),
    source('../app/page.module.css'),
  ]);
  assert.match(card, /resolveProductLine/);
  assert.match(card, /PartInquiryCard source="product"[\s\S]*?cardAction[\s\S]*?actionClassName/);
  assert.match(card, /<AddToCartButton[\s\S]*?label="Add to Cart"/);
  assert.match(card, /unavailable === 'missing_price' \? 'Price unavailable'/);
  assert.match(card, /unavailable === 'out_of_stock' \? <p className=\{styles\.availabilityMeta\}>Out of stock/);
  assert.ok(card.indexOf('<Link className={styles.cardMedia}') < card.indexOf('className={styles.productType}'));
  assert.ok(card.indexOf('className={styles.productType}') < card.indexOf('className={styles.productName}'));
  assert.ok(card.indexOf('className={styles.cardCommerce}') < card.indexOf('<PartInquiryCard'));
  assert.ok(card.indexOf('<PartInquiryCard') < card.indexOf('<details className={styles.compatibilityDetails}'));
  assert.match(card, /<details className=\{styles\.compatibilityDetails\}>\s*<summary>Compatible with \(\{compatibleModels\.length\}\)<\/summary>/);
  assert.match(card, /<ul>\{compatibleModels\.length \? compatibleModels\.map[\s\S]*?No compatible models listed\./);
  assert.match(pageCss, /\.compatibilityDetails\s*\{[^}]*padding-top:\s*10px[^}]*border-top:\s*1px solid var\(--color-border\)[^}]*border-bottom:\s*1px solid var\(--color-border\)/s);
  assert.match(pageCss, /\.compatibilityDetails ul\s*\{[^}]*display:\s*grid[^}]*gap:\s*2px[^}]*margin:\s*6px 0 10px/s);
  assert.doesNotMatch(pageCss, /\.compatibilityDetails summary::after/);
  assert.doesNotMatch(card, /className=\{styles\.cardBody\}|className=\{styles\.cardInfo\}/);
  assert.match(inquiry, /cardAction \? styles\.cardAction/);
  assert.match(inquiryCss, /\.compact \.availabilityAction > \.cardAction \{[^}]*width:\s*100%[^}]*min-height:\s*44px[^}]*border-radius:\s*0/s);
  assert.match(pageCss, /\.card \.addToCart \{[^}]*width:\s*100%[^}]*min-height:\s*44px[^}]*border-radius:\s*0/s);
  assert.match(inquiry, /showAvailabilityState \?/);
  assert.match(addToCart, /label = 'Add to cart'/);
  assert.match(addToCart, /\{label\}/);
});

test('public navigation rulers reuse Service section segments and a native vertical progress control', async () => {
  const [component, css, shell] = await Promise.all([
    source('../app/components/shop/ShopNavigationRulers.js'),
    source('../app/components/shop/ShopNavigationRulers.module.css'),
    source('../app/components/shop/ShopShell.js'),
  ]);
  assert.match(shell, /<ShopNavigationRulers\s*\/>/);
  assert.match(component, /querySelectorAll\('\[data-shop-ruler-section\]'\)/);
  assert.match(component, /aria-current=\{index === active \? 'location'/);
  assert.match(component, /type="range"[\s\S]*?aria-orientation="vertical"/);
  assert.match(component, /sections\.slice\(1\)\.map/);
  assert.match(component, /railSegment/);
  assert.match(component, /content\.querySelectorAll\('\[data-shop-ruler-section\]'\)/);
  assert.match(component, /section\.id && \(section\.querySelector/);
  assert.match(component, /requestAnimationFrame/);
  assert.match(css, /width:\s*96px/);
  assert.match(css, /left:\s*50%[\s\S]*?top:\s*96px[\s\S]*?bottom:\s*96px/);
  assert.match(css, /top:\s*calc\(96px \+ var\(--progress\) \* \(100% - 240px\)\)/);
  assert.match(css, /@media\s*\(min-width:\s*1280px\)\s*\{\s*\.rail\s*\{\s*display:\s*block/);
  assert.match(css, /\.railSections button:focus-visible/);
});

test('product detail follows the reference lower-page order with full-width repair, trust and inquiry sections', async () => {
  const [page, catalogCss, inquiryCss] = await Promise.all([
    source('../app/(shop)/product/[slug]/page.js'),
    source('../app/components/shop/CatalogPages.module.css'),
    source('../app/components/shop/PartInquiryCard.module.css'),
  ]);
  const compatibility = page.indexOf('id="shop-product-compatibility"');
  const repair = page.indexOf('<ServiceLinkCard variant="editorial"');
  const trust = page.indexOf('id="shop-product-trust"');
  const inquiry = page.indexOf('id="shop-product-inquiry"');
  assert.ok(compatibility < repair && repair < trust && trust < inquiry);
  assert.match(page, /<ShopTrustHighlights productStrip \/>/);
  assert.match(page, /PartInquiryCard source="product"[\s\S]*?inquiryPrompt/);
  assert.match(catalogCss, /\.productServiceLink\s*\{[^}]*width:\s*100%/);
  assert.match(inquiryCss, /\.editorialPrompt\s*\{[^}]*border-radius:\s*0/);
  assert.match(inquiryCss, /@media\s*\(min-width:\s*768px\)[\s\S]*?\.editorialPrompt\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto/);
});

test('catalog selectors and compact search results remain separate from card-grid presentation', async () => {
  const [device, catalog, search, searchCss] = await Promise.all([
    source('../app/components/shop/DeviceProducts.js'),
    source('../app/components/Catalog.js'),
    source('../app/components/shop/SearchPanel.js'),
    source('../app/components/shop/SearchPanel.module.css'),
  ]);
  assert.match(device, /aria-label="Filter compatible products"/);
  assert.match(device, /aria-pressed=\{!type\}/);
  assert.match(catalog, /data-shop-ruler-section/);
  assert.match(search, /resolveProductLine/);
  assert.match(searchCss, /grid-template-columns:\s*72px minmax\(0, 1fr\) auto/);
  assert.doesNotMatch(search, /from ['"]\.\.\/\.\.\/page\.module\.css['"]/);
});
