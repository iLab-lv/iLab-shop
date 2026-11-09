import { getSessionUserProfile } from '../../../../lib/auth/sessionAuth';
import { getCheckoutOrder } from '../../../../lib/shopOrders';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(_request, { params }) {
  try {
    const session = await getSessionUserProfile();
    const { orderId } = await params;
    const order = await getCheckoutOrder(orderId, session);
    return Response.json(order ? { order } : { error: 'Order not found.' }, { status: order ? 200 : 404, headers });
  } catch (error) {
    if (error.message === 'authentication_required') return Response.json({ error: 'Sign in again to check this order.' }, { status: 401, headers });
    if (error.message === 'invalid_order') return Response.json({ error: 'Invalid order reference.' }, { status: 400, headers });
    if (error.message === 'order_deleted') return Response.json({ error: 'This order was removed by an administrator. Check with iLab before placing a replacement.', code: 'ORDER_DELETED' }, { status: 410, headers });
    console.error('Unable to recover checkout.', error);
    return Response.json({ error: 'Unable to check the order. Retry before placing another order.' }, { status: 503, headers });
  }
}
