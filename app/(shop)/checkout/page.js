import { getSessionUserProfile } from '../../../lib/auth/sessionAuth';
import { getPublicShopSettings } from '../../../lib/shopSettings';
import CheckoutClient from './CheckoutClient';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout | iLab Shop' };
export default async function CheckoutPage() {
  const session = await getSessionUserProfile();
  const profile = session?.profile;
  const settings = await getPublicShopSettings();
  return <CheckoutClient initialCustomer={{ name: profile?.name ?? '', email: profile?.email ?? session?.token?.email ?? '', phone: profile?.phone ?? '', company: { name: profile?.company?.name ?? '', registrationNumber: profile?.company?.registrationNumber ?? '', vatNumber: profile?.company?.vatNumber ?? '' } }} locations={settings.pickupLocations.map(({ id, name, address }) => ({ id, name, address }))} />;
}
