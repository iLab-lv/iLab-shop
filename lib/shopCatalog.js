import 'server-only';
import { db } from './firebaseAdmin';

const PUBLIC_PRODUCT_FIELDS = [
  'id', 'sku', 'slug', 'name', 'description', 'metaTitle', 'metaDescription',
  'retailPriceCents', 'productTypeId', 'modelIds', 'seriesIds', 'brandIds',
  'imagePaths', 'stockQty', 'status',
];

const orderByCatalog = (a, b) => (Number.isFinite(a.order) ? a.order : Number.MAX_SAFE_INTEGER) - (Number.isFinite(b.order) ? b.order : Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name, 'en', { numeric: true });

function deviceOf(document) {
  const data = document.data();
  return { id: document.id, name: data.name ?? document.id, slug: data.slug ?? '', type: data.type ?? '', parentId: data.parentId ?? null, order: Number.isFinite(data.order) ? data.order : null, status: data.status ?? 'unknown' };
}

function productOf(document, includeWholesale = false) {
  const data = document.data();
  const product = {
    id: data.id ?? document.id,
    sku: Number.isInteger(data.sku) ? data.sku : null,
    slug: data.slug ?? '', name: data.name ?? '', description: data.description ?? '',
    metaTitle: data.metaTitle ?? '', metaDescription: data.metaDescription ?? '',
    retailPriceCents: Number.isInteger(data.retailPriceCents) ? data.retailPriceCents : null,
    productTypeId: data.productTypeId ?? '',
    modelIds: Array.isArray(data.modelIds) ? data.modelIds : [],
    seriesIds: Array.isArray(data.seriesIds) ? data.seriesIds : [],
    brandIds: Array.isArray(data.brandIds) ? data.brandIds : [],
    imagePaths: Array.isArray(data.imagePaths) ? data.imagePaths : [],
    stockQty: Number.isFinite(data.stockQty) ? data.stockQty : 0,
  };
  if (includeWholesale) product.wholesalePriceCents = Number.isInteger(data.wholesalePriceCents) ? data.wholesalePriceCents : null;
  return product;
}

async function activeDevices() {
  const snapshot = await db.collection('shopDevices').get();
  return snapshot.docs.map(deviceOf).filter((device) => device.status === 'active');
}

export async function getBrandDirectory() {
  const devices = await activeDevices();
  const byId = new Map(devices.map((device) => [device.id, device]));
  return devices.filter((device) => device.type === 'brand').sort(orderByCatalog).map((brand) => {
    const series = devices.filter((device) => device.type === 'series' && device.parentId === brand.id).sort(orderByCatalog);
    const seriesIds = new Set(series.map((item) => item.id));
    return { ...brand, modelCount: devices.filter((device) => device.type === 'model' && seriesIds.has(device.parentId)).length, seriesNames: series.map((item) => item.name), valid: byId.has(brand.id) };
  });
}

export async function getBrandCatalog(slug) {
  const devices = await activeDevices();
  const brand = devices.find((device) => device.type === 'brand' && device.slug === slug);
  if (!brand) return null;
  const series = devices.filter((device) => device.type === 'series' && device.parentId === brand.id).sort(orderByCatalog).map((item) => ({ ...item, models: devices.filter((device) => device.type === 'model' && device.parentId === item.id).sort(orderByCatalog) })).filter((item) => item.models.length);
  return { brand, series };
}

export async function getModelCatalog(brandSlug, modelSlug, { includeWholesale = false } = {}) {
  const devices = await activeDevices();
  const brand = devices.find((device) => device.type === 'brand' && device.slug === brandSlug);
  if (!brand) return null;
  const seriesIds = new Set(devices.filter((device) => device.type === 'series' && device.parentId === brand.id).map((device) => device.id));
  const model = devices.find((device) => device.type === 'model' && device.slug === modelSlug && seriesIds.has(device.parentId));
  if (!model) return null;
  const series = devices.find((device) => device.id === model.parentId);
  const snapshot = await db.collection('shopProducts').where('modelIds', 'array-contains', model.id).select(...(includeWholesale ? [...PUBLIC_PRODUCT_FIELDS, 'wholesalePriceCents'] : PUBLIC_PRODUCT_FIELDS)).get();
  const products = snapshot.docs.filter((doc) => doc.get('status') === 'active').map((doc) => productOf(doc, includeWholesale));
  const types = await getActiveProductTypes();
  const relevantIds = new Set(products.map((product) => product.productTypeId));
  return { brand, series, model, products, productTypes: types.filter((type) => relevantIds.has(type.id)) };
}

