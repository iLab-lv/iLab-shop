import Link from 'next/link';
import { buildBreadcrumbStructuredData, serializeJsonLd } from '../../../lib/shopSeo.mjs';
import styles from './CatalogPages.module.css';
export default function Breadcrumbs({ items, currentPath }) { const schema = buildBreadcrumbStructuredData(items, currentPath); return <><nav className={styles.breadcrumbs} aria-label="Breadcrumb"><ol><li><Link href="/">Shop</Link></li>{items.map((item) => <li key={item.href ?? item.label}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>{schema ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} /> : null}</>; }
