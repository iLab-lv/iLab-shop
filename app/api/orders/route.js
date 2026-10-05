import { getSessionUserProfile } from '../../../lib/auth/sessionAuth';
import { createOrder, serializeOrder } from '../../../lib/shopOrders';

export const dynamic = 'force-dynamic';
export async function POST(request) {
  try {
    const input = await request.json();
    const session = await getSessionUserProfile();
    const order = await createOrder(input, session);
    return Response.json({ order: serializeOrder(order, order.id) }, { status: order.repeated ? 200 : 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof SyntaxError || error?.message === 'invalid_checkout') return Response.json({ error: 'Please check the checkout details.', code: 'INVALID_CHECKOUT' }, { status: 400 });
    if (error?.message === 'price_changed') return Response.json({ error: 'Prices changed. Review the refreshed cart before ordering.', code: 'PRICE_CHANGED', currentTotalCents: error.currentTotalCents }, { status: 409 });
    if (error?.message === 'cart_changed') return Response.json({ error: 'Cart availability changed. Review the cart before ordering.', code: 'CART_CHANGED', details: error.details }, { status: 409 });
    console.error('Unable to create order.', error);
    return Response.json({ error: 'Unable to place the order. Please try again.' }, { status: 500 });
  }
}
