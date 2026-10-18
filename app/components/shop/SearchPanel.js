'use client';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProductImage from '../ProductImage';
import { buildSearchIndex, searchModels, searchProducts } from '../../../lib/searchCatalog.mjs';
import ShopFullscreenPanel from './ShopFullscreenPanel';
import { useSearchData } from './SearchContext';
import AddToCartButton from './AddToCartButton';
import styles from './SearchPanel.module.css';
import WholesaleNetPrice from './WholesaleNetPrice';
import { useShopSettings } from './ShopSettingsContext';
import PartInquiryCard from './PartInquiryCard';
import { resolveProductLine } from '../../../lib/commerce.mjs';

const PAGE_SIZE = 30;
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const showPrice = (value) => value === null ? 'Unavailable' : money.format(value / 100);

function Result({ product, vatRatePercent }) {
  const summary = product.modelNames.slice(0, 3), more = product.modelNames.length - summary.length;
  const purchasability = resolveProductLine({ ...product, status: 'active' }, 1, Object.hasOwn(product, 'wholesalePriceCents'));
  const availabilityLabel = purchasability.unavailableReason === 'out_of_stock' ? 'Out of stock' : purchasability.purchasable ? 'In stock' : 'Price unavailable';
  return <article className={styles.result}>
    <Link className={styles.image} href={`/product/${product.slug}`}><ProductImage imagePath={product.primaryImagePath} productName={product.name} /></Link>
    <div className={styles.resultBody}><div className={styles.resultTop}><span>{product.typeName}</span>{product.sku !== null ? <span>SKU {product.sku}</span> : null}</div><Link href={`/product/${product.slug}`}><h3>{product.name}</h3></Link>{summary.length ? <p className={styles.compatibility}>{summary.join(', ')}{more > 0 ? ` +${more} more` : ''}</p> : null}<div className={styles.resultMeta}><p><span>Retail</span> {showPrice(product.retailPriceCents)}</p>{Object.hasOwn(product, 'wholesalePriceCents') ? <p><span>Wholesale</span> {showPrice(product.wholesalePriceCents)}<WholesaleNetPrice grossCents={product.wholesalePriceCents} vatRatePercent={vatRatePercent} /></p> : null}<strong className={purchasability.unavailableReason === 'out_of_stock' ? styles.outOfStock : purchasability.purchasable ? styles.inStock : undefined}>{availabilityLabel}</strong></div>{purchasability.unavailableReason === 'out_of_stock' ? <PartInquiryCard source="product" product={product} compatibleModelNames={product.modelNames} compact showAvailabilityState={false} actionClassName={styles.addToCart} /> : <AddToCartButton product={product} className={styles.addToCart} />}</div>
  </article>;
}

export default function SearchPanel({ open, onClose, returnFocusRef }) {
  const settings = useShopSettings(), { data, status, error, load } = useSearchData(), inputRef = useRef(null), searchBoxRef = useRef(null);
  const [query, setQuery] = useState(''), [visible, setVisible] = useState(PAGE_SIZE), [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const closePanel = useCallback(() => { setAutocompleteOpen(false); onClose(); }, [onClose]);
  useEffect(() => { if (open && status === 'idle') load().catch(() => {}); }, [open, status, load]);
  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsidePointer(event) { if (!searchBoxRef.current?.contains(event.target)) setAutocompleteOpen(false); }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);
  const index = useMemo(() => data ? buildSearchIndex(data) : null, [data]);
  const active = Boolean(query.trim());
  const models = useMemo(() => index && active ? searchModels(index, query) : [], [index, active, query]);
  const products = useMemo(() => index && active ? searchProducts(index, { query }) : [], [index, active, query]);
  const showAutocomplete = autocompleteOpen && active && models.length > 0;
  function changeQuery(value) { setQuery(value); setVisible(PAGE_SIZE); setAutocompleteOpen(Boolean(value.trim())); }
  function handleInputKeyDown(event) { if (event.key === 'Escape' && autocompleteOpen) { event.preventDefault(); event.stopPropagation(); setAutocompleteOpen(false); } }
  return <ShopFullscreenPanel id="shop-search-panel" title="Search" open={open} onClose={closePanel} returnFocusRef={returnFocusRef} initialFocusRef={inputRef}>
    <main className={styles.content}>
      <div className={styles.searchRow} ref={searchBoxRef}><label htmlFor="catalog-search">Search products, models or SKU</label><input ref={inputRef} id="catalog-search" type="search" role="combobox" placeholder="Search products, models or SKU…" value={query} onChange={(event) => changeQuery(event.target.value)} onFocus={() => setAutocompleteOpen(active)} onKeyDown={handleInputKeyDown} aria-autocomplete="list" aria-expanded={showAutocomplete} aria-controls="model-autocomplete" />{showAutocomplete ? <nav className={styles.autocomplete} id="model-autocomplete" aria-label="Matching models"><span className={styles.autocompleteLabel}>Models</span><ul>{models.map((model) => <li key={model.id}><Link className={styles.modelSuggestion} href={model.href} onClick={closePanel}><span><strong>{model.name}</strong><small>{model.seriesName} · {model.brandName}</small></span><span aria-hidden="true">→</span></Link></li>)}</ul></nav> : null}</div>
      {active ? <button className={styles.clear} type="button" onClick={() => changeQuery('')}>Clear search</button> : null}
      {status === 'loading' ? <p className={styles.state} role="status">Loading catalog search…</p> : null}
      {status === 'error' ? <div className={styles.error} role="alert"><p>{error}</p><button type="button" onClick={() => load({ retry: true }).catch(() => {})}>Retry</button></div> : null}
      {status === 'loaded' && !active ? <p className={styles.state}>Search by product name, SKU or device model.</p> : null}
      {status === 'loaded' && active ? <><section aria-labelledby="product-results-title"><div className={styles.summary}><h2 id="product-results-title">Products</h2><span>{products.length} {products.length === 1 ? 'result' : 'results'}</span></div>{products.length ? <div className={styles.results}>{products.slice(0, visible).map((product) => <Result key={product.id} product={product} vatRatePercent={settings.tax.vatRatePercent} />)}</div> : <p className={styles.noResults}>No matching parts found. Can’t find the part you need? Send us the model and part you’re looking for.</p>}{visible < products.length ? <button className={styles.showMore} type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Show more</button> : null}</section><PartInquiryCard source="search" searchQuery={query} prominent={products.length === 0} /></> : null}
    </main>
  </ShopFullscreenPanel>;
}
