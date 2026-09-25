export class ProductInputError extends Error { constructor(message, status = 400) { super(message); this.name = 'ProductInputError'; this.status = status; } }
const clean = (value) => typeof value === 'string' ? value.trim() : '';
export function eurosToCents(value, nullable = true) {
  if (value === '' || value == null) { if (nullable) return null; throw new ProductInputError('Price is required.'); }
  if (!/^\d+(?:\.\d{1,2})?$/.test(String(value))) throw new ProductInputError('Prices must be non-negative with at most two decimal places.');
  const cents = Math.round(Number(value) * 100); if (!Number.isSafeInteger(cents)) throw new ProductInputError('Price is too large.'); return cents;
}
export function centsToEuros(value) { return value == null ? '' : (value / 100).toFixed(2); }
export function validateProductInput(input) {
  const name = clean(input?.name), slug = clean(input?.slug).toLowerCase(), description = clean(input?.description), status = clean(input?.status), productTypeId = clean(input?.productTypeId);
  if (!name || name.length > 200) throw new ProductInputError('Product name is required.');
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ProductInputError('Slug format is invalid.');
  if (!['active', 'inactive'].includes(status)) throw new ProductInputError('Status must be active or inactive.');
  if (!productTypeId) throw new ProductInputError('Product Type is required.');
  const stockQty = Number(input?.stockQty ?? 0); if (!Number.isSafeInteger(stockQty) || stockQty < 0) throw new ProductInputError('Stock must be a non-negative integer.');
  if (!Array.isArray(input?.modelIds) || input.modelIds.some((id) => typeof id !== 'string' || !id)) throw new ProductInputError('Compatible model IDs are invalid.');
  if (!Array.isArray(input?.imagePaths) || input.imagePaths.some((path) => typeof path !== 'string' || !path.startsWith('shop/products/'))) throw new ProductInputError('Product image paths are invalid.');
  const modelIds = [...new Set(input.modelIds)];
  const imagePaths = [...new Set(input.imagePaths)];
  return { name, slug, description, status, productTypeId, stockQty, modelIds, imagePaths, purchasePriceCents: eurosToCents(input.purchasePrice), wholesalePriceCents: eurosToCents(input.wholesalePrice), retailPriceCents: eurosToCents(input.retailPrice), metaTitle: clean(input.metaTitle), metaDescription: clean(input.metaDescription), metaTitleManual: input.metaTitleManual === true, metaDescriptionManual: input.metaDescriptionManual === true };
}
export function applySeoDefaults(product) { return { ...product, metaTitle: product.metaTitleManual ? product.metaTitle : `iLab | ${product.name}`, metaDescription: product.metaDescriptionManual ? product.metaDescription : product.description }; }
export function deriveCompatibility(modelIds, devices) {
  const byId = new Map(devices.map((device) => [device.id, device])); const seriesIds = new Set(), brandIds = new Set();
  for (const id of modelIds) { const model = byId.get(id); if (!model || model.type !== 'model') throw new ProductInputError(`Invalid compatible model: ${id}`); const series = byId.get(model.parentId); const brand = series && byId.get(series.parentId); if (!series || series.type !== 'series' || !brand || brand.type !== 'brand') throw new ProductInputError(`Incomplete device hierarchy for model: ${id}`, 409); seriesIds.add(series.id); brandIds.add(brand.id); }
  return { seriesIds: [...seriesIds], brandIds: [...brandIds] };
}
export function validateProductImmutableFields(input, current) { for (const field of ['id', 'sku', 'createdAt']) if (Object.hasOwn(input || {}, field) && input[field] !== current[field]) throw new ProductInputError(`${field} cannot be changed.`); }
