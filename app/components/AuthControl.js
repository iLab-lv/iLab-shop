'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../../lib/firebaseClient';
import {
  authenticatedFetch,
  beginAuthAction,
  clearServerSession,
  createServerSession,
  endAuthAction,
  friendlyAuthError,
  isAuthActionPending,
} from '../../lib/auth/clientSession';
import { isActiveUser } from '../../lib/auth/roles.mjs';
import styles from './AuthControl.module.css';
import { useCart } from './shop/CartContext';
import { useServiceLocale } from './shop/ServiceLocaleProvider';
import { getPasswordRecoveryCopy, requestPasswordRecovery } from '../../lib/passwordRecovery.mjs';
import ShopDrawer from './shop/ShopDrawer';


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

export default function AuthControl({ variant = 'default', onLoginOpen, onAccountNavigate, checkoutIntent = false, returnFocusRef }) {
  const router = useRouter();
  const { associateAccount, openCart } = useCart();
  const locale = useServiceLocale();
  const [checkoutRequested, setCheckoutRequested] = useState(checkoutIntent);
  const [authState, setAuthState] = useState('loading');
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [modalMode, setModalMode] = useState(checkoutIntent ? 'login' : null);
  const [formError, setFormError] = useState('');
  const [email, setEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoverySubmitting, setRecoverySubmitting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registerWholesale, setRegisterWholesale] = useState(false);
  const [registerCompanyName, setRegisterCompanyName] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef(0);
  const authActionInProgress = useRef(false);
  const triggerRef = useRef(null);
  const modalOpen = modalMode !== null;
  const recoveryCopy = getPasswordRecoveryCopy(locale);

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
      const cartReady = await associateAccount(user.uid);
      if (currentRequest === requestId.current) {
        setProfile(loadedProfile);
        setAuthState('authenticated');
      }
      router.refresh();
      window.dispatchEvent(new Event('shop:auth-changed'));
      window.dispatchEvent(new CustomEvent('shop:auth-ready', { detail: { uid: user.uid, profile: loadedProfile } }));
      return { profile: loadedProfile, cartReady };
    } catch (error) {
      if (currentRequest !== requestId.current || (auth.currentUser && auth.currentUser.uid !== user.uid)) return { profile: null, cartReady: false };
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
  }, [router, associateAccount]);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    if (authActionInProgress.current || isAuthActionPending()) return;
    if (!user) {
      requestId.current += 1;
      setFirebaseUser(null);
      setProfile(null);
      setAuthState('anonymous');
      return;
    }
    loadUser(user).then((result) => {
      if (checkoutIntent && result.cartReady) { router.replace('/checkout'); router.refresh(); }
    }).catch(() => {});
  }), [loadUser, checkoutIntent, router]);

  useEffect(() => {
    function acceptReadySession(event) {
      const { uid, profile: readyProfile } = event.detail ?? {};
      if (auth.currentUser?.uid !== uid || !isActiveUser(readyProfile)) return;
      setFirebaseUser(auth.currentUser);
      setProfile(readyProfile);
      setAuthState('authenticated');
    }
    window.addEventListener('shop:auth-ready', acceptReadySession);
    return () => window.removeEventListener('shop:auth-ready', acceptReadySession);
  }, []);

  useEffect(() => {
    if (variant !== 'header') return;
    function requestCheckoutAuthentication() {
      window.dispatchEvent(new CustomEvent('shop:close-major-overlays'));
      onLoginOpen?.();
      setCheckoutRequested(true);
      setFormError('');
      setModalMode('login');
    }
    window.addEventListener('shop:checkout-auth', requestCheckoutAuthentication);
    return () => window.removeEventListener('shop:checkout-auth', requestCheckoutAuthentication);
  }, [variant, onLoginOpen]);

  useEffect(() => {
    const closeForAnotherOverlay = () => {
      if (!authActionInProgress.current && !recoverySubmitting) setModalMode(null);
    };
    window.addEventListener('shop:close-major-overlays', closeForAnotherOverlay);
    return () => window.removeEventListener('shop:close-major-overlays', closeForAnotherOverlay);
  }, [recoverySubmitting]);

  async function submit(event) {
    event.preventDefault();
    if (authActionInProgress.current) return;
    setSubmitting(true);
    setFormError('');
    authActionInProgress.current = true;
    beginAuthAction();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const wholesaleRegistration = registerWholesale && !checkoutRequested;
    let cartReady = false;

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
        if (wholesaleRegistration && !companyName) throw new Error('Enter your company name.');
        if (wholesaleRegistration && !registrationNumber) throw new Error('Enter your company registration number.');
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        let profileCreated = false;
        try {
          await updateProfile(credential.user, { displayName: name });
          await credential.user.getIdToken(true);
          const registration = {
            name,
            phone,
            wholesale: wholesaleRegistration,
            company: companyName ? { name: companyName, registrationNumber, vatNumber } : null,
          };
          const loadedProfile = await fetchProfile(credential.user, registration);
          profileCreated = true;
          if (wholesaleRegistration) {
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
            cartReady = await associateAccount(credential.user.uid);
            setProfile(loadedProfile);
            setFirebaseUser(credential.user);
            setAuthState('authenticated');
            router.refresh();
            window.dispatchEvent(new Event('shop:auth-changed'));
            window.dispatchEvent(new CustomEvent('shop:auth-ready', { detail: { uid: credential.user.uid, profile: loadedProfile } }));
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
        const loaded = await loadUser(credential.user);
        cartReady = loaded.cartReady;
        setNotice('');
      }
      setModalMode(null);
      if (checkoutRequested && cartReady) { router.push('/checkout'); router.refresh(); }
      else if (checkoutRequested) openCart();
    } catch (error) {
      setFormError(friendlyAuthError(error));
    } finally {
      authActionInProgress.current = false;
      endAuthAction();
      setSubmitting(false);
    }
  }

  async function submitPasswordRecovery(event) {
    event.preventDefault();
    if (recoverySubmitting) return;
    setRecoverySubmitting(true);
    setRecoveryError('');
    setRecoveryMessage('');
    const result = await requestPasswordRecovery({
      auth,
      email,
      locale,
      sendResetEmail: sendPasswordResetEmail,
    });
    if (result.ok) setRecoveryMessage(result.message);
    else setRecoveryError(result.error);
    setRecoverySubmitting(false);
  }

  function openLogin() {
    window.dispatchEvent(new CustomEvent('shop:close-major-overlays'));
    onLoginOpen?.();
    setFormError('');
    setCheckoutRequested(checkoutIntent);
    setModalMode('login');
  }

  const modal = (
    <ShopDrawer title="Account" eyebrow="Customer account" closeLabel="Close account panel"
      open={modalOpen} onClose={() => setModalMode(null)} closeDisabled={submitting || recoverySubmitting}
      returnFocusRef={returnFocusRef ?? triggerRef}>
      <div className={styles.formContent}>
        {checkoutRequested ? <p className={styles.intent}>Sign in or create a customer account to continue. Your cart will be saved and you will return to checkout.</p> : <p className={styles.intro}>Sign in to see your orders and invoices.</p>}
        {modalMode === 'recovery' ? (
          <>
            <h3 className={styles.modeTitle}>{recoveryCopy.title}</h3>
            <p className={styles.recoveryDescription}>{recoveryCopy.description}</p>
            {recoveryMessage ? <p className={styles.recoverySuccess} role="status">{recoveryMessage}</p> : (
              <form noValidate onSubmit={submitPasswordRecovery}>
                <label htmlFor="recovery-email">{recoveryCopy.email}<input id="recovery-email" name="recoveryEmail" type="email" autoComplete="email" value={email}
                  aria-invalid={Boolean(recoveryError)} aria-describedby={recoveryError ? 'recovery-email-error' : undefined}
                  onChange={(event) => { setEmail(event.target.value); setRecoveryError(''); }} required /></label>
                {recoveryError ? <p id="recovery-email-error" className={styles.formError} role="alert">{recoveryError}</p> : null}
                <button className={styles.submit} type="submit" disabled={recoverySubmitting}>
                  {recoverySubmitting ? recoveryCopy.sending : recoveryCopy.send}
                </button>
              </form>
            )}
            <button className={styles.recoveryBack} type="button" disabled={recoverySubmitting}
              onClick={() => { setModalMode('login'); setRecoveryError(''); setRecoveryMessage(''); }}>{recoveryCopy.back}</button>
          </>
        ) : <>
        <div className={styles.tabs}>
          <button type="button" disabled={submitting} aria-pressed={modalMode === 'login'} className={modalMode === 'login' ? styles.activeTab : undefined}
            onClick={() => { setModalMode('login'); setFormError(''); }}>Login</button>
          <button type="button" disabled={submitting} aria-pressed={modalMode === 'register'} className={modalMode === 'register' ? styles.activeTab : undefined}
            onClick={() => { setModalMode('register'); setFormError(''); }}>Register</button>
        </div>
        <h3 className={styles.modeTitle}>{modalMode === 'login' ? 'Login' : 'Create account'}</h3>
        <form onSubmit={submit}>
          {modalMode === 'register' ? (
            <>
              <label>Name *<input name="name" autoComplete="name" required /></label>
              <label>Phone *<input name="phone" type="tel" autoComplete="tel" required /></label>
              {!checkoutRequested ? <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={registerWholesale}
                  onChange={(event) => setRegisterWholesale(event.target.checked)} />
                Register as wholesale partner
              </label> : null}
              {!checkoutRequested ? <><label>Company name{registerWholesale ? ' *' : ' (optional)'}
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
              ) : null}</> : null}
            </>
          ) : null}
          <label>Email<input name="email" type="email" autoComplete="email" value={email}
            onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input name="password" type="password"
            autoComplete={modalMode === 'login' ? 'current-password' : 'new-password'} required /></label>
          {modalMode === 'login' ? <button className={styles.forgotPassword} type="button" disabled={submitting}
            onClick={() => { setRecoveryError(''); setRecoveryMessage(''); setModalMode('recovery'); }}>{recoveryCopy.forgot}</button> : null}
          {modalMode === 'register' ? (
            <label>Confirm password<input name="confirmPassword" type="password"
              autoComplete="new-password" required /></label>
          ) : null}
          {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : modalMode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
        </>}
      </div>
    </ShopDrawer>
  );

  return (
    <div className={`${styles.authControl} ${variant === 'header' ? styles.headerVariant : ''} ${variant === 'menu' ? styles.menuVariant : ''}`}>
      {authState === 'loading' || authState === 'profile-loading' ? (
        <span className={styles.placeholder} aria-label="Loading account status" />
      ) : authState === 'authenticated' ? (
        <Link className={styles.primaryButton} href="/account" onClick={onAccountNavigate}><PersonIcon /><span>My account</span></Link>
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
      {modal}
    </div>
  );
}
