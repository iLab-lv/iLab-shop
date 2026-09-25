import AdminPageHeader from '../components/AdminPageHeader';
import DevicesSection from './DevicesSection';
import ProductTypesSection from './ProductTypesSection';
import styles from './catalog.module.css';

export default function CatalogPage() {
  return (
    <section className={styles.catalog}>
      <AdminPageHeader
        title="Catalog"
        description="Manage device compatibility and product classification."
      />
      <div className={styles.catalogGrid}>
        <DevicesSection />
        <ProductTypesSection />
      </div>
    </section>
  );
}
