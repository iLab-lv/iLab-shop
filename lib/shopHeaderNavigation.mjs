export const DESKTOP_BRAND_LIMIT = 5;

export function buildHeaderBrandNavigation(brands, limit = DESKTOP_BRAND_LIMIT) {
  const seen = new Set();
  const valid = (Array.isArray(brands) ? brands : []).filter((brand) => {
    const slug = String(brand?.slug ?? '').trim();
    const name = String(brand?.name ?? '').trim();
    if (!slug || !name || brand?.status === 'inactive' || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  }).map((brand) => ({ id: brand.id, name: String(brand.name).trim(), slug: String(brand.slug).trim() }));

  return {
    all: valid,
    direct: valid.slice(0, limit),
    overflow: valid.slice(limit),
  };
}

export function isBrandPathActive(pathname, slug) {
  const normalized = String(pathname ?? '/').replace(/^\/shop(?=\/|$)/, '') || '/';
  const href = `/${slug}`;
  return normalized === href || normalized.startsWith(`${href}/`);
}
