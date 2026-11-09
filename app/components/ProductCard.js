'use client';
import Link from 'next/link';
import ProductImage from './ProductImage';
import AddToCartButton from './shop/AddToCartButton';
import PartInquiryCard from './shop/PartInquiryCard';
import styles from '../page.module.css';
import WholesaleNetPrice from './shop/WholesaleNetPrice';
import { useShopSettings } from './shop/ShopSettingsContext';
import { resolveProductLine } from '../../lib/commerce.mjs';

const prices = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const price = (value) => Number.isSafeInteger(value) && value > 0 ? prices.format(value / 100) : 'Price unavailable';

export default function ProductCard({ product, typeName, onSelectType }) {
  const settings = useShopSettings();
  const compatibleModels = product.compatibleModelNames ?? [];
  const purchasability = resolveProductLine({ ...product, status: 'active' }, 1, Object.hasOwn(product, 'wholesalePriceCents'));
  const unavailable = purchasability.unavailableReason;
  return <article className={styles.card} data-product-id={product.id}>
    <Link className={styles.cardMedia} href={`/product/${product.slug}`} aria-label={`View ${product.name}`}>
      <ProductImage imagePath={product.imagePaths[0] ?? null} productName={product.name} />
    </Link>
    {onSelectType ? <button className={styles.productType} type="button" onClick={() => onSelectType(product.productTypeId)}>{typeName}</button> : <span className={styles.productType}>{typeName}</span>}
    <h2 className={styles.productName}><Link href={`/product/${product.slug}`} title={product.name}>{product.name}</Link></h2>
    {product.sku !== null && product.sku !== undefined && String(product.sku).trim() !== '' ? <p className={styles.sku}>SKU {product.sku}</p> : null}
    <div className={styles.cardCommerce}>
      <p className={styles.price}><span>Retail</span><strong>{unavailable === 'missing_price' ? 'Price unavailable' : price(product.retailPriceCents)}</strong></p>
      {Object.hasOwn(product, 'wholesalePriceCents') ? <p className={styles.price}><span>Wholesale</span><span className={styles.wholesaleValue}><strong>{price(product.wholesalePriceCents)}</strong><WholesaleNetPrice grossCents={product.wholesalePriceCents} vatRatePercent={settings.tax.vatRatePercent} /></span></p> : null}
      {unavailable === 'out_of_stock' ? <p className={styles.availabilityMeta}>Out of stock</p> : null}
    </div>
    {purchasability.unavailableReason === 'out_of_stock' || purchasability.unavailableReason === 'missing_price'
      ? <PartInquiryCard source="product" product={product} compatibleModelNames={compatibleModels} compact showAvailabilityState={false} cardAction actionClassName={styles.addToCart} />
      : <AddToCartButton product={product} className={styles.addToCart} label="Add to Cart" />}
    <details className={styles.compatibilityDetails}>
      <summary>Compatible with ({compatibleModels.length})</summary>
      <ul>{compatibleModels.length ? compatibleModels.map((name) => <li key={name}>{name}</li>) : <li>No compatible models listed.</li>}</ul>
    </details>
  </article>;
}
