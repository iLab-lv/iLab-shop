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
import { usePartInquiry } from './PartInquiryContext';
import { resolveProductLine } from '../../../lib/commerce.mjs';

const PAGE_SIZE = 30;
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const showPrice = (value) => value === null ? 'Unavailable' : money.format(value / 100);

function Result({ product, vatRatePercent }) {
  const inquiryContext = usePartInquiry();
  const modelSummary = product.modelNames.slice(0, 3);
  const additionalModels = product.modelNames.length - modelSummary.length;
  const purchasability = resolveProductLine({ ...product, status: 'active' }, 1, Object.hasOwn(product, 'wholesalePriceCents'));
  const needsInquiry = purchasability.unavailableReason === 'out_of_stock' || purchasability.unavailableReason === 'missing_price';
  const availabilityLabel = purchasability.unavailableReason === 'out_of_stock'
    ? 'Out of stock'
    : purchasability.purchasable ? 'In stock' : 'Price unavailable';

  return <article className={styles.result}>
    <Link className={styles.image} href={`/product/${product.slug}`} aria-label={`View ${product.name}`}>
      <ProductImage imagePath={product.primaryImagePath} productName={product.name} />
    </Link>
    <div className={styles.resultBody}>
      <p className={styles.resultTop}>
        <span>{product.typeName}</span>
        {product.sku !== null ? <span>SKU {product.sku}</span> : null}
      </p>
      <Link className={styles.productLink} href={`/product/${product.slug}`}><h3>{product.name}</h3></Link>
      {modelSummary.length ? <p className={styles.compatibility}>
        {modelSummary.join(', ')}{additionalModels > 0 ? ` +${additionalModels} more` : ''}
      </p> : null}
    </div>
    <div className={styles.resultActions}>
      <div className={styles.priceAndStock}>
        <p className={styles.retailPrice}><span>Retail</span><strong>{showPrice(product.retailPriceCents)}</strong></p>
        {Object.hasOwn(product, 'wholesalePriceCents') ? <p className={styles.wholesalePrice}>
          <span>Wholesale</span><strong>{showPrice(product.wholesalePriceCents)}</strong>
          <WholesaleNetPrice grossCents={product.wholesalePriceCents} vatRatePercent={vatRatePercent} />
        </p> : null}
        <span className={`${styles.availability} ${purchasability.purchasable ? styles.inStock : styles.unavailable}`}>
          {availabilityLabel}
        </span>
      </div>
      {needsInquiry
        ? <button
          className={styles.inquiryButton}
          type="button"
          onClick={(event) => inquiryContext?.openInquiry({ source: 'product', product, compatibleModelNames: product.modelNames }, event.currentTarget)}
          aria-label={`Send an inquiry about ${product.name}`}
        >Send Inquiry</button>
        : <AddToCartButton product={product} className={styles.addToCart} />}
    </div>
  </article>;
}

export default function SearchPanel({ open, onClose, returnFocusRef }) {
  const settings = useShopSettings();
  const { data, status, error, load } = useSearchData();
  const inquiryContext = usePartInquiry();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const closePanel = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (open && status === 'idle') load().catch(() => {});
  }, [open, status, load]);

  const index = useMemo(() => data ? buildSearchIndex(data) : null, [data]);
  const active = Boolean(query.trim());
  // Search runs against the in-memory index, so typing updates immediately without a request per keystroke.
  const models = useMemo(() => index && active ? searchModels(index, query, 8) : [], [index, active, query]);
  const products = useMemo(() => index && active ? searchProducts(index, { query }) : [], [index, active, query]);
  const visibleProducts = products.slice(0, visible);

  function changeQuery(value) {
    setQuery(value);
    setVisible(PAGE_SIZE);
  }

  return <ShopFullscreenPanel
    id="shop-search-panel"
    title="Search"
    variant="search"
    open={open}
    onClose={closePanel}
    returnFocusRef={returnFocusRef}
    initialFocusRef={inputRef}
  >
    <div className={styles.content}>
      <div className={styles.searchRow}>
        <label className={styles.visuallyHidden} htmlFor="catalog-search">Search products, models or SKU</label>
        <input
          ref={inputRef}
          id="catalog-search"
          type="search"
          placeholder="Search products, models or SKU..."
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          autoComplete="off"
          spellCheck="false"
        />
        {active ? <button className={styles.clear} type="button" onClick={() => { changeQuery(''); inputRef.current?.focus(); }} aria-label="Clear search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg>
        </button> : null}
      </div>

      <div className={styles.searchLayout}>
        <section className={styles.modelsSection} aria-labelledby="model-results-title">
          <h2 className={styles.sectionLabel} id="model-results-title">Models</h2>
          {!active ? <p className={styles.helper}>Type a device or model name to see matching devices.</p> : null}
          {active && status === 'loading' ? <p className={styles.helper} role="status">Loading matching models...</p> : null}
          {active && status === 'loaded' && models.length ? <ul className={styles.modelResults}>
            {models.map((model) => <li key={model.id}>
              <Link className={styles.modelSuggestion} href={model.href} onClick={closePanel}>
                <strong>{model.name}</strong>
                <span>{model.seriesName} / {model.brandName}</span>
              </Link>
            </li>)}
          </ul> : null}
          {active && status === 'loaded' && !models.length ? <p className={styles.helper}>No matching models.</p> : null}
        </section>

        <section className={styles.productsSection} aria-labelledby="product-results-title">
          <div className={styles.productsHeading}>
            <h2 id="product-results-title">Products</h2>
            <span className={styles.count}>{active && status === 'loaded' ? `${products.length} ${products.length === 1 ? 'result' : 'results'}` : 'Search by product name, SKU or device model.'}</span>
          </div>
          {status === 'loading' ? <p className={styles.state} role="status">Loading catalog search...</p> : null}
          {status === 'error' ? <div className={styles.error} role="alert">
            <p>{error}</p>
            <button type="button" onClick={() => load({ retry: true }).catch(() => {})}>Retry</button>
          </div> : null}
          {status === 'loaded' && !active ? <p className={styles.state}>Matching parts will appear here as you type.</p> : null}
          {status === 'loaded' && active && products.length ? <>
            <div className={styles.results}>
              {visibleProducts.map((product) => <Result key={product.id} product={product} vatRatePercent={settings.tax.vatRatePercent} />)}
            </div>
            {visible < products.length ? <button className={styles.showMore} type="button" onClick={() => setVisible((count) => count + PAGE_SIZE)}>Show more</button> : null}
          </> : null}
          {status === 'loaded' && active && !products.length ? <>
            <p className={styles.noResults}>No matching parts found. Send us the model and part you need and we will check availability.</p>
            <div className={styles.inquiryPrompt}>
              <p>Can&apos;t find the part you need?</p>
              <button className={styles.inquirySearchButton} type="button" onClick={(event) => inquiryContext?.openInquiry({ source: 'search', searchQuery: query }, event.currentTarget)}>Send an inquiry</button>
            </div>
          </> : null}
        </section>
      </div>
    </div>
  </ShopFullscreenPanel>;
}
