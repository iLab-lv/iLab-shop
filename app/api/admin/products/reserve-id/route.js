import { NextResponse } from 'next/server';
import { reserveAdminProductId } from '../../../../../lib/adminProducts';
import { PERMISSIONS } from '../../../../../lib/auth/roles.mjs';
import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../../lib/auth/adminMutationAuth';

export async function POST(request) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.MANAGE_CATALOG); if (denied) return denied;
  return NextResponse.json({ id: await reserveAdminProductId() }, { status: 201, headers: PRIVATE_NO_STORE });
}
