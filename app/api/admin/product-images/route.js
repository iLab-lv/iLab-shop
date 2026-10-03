import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { firebaseStorageBucket } from '../../../../lib/firebaseAdmin';
import { deleteProductImageIfUnreferenced } from '../../../../lib/adminProductImages';
import { ProductInputError, validateProductDocumentId } from '../../../../lib/adminProductValidation.mjs';
import { PERMISSIONS } from '../../../../lib/auth/roles.mjs';
import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../lib/auth/adminMutationAuth';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);
export async function POST(request) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); if (denied) return denied;
  try {
    const form = await request.formData(), file = form.get('file'), productId = validateProductDocumentId(form.get('productId'));
    if (!(file instanceof File) || !TYPES.has(file.type) || file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: 'Upload a JPEG, PNG, or WebP image no larger than 5 MB.' }, { status: 400, headers: PRIVATE_NO_STORE });
    const path = `shop/products/${productId}/${randomUUID()}.${TYPES.get(file.type)}`;
    await firebaseStorageBucket.file(path).save(Buffer.from(await file.arrayBuffer()), { resumable: false, metadata: { contentType: file.type, cacheControl: 'public,max-age=31536000' } });
    return NextResponse.json({ path }, { status: 201, headers: PRIVATE_NO_STORE });
  } catch (error) { if (error instanceof ProductInputError) return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE_NO_STORE }); console.error('Product image upload failed.', error); return NextResponse.json({ error: 'Unable to upload image.' }, { status: 500, headers: PRIVATE_NO_STORE }); }
}
export async function DELETE(request) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); if (denied) return denied;
  try {
    const { path } = await request.json();
    const result = await deleteProductImageIfUnreferenced(path);
    return NextResponse.json({ ok: true, ...result }, { headers: PRIVATE_NO_STORE });
  } catch (error) { if (error instanceof ProductInputError) return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE_NO_STORE }); console.error('Product image cleanup failed.', error); return NextResponse.json({ error: 'Unable to remove image.' }, { status: 500, headers: PRIVATE_NO_STORE }); }
}
