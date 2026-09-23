import { NextResponse } from 'next/server';
import { getAdminDevices } from '../../../../lib/adminDevices';
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
    return NextResponse.json({ devices: await getAdminDevices() }, {
      headers: PRIVATE_NO_STORE,
    });
  } catch (error) {
    console.error('Unable to load admin devices.', error);
    return NextResponse.json(
      { error: 'Unable to load devices.' },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}
