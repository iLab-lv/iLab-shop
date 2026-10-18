import { createPartInquiry } from '../../../lib/shopInquiries';
import { AuthenticationError, authErrorResponse, verifyFirebaseRequest } from '../../../lib/auth/serverAuth';
import { isSameOriginRequest } from '../../../lib/auth/requestOrigin.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  let input;
  try { input = await request.json(); }
  catch { return Response.json({ error: 'A valid inquiry is required.' }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }

  let userId = null;
  if (request.headers.has('authorization')) {
    try { userId = (await verifyFirebaseRequest(request)).uid; }
    catch (error) { return authErrorResponse(error) ?? Response.json({ error: 'Unable to submit the inquiry.' }, { status: 500 }); }
  }

  try {
    const result = await createPartInquiry(input, { userId });
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status ?? 400, headers: { 'Cache-Control': 'no-store' } });
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Unable to store part inquiry.', error);
    return Response.json({ error: 'Unable to send your inquiry right now. Please try again.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
