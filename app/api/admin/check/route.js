import { PERMISSIONS } from '../../../../lib/auth/roles.mjs';
import { authErrorResponse, requirePermission } from '../../../../lib/auth/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { profile } = await requirePermission(request, PERMISSIONS.ACCESS_SHOP_ADMIN);
    return Response.json(
      { authorized: true, uid: profile.uid, role: profile.role },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    console.error('Shop admin authorization check failed.', error);
    return Response.json({ error: 'Unable to verify authorization.' }, { status: 500 });
  }
}
