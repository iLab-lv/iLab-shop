'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ProductCard from './ProductCard';
import HomepageFinder from './shop/HomepageFinder';
import styles from '../page.module.css';
import { catalogPageState, resolveProductTypeSelection } from '../../lib/homepagePresentation.mjs';

export default function Catalog({ initialPage, initialType = '', initialDevice = '', initialModel = '', devices, productTypes, apiPath }) {
  const [products, setProducts] = useState(initialPage.products);
  const [cursor, setCursor] = useState(initialPage.nextCursor);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeType, setActiveType] = useState(initialType);
  const [deviceId, setDeviceId] = useState(initialDevice);
  const [modelId, setModelId] = useState(initialModel);
  const [availableTypes, setAvailableTypes] = useState(initialPage.availableProductTypeIds ?? productTypes.map((type) => type.id));
  const stateRef = useRef({ type: initialType, device: initialDevice, model: initialModel });
  const requestId = useRef(0), loadingRef = useRef(false);
  const router = useRouter(), pathname = usePathname();
  const typeNames = Object.fromEntries(productTypes.map((type) => [type.id, type.name]));

  const buildApiUrl = useCallback((nextCursor = null, filters = stateRef.current) => {
    const parameters = new URLSearchParams();
    if (nextCursor) parameters.set('cursor', nextCursor);
    if (filters.type) parameters.set('type', filters.type);
    if (filters.device) parameters.set('device', filters.device);
    if (filters.model) parameters.set('model', filters.model);
    const query = parameters.toString();
    return query ? `${apiPath}?${query}` : apiPath;
  }, [apiPath]);

  const applyFilters = useCallback(async (changes, { updateUrl = true, scroll = false, scrollTarget = 'products' } = {}) => {
    if (loadingRef.current) return;
    const nextFilters = { ...stateRef.current, ...changes };
    const currentRequest = ++requestId.current;
    loadingRef.current = true; setIsLoading(true); setError('');
    try {
      const response = await fetch(buildApiUrl(null, nextFilters), { cache: 'no-store' });
      const page = await response.json();
      if (!response.ok) throw new Error(page.error || 'Unable to filter products.');
      if (currentRequest !== requestId.current) return;
      const next = catalogPageState(page, nextFilters.type);
      setProducts(next.products); setCursor(next.cursor); setHasMore(next.hasMore);
      if (Array.isArray(page.availableProductTypeIds)) setAvailableTypes(page.availableProductTypeIds);
      setActiveType(nextFilters.type); setDeviceId(nextFilters.device); setModelId(nextFilters.model);
      stateRef.current = nextFilters;
      if (updateUrl) {
        const parameters = new URLSearchParams(window.location.search);
        for (const [key, value] of Object.entries(nextFilters)) { if (value) parameters.set(key === 'type' ? 'type' : key, value); else parameters.delete(key === 'type' ? 'type' : key); }
        const query = parameters.toString();
        router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      }
      if (scroll) requestAnimationFrame(() => document.getElementById(scrollTarget)?.scrollIntoView({ behavior: 'smooth', block: scrollTarget === 'part-types' ? 'center' : 'start' }));
    } catch (filterError) { setError(filterError.message || 'Unable to filter products.'); }
    finally { loadingRef.current = false; setIsLoading(false); }
  }, [buildApiUrl, pathname, router]);

  useEffect(() => {
    const restore = () => {
      const parameters = new URLSearchParams(window.location.search);
      const device = devices.find((item) => item.id === parameters.get('device')) ?? devices.find((item) => item.name.toLocaleLowerCase() === 'iphone') ?? devices[0];
      const model = device?.models.some((item) => item.id === parameters.get('model')) ? parameters.get('model') : '';
      const type = resolveProductTypeSelection(parameters.get('type'), productTypes);
      void applyFilters({ type, device: device?.id ?? '', model }, { updateUrl: false });
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [applyFilters, devices, productTypes]);

  async function loadMore() {
    if (isLoading || !hasMore || !cursor) return;
    setIsLoading(true); setError('');
    try {
      const response = await fetch(buildApiUrl(cursor), { cache: 'no-store' });
      const page = await response.json();
      if (!response.ok) throw new Error(page.error || 'Unable to load more products.');
      setProducts((current) => { const ids = new Set(current.map((product) => product.id)); return [...current, ...page.products.filter((product) => !ids.has(product.id))]; });
      setCursor(page.nextCursor); setHasMore(page.hasMore);
    } catch (loadError) { setError(loadError.message || 'Unable to load more products.'); }
    finally { setIsLoading(false); }
  }

  const activeDevice = devices.find((device) => device.id === deviceId);
  const activeModel = activeDevice?.models.find((model) => model.id === modelId);
  const catalogTitle = activeType ? typeNames[activeType] ?? 'Products' : activeModel ? `${activeModel.name} parts` : activeDevice ? `${activeDevice.name} parts` : 'Products';

  return <>
    <HomepageFinder devices={devices} deviceId={deviceId} modelId={modelId} activeType={activeType} productTypes={productTypes} availableTypes={availableTypes} loading={isLoading}
      onDeviceChange={(device) => void applyFilters({ device, model: '', type: '' })}
      onModelChange={(model) => void applyFilters({ model, type: '' }, { scroll: true, scrollTarget: 'part-types' })}
      onTypeChange={(type) => void applyFilters({ type }, { scroll: true })} />
    <section className={styles.productCatalog} id="products" aria-labelledby="products-title">
      <div className={styles.catalogHeading}><div className={styles.sectionHeading}><p>Product catalog</p><h2 id="products-title">{catalogTitle}</h2></div></div>
      <p className={styles.counter} aria-live="polite">{isLoading ? 'Updating compatible products…' : `${products.length} compatible product${products.length === 1 ? '' : 's'} loaded`}</p>
      <section className={styles.grid} aria-label="Product catalog">
        {products.map((product) => <ProductCard key={product.id} product={product} typeName={typeNames[product.productTypeId] ?? product.productTypeId} onSelectType={(type) => applyFilters({ type }, { scroll: true })} />)}
        {!isLoading && !products.length ? <p className={styles.emptySearch}>No compatible products match these filters.</p> : null}
      </section>
      <div className={styles.pagination}>{error ? <p className={styles.error}>{error}</p> : null}{!hasMore ? <p className={styles.complete}>All compatible products loaded</p> : <button type="button" onClick={loadMore} disabled={isLoading}>{isLoading ? 'Loading…' : 'Load more'}</button>}</div>
    </section>
  </>;
}
