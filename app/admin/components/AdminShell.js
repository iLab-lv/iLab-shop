'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '../../../lib/firebaseClient';
import AdminNav from './AdminNav';
import styles from './AdminShell.module.css';

const AdminUserContext = createContext(null);
const SESSION_ENDPOINT = '/shop/api/auth/session';

export function useAdminUser() {
  return useContext(AdminUserContext);
}

export default function AdminShell({ children, user }) {
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef(null);
  const menuButtonRef = useRef(null);
  const restoreFocusRef = useRef(false);
  const router = useRouter();

  function closeSidebar({ restoreFocus = true } = {}) {
    restoreFocusRef.current = restoreFocus;
    setOpen(false);
  }

  function openSidebar() {
    restoreFocusRef.current = false;
    setOpen(true);
  }

  useEffect(() => {
    if (open) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => firstLinkRef.current?.focus());

      const handleKeyDown = (event) => {
        if (event.key === 'Escape') closeSidebar();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = previousOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }

    if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, [open]);

  async function handleLogout() {
    closeSidebar({ restoreFocus: false });
    await Promise.allSettled([
      fetch(SESSION_ENDPOINT, { method: 'DELETE' }),
      signOut(auth),
    ]);
    router.replace('/');
    router.refresh();
  }

  return (
    <AdminUserContext.Provider value={user}>
      <div className={styles.layout}>
        <aside
          id="admin-sidebar"
          className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}
          aria-label="Shop administration"
        >
          <div className={styles.brand}>iLab Shop Admin</div>
          <AdminNav firstLinkRef={firstLinkRef} onNavigate={() => closeSidebar()} />
          <div className={styles.sidebarFooter}>
            <button className={styles.logoutButton} type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>

        <div className={styles.mainColumn}>
          <header className={styles.mobileTopbar}>
            <button
              ref={menuButtonRef}
              className={styles.menuButton}
              type="button"
              aria-label={open ? 'Close admin menu' : 'Open admin menu'}
              aria-controls="admin-sidebar"
              aria-expanded={open}
              onClick={open ? () => closeSidebar() : openSidebar}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            <span className={styles.mobileTitle}>Shop Admin</span>
          </header>

          <main className={styles.content}>
            <div className={styles.contentInner}>{children}</div>
          </main>
        </div>

        <button
          className={`${styles.overlay} ${open ? styles.overlayVisible : ''}`}
          type="button"
          aria-label="Close admin menu"
          tabIndex={open ? 0 : -1}
          onClick={() => closeSidebar()}
        />
      </div>
    </AdminUserContext.Provider>
  );
}
