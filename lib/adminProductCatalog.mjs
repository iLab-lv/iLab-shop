import { normalizeSearchText } from './searchCatalog.mjs';

export const ADMIN_PRODUCTS_PAGE_SIZE = 25;

export function getAdminModelFilterSelection(model) {
  return { search: '', brand: model.brandId, series: model.seriesId, model: model.id, page: 1 };
}

function nameOrder(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }) || String(a.sku ?? a.id).localeCompare(String(b.sku ?? b.id), undefined, { numeric: true });
}

function compareProducts(sort, productTypes = []) {
  if (sort === 'nameDesc') return (a, b) => -nameOrder(a, b);
  if (sort === 'priceAsc') return (a, b) => (a.purchasePriceCents ?? Infinity) - (b.purchasePriceCents ?? Infinity) || nameOrder(a, b);
  if (sort === 'priceDesc') return (a, b) => (b.purchasePriceCents ?? -Infinity) - (a.purchasePriceCents ?? -Infinity) || nameOrder(a, b);
  if (sort === 'newest') return (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.sku - a.sku || nameOrder(a, b);
  if (sort === 'oldest') return (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.sku - b.sku || nameOrder(a, b);
  if (sort === 'nameAsc') return nameOrder;
  const typeOrder = new Map(productTypes.map((type, index) => [type.id, Number.isFinite(type.order) ? type.order : index]));
  return (a, b) => (typeOrder.get(a.productTypeId) ?? Infinity) - (typeOrder.get(b.productTypeId) ?? Infinity) || nameOrder(a, b) || String(a.sku ?? a.id).localeCompare(String(b.sku ?? b.id), undefined, { numeric: true });
}

export function deriveAdminProducts(products, query, productTypes = [], devices = []) {
  const search = normalizeSearchText(query.search);
  const terms = search.split(' ').filter(Boolean);
  const deviceNames = new Map(devices.map((device) => [device.id, device.name]));
  const typeNames = new Map(productTypes.map((type) => [type.id, type.name]));
  const globalMatches = products.filter((product) => {
    if (!terms.length) return true;
    const compatibility = [...product.brandIds, ...product.seriesIds, ...product.modelIds].map((id) => deviceNames.get(id)).filter(Boolean);
    const searchText = normalizeSearchText([product.name, product.id, product.sku, product.slug, product.description, typeNames.get(product.productTypeId), ...compatibility].join(' '));
    return terms.every((term) => searchText.includes(term));
  });
  return globalMatches
    .filter((product) => {
      if (query.productType && product.productTypeId !== query.productType) return false;
      if (query.brand && !product.brandIds.includes(query.brand)) return false;
      if (query.series && !product.seriesIds.includes(query.series)) return false;
      if (query.model && !product.modelIds.includes(query.model)) return false;
      if (query.status && product.status !== query.status) return false;
      return true;
    })
    .sort(compareProducts(query.sort, productTypes));
}

export function getAdminProductsPage(products, page) {
  const start = (page - 1) * ADMIN_PRODUCTS_PAGE_SIZE;
  return products.slice(start, start + ADMIN_PRODUCTS_PAGE_SIZE);
}

export function getAdminDeviceFilterOptions(devices, brandId, seriesId) {
  const byOrderAndName = (a, b) => a.order - b.order || a.name.localeCompare(b.name);
  const brands = devices.filter((device) => device.type === 'brand').sort(byOrderAndName);
  const allSeries = devices.filter((device) => device.type === 'series').sort(byOrderAndName);
  const series = brandId ? allSeries.filter((device) => device.parentId === brandId) : allSeries;
  const allModels = devices.filter((device) => device.type === 'model');
  let models = allModels;
  if (seriesId) models = allModels.filter((device) => device.parentId === seriesId);
  else if (brandId) {
    const seriesIds = new Set(series.map((device) => device.id));
    models = allModels.filter((device) => seriesIds.has(device.parentId));
  }
  return { brands, series, models: models.sort(byOrderAndName) };
}
