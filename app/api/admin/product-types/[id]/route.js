import { NextResponse } from 'next/server';
import { deleteAdminProductType, updateAdminProductType } from '../../../../../lib/adminProductTypes';
import { PERMISSIONS } from '../../../../../lib/auth/roles.mjs';
import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../../lib/auth/adminMutationAuth';
import { catalogErrorResponse, readJsonObject } from '../../../../../lib/adminCatalogHttp';

export async function PATCH(request, { params }) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); if (denied) return denied;
  try { const { id } = await params; return NextResponse.json({ productType: await updateAdminProductType(id, await readJsonObject(request)) }, { headers: PRIVATE_NO_STORE }); }
  catch (error) { return catalogErrorResponse(error, 'Unable to update product type.'); }
}
export async function DELETE(request, { params }) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); if (denied) return denied;
  try { const { id } = await params; await deleteAdminProductType(id); return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE }); }
  catch (error) { return catalogErrorResponse(error, 'Unable to delete product type.'); }
}
