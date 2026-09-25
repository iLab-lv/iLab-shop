import styles from './AdminEditing.module.css';

export default function AdminFeedback({ tone = 'info', children }) {
  const role = tone === 'error' ? 'alert' : 'status';
  return <div className={`${styles.feedback} ${styles[`feedback${tone[0].toUpperCase()}${tone.slice(1)}`]}`} role={role}>{children}</div>;
}
