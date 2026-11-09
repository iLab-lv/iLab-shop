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
import { cache } from 'react';
import { buildProductStructuredData, buildShopPageMetadata, serializeJsonLd } from '../../../../lib/shopSeo.mjs';
import ShopTrustHighlights from '../../../components/shop/ShopTrustHighlights';
import PartInquiryCard from '../../../components/shop/PartInquiryCard';

export const dynamic = 'force-dynamic';
const prices = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const price = (value) => value === null ? 'Unavailable' : prices.format(value / 100);

const loadProduct = cache((slug, includeWholesale) => getPublicProduct(slug, { includeWholesale }));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await loadProduct(slug, false);
  if (!data) notFound();
  return buildShopPageMetadata({ title: data.product.metaTitle?.trim() || `${data.product.name} | iLab Shop`, description: data.product.metaDescription?.trim() || data.product.description || `View ${data.product.name} at iLab Shop.`, path: `/product/${data.product.slug}` });
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const session = await getSessionUserProfile();
  const data = await loadProduct(slug, canViewWholesalePrices(session?.profile));
  const settings = await getPublicShopSettings();
  if (!data) notFound();
  const { product, type, compatibility, serviceLinks } = data;
  const purchasability = resolveProductLine({ ...product, status: 'active' }, 1, Object.hasOwn(product, 'wholesalePriceCents'));
  const compatibleModelNames = compatibility.flatMap((brand) => brand.series.flatMap((series) => series.models.map((model) => model.name)));
  const primaryBrand = compatibility[0] ?? null;
  const availabilityLabel = purchasability.unavailableReason === 'out_of_stock' ? 'Out of stock' : purchasability.purchasable ? 'In stock' : 'Price unavailable';
  const canonicalPath = `/product/${product.slug}`;
  const productSchema = buildProductStructuredData(product, canonicalPath);
  return <main className={`${styles.page} ${styles.productPage}`}>
    <Breadcrumbs currentPath={canonicalPath} items={[...(primaryBrand ? [{ label: primaryBrand.name, href: `/${primaryBrand.slug}` }] : []), { label: product.name }]} />
    {productSchema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(productSchema) }} /> : null}
    <article id="shop-product-details" className={styles.productLayout} data-shop-ruler-section>
      <ProductGallery imagePaths={product.imagePaths} productName={product.name} />
      <div className={styles.details}>
        <h1>{product.name}</h1>
        {product.sku !== null ? <p className={styles.sku}>SKU {product.sku}</p> : null}
        {type ? <span className={styles.productType}>{type.name}</span> : null}
        <div className={styles.prices}><p><span>Retail price</span><strong>{price(product.retailPriceCents)}</strong></p>{Object.hasOwn(product, 'wholesalePriceCents') ? <p><span>Wholesale price</span><strong>{price(product.wholesalePriceCents)}</strong><WholesaleNetPrice grossCents={product.wholesalePriceCents} vatRatePercent={settings.tax.vatRatePercent} /></p> : null}</div>
        <p className={`${styles.availability} ${purchasability.purchasable ? styles.inStock : purchasability.unavailableReason === 'out_of_stock' ? styles.outOfStock : styles.priceUnavailable}`}>{availabilityLabel}</p>
        <ProductPurchase product={product} compatibleModelNames={compatibleModelNames} />
        <p className={styles.description}>{product.description || 'No description is available for this product.'}</p>
        <section id="shop-product-compatibility" className={styles.compatibility} aria-labelledby="compatibility-title" data-shop-ruler-section><h2 id="compatibility-title">Compatible with</h2>{compatibility.length ? compatibility.map((brand) => <div className={styles.compatBrand} key={brand.id}><h3>{brand.name}</h3>{brand.series.map((series) => <div className={styles.compatSeries} key={series.id}><h4>{series.name}</h4><div>{series.models.map((model) => <Link key={model.id} href={`/${brand.slug}/${model.slug}`}>{model.name}</Link>)}</div></div>)}</div>) : <p className={styles.empty}>No active compatible devices are currently listed.</p>}</section>
      </div>
    </article>
    <div className={styles.productServiceLink}>
      <ServiceLinkCard variant="editorial" description="We can repair compatible devices at iLab." links={serviceLinks} />
    </div>
    <section id="shop-product-trust" aria-label="Why buy from iLab" data-shop-ruler-section>
      <ShopTrustHighlights productStrip />
    </section>
    <section id="shop-product-inquiry" aria-label="Product inquiry" data-shop-ruler-section>
      <PartInquiryCard source="product" product={product} compatibleModelNames={compatibleModelNames} inquiryPrompt />
    </section>
  </main>;
}
