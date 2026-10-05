'use client';

import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { auth } from '../../../lib/firebaseClient';
import { clearServerSession } from '../../../lib/auth/clientSession';
import styles from './account.module.css';

export default function AccountActions() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    await Promise.allSettled([clearServerSession(), signOut(auth)]);
    window.dispatchEvent(new Event('shop:auth-changed'));
    router.replace('/');
    router.refresh();
  }

  return <button className={styles.logout} type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? 'Logging out…' : 'Logout'}</button>;
}
