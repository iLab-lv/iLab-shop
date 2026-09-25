import Catalog from './components/Catalog';
import AuthControl from './components/AuthControl';
import styles from './page.module.css';
import {
  CATALOG_TOTAL,
  getProductTypes,
  getProductsPage,
} from '../lib/shopProducts';
import { getSessionUserProfile } from '../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../lib/auth/roles.mjs';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSessionUserProfile();
  const showWholesale = canViewWholesalePrices(session?.profile);
  const [initialPage, productTypes] = await Promise.all([
    getProductsPage(null, '', { includeWholesale: showWholesale }),
    getProductTypes(),
  ]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>iLab Shop</p>
          <h1>Catalog</h1>
        </div>
        <AuthControl />
      </header>
      <Catalog
        key={showWholesale ? 'wholesale' : 'retail'}
        initialPage={initialPage}
        totalProducts={CATALOG_TOTAL}
        productTypes={productTypes}
        apiPath="/shop/api/products"
      />
    </main>
  );
}
