import ShopShell from '../components/shop/ShopShell';
import { getBrandDirectory } from '../../lib/shopCatalog';
import { getPublicShopSettings } from '../../lib/shopSettings';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'iLab Shop | Professional Repair Parts',
  description: 'iLab professional shop for device repair parts and components.',
};

export default async function PublicShopLayout({ children }) {
  const [settings, brands] = await Promise.all([getPublicShopSettings(), getBrandDirectory()]);
  return <ShopShell settings={settings} brands={brands}>{children}</ShopShell>;
}
