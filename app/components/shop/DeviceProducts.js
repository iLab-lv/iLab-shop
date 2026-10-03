'use client';
import { useState } from 'react';
import ProductCard from '../ProductCard';
import pageStyles from '../../page.module.css';
import styles from './CatalogPages.module.css';
export default function DeviceProducts({ products, productTypes }) {
  const [type, setType] = useState('');
  const names = Object.fromEntries(productTypes.map((item) => [item.id, item.name]));
  const shown = type ? products.filter((product) => product.productTypeId === type) : products;
  return <><nav className={styles.typeFilters} aria-label="Filter compatible products"><button className={!type ? styles.active : undefined} type="button" onClick={() => setType('')}>All</button>{productTypes.map((item) => <button className={type === item.id ? styles.active : undefined} type="button" key={item.id} onClick={() => setType(item.id)}>{item.name}</button>)}</nav><p className={styles.resultCount}>{shown.length} products</p>{shown.length ? <section className={pageStyles.grid} aria-label="Compatible products">{shown.map((product) => <ProductCard key={product.id} product={product} typeName={names[product.productTypeId] ?? product.productTypeId} />)}</section> : <p className={styles.empty}>No products are currently available for this filter.</p>}</>;
}
