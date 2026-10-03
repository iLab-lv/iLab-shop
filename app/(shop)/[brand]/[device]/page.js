import { notFound } from 'next/navigation';
import { getModelCatalog } from '../../../../lib/shopCatalog';
import { getSessionUserProfile } from '../../../../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../../../../lib/auth/roles.mjs';
import Breadcrumbs from '../../../components/shop/Breadcrumbs';
import DeviceProducts from '../../../components/shop/DeviceProducts';
import styles from '../../../components/shop/CatalogPages.module.css';
export const dynamic = 'force-dynamic';
async function resolve(params, pricing = false) { const { brand, device } = await params; return getModelCatalog(brand, device, { includeWholesale: pricing }); }
export async function generateMetadata({ params }) { const data = await resolve(params); if (!data) notFound(); return { title: `${data.model.name} Parts | iLab Shop`, description: `Repair parts compatible with ${data.brand.name} ${data.model.name}.` }; }
export default async function DevicePage({ params }) { const session = await getSessionUserProfile(); const data = await resolve(params, canViewWholesalePrices(session?.profile)); if (!data) notFound(); return <main className={styles.page}><Breadcrumbs items={[{ label: data.brand.name, href: `/${data.brand.slug}` }, { label: data.model.name }]} /><header className={styles.hero}><h1>{data.model.name}</h1><p>{data.brand.name} · {data.series.name}</p></header><DeviceProducts products={data.products} productTypes={data.productTypes} /></main>; }
