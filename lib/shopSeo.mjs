export const SHOP_PUBLIC_ORIGIN = 'https://ilab.lv';
export const SHOP_PUBLIC_BASE_PATH = '/shop';

export function shopCanonicalUrl(path = '/') {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[?#]/.test(path)) {
    throw new TypeError('Shop canonical paths must be absolute internal paths without query or hash.');
  }
  const route = path === '/' ? '' : path.replace(/\/+$/, '');
  const mountedPath = route === '/shop' || route.startsWith('/shop/')
    ? route
    : `${SHOP_PUBLIC_BASE_PATH}${route}`;
  return `${SHOP_PUBLIC_ORIGIN}${mountedPath || SHOP_PUBLIC_BASE_PATH}`;
}

export function buildShopPageMetadata({ title, description, path, noindex = false } = {}) {
  const canonical = shopCanonicalUrl(path);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'website', title, description, url: canonical, siteName: 'iLab Shop' },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export function buildProductStructuredData(product, path) {
  if (!product || typeof product.name !== 'string' || !product.name.trim()) return null;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name.trim(),
    url: shopCanonicalUrl(path),
  };
  if (typeof product.description === 'string' && product.description.trim()) data.description = product.description.trim();
  if (Number.isSafeInteger(product.sku) && product.sku > 0) data.sku = String(product.sku);
  const images = Array.isArray(product.imagePaths) ? product.imagePaths.filter((value) => {
    try { return new URL(value).protocol === 'https:'; } catch { return false; }
  }) : [];
  if (images.length) data.image = images;

  if (Number.isSafeInteger(product.retailPriceCents) && product.retailPriceCents > 0) {
    const offer = {
      '@type': 'Offer',
      url: data.url,
      priceCurrency: 'EUR',
      price: (product.retailPriceCents / 100).toFixed(2),
    };
    if (product.stockQtyKnown !== false && Number.isSafeInteger(product.stockQty) && product.stockQty >= 0) {
      offer.availability = product.stockQty > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
    }
    data.offers = offer;
  }
  return data;
}

export function buildBreadcrumbStructuredData(items, currentPath) {
  if (!Array.isArray(items) || !items.length || !currentPath) return null;
  const list = [{ label: 'Shop', href: '/' }, ...items];
  const itemListElement = list.map((item, index) => {
    const path = item.href || (index === list.length - 1 ? currentPath : null);
    if (!path || typeof item.label !== 'string' || !item.label.trim()) return null;
    return {
      '@type': 'ListItem',
      position: index + 1,
      name: item.label.trim(),
      item: shopCanonicalUrl(path),
    };
  }).filter(Boolean);
  if (itemListElement.length < 2) return null;
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement };
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => ({
    '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029',
  })[character]);
}
