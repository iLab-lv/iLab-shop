import { NextResponse } from 'next/server';
import { getShopAdminSession } from '../../../../lib/auth/sessionAuth';
import { getAdminProductsCatalog } from '../../../../lib/adminProducts';

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
