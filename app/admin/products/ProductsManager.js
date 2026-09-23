'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductImage from '../../components/ProductImage';
import AdminPageHeader from '../components/AdminPageHeader';
import {
  ADMIN_PRODUCTS_PAGE_SIZE,
  deriveAdminProducts,
  getAdminDeviceFilterOptions,
  getAdminProductsPage,
} from '../../../lib/adminProductCatalog.mjs';
import styles from './products.module.css';

const API_ENDPOINT = '/shop/api/admin/products';
const SORTS = new Set(['nameAsc', 'nameDesc', 'priceAsc', 'priceDesc', 'newest', 'oldest']);

const DEFAULT_QUERY = {
  search: '', productType: '', brand: '', series: '', model: '', sort: 'nameAsc', page: 1,
};

function makeQueryString(query) {
  const params = new URLSearchParams();
  for (const key of ['search', 'productType', 'brand', 'series', 'model', 'sort']) {
    if (query[key] && !(key === 'sort' && query[key] === 'nameAsc')) params.set(key, query[key]);
  }
  if (query.page > 1) params.set('page', String(query.page));
  return params;
}

function formatPrice(cents) {
  if (cents === null) return '—';
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function ProductsManager({ initialQuery }) {
  const [query, setQuery] = useState({
    ...DEFAULT_QUERY,
    ...initialQuery,
    sort: SORTS.has(initialQuery.sort) ? initialQuery.sort : 'nameAsc',
  });
  const [catalog, setCatalog] = useState({ products: [], productTypes: [], devices: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(API_ENDPOINT, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load products.');
        setCatalog(body);
        setError('');
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError('Unable to load products.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [requestVersion]);

  useEffect(() => {
    const params = makeQueryString(query);
    window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
  }, [query]);

  const devicesById = useMemo(
    () => new Map(catalog.devices.map((device) => [device.id, device])),
    [catalog.devices]
  );
  const productTypesById = useMemo(
    () => new Map(catalog.productTypes.map((type) => [type.id, type.name])),
    [catalog.productTypes]
  );
  const { brands, series, models } = useMemo(
    () => getAdminDeviceFilterOptions(catalog.devices, query.brand, query.series),
    [catalog.devices, query.brand, query.series]
  );

  const filteredProducts = useMemo(() => {
    return deriveAdminProducts(catalog.products, query);
  }, [catalog.products, query]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ADMIN_PRODUCTS_PAGE_SIZE));
  const currentPage = Math.min(query.page, totalPages);
  const pageProducts = useMemo(
    () => getAdminProductsPage(filteredProducts, currentPage),
    [currentPage, filteredProducts]
  );

  function changeQuery(changes) {
    setExpandedId(null);
    setQuery((current) => ({ ...current, ...changes, page: 1 }));
  }

  function changePage(page) {
    setExpandedId(null);
    setQuery((current) => ({ ...current, page }));
  }

  function retry() {
    setLoading(true);
    setError('');
    setRequestVersion((version) => version + 1);
  }

  function compatibilitySummary(product, full = false) {
    const names = product.modelIds.map((id) => devicesById.get(id)?.name || id);
    if (full || names.length <= 2) return names.join(', ') || 'No compatibility assigned';
    return `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
  }

  return (
    <section className={styles.manager}>
      <AdminPageHeader
        title="Products"
        description={loading ? 'Loading products…' : `${pageProducts.length} of ${filteredProducts.length} products`}
      />

      <div className={styles.controls}>
        <label className={styles.searchField}>
          <span>Search</span>
          <input type="search" value={query.search} placeholder="Search products…"
            disabled={loading} onChange={(event) => changeQuery({ search: event.target.value })} />
        </label>

        <div className={styles.filterGrid}>
          <label><span>Product Type</span><select value={query.productType} disabled={loading}
            onChange={(event) => changeQuery({ productType: event.target.value })}>
            <option value="">All product types</option>
            {catalog.productTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select></label>
          <label><span>Brand</span><select value={query.brand} disabled={loading}
            onChange={(event) => changeQuery({ brand: event.target.value, series: '', model: '' })}>
            <option value="">All brands</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select></label>
          <label><span>Series</span><select value={query.series} disabled={loading}
            onChange={(event) => changeQuery({ series: event.target.value, model: '' })}>
            <option value="">All series</option>
            {series.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
          </select></label>
          <label><span>Model</span><select value={query.model} disabled={loading}
            onChange={(event) => changeQuery({ model: event.target.value })}>
            <option value="">All models</option>
            {models.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
          </select></label>
          <label><span>Sort</span><select value={query.sort} disabled={loading}
            onChange={(event) => changeQuery({ sort: event.target.value })}>
            <option value="nameAsc">Name A–Z</option>
            <option value="nameDesc">Name Z–A</option>
            <option value="priceAsc">Purchase price low–high</option>
            <option value="priceDesc">Purchase price high–low</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select></label>
        </div>
      </div>

      {error ? <div className={styles.error} role="alert">
        <p>Unable to load products.</p>
        <button type="button" onClick={retry}>Retry</button>
      </div> : null}
      {!error && loading ? <div className={styles.loading} aria-live="polite">Loading products…</div> : null}
      {!error && !loading && catalog.products.length === 0 ? <div className={styles.empty}>No products exist.</div> : null}
      {!error && !loading && catalog.products.length > 0 && pageProducts.length === 0 ? (
        <div className={styles.empty}>No products match the current search and filters.</div>
      ) : null}

      {!error && !loading && pageProducts.length > 0 ? (
        <div className={styles.productList}>
          {pageProducts.map((product) => {
            const expanded = expandedId === product.id;
            return (
              <article className={styles.productRow} key={product.id}>
                <div className={styles.rowSummary}>
                  <div className={styles.thumbnail}>
                    <ProductImage imagePath={product.imagePaths[0]} productName={product.name} />
                  </div>
                  <div className={styles.productIdentity}>
                    <h2>{product.name}</h2>
                    <span>{productTypesById.get(product.productTypeId) || product.productTypeId || 'No type'}</span>
                  </div>
                  <div className={styles.compatibility}><span>Compatibility</span><strong>{compatibilitySummary(product)}</strong></div>
                  <div className={styles.price}><span>Prices</span>
                    <strong>Purchase {formatPrice(product.purchasePriceCents)}</strong>
                    <small>Wholesale {formatPrice(product.wholesalePriceCents)}</small>
                    <small>Retail {formatPrice(product.retailPriceCents)}</small>
                  </div>
                  <div className={styles.stock}><span>Stock</span><strong>
                    {product.stockQty ?? 0} units
                  </strong></div>
                  <span className={`${styles.status} ${product.status === 'active' ? styles.statusActive : ''}`}>
                    {product.status}
                  </span>
                  <button className={styles.expandButton} type="button" aria-expanded={expanded}
                    aria-controls={`product-${product.id}`} onClick={() => setExpandedId(expanded ? null : product.id)}>
                    {expanded ? 'Hide' : 'Details'}
                  </button>
                </div>
                {expanded ? (
                  <div className={styles.expanded} id={`product-${product.id}`}>
                    <dl>
                      <div><dt>Product ID</dt><dd>{product.id}</dd></div>
                      <div><dt>SKU</dt><dd>{product.sku ?? '—'}</dd></div>
                      <div><dt>Slug</dt><dd>{product.slug || '—'}</dd></div>
                      <div><dt>Product type</dt><dd>{productTypesById.get(product.productTypeId) || product.productTypeId || '—'}</dd></div>
                      <div><dt>Status</dt><dd>{product.status}</dd></div>
                      <div><dt>Stock</dt><dd>{product.stockQty ?? 0} units</dd></div>
                      <div><dt>Images</dt><dd>{product.imagePaths.length}</dd></div>
                      <div><dt>Created</dt><dd>{formatDate(product.createdAt)}</dd></div>
                      <div><dt>Updated</dt><dd>{formatDate(product.updatedAt)}</dd></div>
                      <div className={styles.wideDetail}><dt>Meta title</dt><dd>{product.metaTitle || '—'}</dd></div>
                      <div className={styles.wideDetail}><dt>Meta description</dt><dd>{product.metaDescription || '—'}</dd></div>
                      <div className={styles.wideDetail}><dt>Compatibility</dt><dd>{compatibilitySummary(product, true)}</dd></div>
                      <div className={styles.wideDetail}><dt>Description</dt><dd>{product.description || 'No description.'}</dd></div>
                    </dl>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {!error && !loading && pageProducts.length > 0 ? (
        <nav className={styles.pagination} aria-label="Products pagination">
          <button type="button" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>Previous</button>
          <span>Page {currentPage} of {totalPages}</span>
          <button type="button" disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)}>Next</button>
        </nav>
      ) : null}
    </section>
  );
}
