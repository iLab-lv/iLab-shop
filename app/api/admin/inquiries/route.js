import { NextResponse } from 'next/server';
import { getShopAdminSession } from '../../../../lib/auth/sessionAuth';
import { getAdminInquiries } from '../../../../lib/shopInquiries';

export const dynamic = 'force-dynamic';
const HEADERS = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const session = await getShopAdminSession();
  if (!session.authenticated) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401, headers: HEADERS });
  if (!session.authorized) return NextResponse.json({ error: 'Shop administration access is required.' }, { status: 403, headers: HEADERS });
  try { return NextResponse.json({ inquiries: await getAdminInquiries() }, { headers: HEADERS }); }
  catch (error) { console.error('Unable to load admin inquiries.', error); return NextResponse.json({ error: 'Unable to load inquiries.' }, { status: 500, headers: HEADERS }); }
}
