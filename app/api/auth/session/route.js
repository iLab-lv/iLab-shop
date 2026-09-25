import { cookies } from 'next/headers';
import { firebaseAuth } from '../../../../lib/firebaseAdmin';
import { authErrorResponse, verifyFirebaseRequest } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'ilab_shop_session';
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

export async function POST(request) {
  try {
    await verifyFirebaseRequest(request);
    const authorization = request.headers.get('authorization');
    const idToken = authorization.replace(/^Bearer\s+/i, '');
    const sessionCookie = await firebaseAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/shop',
      maxAge: SESSION_DURATION_MS / 1000,
    });
    return Response.json({ authenticated: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Unable to create Firebase session.', error);
    return Response.json({ error: 'Unable to create the session.' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/shop',
    maxAge: 0,
  });
  return Response.json({ authenticated: false });
}
