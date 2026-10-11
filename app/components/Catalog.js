'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ProductCard from './ProductCard';
import styles from '../page.module.css';
import { catalogPageState, productTypeThumbnail, resolveProductTypeSelection } from '../../lib/homepagePresentation.mjs';

export default function Catalog({ initialPage, initialType = '', productTypes, apiPath }) {
  const [products, setProducts] = useState(initialPage.products);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeType, setActiveType] = useState(initialType);
  const requestId = useRef(0);
  const activeTypeRef = useRef(initialType), loadingRef = useRef(false);
  const router = useRouter(), pathname = usePathname();

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

  const selectType = useCallback(async (productTypeId, { updateUrl = true, scroll = true } = {}) => {
    if (loadingRef.current || productTypeId === activeTypeRef.current) return;
    const currentRequest = ++requestId.current;
    loadingRef.current = true;
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(buildApiUrl(null, productTypeId), { cache: 'no-store' });
      const page = await response.json();
      if (!response.ok) throw new Error(page.error || 'Unable to filter products.');
      if (currentRequest !== requestId.current) return;
      const next = catalogPageState(page, productTypeId);
      setProducts(next.products);
      setCursor(next.cursor);
      setHasMore(next.hasMore);
      setActiveType(next.activeType);
      activeTypeRef.current = next.activeType;
      if (updateUrl) { const parameters = new URLSearchParams(window.location.search); if (productTypeId) parameters.set('type', productTypeId); else parameters.delete('type'); const query = parameters.toString(); router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }); }
      if (scroll) requestAnimationFrame(() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (filterError) {
      setError(filterError.message || 'Unable to filter products.');
    } finally {
      loadingRef.current = false; setIsLoading(false);
    }
  }, [apiPath, pathname, router]);

  useEffect(() => { const restoreFromUrl = () => { const nextType = resolveProductTypeSelection(new URLSearchParams(window.location.search).get('type'), productTypes); void selectType(nextType, { updateUrl: false, scroll: false }); }; window.addEventListener('popstate', restoreFromUrl); return () => window.removeEventListener('popstate', restoreFromUrl); }, [productTypes, selectType]);

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
      <section className={styles.partBrowse} aria-labelledby="part-browse-title"><div className={styles.sectionHeading}><p>Repair categories</p><h2 id="part-browse-title">Browse by part</h2></div><div className={styles.typeGrid}>{productTypes.map((productType) => { const thumbnail = productTypeThumbnail(productType), selected = activeType === productType.id; return <button type="button" key={productType.id} className={selected ? styles.typeTileSelected : styles.typeTile} aria-pressed={selected} onClick={() => selectType(selected ? '' : productType.id)} disabled={isLoading}><span className={styles.typeArtwork}>{thumbnail ? <Image src={thumbnail} alt="" fill sizes="(max-width: 580px) 42vw, (max-width: 1024px) 22vw, 150px" /> : <span aria-hidden="true">{productType.name.slice(0, 1)}</span>}</span><strong>{productType.name}</strong><span className={styles.typeState}>{selected ? 'Selected' : 'View parts'}</span></button>; })}</div></section>
      <section className={styles.productCatalog} id="products" aria-labelledby="products-title"><div className={styles.catalogHeading}><div className={styles.sectionHeading}><p>Product catalog</p><h2 id="products-title">{activeType ? typeNames[activeType] ?? 'Products' : 'All products'}</h2></div>{activeType ? <button type="button" className={styles.clearFilter} onClick={() => selectType('')} disabled={isLoading}>Clear filter</button> : null}</div>
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
      </section>
    </>
  );
}
