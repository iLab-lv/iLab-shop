import 'server-only';

import { db } from './firebaseAdmin.js';

export const ADMIN_PRODUCTS_PAGE_SIZE = 25;

const PRODUCT_FIELDS = [
  'id', 'sku', 'slug', 'name', 'description', 'metaTitle', 'metaDescription',
  'purchasePriceCents', 'wholesalePriceCents', 'retailPriceCents',
  'createdAt', 'updatedAt', 'productTypeId',
  'modelIds', 'seriesIds', 'brandIds', 'imagePaths',
  'stockQty', 'status',
];

function serializeProduct(snapshot) {
  const data = snapshot.data();
  return {
    id: data.id ?? snapshot.id,
    sku: Number.isInteger(data.sku) ? data.sku : null,
    slug: data.slug ?? '',
    name: data.name ?? '',
    description: data.description ?? '',
    metaTitle: data.metaTitle ?? '',
    metaDescription: data.metaDescription ?? '',
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
