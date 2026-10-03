import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicProduct } from '../../../../lib/shopCatalog';
import { getSessionUserProfile } from '../../../../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../../../../lib/auth/roles.mjs';
import ProductImage from '../../../components/ProductImage';
import Breadcrumbs from '../../../components/shop/Breadcrumbs';
import styles from '../../../components/shop/CatalogPages.module.css';

export const dynamic = 'force-dynamic';
const prices = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const price = (value) => value === null ? 'Unavailable' : prices.format(value / 100);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getPublicProduct(slug);
  if (!data) notFound();
  return { title: data.product.metaTitle || `${data.product.name} | iLab Shop`, description: data.product.metaDescription || data.product.description || `View ${data.product.name} at iLab Shop.` };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const session = await getSessionUserProfile();
  const data = await getPublicProduct(slug, { includeWholesale: canViewWholesalePrices(session?.profile) });
  if (!data) notFound();
  const { product, type, compatibility } = data;
  return <main className={styles.page}>
    <Breadcrumbs items={[{ label: product.name }]} />
    <article className={styles.productLayout}>
      <div className={styles.gallery}>
        <div className={styles.mainImage}><ProductImage imagePath={product.imagePaths[0] ?? null} productName={product.name} /></div>
        {product.imagePaths.length > 1 ? <div className={styles.thumbs}>{product.imagePaths.slice(1).map((imagePath) => <div key={imagePath}><ProductImage imagePath={imagePath} productName={product.name} /></div>)}</div> : null}
      </div>
      <div className={styles.details}>
        <h1>{product.name}</h1>
        {product.sku !== null ? <p className={styles.sku}>SKU {product.sku}</p> : null}
        {type ? <span className={styles.productType}>{type.name}</span> : null}
        <div className={styles.prices}><p><span>Retail price</span><strong>{price(product.retailPriceCents)}</strong></p>{Object.hasOwn(product, 'wholesalePriceCents') ? <p><span>Wholesale price</span><strong>{price(product.wholesalePriceCents)}</strong></p> : null}</div>
        <p className={styles.availability}>{product.stockQty > 0 ? 'In stock' : 'Out of stock'}</p>
        <p className={styles.description}>{product.description || 'No description is available for this product.'}</p>
      </div>
    </article>
    <section className={styles.compatibility} aria-labelledby="compatibility-title"><h2 id="compatibility-title">Compatible with</h2>{compatibility.length ? compatibility.map((brand) => <div className={styles.compatBrand} key={brand.id}><h3>{brand.name}</h3>{brand.series.map((series) => <div className={styles.compatSeries} key={series.id}><h4>{series.name}</h4><div>{series.models.map((model) => <Link key={model.id} href={`/${brand.slug}/${model.slug}`}>{model.name}</Link>)}</div></div>)}</div>) : <p className={styles.empty}>No active compatible devices are currently listed.</p>}</section>
  </main>;
}
