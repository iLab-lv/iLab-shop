import { authorizeAdminMutation, PRIVATE_NO_STORE } from '../../../../../lib/auth/adminMutationAuth';
import { PERMISSIONS } from '../../../../../lib/auth/roles.mjs';
import { updateAdminInquiryStatus } from '../../../../../lib/shopInquiries';

export const dynamic = 'force-dynamic';

export async function PATCH(request, { params }) {
  const denied = await authorizeAdminMutation(request, PERMISSIONS.ACCESS_SHOP_ADMIN);
  if (denied) return denied;
  let input;
  try { input = await request.json(); }
  catch { return Response.json({ error: 'A valid status update is required.' }, { status: 400, headers: PRIVATE_NO_STORE }); }
  try {
    const { id } = await params;
    const result = await updateAdminInquiryStatus(id, input?.status);
    if (!result.ok) return Response.json({ error: result.error }, { status: 400, headers: PRIVATE_NO_STORE });
    return Response.json({ inquiry: result.inquiry }, { headers: PRIVATE_NO_STORE });
  } catch (error) {
    console.error('Unable to update admin inquiry.', error);
    return Response.json({ error: 'Unable to update inquiry status.' }, { status: 500, headers: PRIVATE_NO_STORE });
  }
}
