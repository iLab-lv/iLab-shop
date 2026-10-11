import 'server-only';
import { NextResponse } from 'next/server';
import { getPermissionSession } from './sessionAuth';
import { isSameOriginRequest } from './requestOrigin.mjs';

const HEADERS = { 'Cache-Control': 'private, no-store' };

export async function authorizeAdminMutation(request, permission) {
  const session = await getPermissionSession(permission);
  if (!session.authenticated) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401, headers: HEADERS });
  if (!session.authorized) return NextResponse.json({ error: 'Catalog management access is required.' }, { status: 403, headers: HEADERS });
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers: HEADERS });
  }
  return null;
}

export { HEADERS as PRIVATE_NO_STORE };
