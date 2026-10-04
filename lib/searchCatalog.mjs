export function normalizeSearchText(value) {
  return String(value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

const catalogOrder = (a, b) => (Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER) - (Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name, 'en', { numeric: true });

export function buildSearchIndex(data) {
  const deviceById = new Map(data.devices.map((item) => [item.id, item]));
  const typeById = new Map(data.productTypes.map((item) => [item.id, item]));
  const brands = data.devices.filter((item) => item.type === 'brand').sort(catalogOrder);
  const series = data.devices.filter((item) => item.type === 'series').sort(catalogOrder);
  const models = data.devices.filter((item) => item.type === 'model').sort(catalogOrder);
  const products = data.products.map((product) => {
    const brandNames = product.brandIds.map((id) => deviceById.get(id)?.name).filter(Boolean);
    const seriesNames = product.seriesIds.map((id) => deviceById.get(id)?.name).filter(Boolean);
    const modelNames = product.modelIds.map((id) => deviceById.get(id)?.name).filter(Boolean);
    const typeName = typeById.get(product.productTypeId)?.name ?? '';
    const sku = product.sku === null ? '' : String(product.sku);
    return { ...product, skuText: sku, normalizedName: normalizeSearchText(product.name), normalizedModels: modelNames.map(normalizeSearchText), searchText: normalizeSearchText([sku, product.name, typeName, ...brandNames, ...seriesNames, ...modelNames].join(' ')), typeName, modelNames };
  });
  return { deviceById, typeById, brands, series, models, productTypes: [...data.productTypes].sort(catalogOrder), products };
}

function relevance(product, normalizedQuery, terms) {
  if (!normalizedQuery) return 0;
  const sku = normalizeSearchText(product.skuText);
  if (sku === normalizedQuery) return 1000;
  if (sku.startsWith(normalizedQuery)) return 900;
  if (product.normalizedName === normalizedQuery) return 800;
  if (product.normalizedName.startsWith(normalizedQuery)) return 700;
  if (terms.every((term) => product.normalizedName.includes(term))) return 600;
  if (product.normalizedModels.some((model) => model === normalizedQuery)) return 550;
  if (product.normalizedModels.some((model) => model.includes(normalizedQuery))) return 500;
  return 100 + terms.reduce((score, term) => score + (product.searchText.includes(term) ? 10 : 0), 0);
}

export function searchProducts(index, { query = '', brandId = '', seriesId = '', modelId = '', productTypeId = '' }) {
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(' ').filter(Boolean);
  return index.products.filter((product) => (!brandId || product.brandIds.includes(brandId)) && (!seriesId || product.seriesIds.includes(seriesId)) && (!modelId || product.modelIds.includes(modelId)) && (!productTypeId || product.productTypeId === productTypeId) && (!terms.length || terms.every((term) => product.searchText.includes(term)))).map((product) => ({ product, score: relevance(product, normalizedQuery, terms) })).sort((a, b) => b.score - a.score || (index.typeById.get(a.product.productTypeId)?.order ?? Number.MAX_SAFE_INTEGER) - (index.typeById.get(b.product.productTypeId)?.order ?? Number.MAX_SAFE_INTEGER) || a.product.name.localeCompare(b.product.name, 'en', { numeric: true }) || (a.product.sku ?? 0) - (b.product.sku ?? 0)).map(({ product }) => product);
}
