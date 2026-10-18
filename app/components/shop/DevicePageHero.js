import Image from 'next/image';
import { getDeviceFilterArtwork } from './deviceFilterArtwork';
import ShopTrustHighlights from './ShopTrustHighlights';
import styles from './DevicePageHero.module.css';

export default function DevicePageHero({ brand, series, model }) {
  const artwork = getDeviceFilterArtwork(brand.slug);
  const visualClass = artwork ? styles[`${artwork.kind}Visual`] : '';

  return <header className={styles.hero}>
    <div className={styles.copy}>
      <p className={styles.eyebrow}>Compatible repair parts</p>
      <h1>{model.name}</h1>
      <p className={styles.description}>{brand.name} <span aria-hidden="true">·</span> {series.name}</p>
    </div>
    <div className={`${styles.media} ${visualClass}`} aria-hidden="true">
      {artwork ? <Image src={artwork.image} alt="" fill sizes="(max-width: 600px) 92vw, (max-width: 900px) 48vw, 620px" /> : null}
    </div>
    <ShopTrustHighlights compact />
  </header>;
}
