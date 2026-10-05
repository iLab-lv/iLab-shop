import { getShopAdminSession } from '../../../../lib/auth/sessionAuth';
import { getAdminOrders } from '../../../../lib/shopOrders';
export const dynamic = 'force-dynamic';
export async function GET() {
  const session = await getShopAdminSession();
  if (!session.authenticated) return Response.json({ error: 'Authentication is required.' }, { status: 401 });
  if (!session.authorized) return Response.json({ error: 'Shop administration access is required.' }, { status: 403 });
  try { return Response.json({ orders: await getAdminOrders() }, { headers: { 'Cache-Control': 'private, no-store' } }); }
  catch (error) { console.error('Unable to load orders.', error); return Response.json({ error: 'Unable to load orders.' }, { status: 500 }); }
}
