'use client';
import { useState } from 'react';
import ProductCard from '../ProductCard';
import pageStyles from '../../page.module.css';
import styles from './CatalogPages.module.css';
export default function DeviceProducts({ products, productTypes }) {
  const [type, setType] = useState('');
  const names = Object.fromEntries(productTypes.map((item) => [item.id, item.name]));
  const shown = type ? products.filter((product) => product.productTypeId === type) : products;
  return <section id="parts" aria-labelledby="parts-title" className={styles.deviceCatalog} data-shop-ruler-section>
    <div className={styles.catalogHeading}><h2 id="parts-title">Parts for this device</h2><p className={styles.resultCount}>{shown.length} {shown.length === 1 ? 'product' : 'products'}</p></div>
    <nav className={styles.typeFilters} aria-label="Filter compatible products">
      <button className={!type ? styles.active : undefined} aria-pressed={!type} type="button" onClick={() => setType('')}>All</button>
      {productTypes.map((item) => <button className={type === item.id ? styles.active : undefined} aria-pressed={type === item.id} type="button" key={item.id} onClick={() => setType(item.id)}>{item.name}</button>)}
    </nav>
    {shown.length ? <section className={pageStyles.grid} aria-label="Compatible products">{shown.map((product) => <ProductCard key={product.id} product={product} typeName={names[product.productTypeId] ?? product.productTypeId} />)}</section> : <p className={styles.empty}>No matching parts found for this device filter.</p>}
  </section>;
}
