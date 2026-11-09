import { getSessionUserProfile } from '../../../../lib/auth/sessionAuth';
import { resolveCart } from '../../../../lib/shopOrders';

export const dynamic = 'force-dynamic';
export async function POST(request) {
  try {
    const input = await request.json();
    const session = await getSessionUserProfile();
    return Response.json(await resolveCart(input?.items, session?.profile), { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof SyntaxError || error?.message?.startsWith('Invalid cart')) return Response.json({ error: 'Invalid cart.' }, { status: 400, headers: { 'Cache-Control': 'private, no-store' } });
    console.error('Unable to resolve cart.', error);
    return Response.json({ error: 'Unable to refresh the cart.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
