import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getShopAdminSession } from '../../lib/auth/sessionAuth';
import AdminShell from './components/AdminShell';
import styles from './components/AdminShell.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'iLab Shop Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }) {
  const session = await getShopAdminSession();

  if (!session.authenticated) redirect('/');

  if (!session.authorized) {
    return (
      <main className={styles.deniedPage}>
        <section className={styles.deniedPanel}>
          <p className={styles.eyebrow}>iLab Shop</p>
          <h1>Access Denied</h1>
          <p>This account does not have access to the shop administration area.</p>
          <Link className={styles.backLink} href="/">Back to shop</Link>
        </section>
      </main>
    );
  }

  return <AdminShell user={session.user}>{children}</AdminShell>;
}
