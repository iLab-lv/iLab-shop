import 'server-only';

import { db } from './firebaseAdmin.js';

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
