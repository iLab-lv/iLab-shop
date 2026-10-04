import { getPublicSearchData } from '../../../../lib/shopCatalog';
import { getSessionUserProfile } from '../../../../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../../../../lib/auth/roles.mjs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSessionUserProfile();
    const data = await getPublicSearchData({ includeWholesale: canViewWholesalePrices(session?.profile) });
    return Response.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Unable to load public search data.', error);
    return Response.json({ error: 'Unable to load search data.' }, { status: 500, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
