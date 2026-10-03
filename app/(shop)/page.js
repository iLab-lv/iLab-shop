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

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSessionUserProfile();
  const showWholesale = canViewWholesalePrices(session?.profile);
  const [initialPage, productTypes, brands] = await Promise.all([
    getProductsPage(null, '', { includeWholesale: showWholesale }),
    getProductTypes(),
    getBrandDirectory(),
  ]);

  return (
    <main className={styles.page} id="catalog">
      <header className={styles.storeIntro}><p>Professional repair parts</p><h1>iLab Shop</h1><span>Browse parts by device or explore the complete catalog.</span></header>
      <section className={styles.brandDirectory} aria-labelledby="brands-title"><div className={styles.sectionHeading}><p>Catalog</p><h2 id="brands-title">Browse by brand</h2></div><div className={styles.brandGrid}>{brands.map((brand) => <Link className={styles.brandCard} key={brand.id} href={`/${brand.slug}`}><h3>{brand.name}</h3><p>{brand.modelCount} models</p>{brand.seriesNames.length ? <span>{brand.seriesNames.slice(0, 4).join(' · ')}</span> : null}</Link>)}</div></section>
      <section aria-labelledby="all-products-title"><div className={styles.sectionHeading}><p>All products</p><h2 id="all-products-title">Product catalog</h2></div>
      <Catalog key={showWholesale ? 'wholesale' : 'retail'} initialPage={initialPage}
        productTypes={productTypes} apiPath="/shop/api/products" /></section>
    </main>
  );
}
