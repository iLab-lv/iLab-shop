import { NextResponse } from 'next/server';
import { getAdminUsers } from '../../../../lib/adminUsers';
import { PERMISSIONS } from '../../../../lib/auth/roles.mjs';
import { getPermissionSession } from '../../../../lib/auth/sessionAuth';

export const dynamic = 'force-dynamic';

const PRIVATE_NO_STORE = { 'Cache-Control': 'private, no-store' };

export async function GET() {
  const session = await getPermissionSession(PERMISSIONS.MANAGE_USERS);
  if (!session.authenticated) {
    return NextResponse.json(
      { error: 'Authentication is required.' },
      { status: 401, headers: PRIVATE_NO_STORE }
    );
  }
  if (!session.authorized) {
    return NextResponse.json(
      { error: 'User management access is required.' },
      { status: 403, headers: PRIVATE_NO_STORE }
    );
  }

  try {
    return NextResponse.json({ users: await getAdminUsers(), actor: { uid: session.uid, role: session.profile.role } }, {
      headers: PRIVATE_NO_STORE,
    });
  } catch (error) {
    console.error('Unable to load admin users.', error);
    return NextResponse.json(
      { error: 'Unable to load users.' },
      { status: 500, headers: PRIVATE_NO_STORE }
    );
  }
}
