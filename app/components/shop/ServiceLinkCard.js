'use client';

import { SERVICE_HOME_LINK, normalizeServiceLink, serviceLinkKey, servicePathForLocale } from '../../../lib/shopServiceLinks.mjs';
import { useServiceLocale } from './ServiceLocaleProvider';
import styles from './ServiceLinkCard.module.css';

export default function ServiceLinkCard({ title = 'Need professional repair?', description, links = [] }) {
  const locale = useServiceLocale();
  const safeLinks = (Array.isArray(links) ? links : []).map((item) => {
    const serviceLink = normalizeServiceLink(item?.serviceLink);
    if (!serviceLink) return null;
    const generic = serviceLink.type === SERVICE_HOME_LINK.type;
    return { serviceLink, key: serviceLinkKey(serviceLink), label: generic ? 'Visit iLab repair service' : item.label || 'View iLab repair service' };
  }).filter(Boolean).filter((item, index, values) => values.findIndex((entry) => entry.key === item.key) === index);
  const destinations = safeLinks.length ? safeLinks : [{ serviceLink: SERVICE_HOME_LINK, key: 'home', label: 'Visit iLab repair service' }];
  const visible = destinations.length > 5 ? destinations.slice(0, 5) : destinations;
  const remaining = destinations.slice(5);
  return <aside className={styles.card} aria-label="iLab repair service">
    <div className={styles.copy}><span className={styles.accent} aria-hidden="true" /><div><h2>{title}</h2><p>{description || 'Professional repairs and diagnostics at iLab.'}</p></div></div>
    <nav className={styles.links} aria-label="Related iLab repair services">
      {visible.map((item) => <a key={item.key} href={servicePathForLocale(item.serviceLink, locale)}>{item.label}<span aria-hidden="true"> →</span></a>)}
      {remaining.length ? <details className={styles.more}><summary>More repair options ({remaining.length})</summary><div>{remaining.map((item) => <a key={item.key} href={servicePathForLocale(item.serviceLink, locale)}>{item.label}<span aria-hidden="true"> →</span></a>)}</div></details> : null}
    </nav>
  </aside>;
}
