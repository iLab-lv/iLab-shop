import { NextResponse } from 'next/server';
import { getAdminProductTypes } from '../../../../lib/adminProductTypes';
import { getShopAdminSession } from '../../../../lib/auth/sessionAuth';

export const dynamic = 'force-dynamic';

const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };

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
