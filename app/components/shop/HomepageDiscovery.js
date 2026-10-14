import Image from 'next/image';
import Link from 'next/link';
import { BRAND_LOGOS, resolveHomepageBrands } from '../../../lib/homepagePresentation.mjs';
import styles from '../../page.module.css';

function Arrow() { return <span className={styles.cardArrow} aria-hidden="true">→</span>; }
export default function HomepageDiscovery({ brands }) {
  const { apple, secondary } = resolveHomepageBrands(brands);
  return <section className={styles.deviceBrowse} aria-labelledby="device-browse-title">
    <div className={styles.sectionHeading}><p>Device directory</p><h2 id="device-browse-title">Browse by device</h2></div>
    <div className={styles.deviceGrid}>
      <article className={styles.appleCard}>
        <div className={styles.appleContent}><div className={styles.appleTitle}><Image src="/shop/images/logos/apple-logo.svg" alt="Apple" width={72} height={78} unoptimized /></div><p>Parts for iPhone, iPad, MacBook and Apple Watch.</p>
          <nav className={styles.appleLinks} aria-label="Apple device categories">{apple.map((brand) => <Link key={brand.id} href={`/${brand.slug}`}><span>{brand.name}</span><Arrow /></Link>)}</nav>
        </div>
        <div className={styles.appleArtwork}><Image src="/shop/images/Apple-Devices.png" alt="Apple device lineup with MacBook, iPad, iPhone and Apple Watch" width={1448} height={1086} sizes="(max-width: 768px) 92vw, (max-width: 1100px) 70vw, 48vw" preload /></div>
      </article>
      <div className={styles.secondaryBrands}>{secondary.map((brand) => <Link className={styles.secondaryBrandCard} key={brand.id} href={`/${brand.slug}`} aria-label={`Browse ${brand.name} parts`}><span className={styles.brandLogo}>{BRAND_LOGOS[brand.name.toLowerCase()] ? <Image src={BRAND_LOGOS[brand.name.toLowerCase()]} alt={brand.name} width={180} height={56} unoptimized /> : <strong>{brand.name}</strong>}</span><Arrow /></Link>)}</div>
    </div>
  </section>;
}
