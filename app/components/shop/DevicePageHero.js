import ShopTrustHighlights from './ShopTrustHighlights';
import styles from './DevicePageHero.module.css';

export default function DevicePageHero({ brand, series, model, productCount }) {
  return <header id="shop-device-intro" className={styles.hero} data-shop-ruler-section>
    <div className={styles.copy}>
      <p className={styles.eyebrow}>Compatible repair parts</p>
      <h1>{model.name}</h1>
      <p className={styles.description}>{brand.name} <span aria-hidden="true">·</span> {series.name}</p>
      <p className={styles.count}>{productCount} {productCount === 1 ? 'part' : 'parts'} for this device</p>
      <a className={styles.viewParts} href="#parts">View parts <span aria-hidden="true">↓</span></a>
    </div>
    <ShopTrustHighlights compact editorial />
  </header>;
}
