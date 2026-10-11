import Catalog from '../components/Catalog';
import styles from '../page.module.css';
import {
  getProductTypes,
  getProductsPage,
} from '../../lib/shopProducts';
import { getBrandDirectory } from '../../lib/shopCatalog';
import Link from 'next/link';
import { getSessionUserProfile } from '../../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../../lib/auth/roles.mjs';
import HomepageDiscovery from '../components/shop/HomepageDiscovery';
import { resolveAccessoriesType, resolveProductTypeSelection } from '../../lib/homepagePresentation.mjs';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  const [session, productTypes, brands, query] = await Promise.all([getSessionUserProfile(), getProductTypes(), getBrandDirectory(), searchParams]);
  const showWholesale = canViewWholesalePrices(session?.profile);
  const initialType = resolveProductTypeSelection(query?.type, productTypes);
  const initialPage = await getProductsPage(null, initialType, { includeWholesale: showWholesale });
  const accessoriesType = resolveAccessoriesType(productTypes);

  return (
    <main className={styles.page}>
      <header className={styles.storeIntro}><p>Professional repair parts</p><h1>iLab Shop</h1><span>Browse parts by device or explore the complete catalog.</span></header>
      <HomepageDiscovery brands={brands} />
      <section className={styles.accessoriesBanner} aria-labelledby="accessories-title"><div><p>Power and essentials</p><h2 id="accessories-title">Chargers &amp; Accessories</h2><span>Cables, chargers, adapters and accessories.</span></div>{accessoriesType ? <Link href={`/?type=${encodeURIComponent(accessoriesType.id)}#products`}>Browse category <span aria-hidden="true">→</span></Link> : <span className={styles.accessoriesMark} aria-hidden="true" />}</section>
      <Catalog key={showWholesale ? 'wholesale' : 'retail'} initialPage={initialPage} initialType={initialType} productTypes={productTypes} apiPath="/shop/api/products" />
    </main>
  );
}
