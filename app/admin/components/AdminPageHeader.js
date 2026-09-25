import styles from './AdminShell.module.css';

export default function AdminPageHeader({ title, description, actions }) {
  return (
    <header className={styles.pageHeader}>
      <div>
        <p className={styles.eyebrow}>iLab Shop</p>
        <h1>{title}</h1>
        {description ? <p className={styles.pageDescription}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}
