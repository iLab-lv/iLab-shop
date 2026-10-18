import Catalog from '../components/Catalog';
import styles from '../page.module.css';
import {
  getProductTypes,
  getProductsPage,
} from '../../lib/shopProducts';
import { getBrandDirectory, getHomepageFinderDevices } from '../../lib/shopCatalog';
import { getSessionUserProfile } from '../../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../../lib/auth/roles.mjs';
import HomepageDiscovery from '../components/shop/HomepageDiscovery';
import HomepageHero from '../components/shop/HomepageHero';
import ServiceLinkCard from '../components/shop/ServiceLinkCard';
import { resolveProductTypeSelection } from '../../lib/homepagePresentation.mjs';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  const [session, productTypes, brands, finderDevices, query] = await Promise.all([getSessionUserProfile(), getProductTypes(), getBrandDirectory(), getHomepageFinderDevices(), searchParams]);
  const showWholesale = canViewWholesalePrices(session?.profile);
  const initialType = resolveProductTypeSelection(query?.type, productTypes);
  const defaultDevice = finderDevices.find((device) => device.name.toLocaleLowerCase() === 'iphone') ?? finderDevices[0] ?? null;
  const initialDevice = finderDevices.find((device) => device.id === query?.device) ?? defaultDevice;
  const initialModel = initialDevice?.models.some((model) => model.id === query?.model) ? query.model : '';
  const initialPage = await getProductsPage(null, initialType, { includeWholesale: showWholesale, brandId: initialDevice?.id ?? '', modelId: initialModel });

  return (
    <main className={styles.page}>
      <HomepageHero />
      <HomepageDiscovery brands={brands} />
      <div className={styles.homeServiceLink}><ServiceLinkCard description="iLab repairs phones, tablets, computers and other devices." links={[{ serviceLink: { type: 'home', path: '/' }, label: 'Visit iLab repair service' }]} /></div>
      <Catalog key={showWholesale ? 'wholesale' : 'retail'} initialPage={initialPage} initialType={initialType} initialDevice={initialDevice?.id ?? ''} initialModel={initialModel} devices={finderDevices} productTypes={productTypes} apiPath="/shop/api/products" />
    </main>
  );
}
