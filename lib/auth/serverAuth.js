import 'server-only';

import { firebaseAuth } from '../firebaseAdmin';
import { getUserProfile } from './userProfiles';
import { hasPermission } from './roles.mjs';

export class AuthenticationError extends Error {}
export class AuthorizationError extends Error {}

export async function verifyFirebaseRequest(request) {
  const authorization = request.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) throw new AuthenticationError('A Firebase ID token is required.');

  try {
    return await firebaseAuth.verifyIdToken(match[1], true);
  } catch {
    throw new AuthenticationError('The Firebase ID token is invalid or expired.');
  }
}

export async function getCurrentUserProfile(request) {
  const token = await verifyFirebaseRequest(request);
  const profile = await getUserProfile(token.uid);
  if (!profile) throw new AuthorizationError('No user profile exists for this account.');
  return { token, profile };
}

export async function requirePermission(request, permission) {
  const currentUser = await getCurrentUserProfile(request);
  if (!hasPermission(currentUser.profile, permission)) {
    throw new AuthorizationError('This account does not have the required permission.');
  }
  return currentUser;
}

export function authErrorResponse(error) {
  if (error instanceof AuthenticationError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  return null;
}
