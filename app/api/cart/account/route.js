import { getSessionUserProfile } from '../../../../lib/auth/sessionAuth';
import { isActiveUser } from '../../../../lib/auth/roles.mjs';
import { isSameOriginRequest } from '../../../../lib/auth/requestOrigin.mjs';
import { AccountCartInputError } from '../../../../lib/accountCartModel.mjs';
import { getAccountCart, mutateAccountCart } from '../../../../lib/shopAccountCart';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };

function json(body, status = 200) {
  return Response.json(body, { status, headers });
}

function failure(error) {
  if (error?.message === 'authentication_required') return json({ error: 'Sign in to save your cart.', code: 'AUTHENTICATION_REQUIRED' }, 401);
  if (error instanceof SyntaxError || error instanceof AccountCartInputError) {
    return json({ error: error instanceof AccountCartInputError ? error.message : 'A valid cart request is required.', code: 'INVALID_CART' }, 400);
  }
  console.error('Unable to access account cart.', error);
  return json({ error: 'Unable to sync your saved cart. Please try again.', code: 'CART_SYNC_FAILED' }, 500);
}

async function requireAccountSession() {
  const session = await getSessionUserProfile();
  if (!session?.token?.uid || !isActiveUser(session.profile)) throw new Error('authentication_required');
  return session;
}

export async function GET() {
  try {
    const session = await requireAccountSession();
    return json({ ...await getAccountCart(session), userId: session.token.uid });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) return json({ error: 'Invalid request origin.' }, 403);
    const session = await requireAccountSession();
    const input = await request.json();
    if (input?.expectedUid !== session.token.uid) return json({ error: 'Your account changed. Reload and retry saving your cart.', code: 'ACCOUNT_CHANGED' }, 409);
    return json({ ...await mutateAccountCart(input, session), userId: session.token.uid });
  } catch (error) {
    return failure(error);
  }
}
