import 'server-only';

import { cookies } from 'next/headers';
import { firebaseAuth } from '../firebaseAdmin';
import { getUserProfile } from './userProfiles';
import { PERMISSIONS, hasPermission } from './roles.mjs';

const SESSION_COOKIE = 'ilab_shop_session';

export async function getSessionUserProfile() {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return null;

  try {
    const token = await firebaseAuth.verifySessionCookie(sessionCookie, true);
    const profile = await getUserProfile(token.uid);
    return profile ? { token, profile } : null;
  } catch {
    return null;
  }
}

export async function getPermissionSession(permission) {
  const sessionCookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionCookie) return { authenticated: false, authorized: false, user: null };

  try {
    const token = await firebaseAuth.verifySessionCookie(sessionCookie, true);
    const profile = await getUserProfile(token.uid);
    const authorized = hasPermission(profile, permission);

    return {
      authenticated: true,
      authorized,
      profile,
      uid: token.uid,
      user: authorized
        ? {
            email: profile.email || token.email || '',
            role: profile.role,
          }
        : null,
    };
  } catch {
    return { authenticated: false, authorized: false, user: null };
  }
}

export function getShopAdminSession() {
  return getPermissionSession(PERMISSIONS.ACCESS_SHOP_ADMIN);
}
