import { buildShopSitemap, SHOP_SITEMAP_ORIGIN } from './shopSitemap.mjs';

const FRESH_FOR_MS = 60 * 60 * 1000;
const MAX_STALE_FOR_MS = 24 * 60 * 60 * 1000;
const SITEMAP_PAGE_SIZE = 50000;

function xmlEscape(value) {
  return String(value).replace(/[<>&"']/g, (character) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

export function serializeShopSitemap(entries) {
  const body = entries.map((entry) => {
    const lastmod = entry.lastModified instanceof Date && Number.isFinite(entry.lastModified.getTime())
      ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
      : '';
    return `<url><loc>${xmlEscape(entry.url)}</loc>${lastmod}</url>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function serializeSitemapIndex(parts) {
  const body = parts.map((url) => `<sitemap><loc>${xmlEscape(url)}</loc></sitemap>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

export function createShopSitemapHandler({ getData, now = Date.now } = {}) {
  let cache = null;
  let refresh = null;

  return async function GET(request) {
    const time = now();
    if (cache && time - cache.createdAt < FRESH_FOR_MS) return sitemapResponse(cache.entries, request, false);
    if (!refresh) {
      refresh = Promise.resolve().then(getData).then((data) => {
        const entries = buildShopSitemap({ ...data, origin: SHOP_SITEMAP_ORIGIN });
        if (!Array.isArray(data?.devices) || !Array.isArray(data?.products) || entries.length <= 1) {
          throw new Error('Sitemap source returned no usable catalog routes.');
        }
        cache = { entries, createdAt: now() };
        return cache;
      }).finally(() => { refresh = null; });
    }

    try {
      const result = await refresh;
      return sitemapResponse(result.entries, request, false);
    } catch {
      if (cache && time - cache.createdAt < MAX_STALE_FOR_MS) return sitemapResponse(cache.entries, request, true);
      return new Response('Shop sitemap is temporarily unavailable. Please retry later.\n', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '300' },
      });
    }
  };
}

function sitemapResponse(entries, request, stale) {
  const parts = Math.ceil(entries.length / SITEMAP_PAGE_SIZE);
  const requestedPart = new URL(request?.url || `${SHOP_SITEMAP_ORIGIN}/shop/sitemap.xml`).searchParams.get('part');
  let xml;
  if (requestedPart !== null) {
    if (!/^\d+$/.test(requestedPart) || Number(requestedPart) >= parts) {
      return new Response('Sitemap section not found.\n', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
    }
    const start = Number(requestedPart) * SITEMAP_PAGE_SIZE;
    xml = serializeShopSitemap(entries.slice(start, start + SITEMAP_PAGE_SIZE));
  } else if (parts > 1) {
    const urls = Array.from({ length: parts }, (_, index) => `${SHOP_SITEMAP_ORIGIN}/shop/sitemap.xml?part=${index}`);
    xml = serializeSitemapIndex(urls);
  } else {
    xml = serializeShopSitemap(entries);
  }
  return xmlResponse(xml, stale);
}

function xmlResponse(xml, stale) {
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': stale ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      ...(stale ? { 'X-Shop-Sitemap-Cache': 'stale' } : {}),
    },
  });
}
