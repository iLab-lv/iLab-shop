import 'server-only';
import { FieldPath } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';

export const PRODUCTS_PAGE_SIZE = 48;

const PRODUCT_FIELDS = [
  'id', 'sku', 'slug', 'name', 'description', 'retailPriceCents', 'productTypeId',
  'modelIds', 'seriesIds', 'brandIds', 'imagePaths', 'stockQty', 'status',
];
const WHOLESALE_PRODUCT_FIELDS = [...PRODUCT_FIELDS, 'wholesalePriceCents'];

function encodeCursor(snapshot, productTypeId, brandId = '', modelId = '') {
  return Buffer.from(
    JSON.stringify({
      id: snapshot.id,
      name: productTypeId ? undefined : snapshot.get('name'),
      productTypeId: productTypeId || undefined,
      brandId: brandId || undefined,
      modelId: modelId || undefined,
    }),
    'utf8'
  ).toString('base64url');
}

export function decodeProductsCursor(value) {
  if (!value) return null;
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (typeof cursor.id !== 'string' || cursor.id.length === 0 ||
        cursor.id.includes('/') ||
        (cursor.name !== undefined && typeof cursor.name !== 'string') ||
        (cursor.productTypeId !== undefined && typeof cursor.productTypeId !== 'string') ||
        (cursor.brandId !== undefined && typeof cursor.brandId !== 'string') ||
        (cursor.modelId !== undefined && typeof cursor.modelId !== 'string')) {
      throw new Error('Invalid cursor values.');
    }
    return cursor;
  } catch {
    throw new Error('Invalid product cursor.');
  }
}

function serializeProduct(snapshot, includeWholesale = false) {
  const data = snapshot.data();
  const product = {
    id: data.id ?? snapshot.id,
    sku: Number.isInteger(data.sku) ? data.sku : null,
    slug: data.slug ?? '',
    name: data.name ?? '',
    description: data.description ?? '',
    retailPriceCents: Number.isInteger(data.retailPriceCents) ? data.retailPriceCents : null,
    productTypeId: data.productTypeId ?? '',
    modelIds: data.modelIds ?? [],
    seriesIds: data.seriesIds ?? [],
    brandIds: data.brandIds ?? [],
    imagePaths: data.imagePaths ?? [],
    stockQty: Number.isInteger(data.stockQty) ? data.stockQty : 0,
  };
  if (includeWholesale) {
    product.wholesalePriceCents = Number.isInteger(data.wholesalePriceCents)
      ? data.wholesalePriceCents
      : null;
  }
  return product;
}

export async function getProductTypes() {
  const snapshot = await db.collection('shopProductTypes').orderBy('order').get();
  return snapshot.docs.filter((document) => document.get('status') === 'active').map((document) => ({
    id: document.id,
    name: document.get('name') ?? document.id,
    slug: document.get('slug') ?? '',
  }));
}

export async function getProductsPage(cursor = null, productTypeId = '', { includeWholesale = false, brandId = '', modelId = '' } = {}) {
  let query = db.collection('shopProducts').select(...(includeWholesale ? WHOLESALE_PRODUCT_FIELDS : PRODUCT_FIELDS));
  const compatibilityField = modelId ? 'modelIds' : brandId ? 'brandIds' : '';
  const compatibilityId = modelId || brandId;

  if (cursor && ((cursor.brandId ?? '') !== brandId || (cursor.modelId ?? '') !== modelId || (cursor.productTypeId ?? '') !== productTypeId)) {
    throw new Error('Product cursor does not match the selected filters.');
  }

  if (compatibilityField) {
    query = query.where(compatibilityField, 'array-contains', compatibilityId).orderBy(FieldPath.documentId());
  } else if (productTypeId) {
    query = query.where('productTypeId', '==', productTypeId).orderBy(FieldPath.documentId());
  } else {
    query = query.orderBy('name').orderBy(FieldPath.documentId());
  }

  if (cursor) {
    query = compatibilityField || productTypeId
      ? query.startAfter(cursor.id)
      : query.startAfter(cursor.name, cursor.id);
  }

  const publicDocuments = [];
  let lastDocument = null;
  let hasMore = false;
  do {
    const snapshot = await query.limit(PRODUCTS_PAGE_SIZE).get();
    hasMore = snapshot.size === PRODUCTS_PAGE_SIZE;
    for (const document of snapshot.docs) {
      lastDocument = document;
      if (document.get('status') === 'active' && (!productTypeId || document.get('productTypeId') === productTypeId)) publicDocuments.push(document);
      if (publicDocuments.length === PRODUCTS_PAGE_SIZE) break;
    }
    if (!hasMore || publicDocuments.length === PRODUCTS_PAGE_SIZE || !lastDocument) break;
    query = query.startAfter(lastDocument.id);
  } while (compatibilityField);

  const publicProducts = publicDocuments.map((document) => serializeProduct(document, includeWholesale));
  const modelIds = [...new Set(publicProducts.flatMap((product) => product.modelIds))];
  const modelSnapshots = modelIds.length
    ? await db.getAll(...modelIds.map((id) => db.collection('shopDevices').doc(id)))
    : [];
  const modelNames = new Map(modelSnapshots.filter((document) => document.exists && document.get('status') === 'active' && document.get('type') === 'model').map((document) => [document.id, document.get('name') ?? document.id]));
  let availableProductTypeIds;
  if (!cursor && compatibilityField) {
    const availabilitySnapshot = await db.collection('shopProducts')
      .where(compatibilityField, 'array-contains', compatibilityId)
      .select('productTypeId', 'status')
      .get();
    availableProductTypeIds = [...new Set(availabilitySnapshot.docs
      .filter((document) => document.get('status') === 'active' && document.get('productTypeId'))
      .map((document) => document.get('productTypeId')))];
  }
  return {
    products: publicProducts.map((product) => ({
      ...product,
      compatibleModelNames: product.modelIds.map((id) => modelNames.get(id)).filter(Boolean),
    })),
    nextCursor: lastDocument ? encodeCursor(lastDocument, productTypeId, brandId, modelId) : null,
    hasMore,
    ...(availableProductTypeIds ? { availableProductTypeIds } : {}),
  };
}
