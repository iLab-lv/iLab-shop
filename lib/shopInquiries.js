import 'server-only';

import { db, serverTimestamp } from './firebaseAdmin';
import { canViewWholesalePrices } from './auth/roles.mjs';
import { resolveProductAvailabilitySnapshot, validateInquiryPayload, INQUIRY_STATUSES } from './partInquiry.mjs';

const inquiries = db.collection('shopInquiries');
const asIso = (value) => value?.toDate ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : null;

function serializeInquiry(document) {
  const data = document.data();
  return { id: document.id, ...data, createdAt: asIso(data.createdAt), updatedAt: asIso(data.updatedAt) };
}

async function resolveCatalogContext(inquiry) {
  if (inquiry.source === 'search') return { brandId: null, brandName: null, modelId: null };
  if (inquiry.source === 'brand') {
    const brandSnapshot = await db.collection('shopDevices').doc(inquiry.brandId).get();
    const brand = brandSnapshot.exists ? brandSnapshot.data() : null;
    if (!brand || brand.type !== 'brand' || brand.status !== 'active') throw new Error('brand_context_invalid');
    return { brandId: brandSnapshot.id, brandName: brand.name || brandSnapshot.id, modelId: null };
  }

  const modelSnapshot = await db.collection('shopDevices').doc(inquiry.modelId).get();
  const model = modelSnapshot.exists ? modelSnapshot.data() : null;
  if (!model || model.type !== 'model' || model.status !== 'active' || !model.parentId) throw new Error('model_context_invalid');
  const seriesSnapshot = await db.collection('shopDevices').doc(model.parentId).get();
  const series = seriesSnapshot.exists ? seriesSnapshot.data() : null;
  if (!series || series.type !== 'series' || series.status !== 'active' || !series.parentId) throw new Error('model_context_invalid');
  const brandSnapshot = await db.collection('shopDevices').doc(series.parentId).get();
  const brand = brandSnapshot.exists ? brandSnapshot.data() : null;
  if (!brand || brand.type !== 'brand' || brand.status !== 'active' || (inquiry.brandId && inquiry.brandId !== brandSnapshot.id)) throw new Error('model_context_invalid');
  return { brandId: brandSnapshot.id, brandName: brand.name || brandSnapshot.id, modelId: modelSnapshot.id, modelName: model.name || modelSnapshot.id };
}

async function resolveProductAvailability(inquiry, userId) {
  const productRef = db.collection('shopProducts').doc(inquiry.productId);
  const profileRef = userId ? db.collection('users').doc(userId) : null;
  const [productDocument, profileDocument] = await Promise.all([
    productRef.get(),
    profileRef ? profileRef.get() : Promise.resolve(null),
  ]);
  if (!productDocument.exists || productDocument.get('status') !== 'active') {
    return { ok: false, status: 404, error: 'This product is no longer available to request.' };
  }

  const data = productDocument.data();
  const product = {
    id: productDocument.id,
    sku: Number.isInteger(data.sku) ? data.sku : null,
    slug: data.slug ?? '',
    name: data.name ?? '',
    status: data.status,
    stockQty: data.stockQty,
    retailPriceCents: Number.isInteger(data.retailPriceCents) ? data.retailPriceCents : null,
    wholesalePriceCents: Number.isInteger(data.wholesalePriceCents) ? data.wholesalePriceCents : null,
  };
  const result = resolveProductAvailabilitySnapshot(product, {
    canUseWholesale: canViewWholesalePrices(profileDocument?.data()),
  });
  if (!result.ok) {
    if (result.reason === 'available') return { ok: false, status: 409, error: 'This product is now available to order.' };
    if (result.reason === 'missing_price') return { ok: false, status: 409, error: 'Availability requests are not available for this product right now.' };
    return { ok: false, status: 404, error: 'This product is no longer available to request.' };
  }

  const modelIds = Array.isArray(data.modelIds) ? [...new Set(data.modelIds.filter((id) => typeof id === 'string' && id && !id.includes('/')))] : [];
  const modelById = new Map();
  for (let index = 0; index < modelIds.length; index += 100) {
    const documents = await db.getAll(...modelIds.slice(index, index + 100).map((id) => db.collection('shopDevices').doc(id)));
    for (const document of documents) {
      if (document.exists && document.get('status') === 'active' && document.get('type') === 'model') {
        modelById.set(document.id, document.get('name') || document.id);
      }
    }
  }

  return {
    ok: true,
    snapshot: {
      ...result.snapshot,
      compatibleModelNames: modelIds.map((id) => modelById.get(id)).filter(Boolean),
    },
  };
}

export async function createPartInquiry(input, { userId = null } = {}) {
  const validation = validateInquiryPayload(input);
  if (!validation.ok) return validation;
  if (validation.ignored) return { ok: true, ignored: true };
  const inquiry = validation.inquiry;
  let catalog;
  let productSnapshot = null;
  if (inquiry.source === 'product') {
    const result = await resolveProductAvailability(inquiry, userId);
    if (!result.ok) return result;
    productSnapshot = result.snapshot;
    catalog = { brandId: null, brandName: null, modelId: null, modelName: '' };
  } else {
    try { catalog = await resolveCatalogContext(inquiry); }
    catch { return { ok: false, status: 400, error: 'The selected Shop context is no longer available. Please refresh and try again.' }; }
  }
  const record = {
    source: inquiry.source,
    brandId: catalog.brandId,
    brandName: catalog.brandName,
    modelId: catalog.modelId,
    modelName: catalog.modelName ?? inquiry.modelName,
    requestedPart: productSnapshot?.requestedPart ?? inquiry.requestedPart,
    message: inquiry.message,
    searchQuery: inquiry.searchQuery,
    sourcePath: inquiry.sourcePath,
    contact: inquiry.contact,
    userId: typeof userId === 'string' && userId ? userId : null,
    status: 'new',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(productSnapshot ?? {}),
  };
  await inquiries.add(record);
  return { ok: true };
}

export async function getAdminInquiries() {
  const snapshot = await inquiries.orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(serializeInquiry);
}

export async function updateAdminInquiryStatus(id, status) {
  if (!INQUIRY_STATUSES.includes(status)) return { ok: false, error: 'Choose a valid inquiry status.' };
  if (typeof id !== 'string' || !id || id.includes('/')) return { ok: false, error: 'Inquiry not found.' };
  const reference = inquiries.doc(id);
  const snapshot = await reference.get();
  if (!snapshot.exists) return { ok: false, error: 'Inquiry not found.' };
  await reference.update({ status, updatedAt: serverTimestamp() });
  return { ok: true, inquiry: serializeInquiry(await reference.get()) };
}

export async function countNewInquiries() {
  const result = await inquiries.where('status', '==', 'new').count().get();
  return result.data().count;
}
