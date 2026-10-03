import Catalog from '../components/Catalog';
import styles from '../page.module.css';
import {
  CATALOG_TOTAL,
  getProductTypes,
  getProductsPage,
} from '../../lib/shopProducts';
import { getSessionUserProfile } from '../../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../../lib/auth/roles.mjs';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSessionUserProfile();
  const showWholesale = canViewWholesalePrices(session?.profile);
  const [initialPage, productTypes] = await Promise.all([
    getProductsPage(null, '', { includeWholesale: showWholesale }),
    getProductTypes(),
  ]);

  return (
    <main className={styles.page} id="catalog">
      <h1 className={styles.visuallyHidden}>iLab Shop catalog</h1>
      <Catalog key={showWholesale ? 'wholesale' : 'retail'} initialPage={initialPage}
        totalProducts={CATALOG_TOTAL} productTypes={productTypes} apiPath="/shop/api/products" />
    </main>
  );
}
