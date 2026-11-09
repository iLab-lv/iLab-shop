import styles from './ShopTrustHighlights.module.css';

function DeliveryIcon() {
  return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
    <rect x="7" y="6" width="18" height="21" rx="3" />
    <path d="M7 12h18M11 9h10M12 17h8M12 21h5" />
  </svg>;
}

function PartnersIcon() {
  return <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
    <circle cx="11.5" cy="11" r="4" />
    <circle cx="21.5" cy="11" r="4" />
    <path d="M4.5 26v-3.2a7 7 0 0 1 7-7h1a7 7 0 0 1 7 7V26M18 17.2a7 7 0 0 1 9.5 6.6V26" />
  </svg>;
}

export default function ShopTrustHighlights({ compact = false, editorial = false, productStrip = false }) {
  return <ul className={`${styles.highlights} ${compact ? styles.compact : ''} ${editorial ? styles.editorial : ''} ${productStrip ? styles.productStrip : ''}`} aria-label="Shop service highlights">
    <li className={styles.highlight}>
      <span className={productStrip ? styles.metric : styles.hours} aria-hidden="true">3h</span>
      <span className={styles.highlightCopy}><strong>Riga delivery</strong><small>{productStrip ? 'Fast & reliable courier inside the city' : 'Fast & reliable'}</small></span>
    </li>
    <li className={styles.highlight}>
      {productStrip ? <span className={styles.metric} aria-hidden="true">LV</span> : <span className={styles.icon}><DeliveryIcon /></span>}
      <span className={styles.highlightCopy}><strong>Omniva delivery</strong><small>{productStrip ? 'Parcel machines across Latvia' : 'Across Latvia'}</small></span>
    </li>
    <li className={styles.highlight}>
      {productStrip ? <span className={styles.metric} aria-hidden="true">B2B</span> : <span className={styles.icon}><PartnersIcon /></span>}
      <span className={styles.highlightCopy}><strong>Wholesale for partners</strong><small>{productStrip ? 'Special pricing for approved repair shops' : 'Special pricing'}</small></span>
    </li>
  </ul>;
}
