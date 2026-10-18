import Image from 'next/image';
import Link from 'next/link';
import { resolveHomepageBrands } from '../../../lib/homepagePresentation.mjs';
import styles from './HomepageDiscovery.module.css';

function Arrow() { return <span className={styles.cardArrow} aria-hidden="true">→</span>; }

const DEVICE_IMAGES = Object.freeze({
  iphone: '/shop/images/device_selector/iphone.png',
  ipad: '/shop/images/device_selector/ipad.png',
  macbook: '/shop/images/device_selector/macbook.png',
  'apple-watch': '/shop/images/device_selector/iwatch.png',
});

const BRAND_IMAGES = Object.freeze({
  samsung: '/shop/images/device_selector/samsung.png',
  xiaomi: '/shop/images/device_selector/xiaomi.png',
  huawei: '/shop/images/device_selector/huawei.png',
});

const assetKey = (name) => name.toLocaleLowerCase().replace(/\s+/g, '-');

export default function HomepageDiscovery({ brands }) {
  const { apple, secondary } = resolveHomepageBrands(brands);
  return <section className={styles.deviceBrowse} aria-labelledby="device-browse-title">
    <div className={styles.sectionHeading}>
      <div><p>Device directory</p><h2 id="device-browse-title">Browse by device</h2></div>
    </div>
    <nav className={styles.appleGrid} aria-label="Apple device categories">
      {apple.map((brand) => {
        const key = assetKey(brand.name);
        const image = DEVICE_IMAGES[key];
        return <Link className={`${styles.devicePanel} ${styles[`${key}Panel`] ?? ''}`} key={brand.id} href={`/${brand.slug}`}>
          <span className={styles.deviceImage}>{image ? <Image src={image} alt="" fill sizes="(max-width: 600px) 92vw, (max-width: 1024px) 46vw, 25vw" /> : null}</span>
          <span className={styles.panelLabel}><strong>{brand.name}</strong><Arrow /></span>
        </Link>;
      })}
    </nav>
    <nav className={styles.secondaryBrands} aria-label="Smartphone brands">
      {secondary.map((brand) => {
        const key = assetKey(brand.name);
        const image = BRAND_IMAGES[key];
        return <Link className={styles.brandPanel} key={brand.id} href={`/${brand.slug}`} aria-label={`Browse ${brand.name} parts`}>
          <span className={styles.brandImage}>{image ? <Image src={image} alt="" fill sizes="(max-width: 600px) 92vw, (max-width: 1024px) 46vw, 33vw" /> : null}</span>
          <span className={styles.brandShade} aria-hidden="true" />
          <span className={styles.brandLabel}><strong>{brand.name}</strong><Arrow /></span>
        </Link>;
      })}
    </nav>
  </section>;
}
