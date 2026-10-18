import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicProduct } from '../../../../lib/shopCatalog';
import { getSessionUserProfile } from '../../../../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../../../../lib/auth/roles.mjs';
import ProductGallery from '../../../components/shop/ProductGallery';
import Breadcrumbs from '../../../components/shop/Breadcrumbs';
import ProductPurchase from '../../../components/shop/ProductPurchase';
import styles from '../../../components/shop/CatalogPages.module.css';
import WholesaleNetPrice from '../../../components/shop/WholesaleNetPrice';
import { getPublicShopSettings } from '../../../../lib/shopSettings';
import ServiceLinkCard from '../../../components/shop/ServiceLinkCard';
import { resolveProductLine } from '../../../../lib/commerce.mjs';

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
  const settings = await getPublicShopSettings();
  if (!data) notFound();
  const { product, type, compatibility, serviceLinks } = data;
  const purchasability = resolveProductLine({ ...product, status: 'active' }, 1, Object.hasOwn(product, 'wholesalePriceCents'));
  const compatibleModelNames = compatibility.flatMap((brand) => brand.series.flatMap((series) => series.models.map((model) => model.name)));
  const primaryBrand = compatibility[0] ?? null;
  const availabilityLabel = purchasability.unavailableReason === 'out_of_stock' ? 'Out of stock' : purchasability.purchasable ? 'In stock' : 'Price unavailable';
  return <main className={`${styles.page} ${styles.productPage}`}>
    <Breadcrumbs items={[...(primaryBrand ? [{ label: primaryBrand.name, href: `/${primaryBrand.slug}` }] : []), { label: product.name }]} />
    <article className={styles.productLayout}>
      <ProductGallery imagePaths={product.imagePaths} productName={product.name} />
      <div className={styles.details}>
        <h1>{product.name}</h1>
        {product.sku !== null ? <p className={styles.sku}>SKU {product.sku}</p> : null}
        {type ? <span className={styles.productType}>{type.name}</span> : null}
        <div className={styles.prices}><p><span>Retail price</span><strong>{price(product.retailPriceCents)}</strong></p>{Object.hasOwn(product, 'wholesalePriceCents') ? <p><span>Wholesale price</span><strong>{price(product.wholesalePriceCents)}</strong><WholesaleNetPrice grossCents={product.wholesalePriceCents} vatRatePercent={settings.tax.vatRatePercent} /></p> : null}</div>
        <p className={styles.availability}>{availabilityLabel}</p>
        <ProductPurchase product={product} compatibleModelNames={compatibleModelNames} />
        <p className={styles.description}>{product.description || 'No description is available for this product.'}</p>
      </div>
    </article>
    <div className={styles.productServiceLink}><ServiceLinkCard description="We can repair compatible devices at iLab." links={serviceLinks} /></div>
    <section className={styles.compatibility} aria-labelledby="compatibility-title"><h2 id="compatibility-title">Compatible with</h2>{compatibility.length ? compatibility.map((brand) => <div className={styles.compatBrand} key={brand.id}><h3>{brand.name}</h3>{brand.series.map((series) => <div className={styles.compatSeries} key={series.id}><h4>{series.name}</h4><div>{series.models.map((model) => <Link key={model.id} href={`/${brand.slug}/${model.slug}`}>{model.name}</Link>)}</div></div>)}</div>) : <p className={styles.empty}>No active compatible devices are currently listed.</p>}</section>
  </main>;
}
