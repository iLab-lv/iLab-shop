'use client';

import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { auth } from '../../../lib/firebaseClient';
import { authenticatedFetch } from '../../../lib/auth/clientSession';
import styles from './account.module.css';

export default function AccountProfileForm({ profile, requireCompany = false }) {
  const [authUser, setAuthUser] = useState(null);
  const [draft, setDraft] = useState(() => ({
    name: profile.name ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    company: {
      name: profile.company?.name ?? '',
      registrationNumber: profile.company?.registrationNumber ?? '',
      vatNumber: profile.company?.vatNumber ?? '',
    },
    billingAddress: profile.billingAddress ?? '',
  }));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setAuthUser), []);

  function change(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFeedback(null);
  }

  function changeCompany(field, value) {
    setDraft((current) => ({ ...current, company: { ...current.company, [field]: value } }));
    setFeedback(null);
  }

  async function save(event) {
    event.preventDefault();
    if (saving || !authUser) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await authenticatedFetch(authUser, '/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          phone: draft.phone,
          company: draft.company,
          billingAddress: draft.billingAddress,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save profile details.');
      setFeedback({ tone: 'success', text: 'Profile details saved.' });
    } catch (error) {
      setFeedback({ tone: 'error', text: error.message || 'Unable to save profile details.' });
    } finally {
      setSaving(false);
    }
  }

  return <form className={styles.profileForm} onSubmit={save}>
    <section className={styles.profileSection} aria-labelledby="personal-details-heading">
      <h3 id="personal-details-heading">Personal details</h3>
      <div className={styles.profileFields}>
        <label>Name<input required maxLength={160} autoComplete="name" value={draft.name} onChange={(event) => change('name', event.target.value)} /></label>
        <label>Phone<input required maxLength={40} type="tel" autoComplete="tel" value={draft.phone} onChange={(event) => change('phone', event.target.value)} /></label>
        <label className={styles.profileEmail}>Account email<input type="email" value={draft.email} readOnly aria-describedby="account-email-help" /><small id="account-email-help">Used to sign in to your account.</small></label>
      </div>
    </section>
    <section className={styles.profileSection} aria-labelledby="invoice-details-heading">
      <h3 id="invoice-details-heading">Invoice / company details</h3>
      <div className={styles.profileFields}>
        <label>Company name<input required={requireCompany} maxLength={200} autoComplete="organization" value={draft.company.name} onChange={(event) => changeCompany('name', event.target.value)} /></label>
        <label>Registration number<input required={requireCompany} maxLength={80} value={draft.company.registrationNumber} onChange={(event) => changeCompany('registrationNumber', event.target.value)} /></label>
        <label>VAT number<input maxLength={80} value={draft.company.vatNumber} onChange={(event) => changeCompany('vatNumber', event.target.value)} /></label>
        <label className={styles.profileAddress}>Legal / billing address<textarea maxLength={500} rows={3} autoComplete="street-address" value={draft.billingAddress} onChange={(event) => change('billingAddress', event.target.value)} /></label>
      </div>
    </section>
    <div className={styles.profileActions}>
      <button type="submit" disabled={saving || !authUser}>{saving ? 'Saving…' : 'Save changes'}</button>
      {feedback ? <p role={feedback.tone === 'error' ? 'alert' : 'status'} data-tone={feedback.tone}>{feedback.text}</p> : null}
    </div>
  </form>;
}
