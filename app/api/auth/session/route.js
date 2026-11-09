import { cookies } from 'next/headers';
import { firebaseAuth } from '../../../../lib/firebaseAdmin';
import { authErrorResponse, verifyFirebaseRequest } from '../../../../lib/auth/serverAuth';
import { getUserProfile } from '../../../../lib/auth/userProfiles';
import { USER_STATUSES } from '../../../../lib/auth/roles.mjs';
import { isSameOriginRequest } from '../../../../lib/auth/requestOrigin.mjs';

export const dynamic = 'force-dynamic';

const SESSION_COOKIE = 'ilab_shop_session';
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;
const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function POST(request) {
  try {
    if (!isSameOriginRequest(request)) {
      return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers: PRIVATE_NO_STORE });
    }
    const token = await verifyFirebaseRequest(request);
    const profile = await getUserProfile(token.uid);
    if (!profile) return deniedSession('No user profile exists for this account.', 'missing-profile');
    if (profile.status === USER_STATUSES.PENDING) {
      return deniedSession('Your wholesale account is awaiting approval. You can sign in after it has been approved.', 'account-pending');
    }
    if (profile.status !== USER_STATUSES.ACTIVE) {
      return deniedSession('This shop account has been disabled.', 'account-disabled');
    }
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
    return Response.json({ authenticated: true }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Unable to create Firebase session.', error);
    return Response.json({ error: 'Unable to create the session.' }, { status: 500, headers: PRIVATE_NO_STORE });
  }
}

async function deniedSession(error, code) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/shop',
    maxAge: 0,
  });
  return Response.json({ error, code }, { status: 403, headers: PRIVATE_NO_STORE });
}

export async function DELETE(request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers: PRIVATE_NO_STORE });
  }
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/shop',
      maxAge: 0,
    });
    return Response.json({ authenticated: false }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    console.error('Unable to clear Firebase session.', error);
    return Response.json({ error: 'Unable to clear the session.' }, { status: 500, headers: PRIVATE_NO_STORE });
  }
}
