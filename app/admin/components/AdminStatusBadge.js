import styles from './AdminEditing.module.css';

const TONES = {
  active: 'success', approved: 'success',
  paid: 'success', completed: 'success',
  inactive: 'warning', pending: 'warning',
  processing: 'warning', contacted: 'warning',
  resolved: 'success',
  new: 'accent', ready: 'accent',
  disabled: 'neutral', rejected: 'danger', cancelled: 'danger',
  unpaid: 'neutral',
  out: 'danger', out_of_stock: 'danger',
};

export default function AdminStatusBadge({ status, children }) {
  const normalized = String(status ?? 'unknown').toLocaleLowerCase();
  const tone = TONES[normalized] ?? 'neutral';
  return <span className={`${styles.badge} ${styles[`badge${tone[0].toUpperCase()}${tone.slice(1)}`]}`}>{children ?? status ?? 'Unknown'}</span>;
}
