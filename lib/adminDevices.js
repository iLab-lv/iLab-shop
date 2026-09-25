import 'server-only';

import { db } from './firebaseAdmin.js';
import { CatalogError, assertCatalogDeletionAllowed, assertCatalogStatusChangeAllowed, assertDeviceParentType, assertImmutableDeviceFields, slugifyCatalogName, validateDeviceCreate, validateCatalogFields, validateDeviceSiblingOrder } from './adminCatalogValidation.mjs';

const DEVICE_FIELDS = ['id', 'name', 'slug', 'type', 'parentId', 'order', 'status'];

export function serializeDevice(snapshot) {
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

const productField = { brand: 'brandIds', series: 'seriesIds', model: 'modelIds' };

async function referenceDocs(transaction, field, id) {
  return transaction.get(db.collection('shopProducts').where(field, 'array-contains', id));
}

async function assertUnique(transaction, device, excludedId) {
  const snapshot = await transaction.get(db.collection('shopDevices').where('slug', '==', device.slug));
  if (snapshot.docs.some((doc) => doc.id !== excludedId && (doc.get('parentId') ?? null) === device.parentId)) {
    throw new CatalogError('That slug is already used by a sibling device.', 409);
  }
}

export async function createAdminDevice(input) {
  const device = validateDeviceCreate(input);
  return db.runTransaction(async (transaction) => {
    if (device.parentId) {
      const parent = await transaction.get(db.collection('shopDevices').doc(device.parentId));
      const expected = device.type === 'series' ? 'brand' : 'series';
      if (!parent.exists) throw new CatalogError(`Parent must be an existing ${expected}.`);
      assertDeviceParentType(device.type, parent.get('type'));
    }
    await assertUnique(transaction, device);
    const siblings = await transaction.get(db.collection('shopDevices').where('parentId', '==', device.parentId));
    const order = siblings.docs.reduce((max, doc) => Math.max(max, Number(doc.get('order')) || 0), -1) + 1;
    const base = slugifyCatalogName(device.slug) || device.type;
    let id = base; let suffix = 2; let ref = db.collection('shopDevices').doc(id);
    while ((await transaction.get(ref)).exists) { id = `${base}-${suffix++}`; ref = db.collection('shopDevices').doc(id); }
    const record = { id, ...device, order };
    transaction.create(ref, record);
    return record;
  });
}

export async function updateAdminDevice(id, input) {
  return db.runTransaction(async (transaction) => {
    const ref = db.collection('shopDevices').doc(id); const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new CatalogError('Device not found.', 404);
    const current = serializeDevice(snapshot); assertImmutableDeviceFields(input, current);
    const fields = validateCatalogFields(input); const next = { ...current, ...fields };
    await assertUnique(transaction, next, id);
    if (current.status === 'active' && next.status !== 'active') {
      const refs = await referenceDocs(transaction, productField[current.type], id);
      assertCatalogStatusChangeAllowed(current.status, next.status, refs.docs.filter((doc) => doc.get('status') === 'active').length);
    }
    transaction.update(ref, fields); return next;
  });
}

export async function deleteAdminDevice(id) {
  return db.runTransaction(async (transaction) => {
    const ref = db.collection('shopDevices').doc(id); const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new CatalogError('Device not found.', 404);
    const device = serializeDevice(snapshot);
    const children = await transaction.get(db.collection('shopDevices').where('parentId', '==', id));
    const refs = await referenceDocs(transaction, productField[device.type], id);
    assertCatalogDeletionAllowed({ childCount: children.size, referenceCount: refs.size });
    transaction.delete(ref);
  });
}

export async function getAdminDevices() {
  const snapshot = await db.collection('shopDevices').select(...DEVICE_FIELDS).get();
  return snapshot.docs.map(serializeDevice);
}

export async function reorderAdminDevices(input) {
  await db.runTransaction(async (transaction) => {
    const parentId = input?.parentId == null ? null : input.parentId;
    const requestedType = typeof input?.type === 'string' ? input.type.trim() : '';
    if (['series', 'model'].includes(requestedType)) {
      const parent = await transaction.get(db.collection('shopDevices').doc(parentId || ''));
      if (!parent.exists) throw new CatalogError('Device parent not found.', 409);
      assertDeviceParentType(requestedType, parent.get('type'));
    }
    const snapshot = await transaction.get(db.collection('shopDevices').where('parentId', '==', parentId));
    const siblings = snapshot.docs.map(serializeDevice).filter((device) => device.type === requestedType);
    const order = validateDeviceSiblingOrder(input, siblings);
    order.ids.forEach((id, index) => transaction.update(db.collection('shopDevices').doc(id), { order: index }));
  });
}
