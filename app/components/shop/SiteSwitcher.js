'use client';

import { SERVICE_HOME_LINK, servicePathForLocale } from '../../../lib/shopServiceLinks.mjs';
import { useServiceLocale } from './ServiceLocaleProvider';
import styles from './SiteSwitcher.module.css';

export default function SiteSwitcher({ label, href, className = '', serviceLocaleAware = false }) {
  const locale = useServiceLocale();
  const targetHref = serviceLocaleAware
    ? new URL(servicePathForLocale(SERVICE_HOME_LINK, locale), href).href
    : href;
  return (
    <a className={`${styles.switcher} ${className}`.trim()} href={targetHref}>
      {label}
    </a>
  );
}
