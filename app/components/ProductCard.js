'use client';
import Link from 'next/link';
import ProductImage from './ProductImage';
import AddToCartButton from './shop/AddToCartButton';
import styles from '../page.module.css';

const prices = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const price = (value) => value === null ? 'Unavailable' : prices.format(value / 100);

export default function ProductCard({ product, typeName, onSelectType }) {
  const compatibleModels = product.compatibleModelNames ?? [];
  return <article className={styles.card} data-product-id={product.id}>
    <div className={styles.cardMedia}>
      <Link href={`/product/${product.slug}`} aria-label={`View ${product.name}`}><ProductImage imagePath={product.imagePaths[0] ?? null} productName={product.name} /></Link>
      {onSelectType ? <button className={styles.typePill} type="button" onClick={() => onSelectType(product.productTypeId)}>{typeName}</button> : <span className={styles.typeLabel}>{typeName}</span>}
    </div>
    <div className={styles.cardBody}>
      <Link className={styles.productName} href={`/product/${product.slug}`}><h2>{product.name}</h2></Link>
      {product.sku !== null ? <p className={styles.sku}>SKU {product.sku}</p> : null}
      <p className={styles.price}><span>Retail</span> {price(product.retailPriceCents)}</p>
      {Object.hasOwn(product, 'wholesalePriceCents') ? <p className={styles.price}><span>Wholesale</span> {price(product.wholesalePriceCents)}</p> : null}
      <AddToCartButton product={product} className={styles.addToCart} />
      <details className={styles.compatibilityDetails}><summary>Compatible with{compatibleModels.length ? ` (${compatibleModels.length})` : ''}</summary>{compatibleModels.length ? <ul>{compatibleModels.map((name) => <li key={name}>{name}</li>)}</ul> : <p>No compatible models listed.</p>}</details>
    </div>
  </article>;
}
