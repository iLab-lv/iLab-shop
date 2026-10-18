'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../lib/firebaseClient';
import ShopFullscreenPanel from './ShopFullscreenPanel';
import { usePartInquiry } from './PartInquiryContext';
import styles from './PartInquiryCard.module.css';

const EMPTY_CONTACT = { name: '', email: '', phone: '' };

export default function PartInquiryCard({ source, brand = null, model = null, product = null, compatibleModelNames = [], searchQuery = '', prominent = false, compact = false, showAvailabilityState = true, actionClassName = '', panel = false, panelOpen = false, onPanelClose, returnFocusRef }) {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [modelName, setModelName] = useState('');
  const [requestedPart, setRequestedPart] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const inquiryContext = usePartInquiry();
  const productRequest = source === 'product';
  const titleId = `${panel ? 'panel-' : ''}part-inquiry-title-${source}`;
  const productKey = String(product?.id ?? 'missing-product').replace(/[^a-zA-Z0-9_-]/g, '-');
  const formId = `part-inquiry-form-${source}${productRequest ? `-${productKey}` : ''}`;

  useEffect(() => {
    if (!(panel || open)) return undefined;
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || cancelled) return;
      try {
        const token = await user.getIdToken();
        const response = await fetch('/shop/api/users/me', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json();
        if (cancelled || !result.profile) return;
        const profile = result.profile;
        setContact((current) => ({
          name: current.name || profile.name || '',
          email: current.email || profile.email || user.email || '',
          phone: current.phone || profile.phone || '',
        }));
      } catch { /* Profile prefill is optional; guest submission remains available. */ }
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [open, panel]);

  async function submit(event) {
    event.preventDefault();
    if (pending || sent) return;
    setPending(true); setError('');
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const inquiry = {
        source,
        brandId: brand?.id ?? null,
        modelId: model?.id ?? null,
        modelName: source === 'model' || productRequest ? '' : modelName,
        message,
        searchQuery: source === 'search' ? searchQuery.slice(0, 300) : '',
        sourcePath: window.location.pathname,
        contact,
        website,
      };
      if (productRequest) inquiry.productId = product?.id;
      else inquiry.requestedPart = requestedPart;
      const response = await fetch('/shop/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(inquiry),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send your inquiry right now. Please try again.');
      setSent(true);
    } catch (submitError) { setError(submitError.message || 'Unable to send your inquiry right now. Please try again.'); }
    finally { setPending(false); }
  }

  const needsModel = source === 'brand' || source === 'search';
  const modelLabel = source === 'brand' ? 'Device model' : 'Device / model';
  const compatibleModels = compatibleModelNames.length ? compatibleModelNames : product?.compatibleModelNames ?? product?.modelNames ?? [];
  const toggleClassName = [styles.toggle, actionClassName].filter(Boolean).join(' ');

  if (!panel) return <section className={`${styles.card} ${prominent ? styles.prominent : ''} ${productRequest && compact ? styles.compact : ''}`} aria-label={productRequest ? `Availability request for ${product?.name || 'product'}` : undefined} aria-labelledby={productRequest ? undefined : `part-inquiry-title-${source}`}>
    {productRequest ? <div className={styles.availabilityAction}>
      {showAvailabilityState ? <strong className={styles.outOfStock}>Out of stock</strong> : null}
      <button className={toggleClassName} type="button" onClick={(event) => inquiryContext?.openInquiry({ source, brand, model, product, compatibleModelNames: compatibleModels, searchQuery }, event.currentTarget)}>Request availability</button>
    </div> : <div className={styles.intro}>
      <div><p className={styles.eyebrow}>Part inquiry</p><h2 id={`part-inquiry-title-${source}`}>{source === 'brand' ? 'Can’t find your model or part?' : 'Can’t find what you need?'}</h2><p>Tell us which device and part you’re looking for and we’ll check availability.</p></div>
      <button className={styles.toggle} type="button" onClick={(event) => inquiryContext?.openInquiry({ source, brand, model, product, compatibleModelNames: compatibleModels, searchQuery }, event.currentTarget)}>Send an inquiry</button>
    </div>}
  </section>;

  const content = <section className={`${styles.card} ${panel ? styles.panelCard : ''} ${prominent ? styles.prominent : ''}`} aria-labelledby={titleId}>
    {panel && productRequest ? <div className={styles.intro}><div><p className={styles.eyebrow}>Product inquiry</p><h2 id={titleId}>Request availability</h2><p>Send us your contact details and we’ll check this product for you.</p></div></div> : panel ? <div className={styles.intro}><div><p className={styles.eyebrow}>Part inquiry</p><h2 id={titleId}>{source === 'brand' ? 'Can’t find your model or part?' : 'Can’t find what you need?'}</h2><p>Tell us which device and part you’re looking for and we’ll check availability.</p></div></div> : <div className={styles.intro}>
      <div><p className={styles.eyebrow}>Part inquiry</p><h2 id={titleId}>{source === 'brand' ? 'Can’t find your model or part?' : 'Can’t find what you need?'}</h2><p>Tell us which device and part you’re looking for and we’ll check availability.</p></div>
      {!sent ? <button className={styles.toggle} type="button" aria-expanded={open} aria-controls={`part-inquiry-form-${source}`} onClick={() => setOpen((value) => !value)}>{open ? 'Close form' : 'Send an inquiry'}<span aria-hidden="true">{open ? '−' : '+'}</span></button> : null}
    </div>}
    {sent ? <div className={styles.success} role="status"><strong>{panel ? 'Request sent' : 'Inquiry sent'}</strong><p>{panel ? 'We’ll check availability for this product and contact you using the details you provided.' : 'Thanks — we’ll check availability and contact you using the details you provided.'}</p></div> : null}
    {(panel || open) && !sent ? <form id={formId} className={styles.form} onSubmit={submit}>
      {source === 'model' ? <div className={styles.context}><span>Device</span><strong>{model?.name}</strong></div> : null}
      {source === 'brand' ? <div className={styles.context}><span>Brand</span><strong>{brand?.name}</strong></div> : null}
      {productRequest ? <>
        <div className={styles.context}><span>Product</span><strong>{product?.name}</strong>{product?.sku !== null && product?.sku !== undefined ? <small>SKU {product.sku}</small> : null}</div>
        <div className={styles.context}><span>Compatible models</span><strong>{compatibleModels.length ? compatibleModels.join(', ') : 'No compatible models listed.'}</strong></div>
      </> : null}
      {needsModel ? <label className={styles.field}>{modelLabel}<span aria-hidden="true"> *</span><input required maxLength={150} value={modelName} onChange={(event) => setModelName(event.target.value)} autoComplete="off" /></label> : null}
      {!productRequest ? <label className={styles.field}>What part do you need? <span aria-hidden="true">*</span><input required maxLength={250} value={requestedPart} onChange={(event) => setRequestedPart(event.target.value)} /></label> : null}
      <label className={styles.field}>Additional details<textarea maxLength={2000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
      <div className={styles.contactFields}>
        <label className={styles.field}>Name <span aria-hidden="true">*</span><input required maxLength={120} autoComplete="name" value={contact.name} onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))} /></label>
        <label className={styles.field}>Email<input type="email" maxLength={254} autoComplete="email" value={contact.email} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} /></label>
        <label className={styles.field}>Phone<input type="tel" maxLength={50} autoComplete="tel" value={contact.phone} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} /></label>
      </div>
      <p className={styles.help}>Add an email address or phone number so we can contact you.</p>
      <label className={styles.honeypot} aria-hidden="true" tabIndex={-1}>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      <button className={styles.submit} type="submit" disabled={pending}>{pending ? 'Sending…' : productRequest ? 'Send request' : 'Send inquiry'}</button>
    </form> : null}
  </section>;

  return panel ? <ShopFullscreenPanel id="shop-part-inquiry-panel" title="Part inquiry" open={panelOpen} onClose={onPanelClose} returnFocusRef={returnFocusRef}><div className={styles.panelContent}>{content}</div></ShopFullscreenPanel> : content;
}
