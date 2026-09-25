import { NextResponse } from 'next/server';
import { reorderAdminProductTypes } from '../../../../../lib/adminProductTypes';
import { PERMISSIONS } from '../../../../../lib/auth/roles.mjs';
import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../../lib/auth/adminMutationAuth';
import { catalogErrorResponse, readJsonObject } from '../../../../../lib/adminCatalogHttp';

export async function PUT(request) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); if (denied) return denied;
  try { const body = await readJsonObject(request); await reorderAdminProductTypes(body.ids); return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE }); }
  catch (error) { return catalogErrorResponse(error, 'Unable to reorder product types.'); }
}
