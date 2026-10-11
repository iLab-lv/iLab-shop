import { getSessionUserProfile } from '../../../lib/auth/sessionAuth';
import { isActiveUser } from '../../../lib/auth/roles.mjs';
import { getPublicShopSettings } from '../../../lib/shopSettings';
import CheckoutClient from './CheckoutClient';
import CheckoutAuthGate from './CheckoutAuthGate';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout | iLab Shop' };
export default async function CheckoutPage() {
  const session = await getSessionUserProfile();
  const profile = session?.profile;
  if (!session?.token?.uid || !isActiveUser(profile)) return <CheckoutAuthGate />;
  const settings = await getPublicShopSettings();
  return <CheckoutClient initialCustomer={{ name: profile?.name ?? '', email: profile?.email ?? session?.token?.email ?? '', phone: profile?.phone ?? '', company: { name: profile?.company?.name ?? '', registrationNumber: profile?.company?.registrationNumber ?? '', vatNumber: profile?.company?.vatNumber ?? '' } }} locations={settings.pickupLocations.map(({ id, name, address }) => ({ id, name, address }))} />;
}
