import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBrandCatalog } from '../../../lib/shopCatalog';
import Breadcrumbs from '../../components/shop/Breadcrumbs';
import styles from '../../components/shop/CatalogPages.module.css';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }) { const { brand: slug } = await params; const data = await getBrandCatalog(slug); if (!data) notFound(); return { title: `${data.brand.name} Parts | iLab Shop`, description: `Browse repair parts by ${data.brand.name} model.` }; }
export default async function BrandPage({ params }) { const { brand: slug } = await params; const data = await getBrandCatalog(slug); if (!data) notFound(); return <main className={styles.page}><Breadcrumbs items={[{ label: data.brand.name }]} /><header className={styles.hero}><h1>{data.brand.name}</h1><p>Choose a model to view compatible repair parts.</p></header>{data.series.length ? <div className={styles.seriesList}>{data.series.map((series) => <section className={styles.series} key={series.id}><h2>{series.name}</h2><div className={styles.modelGrid}>{series.models.map((model) => <Link className={styles.model} key={model.id} href={`/${data.brand.slug}/${model.slug}`}>{model.name}</Link>)}</div></section>)}</div> : <p className={styles.empty}>No active models are currently available for this brand.</p>}</main>; }
