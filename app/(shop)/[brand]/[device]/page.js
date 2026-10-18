import { notFound } from 'next/navigation';
import { getModelCatalog } from '../../../../lib/shopCatalog';
import { getSessionUserProfile } from '../../../../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../../../../lib/auth/roles.mjs';
import Breadcrumbs from '../../../components/shop/Breadcrumbs';
import DeviceProducts from '../../../components/shop/DeviceProducts';
import styles from '../../../components/shop/CatalogPages.module.css';
import ServiceLinkCard from '../../../components/shop/ServiceLinkCard';
import { resolveShopServiceLink } from '../../../../lib/shopServiceLinks.mjs';
import PartInquiryCard from '../../../components/shop/PartInquiryCard';
export const dynamic = 'force-dynamic';
async function resolve(params, pricing = false) { const { brand, device } = await params; return getModelCatalog(brand, device, { includeWholesale: pricing }); }
export async function generateMetadata({ params }) { const data = await resolve(params); if (!data) notFound(); return { title: `${data.model.name} Parts | iLab Shop`, description: `Repair parts compatible with ${data.brand.name} ${data.model.name}.` }; }
export default async function DevicePage({ params }) { const session = await getSessionUserProfile(); const data = await resolve(params, canViewWholesalePrices(session?.profile)); if (!data) notFound(); const resolved = resolveShopServiceLink({ model: data.model, brand: data.brand }); const isHome = resolved.serviceLink.type === 'home'; const label = isHome ? 'Visit iLab repair service' : resolved.source === 'model' ? `${data.model.name} repair` : `${data.brand.name} repair`; return <main className={styles.page}><Breadcrumbs items={[{ label: data.brand.name, href: `/${data.brand.slug}` }, { label: data.model.name }]} /><header className={styles.hero}><h1>{data.model.name}</h1><p>{data.brand.name} · {data.series.name}</p></header><ServiceLinkCard description={isHome ? 'iLab repairs phones, tablets, computers and other devices.' : `Professional ${resolved.source === 'model' ? data.model.name : data.brand.name} repair at iLab.`} links={[{ serviceLink: resolved.serviceLink, label }]} /><DeviceProducts products={data.products} productTypes={data.productTypes} /><PartInquiryCard source="model" brand={{ id: data.brand.id, name: data.brand.name }} model={{ id: data.model.id, name: data.model.name }} /></main>; }
