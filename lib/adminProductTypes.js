import 'server-only';

import { db } from './firebaseAdmin.js';
import { CatalogError, assertCatalogDeletionAllowed, assertCatalogStatusChangeAllowed, slugifyCatalogName, validateCatalogFields, validateCompleteOrder } from './adminCatalogValidation.mjs';

const PRODUCT_TYPE_FIELDS = ['id', 'name', 'slug', 'order', 'status'];

export async function getAdminProductTypes() {
  const snapshot = await db.collection('shopProductTypes').select(...PRODUCT_TYPE_FIELDS).get();
  return snapshot.docs.map((document) => ({
    id: document.get('id') ?? document.id,
    name: document.get('name') ?? '',
    slug: document.get('slug') ?? '',
    order: Number.isFinite(document.get('order')) ? document.get('order') : null,
    status: document.get('status') ?? 'unknown',
  }));
}

function serialize(document) { return { id: document.get('id') ?? document.id, name: document.get('name') ?? '', slug: document.get('slug') ?? '', order: Number.isFinite(document.get('order')) ? document.get('order') : null, status: document.get('status') ?? 'unknown' }; }
async function assertUnique(transaction, slug, excludedId) {
  const snapshot = await transaction.get(db.collection('shopProductTypes').where('slug', '==', slug));
  if (snapshot.docs.some((doc) => doc.id !== excludedId)) throw new CatalogError('That product type slug is already used.', 409);
}
export async function createAdminProductType(input) {
  const fields = validateCatalogFields(input);
  return db.runTransaction(async (transaction) => {
    await assertUnique(transaction, fields.slug);
    const all = await transaction.get(db.collection('shopProductTypes'));
    const order = all.docs.reduce((max, doc) => Math.max(max, Number(doc.get('order')) || 0), -1) + 1;
    const base = slugifyCatalogName(fields.slug) || 'product-type'; let id = base; let suffix = 2; let ref = db.collection('shopProductTypes').doc(id);
    while ((await transaction.get(ref)).exists) { id = `${base}-${suffix++}`; ref = db.collection('shopProductTypes').doc(id); }
    const record = { id, ...fields, order }; transaction.create(ref, record); return record;
  });
}
export async function updateAdminProductType(id, input) {
  return db.runTransaction(async (transaction) => {
    const ref = db.collection('shopProductTypes').doc(id); const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new CatalogError('Product type not found.', 404);
    if (Object.hasOwn(input || {}, 'id') && input.id !== id) throw new CatalogError('id cannot be changed.');
    const current = serialize(snapshot); const fields = validateCatalogFields(input); await assertUnique(transaction, fields.slug, id);
    if (current.status === 'active' && fields.status !== 'active') {
      const products = await transaction.get(db.collection('shopProducts').where('productTypeId', '==', id));
      assertCatalogStatusChangeAllowed(current.status, fields.status, products.docs.filter((doc) => doc.get('status') === 'active').length);
    }
    transaction.update(ref, fields); return { ...current, ...fields };
  });
}
export async function deleteAdminProductType(id) {
  return db.runTransaction(async (transaction) => {
    const ref = db.collection('shopProductTypes').doc(id); const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new CatalogError('Product type not found.', 404);
    const products = await transaction.get(db.collection('shopProducts').where('productTypeId', '==', id));
    assertCatalogDeletionAllowed({ referenceCount: products.size });
    transaction.delete(ref);
  });
}
export async function reorderAdminProductTypes(ids) {
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(db.collection('shopProductTypes'));
    validateCompleteOrder(ids, snapshot.docs.map((doc) => doc.id));
    ids.forEach((id, order) => transaction.update(db.collection('shopProductTypes').doc(id), { order }));
  });
}
