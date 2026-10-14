import Catalog from '../components/Catalog';
import styles from '../page.module.css';
import {
  getProductTypes,
  getProductsPage,
} from '../../lib/shopProducts';
import { getBrandDirectory } from '../../lib/shopCatalog';
import Link from 'next/link';
import { getSessionUserProfile } from '../../lib/auth/sessionAuth';
import { canViewWholesalePrices } from '../../lib/auth/roles.mjs';
import HomepageDiscovery from '../components/shop/HomepageDiscovery';
import { resolveAccessoriesType, resolveProductTypeSelection } from '../../lib/homepagePresentation.mjs';

export const dynamic = 'force-dynamic';

function BenefitIcon({ kind }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (kind === 'delivery') return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  if (kind === 'pickup') return <svg {...common}><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.2" /></svg>;
  return <svg {...common}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 9h.01M15 9h.01M9 12h.01M15 12h.01" /></svg>;
}

const benefits = [
  { kind: 'delivery', label: '3h delivery in Riga', primary: true },
  { kind: 'pickup', label: 'Pickup today' },
  { kind: 'wholesale', label: 'Wholesale for partners' },
];

export default async function Home({ searchParams }) {
  const [session, productTypes, brands, query] = await Promise.all([getSessionUserProfile(), getProductTypes(), getBrandDirectory(), searchParams]);
  const showWholesale = canViewWholesalePrices(session?.profile);
  const initialType = resolveProductTypeSelection(query?.type, productTypes);
  const initialPage = await getProductsPage(null, initialType, { includeWholesale: showWholesale });
  const accessoriesType = resolveAccessoriesType(productTypes);

  return (
    <main className={styles.page}>
      <header className={styles.storeIntro}><div className={styles.introCopy}><p>Professional repair parts</p><h1>iLab Shop</h1><span>Browse parts by device or explore the complete catalog.</span></div><ul className={styles.benefits} aria-label="Shop services">{benefits.map(({ kind, label, primary }) => <li className={primary ? styles.benefitPrimary : styles.benefit} key={kind}><BenefitIcon kind={kind} /><strong>{label}</strong></li>)}</ul></header>
      <HomepageDiscovery brands={brands} />
      <section className={styles.accessoriesBanner} aria-labelledby="accessories-title"><div><p>Power and essentials</p><h2 id="accessories-title">Chargers &amp; Accessories</h2><span>Cables, chargers, adapters and accessories.</span></div>{accessoriesType ? <Link href={`/?type=${encodeURIComponent(accessoriesType.id)}#products`}>Browse category <span aria-hidden="true">→</span></Link> : <span className={styles.accessoriesMark} aria-hidden="true" />}</section>
      <Catalog key={showWholesale ? 'wholesale' : 'retail'} initialPage={initialPage} initialType={initialType} productTypes={productTypes} apiPath="/shop/api/products" />
    </main>
  );
}
