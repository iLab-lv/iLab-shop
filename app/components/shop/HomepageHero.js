import Image from 'next/image';
import Link from 'next/link';
import ShopTrustHighlights from './ShopTrustHighlights';
import styles from './HomepageHero.module.css';

export default function HomepageHero() {
  return <section className={styles.hero} aria-labelledby="homepage-hero-title">
    <div className={styles.main}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>Professional repair parts</p>
        <h1 id="homepage-hero-title">
          <span>Phone &amp; Laptop</span>
          <span>Repair Parts</span>
        </h1>
        <p className={styles.description}>Quality replacement displays, batteries, cameras and components for iPhone, iPad, MacBook, Samsung and more.</p>
        <Link className={styles.cta} href="#products">Browse parts <span aria-hidden="true">→</span></Link>
      </div>

      <div className={styles.media} aria-hidden="true">
        <Image
          className={styles.image}
          src="/shop/images/shop-hero.png"
          alt=""
          width={1254}
          height={1254}
          sizes="(max-width: 760px) 92vw, (max-width: 1100px) 58vw, 720px"
          preload
        />
      </div>
    </div>

    <ShopTrustHighlights />
  </section>;
}
