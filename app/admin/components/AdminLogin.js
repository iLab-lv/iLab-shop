'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '../../../lib/firebaseClient';
import {
  clearServerSession,
  createServerSession,
  friendlyAuthError,
} from '../../../lib/auth/clientSession';
import styles from './AdminLogin.module.css';

export default function AdminLogin() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    try {
      await clearServerSession();
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await createServerSession(credential.user);
      router.refresh();
    } catch (loginError) {
      await Promise.allSettled([clearServerSession(), signOut(auth)]);
      setError(friendlyAuthError(loginError));
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-busy={submitting}>
      <label htmlFor="admin-email">
        Email
        <input id="admin-email" name="email" type="email" autoComplete="email" disabled={submitting} required />
      </label>
      <label htmlFor="admin-password">
        Password
        <input id="admin-password" name="password" type="password" autoComplete="current-password" disabled={submitting} required />
      </label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Login'}</button>
    </form>
  );
}
