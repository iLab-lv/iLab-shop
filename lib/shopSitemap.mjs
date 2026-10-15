export const SHOP_SITEMAP_ORIGIN = 'https://ilab.lv';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validSlug(value) {
  return typeof value === 'string' && value.length <= 160 && SLUG_PATTERN.test(value);
}

export function normalizeSitemapLastModified(value) {
  let date = null;
  try {
    if (value instanceof Date) date = value;
    else if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
    else if (typeof value?.toDate === 'function') date = value.toDate();
  } catch {
    return undefined;
  }
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : undefined;
}

export function buildShopSitemap({ devices = [], products = [], origin = SHOP_SITEMAP_ORIGIN } = {}) {
  const normalizedOrigin = String(origin).replace(/\/+$/, '');
  const entries = [];
  const seen = new Set();
  const add = (path, updatedAt) => {
    const url = `${normalizedOrigin}${path}`;
    if (seen.has(url)) return;
    seen.add(url);
    const lastModified = normalizeSitemapLastModified(updatedAt);
    entries.push(lastModified ? { url, lastModified } : { url });
  };

  add('/shop');
  const activeDevices = devices.filter((device) => device?.status === 'active');
  const devicesById = new Map(activeDevices.filter((device) => typeof device.id === 'string').map((device) => [device.id, device]));

  for (const brand of activeDevices) {
    if (brand.type === 'brand' && validSlug(brand.slug)) add(`/shop/${brand.slug}`, brand.updatedAt);
  }

  for (const model of activeDevices) {
    if (model.type !== 'model' || !validSlug(model.slug)) continue;
    const series = devicesById.get(model.parentId);
    const brand = series?.type === 'series' ? devicesById.get(series.parentId) : null;
    if (series?.status !== 'active' || brand?.type !== 'brand' || brand.status !== 'active' || !validSlug(brand.slug)) continue;
    add(`/shop/${brand.slug}/${model.slug}`, model.updatedAt);
  }

  for (const product of products) {
    if (product?.status === 'active' && validSlug(product.slug)) add(`/shop/product/${product.slug}`, product.updatedAt);
  }

  return entries;
}
