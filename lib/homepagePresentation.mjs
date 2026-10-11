const normalize = (value) => typeof value === 'string' ? value.trim().toLowerCase().replaceAll('&', 'and').replace(/[^a-z0-9]+/g, '-') .replace(/^-|-$/g, '') : '';

export const APPLE_CATEGORY_NAMES = Object.freeze(['iPhone', 'iPad', 'MacBook', 'Apple Watch']);
export const SECONDARY_BRAND_NAMES = Object.freeze(['Samsung', 'Xiaomi', 'Huawei']);

export const PRODUCT_TYPE_THUMBNAILS = Object.freeze({
  displays: '/shop/images/part_type_thumbnails/displays.webp',
  batteries: '/shop/images/part_type_thumbnails/batteries.webp',
  cameras: '/shop/images/part_type_thumbnails/cameras.webp',
  housings: '/shop/images/part_type_thumbnails/housings.webp',
  'charging-port-flex': '/shop/images/part_type_thumbnails/charging-port-flex.webp',
  buttons: '/shop/images/part_type_thumbnails/buttons.webp',
  connectors: '/shop/images/part_type_thumbnails/connectors.webp',
  'sound-vibration': '/shop/images/part_type_thumbnails/sound-vibration.webp',
});

export const BRAND_LOGOS = Object.freeze({
  samsung: '/shop/images/logos/samsung-logo.svg',
  xiaomi: '/shop/images/logos/xiaomi-logo.svg',
  huawei: '/shop/images/logos/huawei-logo.svg',
});

function findActiveByName(records, name) { const target = normalize(name); return records.find((record) => normalize(record.name) === target && record.slug) ?? null; }
export function resolveHomepageBrands(brands) { return { apple: APPLE_CATEGORY_NAMES.map((name) => findActiveByName(brands, name)).filter(Boolean), secondary: SECONDARY_BRAND_NAMES.map((name) => findActiveByName(brands, name)).filter(Boolean) }; }
export function productTypeThumbnail(type) { return PRODUCT_TYPE_THUMBNAILS[normalize(type?.slug) || normalize(type?.id)] ?? PRODUCT_TYPE_THUMBNAILS[normalize(type?.name)] ?? null; }
export function resolveProductTypeSelection(value, productTypes) { if (typeof value !== 'string') return ''; return productTypes.some((type) => type.id === value) ? value : ''; }
export function resolveAccessoriesType(productTypes) { return productTypes.find((type) => ['chargers', 'accessories', 'chargers-and-accessories'].includes(normalize(type.name)) || ['chargers', 'accessories', 'chargers-and-accessories'].includes(normalize(type.slug))) ?? null; }
export function catalogPageState(page, activeType) { return { products: page.products, cursor: page.nextCursor, hasMore: page.hasMore, activeType }; }
