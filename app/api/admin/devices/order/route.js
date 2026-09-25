import { NextResponse } from 'next/server';
import { reorderAdminDevices } from '../../../../../lib/adminDevices';
import { catalogErrorResponse, readJsonObject } from '../../../../../lib/adminCatalogHttp';
import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../../lib/auth/adminMutationAuth';
import { PERMISSIONS } from '../../../../../lib/auth/roles.mjs';

export async function PUT(request) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG);
  if (denied) return denied;

  try {
    await reorderAdminDevices(await readJsonObject(request));
    return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    return catalogErrorResponse(error, 'Unable to reorder devices.');
  }
}
