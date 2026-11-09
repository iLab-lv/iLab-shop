'use client';

import Link from 'next/link';
import { useShopSettings } from './ShopSettingsContext';
import SiteSwitcher from './SiteSwitcher';
import styles from './ShopFooter.module.css';

export default function ShopFooter({ brands = [], onOpenContact, onOpenInquiry }) {
  const settings = useShopSettings();
  const locations = settings.pickupLocations.slice(0, 2);
  const topBrands = brands.slice(0, 6);
  const phone = settings.contact.phone;
  const email = settings.contact.email;

  return <footer className={styles.footer}>
    <div className={styles.inner}>
      <div className={styles.columns}>
        <section className={styles.identity} aria-label="iLab Shop">
          <Link className={styles.wordmark} href="/" aria-label="iLab Shop home">iLab<span> / SHOP</span></Link>
          <p>SIA “iLab” · Reg. no. 40203288307</p>
          <p>Parts and components for repair professionals.</p>
          {settings.tax.pricesIncludeVat ? <p>Prices include {settings.tax.vatRatePercent}% VAT.</p> : null}
          <SiteSwitcher className={styles.serviceLink} label="Repair service ↗" href="https://ilab.lv/" serviceLocaleAware />
        </section>

        <section className={styles.column}>
          <h2>Pickup & support</h2>
          {locations.map((location) => <address key={location.id}>
            <strong>{location.name}</strong><span>{location.address}</span>
            {location.hours.map((line) => <span key={line}>{line}</span>)}
          </address>)}
          <a href={`tel:${phone.replace(/[^+\d]/g, '')}`}>{phone}</a>
          <a href={`mailto:${email}`}>{email}</a>
        </section>

        <section className={styles.column}>
          <h2>Shop</h2>
          {topBrands.map((brand) => <Link key={brand.id || brand.slug} href={`/${brand.slug}`}>{brand.name}</Link>)}
          <button type="button" onClick={() => onOpenInquiry({ source: 'brand' })}>Send a part inquiry</button>
        </section>

        <section className={styles.column}>
          <h2>Help</h2>
          <button type="button" onClick={onOpenContact}>Contact us</button>
          <Link href="/account">My account</Link>
          <a href="https://ilab.lv/noteikumi">Terms & privacy</a>
        </section>
      </div>
      <div className={styles.bottom}><span>© {new Date().getFullYear()} iLab Shop</span><span>Latvia · EUR</span></div>
    </div>
  </footer>;
}
