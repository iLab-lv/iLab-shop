import { getShopAdminSession } from '../../../../lib/auth/sessionAuth';
import { getAdminOrders } from '../../../../lib/shopOrders';
export const dynamic = 'force-dynamic';
const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };
export async function GET() {
  try {
    const session = await getShopAdminSession();
    if (!session.authenticated) return Response.json({ error: 'Authentication is required.' }, { status: 401, headers: PRIVATE_NO_STORE });
    if (!session.authorized) return Response.json({ error: 'Shop administration access is required.' }, { status: 403, headers: PRIVATE_NO_STORE });
    return Response.json({ orders: await getAdminOrders() }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    console.error('Unable to load orders.', error);
    return Response.json({ error: 'Unable to load orders.' }, { status: 500, headers: PRIVATE_NO_STORE });
  }
}
