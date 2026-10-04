'use client';

import { useState } from 'react';
import ProductCard from './ProductCard';
import styles from '../page.module.css';

export default function Catalog({ initialPage, productTypes, apiPath }) {
  const [products, setProducts] = useState(initialPage.products);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeType, setActiveType] = useState('');

  const typeNames = Object.fromEntries(
    productTypes.map((productType) => [productType.id, productType.name])
  );

  function buildApiUrl(nextCursor = null, productTypeId = activeType) {
    const parameters = new URLSearchParams();
    if (nextCursor) parameters.set('cursor', nextCursor);
    if (productTypeId) parameters.set('type', productTypeId);
    const query = parameters.toString();
    return query ? `${apiPath}?${query}` : apiPath;
  }

  async function selectType(productTypeId) {
    if (isLoading || productTypeId === activeType) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(buildApiUrl(null, productTypeId), { cache: 'no-store' });
      const page = await response.json();
      if (!response.ok) throw new Error(page.error || 'Unable to filter products.');
      setProducts(page.products);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setActiveType(productTypeId);
    } catch (filterError) {
      setError(filterError.message || 'Unable to filter products.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMore() {
    if (isLoading || !hasMore || !cursor) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(buildApiUrl(cursor), {
        cache: 'no-store',
      });
      const page = await response.json();
      if (!response.ok) throw new Error(page.error || 'Unable to load more products.');

      setProducts((currentProducts) => {
        const knownIds = new Set(currentProducts.map((product) => product.id));
        return [...currentProducts,
          ...page.products.filter((product) => !knownIds.has(product.id))];
      });
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load more products.');
    } finally {
      setIsLoading(false);
    }
  }

  const allProductsLoaded = !hasMore;
  return (
    <>
      <nav className={styles.filters} aria-label="Filter products by type">
        <button type="button" className={!activeType ? styles.activeFilter : undefined}
          onClick={() => selectType('')} disabled={isLoading}>All</button>
        {productTypes.map((productType) => (
          <button type="button" key={productType.id}
            className={activeType === productType.id ? styles.activeFilter : undefined}
            onClick={() => selectType(productType.id)} disabled={isLoading}>
            {productType.name}
          </button>
        ))}
      </nav>
      <p className={styles.counter} aria-live="polite">
        {activeType
          ? `Loaded ${products.length} ${typeNames[activeType] ?? activeType} products`
          : `${products.length} products loaded`}
      </p>
      <section className={styles.grid} aria-label="Product catalog">
        {products.map((product) => (
          <ProductCard key={product.id} product={product}
            typeName={typeNames[product.productTypeId] ?? product.productTypeId}
            onSelectType={selectType} />
        ))}
      </section>
      <div className={styles.pagination}>
        {error ? <p className={styles.error}>{error}</p> : null}
        {allProductsLoaded ? <p className={styles.complete}>All products loaded</p> : (
          <button type="button" onClick={loadMore} disabled={isLoading}>
            {isLoading ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>
    </>
  );
}
