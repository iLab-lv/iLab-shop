import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../../lib/auth/adminMutationAuth';
import { PERMISSIONS } from '../../../../../lib/auth/roles.mjs';
import { updateOrder } from '../../../../../lib/shopOrders';
export async function PATCH(request, { params }) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.ACCESS_SHOP_ADMIN); if (denied) return denied;
  try { const { id } = await params; return Response.json({ order: await updateOrder(id, await request.json()) }, { headers: PRIVATE_NO_STORE }); }
  catch (error) {
    const known = ['invalid_order', 'order_not_found', 'cancelled_terminal'].includes(error?.message);
    return Response.json({ error: error?.message === 'cancelled_terminal' ? 'Cancelled orders cannot be reopened.' : error?.message === 'order_not_found' ? 'Order not found.' : known ? 'Invalid order update.' : 'Unable to update order.' }, { status: error?.message === 'order_not_found' ? 404 : known ? 400 : 500, headers: PRIVATE_NO_STORE });
  }
}
