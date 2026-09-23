import Catalog from './components/Catalog';
import AuthControl from './components/AuthControl';
import styles from './page.module.css';
import {
  CATALOG_TOTAL,
  getProductTypes,
  getProductsPage,
} from '../lib/shopProducts';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [initialPage, productTypes] = await Promise.all([
    getProductsPage(),
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
        initialPage={initialPage}
        totalProducts={CATALOG_TOTAL}
        productTypes={productTypes}
        apiPath="/shop/api/products"
      />
    </main>
  );
}
