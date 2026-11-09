'use client';

import ShopFullscreenPanel from './ShopFullscreenPanel';
import { useShopSettings } from './ShopSettingsContext';
import { useState } from 'react';
import styles from './ContactPanel.module.css';

function LocationCard({ location }) {
  return <article className={styles.location}>
    <h3>{location.name}</h3>
    <address>{location.address}</address>
    <div className={styles.details}>
      <div><span>Hours</span><div>{location.hours.map((line) => <p key={line}>{line}</p>)}</div></div>
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
  const settings = useShopSettings();
  const [activeLocationId, setActiveLocationId] = useState(settings.pickupLocations[0]?.id ?? null);
  const activeLocation = settings.pickupLocations.find((location) => location.id === activeLocationId) ?? settings.pickupLocations[0];
  return <ShopFullscreenPanel id="shop-contact-panel" title="Contacts" variant="drawer" open={open} onClose={onClose} returnFocusRef={returnFocusRef}>
    <main className={styles.content}>
      <section className={styles.intro} aria-labelledby="contact-heading">
        <p className={styles.eyebrow}>Professional support</p>
        <h3 id="contact-heading">Need help with a part, compatibility or an order?</h3>
        <p>Contact our team directly for quick, practical assistance.</p>
        <div className={styles.quickActions}><a href={`tel:${settings.contact.phone.replace(/[^+\d]/g, '')}`}>Call {settings.contact.phone}</a><a href={`mailto:${settings.contact.email}`}>Email {settings.contact.email}</a></div>
      </section>
      <section className={styles.locations} aria-label="iLab locations">
        {settings.pickupLocations.length > 1 ? <div className={styles.tabs} role="tablist" aria-label="Choose a location">{settings.pickupLocations.map((location) => <button key={location.id} role="tab" type="button" aria-selected={location.id === activeLocation?.id} onClick={() => setActiveLocationId(location.id)}>{location.name}</button>)}</div> : null}
        {activeLocation ? <LocationCard location={{ ...activeLocation, tel: `tel:${activeLocation.phone.replace(/[^+\d]/g, '')}` }} /> : <p>No active locations are currently available.</p>}
      </section>
    </main>
  </ShopFullscreenPanel>;
}
