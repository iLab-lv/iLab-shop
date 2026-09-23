import 'server-only';
import { FieldPath } from 'firebase-admin/firestore';
import { db } from './firebaseAdmin';

export const CATALOG_TOTAL = 605;
export const PRODUCTS_PAGE_SIZE = 48;

const PRODUCT_FIELDS = [
  'id', 'name', 'description', 'retailPriceCents', 'productTypeId',
  'modelIds', 'seriesIds', 'brandIds', 'imagePaths',
];

function encodeCursor(snapshot, productTypeId) {
  return Buffer.from(
    JSON.stringify({
      id: snapshot.id,
      name: productTypeId ? undefined : snapshot.get('name'),
      productTypeId: productTypeId || undefined,
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
        (cursor.productTypeId !== undefined && typeof cursor.productTypeId !== 'string')) {
      throw new Error('Invalid cursor values.');
    }
    return cursor;
  } catch {
    throw new Error('Invalid product cursor.');
  }
}

function serializeProduct(snapshot) {
  const data = snapshot.data();
  return {
    id: data.id ?? snapshot.id,
    name: data.name ?? '',
    description: data.description ?? '',
    retailPriceCents: Number.isInteger(data.retailPriceCents) ? data.retailPriceCents : null,
    productTypeId: data.productTypeId ?? '',
    modelIds: data.modelIds ?? [],
    seriesIds: data.seriesIds ?? [],
    brandIds: data.brandIds ?? [],
    imagePaths: data.imagePaths ?? [],
  };
}

export async function getProductTypes() {
  const snapshot = await db.collection('shopProductTypes').orderBy('order').get();
  return snapshot.docs.map((document) => ({
    id: document.id,
    name: document.get('name') ?? document.id,
  }));
}

export async function getProductsPage(cursor = null, productTypeId = '') {
  let query = db.collection('shopProducts').select(...PRODUCT_FIELDS);

  if (productTypeId) {
    query = query.where('productTypeId', '==', productTypeId)
      .orderBy(FieldPath.documentId());
  } else {
    query = query.orderBy('name').orderBy(FieldPath.documentId());
  }

  query = query.limit(PRODUCTS_PAGE_SIZE);

  if (cursor) {
    if ((cursor.productTypeId ?? '') !== productTypeId) {
      throw new Error('Product cursor does not match the selected type.');
    }
    query = productTypeId
      ? query.startAfter(cursor.id)
      : query.startAfter(cursor.name, cursor.id);
  }

  const snapshot = await query.get();
  const lastDocument = snapshot.docs.at(-1);
  return {
    products: snapshot.docs.map(serializeProduct),
    nextCursor: lastDocument ? encodeCursor(lastDocument, productTypeId) : null,
    hasMore: snapshot.size === PRODUCTS_PAGE_SIZE,
  };
}
