import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { firebaseStorageBucket, db } from '../../../../lib/firebaseAdmin';
import { PERMISSIONS } from '../../../../lib/auth/roles.mjs';
import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../lib/auth/adminMutationAuth';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
export async function POST(request) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); if (denied) return denied;
  try {
    const form = await request.formData(), file = form.get('file'), productId = String(form.get('productId') || '_drafts').replace(/[^a-zA-Z0-9_-]/g, '');
    if (!(file instanceof File) || !TYPES.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'Upload a JPEG, PNG, or WebP image no larger than 5 MB.' }, { status: 400, headers: PRIVATE_NO_STORE });
    const path = `shop/products/${productId || '_drafts'}/${randomUUID()}.${TYPES.get(file.type)}`;
    await firebaseStorageBucket.file(path).save(Buffer.from(await file.arrayBuffer()), { resumable: false, metadata: { contentType: file.type, cacheControl: 'public,max-age=31536000' } });
    return NextResponse.json({ path }, { status: 201, headers: PRIVATE_NO_STORE });
  } catch (error) { console.error('Product image upload failed.', error); return NextResponse.json({ error: 'Unable to upload image.' }, { status: 500, headers: PRIVATE_NO_STORE }); }
}
export async function DELETE(request) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); if (denied) return denied;
  try {
    const { path } = await request.json(); if (typeof path !== 'string' || !path.startsWith('shop/products/')) return NextResponse.json({ error: 'Invalid image path.' }, { status: 400, headers: PRIVATE_NO_STORE });
    const refs = await db.collection('shopProducts').where('imagePaths', 'array-contains', path).limit(1).get();
    if (!refs.empty) return NextResponse.json({ error: 'Image is still referenced by a product.' }, { status: 409, headers: PRIVATE_NO_STORE });
    await firebaseStorageBucket.file(path).delete({ ignoreNotFound: true }); return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
  } catch (error) { console.error('Product image cleanup failed.', error); return NextResponse.json({ error: 'Unable to remove image.' }, { status: 500, headers: PRIVATE_NO_STORE }); }
}