export async function getActiveProductTypes() {
  const snapshot = await db.collection('shopProductTypes').orderBy('order').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, name: doc.get('name') ?? doc.id, slug: doc.get('slug') ?? '', order: doc.get('order') ?? null, status: doc.get('status') ?? 'unknown' })).filter((type) => type.status === 'active');
}

export async function getPublicProduct(slug, { includeWholesale = false } = {}) {
  const snapshot = await db.collection('shopProducts').where('slug', '==', slug).select(...(includeWholesale ? [...PUBLIC_PRODUCT_FIELDS, 'wholesalePriceCents'] : PUBLIC_PRODUCT_FIELDS)).limit(2).get();
  const document = snapshot.docs.find((doc) => doc.get('status') === 'active');
  if (!document) return null;
  const product = productOf(document, includeWholesale);
  const [types, devices] = await Promise.all([getActiveProductTypes(), activeDevices()]);
  const type = types.find((item) => item.id === product.productTypeId) ?? null;
  const byId = new Map(devices.map((device) => [device.id, device]));
  const grouped = new Map();
  for (const modelId of product.modelIds) {
    const model = byId.get(modelId); const series = model && byId.get(model.parentId); const brand = series && byId.get(series.parentId);
    if (!model || model.type !== 'model' || !series || series.type !== 'series' || !brand || brand.type !== 'brand') continue;
    if (!grouped.has(brand.id)) grouped.set(brand.id, { ...brand, series: new Map() });
    const group = grouped.get(brand.id); if (!group.series.has(series.id)) group.series.set(series.id, { ...series, models: [] });
    group.series.get(series.id).models.push(model);
  }
  const compatibility = [...grouped.values()].sort(orderByCatalog).map((brand) => ({ ...brand, series: [...brand.series.values()].sort(orderByCatalog).map((series) => ({ ...series, models: series.models.sort(orderByCatalog) })) }));
  return { product, type, compatibility };
}

export async function getPublicSearchData({ includeWholesale = false } = {}) {
  const productFields = ['id', 'sku', 'slug', 'name', 'productTypeId', 'brandIds', 'seriesIds', 'modelIds', 'imagePaths', 'retailPriceCents', 'stockQty', 'status'];
  if (includeWholesale) productFields.push('wholesalePriceCents');
  const [productsSnapshot, devicesSnapshot, typesSnapshot] = await Promise.all([
    db.collection('shopProducts').select(...productFields).get(),
    db.collection('shopDevices').select('name', 'slug', 'type', 'parentId', 'order', 'status').get(),
    db.collection('shopProductTypes').select('name', 'slug', 'order', 'status').get(),
  ]);
  const products = productsSnapshot.docs.filter((doc) => doc.get('status') === 'active').map((doc) => {
    const data = doc.data();
    const product = {
      id: data.id ?? doc.id, sku: Number.isInteger(data.sku) ? data.sku : null,
      slug: data.slug ?? '', name: data.name ?? '', productTypeId: data.productTypeId ?? '',
      brandIds: Array.isArray(data.brandIds) ? data.brandIds : [], seriesIds: Array.isArray(data.seriesIds) ? data.seriesIds : [], modelIds: Array.isArray(data.modelIds) ? data.modelIds : [],
      primaryImagePath: Array.isArray(data.imagePaths) ? data.imagePaths[0] ?? null : null,
      retailPriceCents: Number.isInteger(data.retailPriceCents) ? data.retailPriceCents : null,
      stockQty: Number.isFinite(data.stockQty) ? data.stockQty : 0,
    };
    if (includeWholesale) product.wholesalePriceCents = Number.isInteger(data.wholesalePriceCents) ? data.wholesalePriceCents : null;
    return product;
  });
  const devices = devicesSnapshot.docs.map(deviceOf).filter((device) => device.status === 'active').map(({ status, ...device }) => device);
  const productTypes = typesSnapshot.docs.map((doc) => ({ id: doc.id, name: doc.get('name') ?? doc.id, slug: doc.get('slug') ?? '', order: Number.isFinite(doc.get('order')) ? doc.get('order') : null, status: doc.get('status') ?? 'unknown' })).filter((type) => type.status === 'active').sort(orderByCatalog).map(({ status, ...type }) => type);
  return { products, devices, productTypes };
}
