import { getSessionUserProfile } from '../../../lib/auth/sessionAuth';
import { isActiveUser } from '../../../lib/auth/roles.mjs';
import { getPublicShopSettings } from '../../../lib/shopSettings';
import CheckoutClient from './CheckoutClient';
import CheckoutAuthGate from './CheckoutAuthGate';
import Breadcrumbs from '../../components/shop/Breadcrumbs';
import { buildShopPageMetadata } from '../../../lib/shopSeo.mjs';
export const dynamic = 'force-dynamic';
export const metadata = buildShopPageMetadata({ title: 'Checkout | iLab Shop', description: 'Complete your iLab Shop order.', path: '/checkout', noindex: true });
export default async function CheckoutPage() {
  const session = await getSessionUserProfile();
  const profile = session?.profile;
  if (!session?.token?.uid || !isActiveUser(profile)) return <><Breadcrumbs items={[{ label: 'Shop', href: '/' }, { label: 'Checkout' }]} /><CheckoutAuthGate /></>;
  const settings = await getPublicShopSettings();
  return <><Breadcrumbs items={[{ label: 'Shop', href: '/' }, { label: 'Checkout' }]} /><CheckoutClient accountUid={session.token.uid} initialCustomer={{ name: profile?.name ?? '', email: profile?.email ?? session?.token?.email ?? '', phone: profile?.phone ?? '', company: { name: profile?.company?.name ?? '', registrationNumber: profile?.company?.registrationNumber ?? '', vatNumber: profile?.company?.vatNumber ?? '' }, billingAddress: profile?.billingAddress ?? '' }} locations={settings.pickupLocations.map(({ id, name, address }) => ({ id, name, address }))} /></>;
}
