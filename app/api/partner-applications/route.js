import { getCurrentUserProfile, authErrorResponse } from '../../../lib/auth/serverAuth';
import { requestPartnerAccess } from '../../../lib/auth/userProfiles';
import { UserInputError } from '../../../lib/auth/userModel.mjs';

export async function POST(request) {
  try {
    const { profile } = await getCurrentUserProfile(request);
    const body = await request.json();
    const updatedProfile = await requestPartnerAccess(profile.uid, body.company);
    return Response.json({ profile: updatedProfile });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof SyntaxError) {
      return Response.json({ error: 'A valid JSON body is required.' }, { status: 400 });
    }
    if (error instanceof UserInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error('Wholesale application failed.', error);
    return Response.json({ error: 'Unable to submit the application.' }, { status: 500 });
  }
}
