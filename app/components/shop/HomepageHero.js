import Image from 'next/image';
import Link from 'next/link';
import ShopTrustHighlights from './ShopTrustHighlights';
import styles from './HomepageHero.module.css';

export default function HomepageHero() {
  return <section id="shop-home-intro" className={styles.hero} aria-labelledby="homepage-hero-title" data-shop-ruler-section>
    <div className={styles.main}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}><span>iLab Shop</span><span aria-hidden="true">/</span><span>Professional repair parts</span></p>
        <h1 id="homepage-hero-title">
          <span>Phone &amp; laptop</span>
          <span>repair parts.</span>
        </h1>
        <p className={styles.description}>Quality replacement displays, batteries, cameras and components for iPhone, iPad, MacBook, Samsung and more.</p>
        <div className={styles.actions}>
          <Link className={styles.cta} href="#part-finder">Browse parts <span aria-hidden="true">→</span></Link>
          <Link className={styles.secondaryCta} href="#devices">Browse by device</Link>
        </div>
        <a className={styles.scrollCue} href="#devices"><span aria-hidden="true">↓</span>Explore the catalog</a>
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

    <ShopTrustHighlights editorial />
  </section>;
}
