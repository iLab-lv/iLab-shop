'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import ProductImage from '../ProductImage';
import { buildSearchIndex, searchProducts } from '../../../lib/searchCatalog.mjs';
import ShopFullscreenPanel from './ShopFullscreenPanel';
import { useSearchData } from './SearchContext';
import AddToCartButton from './AddToCartButton';
import styles from './SearchPanel.module.css';

const PAGE_SIZE = 30;
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const showPrice = (value) => value === null ? 'Unavailable' : money.format(value / 100);

function Result({ product }) {
  const summary = product.modelNames.slice(0, 3);
  const more = product.modelNames.length - summary.length;
  return <article className={styles.result}>
    <Link className={styles.image} href={`/product/${product.slug}`}><ProductImage imagePath={product.primaryImagePath} productName={product.name} /></Link>
    <div className={styles.resultBody}><div className={styles.resultTop}><span>{product.typeName}</span>{product.sku !== null ? <span>SKU {product.sku}</span> : null}</div><Link href={`/product/${product.slug}`}><h3>{product.name}</h3></Link>{summary.length ? <p className={styles.compatibility}>{summary.join(', ')}{more > 0 ? ` +${more} more` : ''}</p> : null}<div className={styles.resultMeta}><p><span>Retail</span> {showPrice(product.retailPriceCents)}</p>{Object.hasOwn(product, 'wholesalePriceCents') ? <p><span>Wholesale</span> {showPrice(product.wholesalePriceCents)}</p> : null}<strong className={product.stockQty > 0 ? styles.inStock : styles.outOfStock}>{product.stockQty > 0 ? 'In stock' : 'Out of stock'}</strong></div><AddToCartButton product={product} className={styles.addToCart} /></div>
  </article>;
}

export default function SearchPanel({ open, onClose, returnFocusRef }) {
  const { data, status, error, load } = useSearchData();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [brandId, setBrandId] = useState(''); const [seriesId, setSeriesId] = useState(''); const [modelId, setModelId] = useState(''); const [productTypeId, setProductTypeId] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => { if (open && status === 'idle') load().catch(() => {}); }, [open, status, load]);
  const index = useMemo(() => data ? buildSearchIndex(data) : null, [data]);
  const seriesOptions = useMemo(() => index ? index.series.filter((item) => item.parentId === brandId) : [], [index, brandId]);
  const modelOptions = useMemo(() => index ? index.models.filter((item) => item.parentId === seriesId) : [], [index, seriesId]);
  const active = Boolean(query.trim() || brandId || seriesId || modelId || productTypeId);
  const matches = useMemo(() => index && active ? searchProducts(index, { query, brandId, seriesId, modelId, productTypeId }) : [], [index, active, query, brandId, seriesId, modelId, productTypeId]);
  function clear() { setQuery(''); setBrandId(''); setSeriesId(''); setModelId(''); setProductTypeId(''); setVisible(PAGE_SIZE); }
  return <ShopFullscreenPanel id="shop-search-panel" title="Search" open={open} onClose={onClose} returnFocusRef={returnFocusRef} initialFocusRef={inputRef}>
    <main className={styles.content}>
      <div className={styles.searchRow}><label htmlFor="catalog-search">Search the catalog</label><input ref={inputRef} id="catalog-search" type="search" placeholder="Search product, SKU or model…" value={query} onChange={(event) => { setQuery(event.target.value); setVisible(PAGE_SIZE); }} /></div>
      <div className={styles.filters}>
        <label>Brand<select value={brandId} onChange={(event) => { setBrandId(event.target.value); setSeriesId(''); setModelId(''); setVisible(PAGE_SIZE); }}><option value="">All brands</option>{index?.brands.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Series<select value={seriesId} disabled={!brandId} onChange={(event) => { setSeriesId(event.target.value); setModelId(''); setVisible(PAGE_SIZE); }}><option value="">All series</option>{seriesOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Model<select value={modelId} disabled={!seriesId} onChange={(event) => { setModelId(event.target.value); setVisible(PAGE_SIZE); }}><option value="">All models</option>{modelOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Product type<select value={productTypeId} onChange={(event) => { setProductTypeId(event.target.value); setVisible(PAGE_SIZE); }}><option value="">All product types</option>{index?.productTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      </div>
      {active ? <button className={styles.clear} type="button" onClick={clear}>Clear search and filters</button> : null}
      {status === 'loading' ? <p className={styles.state} role="status">Loading catalog search…</p> : null}
      {status === 'error' ? <div className={styles.error} role="alert"><p>{error}</p><button type="button" onClick={() => load({ retry: true }).catch(() => {})}>Retry</button></div> : null}
      {status === 'loaded' && !active ? <p className={styles.state}>Search by product, SKU or model, or choose a filter.</p> : null}
      {status === 'loaded' && active ? <section aria-labelledby="search-results-title"><div className={styles.summary}><h2 id="search-results-title">{matches.length === 0 ? 'No matching products' : `${matches.length} ${matches.length === 1 ? 'product' : 'products'}`}</h2></div><div className={styles.results}>{matches.slice(0, visible).map((product) => <Result key={product.id} product={product} />)}</div>{visible < matches.length ? <button className={styles.showMore} type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Show more</button> : null}</section> : null}
    </main>
  </ShopFullscreenPanel>;
}
