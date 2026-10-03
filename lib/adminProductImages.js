import 'server-only';

import { db, firebaseStorageBucket } from './firebaseAdmin.js';
import { ProductInputError } from './adminProductValidation.mjs';

export function validateProductImagePath(path) {
  if (typeof path !== 'string' || !path.startsWith('shop/products/') || path.length > 1500) {
    throw new ProductInputError('Invalid image path.');
  }
  return path;
}

export async function deleteProductImageIfUnreferenced(path) {
  const safePath = validateProductImagePath(path);
  const references = await db.collection('shopProducts').where('imagePaths', 'array-contains', safePath).limit(1).get();
  if (!references.empty) return { deleted: false, referenced: true };
  await firebaseStorageBucket.file(safePath).delete({ ignoreNotFound: true });
  return { deleted: true, referenced: false };
}

export async function cleanupUnreferencedProductImages(paths, context = 'Product image cleanup') {
  const uniquePaths = [...new Set(paths)];
  const failures = [];
  for (const path of uniquePaths) {
    try {
      await deleteProductImageIfUnreferenced(path);
    } catch (error) {
      failures.push(path);
      console.error(`${context} failed for ${path}.`, error);
    }
  }
  return { attempted: uniquePaths.length, failed: failures.length, failures };
}
