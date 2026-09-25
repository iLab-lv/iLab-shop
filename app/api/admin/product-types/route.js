import { NextResponse } from 'next/server';
import { createAdminProductType, getAdminProductTypes } from '../../../../lib/adminProductTypes';
import { getShopAdminSession } from '../../../../lib/auth/sessionAuth';
import { PERMISSIONS } from '../../../../lib/auth/roles.mjs';
import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../lib/auth/adminMutationAuth';
import { catalogErrorResponse, readJsonObject } from '../../../../lib/adminCatalogHttp';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getShopAdminSession();
  if (!session.authenticated) {
    return NextResponse.json(
      { error: 'Authentication is required.' },
      { status: 401, headers: PRIVATE_NO_STORE }
    );
  }
  if (!session.authorized) {
    return NextResponse.json(
      { error: 'Shop administration access is required.' },
      { status: 403, headers: PRIVATE_NO_STORE }
    );
  }

  try {
    return NextResponse.json({ productTypes: await getAdminProductTypes() }, {
      headers: PRIVATE_NO_STORE,
    });
  } catch (error) {
    console.error('Unable to load admin product types.', error);
    return NextResponse.json(
      { error: 'Unable to load product types.' },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}

export async function POST(request) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); if (denied) return denied;
  try { return NextResponse.json({ productType: await createAdminProductType(await readJsonObject(request)) }, { status: 201, headers: PRIVATE_NO_STORE }); }
  catch (error) { return catalogErrorResponse(error, 'Unable to create product type.'); }
}
