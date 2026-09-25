import { PERMISSIONS } from '../../../../../lib/auth/roles.mjs';
import { authErrorResponse, requirePermission } from '../../../../../lib/auth/serverAuth';
import {
  decidePartnerApplication,
  setPartnerDiscount,
  setUserStatus,
  updateManagedUser,
  setAdministrativeRole,
  setWholesaleAccess,
} from '../../../../../lib/auth/userProfiles';
import { authorizeAdminMutation } from '../../../../../lib/auth/adminMutationAuth';
import { getPermissionSession } from '../../../../../lib/auth/sessionAuth';
import { UserInputError } from '../../../../../lib/auth/userModel.mjs';
import { serializeAdminUser } from '../../../../../lib/adminUsers';

const ACTION_PERMISSIONS = Object.freeze({
  approvePartner: PERMISSIONS.APPROVE_PARTNERS,
  rejectPartner: PERMISSIONS.APPROVE_PARTNERS,
  setDiscount: PERMISSIONS.SET_PARTNER_DISCOUNT,
  setStatus: PERMISSIONS.MANAGE_USERS,
  updateProfile: PERMISSIONS.MANAGE_USERS,
  setRole: PERMISSIONS.MANAGE_USERS,
  enableWholesale: PERMISSIONS.MANAGE_PARTNERS,
  disableWholesale: PERMISSIONS.MANAGE_PARTNERS,
});

export async function PATCH(request, context) {
  try {
    const body = await request.json();
    const permission = ACTION_PERMISSIONS[body.action];
    if (!permission) return Response.json({ error: 'Unsupported action.' }, { status: 400 });

    let actorProfile;
    if (request.headers.get('authorization')) ({ profile: actorProfile } = await requirePermission(request, permission));
    else {
      const denied = await authorizeAdminMutation(request, permission); if (denied) return denied;
      actorProfile = (await getPermissionSession(permission)).profile;
    }
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
      case 'updateProfile':
        profile = await updateManagedUser(actorProfile, uid, { name: body.name, phone: body.phone, company: body.company });
        break;
      case 'setRole':
        profile = await setAdministrativeRole(actorProfile, uid, body.role);
        break;
      case 'enableWholesale':
        profile = await setWholesaleAccess(actorProfile, uid, true, body.discountPercent ?? 0);
        break;
      case 'disableWholesale':
        profile = await setWholesaleAccess(actorProfile, uid, false);
        break;
    }

    return Response.json({ profile: serializeAdminUser(profile, uid) });
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
