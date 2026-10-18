import { notFound } from 'next/navigation';
import { getBrandCatalog } from '../../../lib/shopCatalog';
import BrandModelDirectory from '../../components/shop/BrandModelDirectory';
import Breadcrumbs from '../../components/shop/Breadcrumbs';
import styles from '../../components/shop/BrandModelDirectory.module.css';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }) { const { brand: slug } = await params; const data = await getBrandCatalog(slug); if (!data) notFound(); return { title: data.brand.metaTitle?.trim() || `${data.brand.name} | iLab Shop`, description: data.brand.metaDescription?.trim() || `Browse ${data.brand.name} repair parts and components at iLab Shop.` }; }
export default async function BrandPage({ params }) { const { brand: slug } = await params; const data = await getBrandCatalog(slug); if (!data) notFound(); return <main className={styles.page}><Breadcrumbs items={[{ label: data.brand.name }]} /><BrandModelDirectory brand={data.brand} series={data.series} /></main>; }
