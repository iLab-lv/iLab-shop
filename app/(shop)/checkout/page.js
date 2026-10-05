import { getSessionUserProfile } from '../../../lib/auth/sessionAuth';
import { SHOP_CONTACT } from '../../components/shop/contactData';
import CheckoutClient from './CheckoutClient';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Checkout | iLab Shop' };
export default async function CheckoutPage() {
  const session = await getSessionUserProfile();
  const profile = session?.profile;
  return <CheckoutClient initialCustomer={{ name: profile?.name ?? '', email: profile?.email ?? session?.token?.email ?? '', phone: profile?.phone ?? '', company: { name: profile?.company?.name ?? '', registrationNumber: profile?.company?.registrationNumber ?? '', vatNumber: profile?.company?.vatNumber ?? '' } }} locations={SHOP_CONTACT.locations.map(({ id, name, address }) => ({ id, name, address }))} />;
}
