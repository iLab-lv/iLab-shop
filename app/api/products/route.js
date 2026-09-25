import { NextResponse } from 'next/server';
import { decodeProductsCursor, getProductsPage } from '../../../lib/shopProducts';
import { getSessionUserProfile } from '../../../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../../../lib/auth/roles.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const productTypeId = request.nextUrl.searchParams.get('type') ?? '';
    if (productTypeId.includes('/') || productTypeId.length > 100) {
      return NextResponse.json({ error: 'Invalid product type.' }, { status: 400 });
    }
    const cursor = decodeProductsCursor(request.nextUrl.searchParams.get('cursor'));
    const session = await getSessionUserProfile();
    const page = await getProductsPage(cursor, productTypeId, {
      includeWholesale: canViewWholesalePrices(session?.profile),
    });
    return NextResponse.json(page, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const invalidCursor = error?.message === 'Invalid product cursor.';
    if (!invalidCursor) console.error('Unable to load products.', error);
    return NextResponse.json(
      { error: invalidCursor ? error.message : 'Unable to load products.' },
      { status: invalidCursor ? 400 : 500 }
    );
  }
}
