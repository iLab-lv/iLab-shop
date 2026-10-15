import styles from './ShopBenefits.module.css';

function BenefitIcon({ kind }) {
  const common = { viewBox: '0 0 32 32', fill: 'none', stroke: 'currentColor', strokeWidth: 1.65, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  if (kind === 'delivery') return <svg {...common}><circle cx="16" cy="16" r="12" opacity=".32" /><path d="M18.2 5.5 10 17h6l-2.2 9.5L22 14h-6l2.2-8.5Z" fill="currentColor" stroke="none" /></svg>;
  if (kind === 'pickup') return <svg {...common}><path d="M25 13c0 7-9 15-9 15S7 20 7 13a9 9 0 1 1 18 0Z" /><path d="M12 13h8m-7-3h6m-8 7h10" opacity=".72" /><circle cx="16" cy="13" r="1.3" fill="currentColor" stroke="none" /></svg>;
  return <svg {...common}><path d="m5 11 11-6 11 6v14H5z" /><path d="M10 25v-8h12v8M5 11h22M11 11V8m10 3V8" /><path d="M8 14h3m10 0h3" opacity=".7" /></svg>;
}

const benefits = [
  { kind: 'delivery', label: '3h delivery in Riga', detail: 'Fast local delivery', primary: true },
  { kind: 'pickup', label: 'Pickup today', detail: 'From our Riga locations' },
  { kind: 'wholesale', label: 'Wholesale for partners', detail: 'Partner pricing available' },
];

export default function ShopBenefits() {
  return <div className={styles.strip}>
    <ul className={styles.list} aria-label="Shop benefits">
      {benefits.map(({ kind, label, detail, primary }) => <li className={primary ? styles.primaryItem : styles.item} key={kind}>
        <span className={primary ? `${styles.icon} ${styles.primaryIcon}` : styles.icon}><BenefitIcon kind={kind} /></span>
        <span className={styles.copy}><strong>{label}</strong><small>{detail}</small></span>
      </li>)}
    </ul>
  </div>;
}
