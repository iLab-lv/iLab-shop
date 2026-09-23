import 'server-only';

import { db } from './firebaseAdmin.js';

const DEVICE_FIELDS = ['id', 'name', 'slug', 'type', 'parentId', 'order', 'status'];

function serializeDevice(snapshot) {
  const data = snapshot.data();
  return {
    id: data.id ?? snapshot.id,
    name: data.name ?? '',
    slug: data.slug ?? '',
    type: data.type ?? '',
    parentId: data.parentId ?? null,
    order: Number.isFinite(data.order) ? data.order : null,
    status: data.status ?? 'unknown',
  };
}

export async function getAdminDevices() {
  const snapshot = await db.collection('shopDevices').select(...DEVICE_FIELDS).get();
  return snapshot.docs.map(serializeDevice);
}
