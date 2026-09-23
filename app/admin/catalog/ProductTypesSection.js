'use client';

import { useEffect, useMemo, useState } from 'react';
import { sortAdminProductTypes } from '../../../lib/adminProductTypeCatalog.mjs';
import styles from './catalog.module.css';

const API_ENDPOINT = '/shop/api/admin/product-types';

export default function ProductTypesSection() {
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch(API_ENDPOINT, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load product types.');
        setProductTypes(Array.isArray(body.productTypes) ? body.productTypes : []);
        setError('');
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError('Unable to load product types.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [requestVersion]);

  const sortedProductTypes = useMemo(() => sortAdminProductTypes(productTypes), [productTypes]);

  function retry() {
    setLoading(true);
    setError('');
    setRequestVersion((version) => version + 1);
  }

  return (
    <section className={styles.section} aria-labelledby="product-types-heading">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="product-types-heading">Product Types</h2>
          <p>{loading ? 'Loading product types…' : `${productTypes.length} product types`}</p>
        </div>
      </div>

      {error ? <div className={styles.error} role="alert"><p>Unable to load product types.</p><button type="button" onClick={retry}>Retry</button></div> : null}
      {!error && loading ? <div className={styles.state} aria-live="polite">Loading product types…</div> : null}
      {!error && !loading && productTypes.length === 0 ? <div className={styles.state}>No product types exist.</div> : null}
      {!error && !loading && sortedProductTypes.length > 0 ? <div className={styles.typeList}>
        {sortedProductTypes.map((productType) => <div className={styles.typeRow} key={productType.id}>
          <div className={styles.typeIdentity}>
            <strong>{productType.name || productType.id}</strong>
            <span>{productType.id}{productType.slug ? ` · ${productType.slug}` : ''}</span>
          </div>
          <span className={`${styles.status} ${productType.status === 'active' ? styles.statusActive : styles.statusInactive}`}>{productType.status}</span>
        </div>)}
      </div> : null}
    </section>
  );
}
