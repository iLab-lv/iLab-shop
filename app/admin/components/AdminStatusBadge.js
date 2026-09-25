import styles from './AdminEditing.module.css';

const TONES = {
  active: 'success', approved: 'success',
  inactive: 'warning', pending: 'warning',
  disabled: 'danger', rejected: 'danger',
};

export default function AdminStatusBadge({ status, children }) {
  const normalized = String(status ?? 'unknown').toLocaleLowerCase();
  const tone = TONES[normalized] ?? 'neutral';
  return <span className={`${styles.badge} ${styles[`badge${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>{children ?? status ?? 'Unknown'}</span>;
}
