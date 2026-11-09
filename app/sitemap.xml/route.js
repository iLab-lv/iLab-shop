import { getShopSitemapData } from '../../lib/shopCatalog';
import { createShopSitemapHandler } from '../../lib/shopSitemapResponse.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const GET = createShopSitemapHandler({ getData: getShopSitemapData });
