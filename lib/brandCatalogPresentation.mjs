import { normalizeSearchText } from './searchCatalog.mjs';

const BRAND_LOGOS = new Map([
  ['iphone', '/shop/images/logos/apple-logo.svg'],
  ['ipad', '/shop/images/logos/apple-logo.svg'],
  ['macbook', '/shop/images/logos/apple-logo.svg'],
  ['apple-watch', '/shop/images/logos/apple-logo.svg'],
  ['samsung', '/shop/images/logos/samsung-logo.svg'],
  ['xiaomi', '/shop/images/logos/xiaomi-logo.svg'],
  ['huawei', '/shop/images/logos/huawei-logo.svg'],
]);

export function getBrandLogoPath(brand) {
  return BRAND_LOGOS.get(normalizeSearchText(brand?.slug).replaceAll(' ', '-')) ?? null;
}

export function countBrandModels(series) {
  return series.reduce((total, item) => total + item.models.length, 0);
}

export function filterBrandSeries(series, query) {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(' ').filter(Boolean);
  if (!terms.length) return series;

  const matchingSeries = series.filter((item) => normalizeSearchText(item.name) === normalizedQuery);
  if (matchingSeries.length) return matchingSeries;

  return series.map((item) => {
    return {
      ...item,
      models: item.models.filter((model) => {
        const modelName = normalizeSearchText(model.name);
        return terms.every((term) => modelName.includes(term));
      }),
    };
  }).filter((item) => item.models.length);
}

export function getModelHref(brandSlug, modelSlug) {
  return `/${brandSlug}/${modelSlug}`;
}
