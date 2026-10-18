'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  countBrandModels,
  filterBrandSeries,
  getModelHref,
} from '../../../lib/brandCatalogPresentation.mjs';
import { resolveShopServiceLink } from '../../../lib/shopServiceLinks.mjs';
import { getDeviceFilterArtwork } from './deviceFilterArtwork';
import ShopTrustHighlights from './ShopTrustHighlights';
import ServiceLinkCard from './ServiceLinkCard';
import PartInquiryCard from './PartInquiryCard';
import styles from './BrandModelDirectory.module.css';

function modelLabel(count) {
  return `${count} ${count === 1 ? 'model' : 'models'}`;
}

const BRAND_IMAGE_CLASSES = Object.freeze({
  iphone: styles.iphoneVisual,
  ipad: styles.ipadVisual,
  macbook: styles.macbookVisual,
  'apple-watch': styles.watchVisual,
  samsung: styles.androidVisual,
  xiaomi: styles.androidVisual,
  huawei: styles.androidVisual,
});

export default function BrandModelDirectory({ brand, series }) {
  const [query, setQuery] = useState('');
  const totalModels = countBrandModels(series);
  const filteredSeries = useMemo(() => filterBrandSeries(series, query), [series, query]);
  const visibleModels = countBrandModels(filteredSeries);
  const hasQuery = query.trim().length > 0;
  const normalizedBrand = brand.slug.toLowerCase();
  const heroImage = getDeviceFilterArtwork(normalizedBrand)?.image ?? null;
  const heroImageClass = BRAND_IMAGE_CLASSES[normalizedBrand] ?? '';
  const resolvedService = resolveShopServiceLink({ brand });
  const serviceIsHome = resolvedService.serviceLink.type === 'home';
  const serviceLabel = serviceIsHome ? 'Visit iLab repair service' : `${brand.name} repair`;

  const clearSearch = () => setQuery('');

  return <>
    <header className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.headingGroup}>
          <p className={styles.eyebrow}>Repair parts</p>
          <h1>{brand.name}</h1>
          <p className={styles.description}>Choose your model to see compatible repair parts.</p>
          <p className={styles.total}>{modelLabel(totalModels)}</p>
        </div>

        <div className={styles.searchArea}>
          <label className={styles.visuallyHidden} htmlFor="brand-model-search">Search {brand.name} models</label>
          <div className={styles.searchControl}>
            <svg className={styles.searchIcon} aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              id="brand-model-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && query) {
                  event.preventDefault();
                  clearSearch();
                }
              }}
              placeholder={`Search ${brand.name} model…`}
              autoComplete="off"
            />
            {query ? <button className={styles.clearButton} type="button" onClick={clearSearch} aria-label={`Clear ${brand.name} model search`}>
              <span aria-hidden="true">×</span>
            </button> : null}
          </div>
          <p className={styles.searchStatus} aria-live="polite">
            {hasQuery ? `${modelLabel(visibleModels)} found` : 'Search by model or series name'}
          </p>
        </div>
      </div>

      <div className={`${styles.heroMedia} ${heroImageClass}`} aria-hidden="true">
        {heroImage ? <Image src={heroImage} alt="" fill sizes="(max-width: 600px) 92vw, (max-width: 900px) 48vw, 620px" /> : <span className={styles.visualMark} />}
      </div>
      <ShopTrustHighlights compact />
    </header>

    <ServiceLinkCard description={serviceIsHome ? 'iLab repairs phones, tablets, computers and other devices.' : `Professional ${brand.name} repair at iLab.`} links={[{ serviceLink: resolvedService.serviceLink, label: serviceLabel }]} />

    {totalModels === 0 ? <div className={styles.emptyState}>
      <p>No active models are currently available for this brand.</p>
    </div> : visibleModels === 0 ? <div className={styles.emptyState}>
      <p>No models found for “{query.trim()}”.</p>
      <button type="button" onClick={clearSearch}>Clear search</button>
    </div> : <div className={styles.directory}>
      {filteredSeries.map((item, seriesIndex) => <section className={styles.series} key={item.id || `${item.name}-${seriesIndex}`}>
        <div className={styles.seriesHeader}>
          <h2>{item.name}</h2>
          <span>{modelLabel(item.models.length)}</span>
        </div>
        <ul className={styles.modelGrid}>
          {item.models.map((model, modelIndex) => <li key={model.id || `${model.name}-${modelIndex}`}>
            <Link className={styles.modelLink} href={getModelHref(brand.slug, model.slug)}>
              <span>{model.name}</span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </Link>
          </li>)}
        </ul>
      </section>)}
    </div>}
    <PartInquiryCard source="brand" brand={{ id: brand.id, name: brand.name }} />
  </>;
}
