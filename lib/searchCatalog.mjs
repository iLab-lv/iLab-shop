export function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

const catalogOrder = (a, b) => (Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER) - (Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name, 'en', { numeric: true });

export function buildSearchIndex(data) {
  const deviceById = new Map(data.devices.map((item) => [item.id, item]));
  const typeById = new Map(data.productTypes.map((item) => [item.id, item]));
  const brands = data.devices.filter((item) => item.type === 'brand').sort(catalogOrder);
  const series = data.devices.filter((item) => item.type === 'series').sort(catalogOrder);
  const models = buildModelSearchIndex(data.devices, { requireRoutes: true });
  const products = data.products.map((product) => {
    const brandNames = product.brandIds.map((id) => deviceById.get(id)?.name).filter(Boolean);
    const seriesNames = product.seriesIds.map((id) => deviceById.get(id)?.name).filter(Boolean);
    const modelNames = product.modelIds.map((id) => deviceById.get(id)?.name).filter(Boolean);
    const typeName = typeById.get(product.productTypeId)?.name ?? '';
    const skuText = product.sku === null ? '' : String(product.sku);
    return { ...product, skuText, normalizedSku: normalizeSearchText(skuText), normalizedName: normalizeSearchText(product.name), normalizedType: normalizeSearchText(typeName), normalizedBrands: brandNames.map(normalizeSearchText), normalizedSeries: seriesNames.map(normalizeSearchText), normalizedModels: modelNames.map(normalizeSearchText), searchText: normalizeSearchText([skuText, product.name, typeName, ...brandNames, ...seriesNames, ...modelNames].join(' ')), typeName, modelNames };
  });
  return { deviceById, typeById, brands, series, models, productTypes: [...data.productTypes].sort(catalogOrder), products };
}

export function buildModelSearchIndex(devices, { requireRoutes = false } = {}) {
  const deviceById = new Map(devices.map((item) => [item.id, item]));
  return devices.filter((item) => item.type === 'model').sort(catalogOrder).flatMap((model) => {
    const parentSeries = deviceById.get(model.parentId);
    const brand = parentSeries?.type === 'series' ? deviceById.get(parentSeries.parentId) : null;
    if (!parentSeries || !brand || brand.type !== 'brand' || (requireRoutes && (!model.slug || !brand.slug))) return [];
    const normalizedName = normalizeSearchText(model.name);
    return [{ ...model, seriesId: parentSeries.id, brandId: brand.id, seriesName: parentSeries.name, brandName: brand.name, href: model.slug && brand.slug ? `/${brand.slug}/${model.slug}` : null, normalizedName, searchText: normalizeSearchText(`${model.name} ${parentSeries.name} ${brand.name}`) }];
  });
}

function productRelevance(product, normalizedQuery, terms) {
  if (product.normalizedSku === normalizedQuery) return 10_000;
  if (product.normalizedSku.startsWith(normalizedQuery)) return 9_000;
  if (product.normalizedModels.some((model) => model === normalizedQuery)) return 8_000;
  if (product.normalizedName === normalizedQuery) return 7_500;
  if (product.normalizedModels.some((model) => model.startsWith(normalizedQuery))) return 7_000;
  if (product.normalizedName.startsWith(normalizedQuery)) return 6_500;
  const nameMatches = terms.filter((term) => product.normalizedName.includes(term)).length;
  const modelMatches = terms.filter((term) => product.normalizedModels.some((model) => model.includes(term))).length;
  const contextMatches = terms.filter((term) => product.normalizedBrands.some((name) => name.includes(term)) || product.normalizedSeries.some((name) => name.includes(term))).length;
  const typeMatches = terms.filter((term) => product.normalizedType.includes(term)).length;
  return 1_000 + nameMatches * 160 + modelMatches * 140 + contextMatches * 80 + typeMatches * 70;
}

export function searchProducts(index, { query = '', brandId = '', seriesId = '', modelId = '', productTypeId = '' }) {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(' ').filter(Boolean);
  return index.products.filter((product) => (!brandId || product.brandIds.includes(brandId)) && (!seriesId || product.seriesIds.includes(seriesId)) && (!modelId || product.modelIds.includes(modelId)) && (!productTypeId || product.productTypeId === productTypeId) && (!terms.length || terms.every((term) => product.searchText.includes(term)))).map((product) => ({ product, score: productRelevance(product, normalizedQuery, terms) })).sort((a, b) => b.score - a.score || (index.typeById.get(a.product.productTypeId)?.order ?? Number.MAX_SAFE_INTEGER) - (index.typeById.get(b.product.productTypeId)?.order ?? Number.MAX_SAFE_INTEGER) || a.product.name.localeCompare(b.product.name, 'en', { numeric: true }) || (a.product.sku ?? 0) - (b.product.sku ?? 0)).map(({ product }) => product);
}

function modelRelevance(model, normalizedQuery, terms) {
  if (model.normalizedName === normalizedQuery) return 1_000;
  if (model.normalizedName.startsWith(normalizedQuery)) return 900;
  if (terms.every((term) => model.normalizedName.includes(term))) return 800;
  const nameMatches = terms.filter((term) => model.normalizedName.includes(term)).length;
  const contextMatches = terms.filter((term) => model.searchText.includes(term)).length;
  return 100 + nameMatches * 30 + contextMatches * 10;
}

export function searchModels(index, query, limit = 5) {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(' ').filter(Boolean);
  if (!terms.length) return [];
  const minimumMatches = Math.min(2, terms.length);
  return index.models.filter((model) => terms.filter((term) => model.searchText.includes(term)).length >= minimumMatches).map((model) => ({ model, score: modelRelevance(model, normalizedQuery, terms) })).sort((a, b) => b.score - a.score || catalogOrder(a.model, b.model)).slice(0, limit).map(({ model }) => model);
}
