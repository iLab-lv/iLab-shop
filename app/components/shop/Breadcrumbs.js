import Link from 'next/link';
import styles from './CatalogPages.module.css';
export default function Breadcrumbs({ items }) { return <nav className={styles.breadcrumbs} aria-label="Breadcrumb"><ol><li><Link href="/">Shop</Link></li>{items.map((item) => <li key={item.href ?? item.label}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</li>)}</ol></nav>; }
