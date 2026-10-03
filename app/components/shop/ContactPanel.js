'use client';

import ShopFullscreenPanel from './ShopFullscreenPanel';
import { SHOP_CONTACT } from './contactData';
import styles from './ContactPanel.module.css';

function LocationCard({ location }) {
  return <article className={styles.location}>
    <h3>{location.name}</h3>
    <address>{location.address}</address>
    <div className={styles.details}>
      <div><span>Hours</span>{location.hours.map((line) => <p key={line}>{line}</p>)}</div>
      <div><span>Phone</span><a href={location.tel}>{location.phone}</a></div>
      <div><span>Email</span><a href={`mailto:${location.email}`}>{location.email}</a></div>
    </div>
    <div className={styles.actions}>
      <a href={location.tel} aria-label={`Call ${location.name}`}>Call</a>
      <a href={location.whatsapp} target="_blank" rel="noreferrer" aria-label={`Message ${location.name} on WhatsApp`}>WhatsApp</a>
      <a href={`mailto:${location.email}`} aria-label={`Email ${location.name}`}>Email</a>
      <a href={location.directions} target="_blank" rel="noreferrer" aria-label={`Get directions to ${location.name}`}>Directions</a>
    </div>
  </article>;
}

export default function ContactPanel({ open, onClose, returnFocusRef }) {
  return <ShopFullscreenPanel id="shop-contact-panel" title="Contacts" open={open} onClose={onClose} returnFocusRef={returnFocusRef}>
    <main className={styles.content}>
      <section className={styles.intro} aria-labelledby="contact-heading">
        <p className={styles.eyebrow}>Professional support</p>
        <h1 id="contact-heading">Need help with a part, compatibility or an order?</h1>
        <p>Contact our team directly for quick, practical assistance.</p>
        <div className={styles.quickActions}><a href={SHOP_CONTACT.tel}>Call {SHOP_CONTACT.phone}</a><a href={`mailto:${SHOP_CONTACT.email}`}>Email {SHOP_CONTACT.email}</a></div>
      </section>
      <section className={styles.locations} aria-label="iLab locations">
        {SHOP_CONTACT.locations.map((location) => <LocationCard key={location.id} location={location} />)}
      </section>
    </main>
  </ShopFullscreenPanel>;
}
