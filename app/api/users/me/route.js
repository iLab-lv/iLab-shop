import { ensureCustomerProfile, getUserProfile } from '../../../../lib/auth/userProfiles';
import {
  AuthenticationError,
  authErrorResponse,
  verifyFirebaseRequest,
} from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const token = await verifyFirebaseRequest(request);
    const profile = await getUserProfile(token.uid);
    if (!profile) return Response.json({ error: 'User profile not found.' }, { status: 404 });
    return Response.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return authErrorResponse(error) ?? unexpectedError(error);
  }
}

export async function POST(request) {
  try {
    const token = await verifyFirebaseRequest(request);
    const profile = await ensureCustomerProfile({
      uid: token.uid,
      email: token.email ?? '',
      name: token.name ?? '',
    });
    return Response.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return authErrorResponse(error) ?? unexpectedError(error);
  }
}

function unexpectedError(error) {
  if (!(error instanceof AuthenticationError)) console.error('User profile request failed.', error);
  return Response.json({ error: 'Unable to process the user profile.' }, { status: 500 });
}
