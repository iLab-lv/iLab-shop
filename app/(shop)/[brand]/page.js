import { notFound } from 'next/navigation';
import { getBrandCatalog } from '../../../lib/shopCatalog';
import BrandModelDirectory from '../../components/shop/BrandModelDirectory';
import Breadcrumbs from '../../components/shop/Breadcrumbs';
import styles from '../../components/shop/BrandModelDirectory.module.css';
import { cache } from 'react';
import { buildShopPageMetadata } from '../../../lib/shopSeo.mjs';
export const dynamic = 'force-dynamic';
const getBrand = cache((slug) => getBrandCatalog(slug));
export async function generateMetadata({ params }) { const { brand: slug } = await params; const data = await getBrand(slug); if (!data) notFound(); const title = data.brand.metaTitle?.trim() || `${data.brand.name} | iLab Shop`; const description = data.brand.metaDescription?.trim() || `Browse ${data.brand.name} repair parts and components at iLab Shop.`; return buildShopPageMetadata({ title, description, path: `/${data.brand.slug}` }); }
export default async function BrandPage({ params }) { const { brand: slug } = await params; const data = await getBrand(slug); if (!data) notFound(); return <main className={styles.page}><Breadcrumbs currentPath={`/${data.brand.slug}`} items={[{ label: data.brand.name }]} /><BrandModelDirectory brand={data.brand} series={data.series} /></main>; }
