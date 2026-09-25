export const CATALOG_STATUSES = Object.freeze(['active', 'inactive']);
export const DEVICE_TYPES = Object.freeze(['brand', 'series', 'model']);

export class CatalogError extends Error {
  constructor(message, status = 400) { super(message); this.name = 'CatalogError'; this.status = status; }
}

const clean = (value) => typeof value === 'string' ? value.trim() : '';

export function slugifyCatalogName(value) {
  return clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function validateCatalogFields(input) {
  const name = clean(input?.name);
  const slug = clean(input?.slug).toLowerCase();
  const status = clean(input?.status);
  if (!name || name.length > 160) throw new CatalogError('Name is required and must be at most 160 characters.');
  if (!slug || slug.length > 160 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new CatalogError('Slug must contain lowercase letters, numbers, and single hyphens only.');
  }
  if (!CATALOG_STATUSES.includes(status)) throw new CatalogError('Status must be active or inactive.');
  return { name, slug, status };
}

export function validateDeviceCreate(input) {
  const fields = validateCatalogFields(input);
  const type = clean(input?.type);
  const parentId = input?.parentId == null ? null : clean(input.parentId);
  if (!DEVICE_TYPES.includes(type)) throw new CatalogError('Device type is invalid.');
  if (type === 'brand' && parentId !== null) throw new CatalogError('A brand cannot have a parent.');
  if (type !== 'brand' && !parentId) throw new CatalogError(`${type} requires a parent.`);
  return { ...fields, type, parentId };
}

export function assertDeviceParentType(type, parentType) {
  const expected = type === 'series' ? 'brand' : type === 'model' ? 'series' : null;
  if ((type === 'brand' && parentType !== null) || (expected && parentType !== expected)) {
    throw new CatalogError(expected ? `Parent must be an existing ${expected}.` : 'A brand cannot have a parent.');
  }
  return true;
}

export function assertCatalogDeletionAllowed({ childCount = 0, referenceCount = 0 }) {
  if (childCount > 0) throw new CatalogError('Delete child devices first.', 409);
  if (referenceCount > 0) throw new CatalogError('This entry is referenced by products and cannot be deleted.', 409);
  return true;
}

export function assertCatalogStatusChangeAllowed(currentStatus, nextStatus, activeReferenceCount) {
  if (currentStatus === 'active' && nextStatus !== 'active' && activeReferenceCount > 0) {
    throw new CatalogError('Deactivate referencing active products first.', 409);
  }
  return true;
}

export function assertImmutableDeviceFields(input, device) {
  for (const field of ['id', 'type', 'parentId']) {
    if (Object.hasOwn(input || {}, field) && input[field] !== device[field]) {
      throw new CatalogError(`${field} cannot be changed.`);
    }
  }
}

export function validateCompleteOrder(ids, currentIds) {
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string')) throw new CatalogError('A complete ordered ID list is required.');
  if (new Set(ids).size !== ids.length || ids.length !== currentIds.length || currentIds.some((id) => !ids.includes(id))) {
    throw new CatalogError('Order is stale or incomplete.', 409);
  }
  return ids;
}

export function validateDeviceSiblingOrder(input, siblings) {
  const type = clean(input?.type);
  const parentId = input?.parentId == null ? null : clean(input.parentId);
  if (!DEVICE_TYPES.includes(type)) throw new CatalogError('Device type is invalid.');
  if (type === 'brand' && parentId !== null) throw new CatalogError('Brands must be ordered at the root level.');
  if (type !== 'brand' && !parentId) throw new CatalogError(`${type} ordering requires a parent.`);
  if (!Array.isArray(siblings) || siblings.some((device) => device.type !== type || (device.parentId ?? null) !== parentId)) {
    throw new CatalogError('Device order must contain one sibling group.', 409);
  }
  return { type, parentId, ids: validateCompleteOrder(input?.ids, siblings.map((device) => device.id)) };
}

export function moveCatalogItem(items, fromId, toId) {
  const from = items.findIndex((item) => item.id === fromId);
  const to = items.findIndex((item) => item.id === toId);
  if (from < 0 || to < 0 || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((entry, order) => ({ ...entry, order }));
}
