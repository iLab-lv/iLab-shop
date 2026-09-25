'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../../lib/firebaseClient';
import { PERMISSIONS, hasPermission, isActiveUser } from '../../lib/auth/roles.mjs';
import styles from './AuthControl.module.css';

const API_BASE = '/shop/api';

function friendlyAuthError(error) {
  const messages = {
    'auth/email-already-in-use': 'An account already exists for this email address.',
    'auth/invalid-credential': 'The email or password is incorrect.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/missing-password': 'Enter your password.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account exists for this email address.',
    'auth/weak-password': 'Use a stronger password with at least 6 characters.',
    'auth/wrong-password': 'The password is incorrect.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
  };
  return messages[error?.code] ?? error?.message ?? 'Authentication failed. Please try again.';
}

async function authenticatedFetch(user, path, options = {}) {
  const idToken = await user.getIdToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    cache: 'no-store',
    headers: { ...options.headers, Authorization: `Bearer ${idToken}` },
  });
}

async function createServerSession(user) {
  const response = await authenticatedFetch(user, '/auth/session', { method: 'POST' });
  if (!response.ok) throw new Error('Unable to establish a secure session.');
}

async function fetchProfile(user, create = false) {
  const response = await authenticatedFetch(user, '/users/me', {
    method: create ? 'POST' : 'GET',
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to load the user profile.');
  return result.profile;
}

export default function AuthControl() {
  const [authState, setAuthState] = useState('loading');
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestId = useRef(0);
  const authActionInProgress = useRef(false);

  const loadUser = useCallback(async (user, createProfile = false) => {
    const currentRequest = ++requestId.current;
    setFirebaseUser(user);
    setProfile(null);
    setAuthState('profile-loading');
    try {
      const loadedProfile = await fetchProfile(user, createProfile);
      if (!isActiveUser(loadedProfile)) {
        await fetch(`${API_BASE}/auth/session`, { method: 'DELETE' });
        await signOut(auth);
        throw Object.assign(new Error('This shop account has been disabled.'), {
          code: 'auth/user-disabled',
        });
      }
      await createServerSession(user);
      if (currentRequest === requestId.current) {
        setProfile(loadedProfile);
        setAuthState('authenticated');
      }
      return loadedProfile;
    } catch (error) {
      if (currentRequest === requestId.current) {
        setProfile(null);
        setAuthState(auth.currentUser ? 'profile-error' : 'anonymous');
      }
      throw error;
    }
  }, []);

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
        const confirmation = String(form.get('confirmPassword') ?? '');
        if (!name) throw new Error('Enter your name.');
        if (password !== confirmation) throw new Error('Passwords do not match.');
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        await credential.user.getIdToken(true);
        await loadUser(credential.user, true);
      } else {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        await loadUser(credential.user);
      }
      setModalMode(null);
    } catch (error) {
      setFormError(friendlyAuthError(error));
    } finally {
      authActionInProgress.current = false;
      setSubmitting(false);
    }
  }

  async function logout() {
    setFormError('');
    await Promise.allSettled([
      fetch(`${API_BASE}/auth/session`, { method: 'DELETE' }),
      signOut(auth),
    ]);
    requestId.current += 1;
    setFirebaseUser(null);
    setProfile(null);
    setAuthState('anonymous');
  }

  const canAccessAdmin = hasPermission(profile, PERMISSIONS.ACCESS_SHOP_ADMIN);

  return (
    <div className={styles.authControl}>
      {authState === 'loading' || authState === 'profile-loading' ? (
        <p className={styles.status}>Loading account…</p>
      ) : authState === 'authenticated' ? (
        <div className={styles.account}>
          <div><strong>{firebaseUser.email}</strong><span>Role: {profile.role}</span></div>
          <div className={styles.actions}>
            {canAccessAdmin ? <Link className={styles.primaryButton} href="/admin">Admin</Link> : null}
            <button type="button" onClick={logout}>Logout</button>
          </div>
        </div>
      ) : authState === 'profile-error' ? (
        <div className={styles.account}>
          <div><strong>{firebaseUser?.email}</strong><span>Profile unavailable</span></div>
          <div className={styles.actions}><button type="button" onClick={logout}>Logout</button></div>
        </div>
      ) : (
        <button className={styles.primaryButton} type="button" onClick={() => setModalMode('login')}>
          Login / Register
        </button>
      )}

      {modalMode ? (
        <div className={styles.backdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !submitting) setModalMode(null);
        }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className={styles.close} type="button" aria-label="Close" disabled={submitting}
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
                <label>Name<input name="name" autoComplete="name" required /></label>
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
      ) : null}
    </div>
  );
}
