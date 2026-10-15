import { buildShopSitemap } from '../lib/shopSitemap.mjs';
import { getShopSitemapData } from '../lib/shopCatalog';

export const revalidate = 3600;

export default async function sitemap() {
  return buildShopSitemap(await getShopSitemapData());
}
