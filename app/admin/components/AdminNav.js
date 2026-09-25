'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminShell.module.css';

const ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/catalog', label: 'Catalog' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/users', label: 'Users' },
];

function isActive(pathname, item) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AdminNav({ firstLinkRef, onNavigate }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Admin sections">
      {ITEMS.map((item, index) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            ref={index === 0 ? firstLinkRef : undefined}
            className={active ? styles.navLinkActive : styles.navLink}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
