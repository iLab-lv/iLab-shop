import { NextResponse } from 'next/server';
import { getShopAdminSession } from '../../../../lib/auth/sessionAuth';
import { PRIVATE_NO_STORE } from '../../../../lib/auth/adminMutationAuth';
import { getServiceTargets } from '../../../../lib/serviceTargets';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getShopAdminSession();
  if (!session.authenticated) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401, headers: PRIVATE_NO_STORE });
  if (!session.authorized) return NextResponse.json({ error: 'Shop administration access is required.' }, { status: 403, headers: PRIVATE_NO_STORE });
  try {
    const targets = await getServiceTargets();
    return NextResponse.json({
      brandTargets: [{ id: 'home', name: 'Service homepage', type: 'home', path: '/', paths: { lv: '/', ru: '/ru' }, description: 'LV / · RU /ru' }, ...targets.allTargets],
      deviceTargets: targets.deviceTargets,
    }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    console.error('Unable to load Service destinations for Shop Admin.', error);
    return NextResponse.json({ error: 'Unable to load Service destinations.' }, { status: 500, headers: PRIVATE_NO_STORE });
  }
}
