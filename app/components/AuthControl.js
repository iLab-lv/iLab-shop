'use client';

import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../../lib/firebaseClient';
import {
  authenticatedFetch,
  clearServerSession,
  createServerSession,
  friendlyAuthError,
} from '../../lib/auth/clientSession';
import { isActiveUser } from '../../lib/auth/roles.mjs';
import styles from './AuthControl.module.css';

async function fetchProfile(user, registration = null) {
  const response = await authenticatedFetch(user, '/users/me', {
    method: registration ? 'POST' : 'GET',
    headers: registration ? { 'Content-Type': 'application/json' } : undefined,
    body: registration ? JSON.stringify(registration) : undefined,
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || 'Unable to load the user profile.');
    error.status = response.status;
    throw error;
  }
  return result.profile;
}

function PersonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

export default function AuthControl({ variant = 'default', onLoginOpen, onAccountNavigate }) {
  const router = useRouter();
  const [authState, setAuthState] = useState('loading');
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registerWholesale, setRegisterWholesale] = useState(false);
  const [registerCompanyName, setRegisterCompanyName] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef(0);
  const authActionInProgress = useRef(false);
  const closeButtonRef = useRef(null);
  const triggerRef = useRef(null);
  const modalOpen = modalMode !== null;

  const loadUser = useCallback(async (user, registration = null) => {
    const currentRequest = ++requestId.current;
    setFirebaseUser(user);
    setProfile(null);
    setAuthState('profile-loading');
    try {
      if (!registration) await createServerSession(user);
      const loadedProfile = await fetchProfile(user, registration);
      if (loadedProfile.status === 'pending') {
        await clearServerSession();
        await signOut(auth);
        throw Object.assign(new Error('Your wholesale account is awaiting approval. You can sign in after it has been approved.'), {
          code: 'account-pending',
        });
      }
      if (!isActiveUser(loadedProfile)) {
        await clearServerSession();
        await signOut(auth);
        throw Object.assign(new Error('This shop account has been disabled.'), { code: 'auth/user-disabled' });
      }
      if (registration) await createServerSession(user);
      if (currentRequest === requestId.current) {
        setProfile(loadedProfile);
        setAuthState('authenticated');
      }
      router.refresh();
      window.dispatchEvent(new Event('shop:auth-changed'));
      return loadedProfile;
    } catch (error) {
      await Promise.allSettled([
        clearServerSession(),
        signOut(auth),
      ]);
      if (currentRequest === requestId.current) {
        setProfile(null);
        setAuthState(auth.currentUser ? 'profile-error' : 'anonymous');
      }
      throw error;
    }
  }, [router]);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (authActionInProgress.current) return;
    if (!user) {
      requestId.current += 1;
      setFirebaseUser(null);
      setProfile(null);
      setAuthState('anonymous');
      return;
    }
    loadUser(user).catch(() => {});
  }), [loadUser]);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const body = document.body;
    const trigger = triggerRef.current;
    const scrollY = window.scrollY;
    const previous = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
    };
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    function closeOnEscape(event) { if (event.key === 'Escape') setModalMode(null); }
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      body.style.overflow = previous.overflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.paddingRight = previous.paddingRight;
      window.scrollTo(0, scrollY);
      trigger?.focus();
    };
  }, [modalOpen]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    authActionInProgress.current = true;
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    try {
      if (modalMode === 'register') {
        const name = String(form.get('name') ?? '').trim();
        const phone = String(form.get('phone') ?? '').trim();
        const companyName = String(form.get('companyName') ?? '').trim();
        const registrationNumber = String(form.get('registrationNumber') ?? '').trim();
        const vatNumber = String(form.get('vatNumber') ?? '').trim();
        const confirmation = String(form.get('confirmPassword') ?? '');
        if (!name) throw new Error('Enter your name.');
        if (!phone) throw new Error('Enter your phone number.');
        if (password !== confirmation) throw new Error('Passwords do not match.');
        if (registerWholesale && !companyName) throw new Error('Enter your company name.');
        if (registerWholesale && !registrationNumber) throw new Error('Enter your company registration number.');
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        let profileCreated = false;
        try {
          await updateProfile(credential.user, { displayName: name });
          await credential.user.getIdToken(true);
          const registration = {
            name,
            phone,
            wholesale: registerWholesale,
            company: companyName ? { name: companyName, registrationNumber, vatNumber } : null,
          };
          const loadedProfile = await fetchProfile(credential.user, registration);
          profileCreated = true;
          if (registerWholesale) {
            await Promise.allSettled([
              clearServerSession(),
              signOut(auth),
            ]);
            requestId.current += 1;
            setFirebaseUser(null);
            setProfile(null);
            setAuthState('anonymous');
            setNotice('Your wholesale account is awaiting approval. You can sign in after it has been approved.');
          } else {
            await createServerSession(credential.user);
            setProfile(loadedProfile);
            setFirebaseUser(credential.user);
            setAuthState('authenticated');
            router.refresh();
            window.dispatchEvent(new Event('shop:auth-changed'));
            setNotice('');
          }
        } catch (registrationError) {
          if (!profileCreated && registrationError.status === 400 && auth.currentUser?.uid === credential.user.uid) {
            await deleteUser(credential.user).catch(() => signOut(auth));
          } else {
            await Promise.allSettled([
              clearServerSession(),
              signOut(auth),
            ]);
          }
          throw registrationError;
        }
      } else {
        await clearServerSession();
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await loadUser(credential.user);
        setNotice('');
      }
      setModalMode(null);
    } catch (error) {
      setFormError(friendlyAuthError(error));
    } finally {
      authActionInProgress.current = false;
      setSubmitting(false);
    }
  }

  function openLogin() {
    window.dispatchEvent(new CustomEvent('shop:close-major-overlays'));
    onLoginOpen?.();
    setFormError('');
    setModalMode('login');
  }

  const modal = modalMode ? (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !submitting) setModalMode(null);
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button ref={closeButtonRef} className={styles.close} type="button" aria-label="Close" disabled={submitting}
          onClick={() => setModalMode(null)}>×</button>
        <div className={styles.tabs}>
          <button type="button" className={modalMode === 'login' ? styles.activeTab : undefined}
            onClick={() => { setModalMode('login'); setFormError(''); }}>Login</button>
          <button type="button" className={modalMode === 'register' ? styles.activeTab : undefined}
            onClick={() => { setModalMode('register'); setFormError(''); }}>Register</button>
        </div>
        <h2 id="auth-title">{modalMode === 'login' ? 'Login' : 'Create account'}</h2>
        <form onSubmit={submit}>
          {modalMode === 'register' ? (
            <>
              <label>Name *<input name="name" autoComplete="name" required /></label>
              <label>Phone *<input name="phone" type="tel" autoComplete="tel" required /></label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={registerWholesale}
                  onChange={(event) => setRegisterWholesale(event.target.checked)} />
                Register as wholesale partner
              </label>
              <label>Company name{registerWholesale ? ' *' : ' (optional)'}
                <input name="companyName" autoComplete="organization" value={registerCompanyName}
                  required={registerWholesale} onChange={(event) => setRegisterCompanyName(event.target.value)} />
              </label>
              {registerCompanyName.trim() ? (
                <>
                  <label>Registration number{registerWholesale ? ' *' : ' (optional)'}
                    <input name="registrationNumber" required={registerWholesale} />
                  </label>
                  <label>VAT number (optional)<input name="vatNumber" /></label>
                </>
              ) : null}
            </>
          ) : null}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password"
            autoComplete={modalMode === 'login' ? 'current-password' : 'new-password'} required /></label>
          {modalMode === 'register' ? (
            <label>Confirm password<input name="confirmPassword" type="password"
              autoComplete="new-password" required /></label>
          ) : null}
          {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : modalMode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
      </section>
    </div>
  ) : null;

  return (
    <div className={`${styles.authControl} ${variant === 'header' ? styles.headerVariant : ''} ${variant === 'menu' ? styles.menuVariant : ''}`}>
      {authState === 'loading' || authState === 'profile-loading' ? (
        <span className={styles.placeholder} aria-label="Loading account status" />
      ) : authState === 'authenticated' ? (
        <Link className={styles.primaryButton} href="/account" onClick={onAccountNavigate}><PersonIcon /><span>Account</span></Link>
      ) : authState === 'profile-error' ? (
        <button ref={triggerRef} className={styles.primaryButton} type="button" aria-haspopup="dialog" onClick={openLogin}><PersonIcon /><span>Login</span></button>
      ) : (
        <div>
          {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
          <button ref={triggerRef} className={styles.primaryButton} type="button" aria-haspopup="dialog" onClick={openLogin}>
            <PersonIcon /><span>Login</span>
          </button>
        </div>
      )}
      {modal ? createPortal(modal, document.body) : null}
    </div>
  );
}
