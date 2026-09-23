'use client';

import AdminPageHeader from './components/AdminPageHeader';
import { useAdminUser } from './components/AdminShell';
import styles from './admin.module.css';

export default function AdminPage() {
  const user = useAdminUser();
  return (
    <>
      <AdminPageHeader title="Shop Admin" />
      <section className={styles.dashboardCard} aria-label="Administrator account">
        <dl className={styles.accountDetails}>
          <div><dt>Logged in as:</dt><dd>{user.email}</dd></div>
          <div><dt>Role:</dt><dd>{user.role}</dd></div>
        </dl>
      </section>
    </>
  );
}
