import AdminPageHeader from './AdminPageHeader';
import styles from './AdminShell.module.css';

export default function AdminPlaceholder({ title, message }) {
  return (
    <>
      <AdminPageHeader title={title} />
      <section className={styles.placeholder}>
        <p>{message}</p>
      </section>
    </>
  );
}
