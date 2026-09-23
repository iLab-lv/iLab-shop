export const ADMIN_PRODUCTS_PAGE_SIZE = 25;

function nameOrder(a, b) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.id.localeCompare(b.id);
}

function compareProducts(sort) {
  if (sort === 'nameDesc') return (a, b) => -nameOrder(a, b);
  if (sort === 'priceAsc') return (a, b) => a.priceCents - b.priceCents || nameOrder(a, b);
  if (sort === 'priceDesc') return (a, b) => b.priceCents - a.priceCents || nameOrder(a, b);
  return nameOrder;
}

export function deriveAdminProducts(products, query) {
  const search = query.search.trim().toLocaleLowerCase();
  return products
    .filter((product) => {
      if (query.productType && product.productTypeId !== query.productType) return false;
      if (query.brand && !product.brandIds.includes(query.brand)) return false;
      if (query.series && !product.seriesIds.includes(query.series)) return false;
      if (query.model && !product.modelIds.includes(query.model)) return false;
      if (!search) return true;
      return [product.name, product.id, product.slug, product.description]
        .some((value) => String(value ?? '').toLocaleLowerCase().includes(search));
    })
    .sort(compareProducts(query.sort));
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
