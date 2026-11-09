import { getSessionUserProfile } from '../../../lib/auth/sessionAuth';
import { isActiveUser } from '../../../lib/auth/roles.mjs';
import { createOrder, serializeOrder } from '../../../lib/shopOrders';
import { updateCustomerProfileDefaults } from '../../../lib/auth/userProfiles';
import { createOrderWithProfileDefaults } from '../../../lib/orderSubmission.mjs';
import { isSameOriginRequest } from '../../../lib/auth/requestOrigin.mjs';

export const dynamic = 'force-dynamic';
export async function POST(request) {
  try {
    const session = await getSessionUserProfile();
    if (!session?.token?.uid || !isActiveUser(session.profile)) return Response.json({ error: 'Sign in to place an order.', code: 'AUTHENTICATION_REQUIRED' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
    if (!isSameOriginRequest(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
    const input = await request.json();
    if (input?.expectedUid !== undefined && input.expectedUid !== session.token.uid) return Response.json({ error: 'Your account changed. Sign in to the original account to recover checkout.', code: 'ACCOUNT_CHANGED' }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
    const submission = await createOrderWithProfileDefaults(input, session, {
      createOrder,
      saveProfileDefaults: updateCustomerProfileDefaults,
    });
    if (submission.profileSaveError) console.error('Order succeeded but customer profile defaults could not be saved.', submission.profileSaveError);
    const { order, profileSaved } = submission;
    return Response.json({ order: serializeOrder(order, order.id), ...(profileSaved === null ? {} : { profileSaved }) }, { status: order.repeated ? 200 : 201, headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error?.message === 'order_deleted') return Response.json({ error: 'This order was removed by an administrator. Check with iLab before placing a replacement.', code: 'ORDER_DELETED' }, { status: 410, headers: { 'Cache-Control': 'private, no-store' } });
    if (error?.message === 'authentication_required') return Response.json({ error: 'Sign in to place an order.', code: 'AUTHENTICATION_REQUIRED' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } });
    if (error instanceof SyntaxError || error?.message === 'invalid_checkout' || error?.message?.startsWith('Invalid cart')) return Response.json({ error: 'Please check the checkout details.', code: 'INVALID_CHECKOUT' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
    if (error?.message === 'invalid_pickup_location') return Response.json({ error: 'That pickup location is no longer available. Refresh checkout and choose another location.', code: 'INVALID_PICKUP_LOCATION' }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
    if (error?.message === 'price_changed') return Response.json({ error: 'Prices changed. Review the refreshed cart before ordering.', code: 'PRICE_CHANGED', currentTotalCents: error.currentTotalCents }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
    if (error?.message === 'cart_changed') return Response.json({ error: 'Cart availability changed. Review the cart before ordering.', code: 'CART_CHANGED', details: error.details }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
    if (error?.message === 'duplicate_request') return Response.json({ error: 'This checkout request belongs to another account. Reload checkout and try again.', code: 'DUPLICATE_REQUEST' }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } });
    console.error('Unable to create order.', error);
    return Response.json({ error: 'Unable to place the order. Please try again.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
  }
}

