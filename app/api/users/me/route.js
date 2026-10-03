import { ensureCustomerProfile, getUserProfile } from '../../../../lib/auth/userProfiles';
import {
  AuthenticationError,
  authErrorResponse,
  verifyFirebaseRequest,
} from '../../../../lib/auth/serverAuth';
import { UserInputError } from '../../../../lib/auth/userModel.mjs';
import { USER_STATUSES } from '../../../../lib/auth/roles.mjs';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const token = await verifyFirebaseRequest(request);
    const profile = await getUserProfile(token.uid);
    if (!profile) return Response.json({ error: 'User profile not found.' }, { status: 404 });
    if (profile.status !== USER_STATUSES.ACTIVE) {
      return Response.json({ error: 'An active account is required.' }, { status: 403 });
    }
    return Response.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return authErrorResponse(error) ?? unexpectedError(error);
  }
}

export async function POST(request) {
  try {
    const token = await verifyFirebaseRequest(request);
    const registration = await request.json();
    const profile = await ensureCustomerProfile({
      uid: token.uid,
      email: token.email ?? '',
      name: token.name ?? '',
    }, registration);
    return Response.json({ profile }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'A valid registration body is required.' }, { status: 400 });
    }
    if (error instanceof UserInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    return authErrorResponse(error) ?? unexpectedError(error);
  }
}

function unexpectedError(error) {
  if (!(error instanceof AuthenticationError)) console.error('User profile request failed.', error);
  return Response.json({ error: 'Unable to process the user profile.' }, { status: 500 });
}
