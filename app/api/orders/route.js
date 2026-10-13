import { getSessionUserProfile } from '../../../lib/auth/sessionAuth';
import { isActiveUser } from '../../../lib/auth/roles.mjs';
import { createOrder, serializeOrder } from '../../../lib/shopOrders';

export const dynamic = 'force-dynamic';
export async function POST(request) {
  try {
    const session = await getSessionUserProfile();
    if (!session?.token?.uid || !isActiveUser(session.profile)) return Response.json({ error: 'Sign in to place an order.', code: 'AUTHENTICATION_REQUIRED' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
    const input = await request.json();
    const order = await createOrder(input, session);
    return Response.json({ order: serializeOrder(order, order.id) }, { status: order.repeated ? 200 : 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error?.message === 'authentication_required') return Response.json({ error: 'Sign in to place an order.', code: 'AUTHENTICATION_REQUIRED' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
    if (error instanceof SyntaxError || error?.message === 'invalid_checkout') return Response.json({ error: 'Please check the checkout details.', code: 'INVALID_CHECKOUT' }, { status: 400 });
    if (error?.message === 'invalid_pickup_location') return Response.json({ error: 'That pickup location is no longer available. Refresh checkout and choose another location.', code: 'INVALID_PICKUP_LOCATION' }, { status: 409 });
    if (error?.message === 'price_changed') return Response.json({ error: 'Prices changed. Review the refreshed cart before ordering.', code: 'PRICE_CHANGED', currentTotalCents: error.currentTotalCents }, { status: 409 });
    if (error?.message === 'cart_changed') return Response.json({ error: 'Cart availability changed. Review the cart before ordering.', code: 'CART_CHANGED', details: error.details }, { status: 409 });
    console.error('Unable to create order.', error);
    return Response.json({ error: 'Unable to place the order. Please try again.' }, { status: 500 });
  }
}
