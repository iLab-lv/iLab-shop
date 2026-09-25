import { NextResponse } from 'next/server';
import { deleteAdminDevice, updateAdminDevice } from '../../../../../lib/adminDevices';
import { PERMISSIONS } from '../../../../../lib/auth/roles.mjs';
import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../../lib/auth/adminMutationAuth';
import { catalogErrorResponse, readJsonObject } from '../../../../../lib/adminCatalogHttp';

async function authorize(request) { return authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); }
export async function PATCH(request, { params }) {
  const denied = await authorize(request); if (denied) return denied;
  try { const { id } = await params; return NextResponse.json({ device: await updateAdminDevice(id, await readJsonObject(request)) }, { headers: PRIVATE_NO_STORE }); }
  catch (error) { return catalogErrorResponse(error, 'Unable to update device.'); }
}
export async function DELETE(request, { params }) {
  const denied = await authorize(request); if (denied) return denied;
  try { const { id } = await params; await deleteAdminDevice(id); return NextResponse.json({ ok: true }, { headers: PRIVATE_NO_STORE }); }
  catch (error) { return catalogErrorResponse(error, 'Unable to delete device.'); }
}
