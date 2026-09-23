import { PERMISSIONS } from '../../../../../lib/auth/roles.mjs';
import { authErrorResponse, requirePermission } from '../../../../../lib/auth/serverAuth';
import {
  decidePartnerApplication,
  setPartnerDiscount,
  setUserStatus,
} from '../../../../../lib/auth/userProfiles';
import { UserInputError } from '../../../../../lib/auth/userModel.mjs';

const ACTION_PERMISSIONS = Object.freeze({
  approvePartner: PERMISSIONS.APPROVE_PARTNERS,
  rejectPartner: PERMISSIONS.APPROVE_PARTNERS,
  setDiscount: PERMISSIONS.SET_PARTNER_DISCOUNT,
  setStatus: PERMISSIONS.MANAGE_USERS,
});

export async function PATCH(request, context) {
  try {
    const body = await request.json();
    const permission = ACTION_PERMISSIONS[body.action];
    if (!permission) return Response.json({ error: 'Unsupported action.' }, { status: 400 });

    const { profile: actorProfile } = await requirePermission(request, permission);
    const { uid } = await context.params;
    let profile;

    switch (body.action) {
      case 'approvePartner':
        profile = await decidePartnerApplication(actorProfile, uid, true);
        break;
      case 'rejectPartner':
        profile = await decidePartnerApplication(actorProfile, uid, false);
        break;
      case 'setDiscount':
        profile = await setPartnerDiscount(actorProfile, uid, body.discountPercent);
        break;
      case 'setStatus':
        profile = await setUserStatus(actorProfile, uid, body.status);
        break;
    }

    return Response.json({ profile });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'A valid JSON body is required.' }, { status: 400 });
    }
    if (error instanceof UserInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error('Privileged user update failed.', error);
    return Response.json({ error: 'Unable to update the user.' }, { status: 500 });
  }
}
