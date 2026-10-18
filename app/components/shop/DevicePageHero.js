import ShopTrustHighlights from './ShopTrustHighlights';
import styles from './DevicePageHero.module.css';

export default function DevicePageHero({ brand, series, model }) {
  return <header className={styles.hero}>
    <div className={styles.copy}>
      <p className={styles.eyebrow}>Compatible repair parts</p>
      <h1>{model.name}</h1>
      <p className={styles.description}>{brand.name} <span aria-hidden="true">·</span> {series.name}</p>
    </div>
    <ShopTrustHighlights compact />
  </header>;
}
