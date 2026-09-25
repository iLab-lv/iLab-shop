import 'server-only';

import { db } from './firebaseAdmin.js';
import { serverTimestamp } from './firebaseAdmin.js';
import { ProductInputError, applySeoDefaults, deriveCompatibility, validateProductImmutableFields, validateProductInput } from './adminProductValidation.mjs';

export const ADMIN_PRODUCTS_PAGE_SIZE = 25;

const PRODUCT_FIELDS = [
  'id', 'sku', 'slug', 'name', 'description', 'metaTitle', 'metaDescription',
  'purchasePriceCents', 'wholesalePriceCents', 'retailPriceCents',
  'createdAt', 'updatedAt', 'productTypeId',
  'modelIds', 'seriesIds', 'brandIds', 'imagePaths',
  'stockQty', 'status',
];

export function serializeProduct(snapshot) {
  const data = snapshot.data();
  return {
    id: data.id ?? snapshot.id,
    sku: Number.isInteger(data.sku) ? data.sku : null,
    slug: data.slug ?? '',
    name: data.name ?? '',
    description: data.description ?? '',
    metaTitle: data.metaTitle ?? '',
    metaDescription: data.metaDescription ?? '',
    metaTitleManual: data.metaTitleManual === true,
    metaDescriptionManual: data.metaDescriptionManual === true,
    productTypeId: data.productTypeId ?? '',
    purchasePriceCents: Number.isInteger(data.purchasePriceCents) ? data.purchasePriceCents : null,
    wholesalePriceCents: Number.isInteger(data.wholesalePriceCents) ? data.wholesalePriceCents : null,
    retailPriceCents: Number.isInteger(data.retailPriceCents) ? data.retailPriceCents : null,
    modelIds: Array.isArray(data.modelIds) ? data.modelIds : [],
    seriesIds: Array.isArray(data.seriesIds) ? data.seriesIds : [],
    brandIds: Array.isArray(data.brandIds) ? data.brandIds : [],
    imagePaths: Array.isArray(data.imagePaths) ? data.imagePaths : [],
    stockQty: Number.isFinite(data.stockQty) ? data.stockQty : null,
    status: data.status ?? 'unknown',
    createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? null,
  };
}

export async function getAdminProductsCatalog() {
  const [products, types, devices] = await Promise.all([
    db.collection('shopProducts').select(...PRODUCT_FIELDS).get(),
    db.collection('shopProductTypes').orderBy('order').get(),
    db.collection('shopDevices').get(),
  ]);

  return {
    products: products.docs.map(serializeProduct),
    productTypes: types.docs.map((document) => ({
      id: document.id,
      name: document.get('name') ?? document.id,
      status: document.get('status') ?? 'unknown',
      order: Number.isFinite(document.get('order')) ? document.get('order') : null,
    })),
    devices: devices.docs.map((document) => ({
      id: document.id,
      name: document.get('name') ?? document.id,
      type: document.get('type') ?? '',
      parentId: document.get('parentId') ?? null,
      order: document.get('order') ?? 0,
      status: document.get('status') ?? 'unknown',
    })),
  };
}

async function validatedRecord(transaction, input, current = null) {
  if (current) validateProductImmutableFields(input, current);
  const record = applySeoDefaults(validateProductInput(input));
  const type = await transaction.get(db.collection('shopProductTypes').doc(record.productTypeId));
  if (!type.exists || type.get('status') !== 'active') throw new ProductInputError('Select an active Product Type.', 409);
  const deviceSnapshot = await transaction.get(db.collection('shopDevices'));
  return { ...record, ...deriveCompatibility(record.modelIds, deviceSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))) };
}
async function assertUniqueSlug(transaction, slug, excludedId) { const snapshot = await transaction.get(db.collection('shopProducts').where('slug', '==', slug)); if (snapshot.docs.some((doc) => doc.id !== excludedId)) throw new ProductInputError('That product slug is already used.', 409); }
export async function createAdminProduct(input) {
  return db.runTransaction(async (transaction) => {
    const record = await validatedRecord(transaction, input); await assertUniqueSlug(transaction, record.slug);
    const counterRef = db.doc('shopSettings/counters'), counter = await transaction.get(counterRef), sku = counter.get('nextProductSku');
    if (!Number.isSafeInteger(sku)) throw new ProductInputError('Product SKU counter is unavailable.', 500);
    const ref = db.collection('shopProducts').doc(); const persisted = { id: ref.id, sku, ...record, stockQty: record.stockQty ?? 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    transaction.create(ref, persisted); transaction.update(counterRef, { nextProductSku: sku + 1 }); return { ...persisted, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  });
}
export async function updateAdminProduct(id, input) {
  return db.runTransaction(async (transaction) => { const ref = db.collection('shopProducts').doc(id), snapshot = await transaction.get(ref); if (!snapshot.exists) throw new ProductInputError('Product not found.', 404); const current = serializeProduct(snapshot); if (input.expectedUpdatedAt && input.expectedUpdatedAt !== current.updatedAt) throw new ProductInputError('This product changed since it was opened. Refresh and review the newer values.', 409); const record = await validatedRecord(transaction, input, current); await assertUniqueSlug(transaction, record.slug, id); transaction.update(ref, { ...record, updatedAt: serverTimestamp() }); return { ...current, ...record, updatedAt: new Date().toISOString() }; });
}
export async function deleteAdminProduct(id) { const ref = db.collection('shopProducts').doc(id); const snapshot = await ref.get(); if (!snapshot.exists) throw new ProductInputError('Product not found.', 404); await ref.delete(); }
