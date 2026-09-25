import { NextResponse } from 'next/server';
import { getShopAdminSession } from '../../../../lib/auth/sessionAuth';
import { createAdminProduct, getAdminProductsCatalog } from '../../../../lib/adminProducts';
import { PERMISSIONS } from '../../../../lib/auth/roles.mjs';
import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../lib/auth/adminMutationAuth';
import { readJsonObject } from '../../../../lib/adminCatalogHttp';
import { productErrorResponse } from '../../../../lib/adminProductHttp';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getShopAdminSession();
  if (!session.authenticated) {
    return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  }
  if (!session.authorized) {
    return NextResponse.json({ error: 'Shop administration access is required.' }, { status: 403 });
  }

  try {
    return NextResponse.json(await getAdminProductsCatalog(), {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('Unable to load admin products.', error);
    return NextResponse.json({ error: 'Unable to load products.' }, { status: 500 });
  }
}

export async function POST(request) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); if (denied) return denied;
  try { return NextResponse.json({ product: await createAdminProduct(await readJsonObject(request)) }, { status: 201, headers: PRIVATE_NO_STORE }); }
  catch (error) { return productErrorResponse(error, 'Unable to create product.'); }
}
