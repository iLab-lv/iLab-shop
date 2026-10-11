import ShopShell from '../components/shop/ShopShell';
import { getPublicShopSettings } from '../../lib/shopSettings';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'iLab Shop | Professional Repair Parts',
  description: 'iLab professional shop for device repair parts and components.',
};

export default async function PublicShopLayout({ children }) {
  return <ShopShell settings={await getPublicShopSettings()}>{children}</ShopShell>;
}
