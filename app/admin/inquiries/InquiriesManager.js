'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { filterAdminInquiries, inquirySourceLabel, INQUIRY_STATUSES } from '../../../lib/partInquiry.mjs';
import AdminAccordionRow from '../components/AdminAccordionRow';
import AdminButton from '../components/AdminButton';
import AdminStatusBadge from '../components/AdminStatusBadge';
import styles from './inquiries.module.css';

const STATUS_LABELS = { new: 'New', contacted: 'Contacted', resolved: 'Resolved' };
const dateTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Riga', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
const displayDate = (value) => value && Number.isFinite(new Date(value).getTime()) ? dateTime.format(new Date(value)) : '—';

function InquirySummary({ inquiry }) {
  const compatibleModels = Array.isArray(inquiry.compatibleModelNames) ? inquiry.compatibleModelNames : [];
  const device = inquiry.source === 'product'
    ? compatibleModels.length > 2 ? `${compatibleModels.slice(0, 2).join(', ')} +${compatibleModels.length - 2} more` : compatibleModels.join(', ') || '—'
    : inquiry.modelName || '—';
  return <div className={styles.summary}>
    <span className={styles.date}><small>Date</small><strong>{displayDate(inquiry.createdAt)}</strong></span>
    <span className={styles.customer}><small>Customer</small><strong>{inquiry.contact?.name || 'Customer'}</strong><em>{inquiry.contact?.email || inquiry.contact?.phone || ''}</em></span>
    <span className={styles.device}><small>Device</small><strong title={device}>{device}</strong>{inquiry.source === 'brand' && inquiry.brandName ? <em>{inquiry.brandName}</em> : null}</span>
    <span className={styles.part}><small>Requested part</small><strong title={inquiry.requestedPart}>{inquiry.requestedPart}</strong></span>
    <span className={styles.source}><small>Source</small><strong>{inquirySourceLabel(inquiry.source)}</strong></span>
    <span className={styles.status}><small>Status</small><AdminStatusBadge status={inquiry.status}>{STATUS_LABELS[inquiry.status] || 'New'}</AdminStatusBadge></span>
  </div>;
}

function DetailGroup({ title, children }) { return <section className={styles.group}><h3>{title}</h3>{children}</section>; }

function InquiryDetail({ inquiry, saving, updateStatus }) {
  const contextPath = inquiry.sourcePath === '/shop' ? '/' : typeof inquiry.sourcePath === 'string' && inquiry.sourcePath.startsWith('/shop/') ? inquiry.sourcePath.replace(/^\/shop/, '') : '';
  return <div className={styles.detail}>
    <div className={styles.detailGrid}>
      <DetailGroup title="Customer">
        <strong>{inquiry.contact?.name || 'Name unavailable'}</strong>
        {inquiry.contact?.email ? <a href={`mailto:${inquiry.contact.email}`}>{inquiry.contact.email}</a> : null}
        {inquiry.contact?.phone ? <a href={`tel:${inquiry.contact.phone}`}>{inquiry.contact.phone}</a> : null}
      </DetailGroup>
      <DetailGroup title="Request">
        {inquiry.source === 'product' ? <>
          <p><span>Product</span><strong>{inquiry.productSlug ? <Link href={`/product/${inquiry.productSlug}`}>{inquiry.productName || inquiry.requestedPart}</Link> : inquiry.productName || inquiry.requestedPart}</strong></p>
          <p><span>SKU</span>{inquiry.sku ?? '—'}</p>
          <p><span>Availability at request time</span>{inquiry.stockQtyAtRequest === 0 ? 'Out of stock' : '—'}</p>
          <div><span>Compatible models</span>{inquiry.compatibleModelNames?.length ? <ul>{inquiry.compatibleModelNames.map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}</ul> : <p>—</p>}</div>
        </> : <>
          {inquiry.brandName ? <p><span>Brand</span>{inquiry.brandName}</p> : null}
          <p><span>Model</span>{inquiry.modelName || '—'}</p>
          <p className={styles.requestedPart}><span>Requested part</span><strong>{inquiry.requestedPart}</strong></p>
        </>}
        {inquiry.message ? <p className={styles.message}><span>Additional details</span>{inquiry.message}</p> : null}
      </DetailGroup>
      <DetailGroup title="Context">
        <p><span>Source</span>{inquirySourceLabel(inquiry.source)}</p>
        {contextPath ? <p><span>Source page</span><Link href={contextPath}>{inquiry.sourcePath}</Link></p> : null}
        {inquiry.source === 'search' && inquiry.searchQuery ? <p><span>Search query</span>{inquiry.searchQuery}</p> : null}
      </DetailGroup>
      <DetailGroup title="Status">
        <label className={styles.statusControl}>Inquiry status<select disabled={saving} value={INQUIRY_STATUSES.includes(inquiry.status) ? inquiry.status : 'new'} onChange={(event) => updateStatus(inquiry.id, event.target.value)}>{INQUIRY_STATUSES.map((status) => <option value={status} key={status}>{STATUS_LABELS[status]}</option>)}</select></label>
        {inquiry.updatedAt && inquiry.updatedAt !== inquiry.createdAt ? <p><span>Last updated</span>{displayDate(inquiry.updatedAt)}</p> : null}
      </DetailGroup>
    </div>
  </div>;
}

export default function InquiriesManager() {
  const [inquiries, setInquiries] = useState([]);
  const [state, setState] = useState('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [open, setOpen] = useState(null);
  const [saving, setSaving] = useState(null);

  const load = useCallback(async () => {
    setState('loading'); setError('');
    try {
      const response = await fetch('/shop/api/admin/inquiries', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load inquiries.');
      setInquiries(result.inquiries); setState('ready');
    } catch (loadError) { setError(loadError.message || 'Unable to load inquiries.'); setState('error'); }
  }, []);
  useEffect(() => { queueMicrotask(load); }, [load]);

  const visible = useMemo(() => filterAdminInquiries(inquiries, { search, status }), [inquiries, search, status]);

  async function updateStatus(id, nextStatus) {
    if (saving) return;
    setSaving(id); setError('');
    try {
      const response = await fetch(`/shop/api/admin/inquiries/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to update inquiry status.');
      setInquiries((current) => current.map((item) => item.id === id ? result.inquiry : item));
    } catch (updateError) { setError(updateError.message || 'Unable to update inquiry status.'); }
    finally { setSaving(null); }
  }

  if (state === 'loading') return <p className={styles.state} role="status">Loading inquiries…</p>;
  if (state === 'error') return <div className={styles.state} role="alert"><p>{error}</p><AdminButton type="button" onClick={load}>Retry</AdminButton></div>;

  return <div className={styles.manager}>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    <div className={styles.toolbar}>
      <label className={styles.search}>Search inquiries<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Customer, contact, model or part" /></label>
      <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{INQUIRY_STATUSES.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></label>
      {search || status !== 'all' ? <AdminButton type="button" variant="ghost" size="small" onClick={() => { setSearch(''); setStatus('all'); }}>Clear filters</AdminButton> : null}
    </div>
    {!visible.length ? <p className={styles.state}>{inquiries.length ? 'No inquiries match these filters.' : 'No customer inquiries yet.'}</p> : <div className={styles.list}>{visible.map((inquiry) => <AdminAccordionRow key={inquiry.id} id={`inquiry-${inquiry.id}`} expanded={open === inquiry.id} onToggle={() => setOpen(open === inquiry.id ? null : inquiry.id)} ariaLabel={`${open === inquiry.id ? 'Collapse' : 'Expand'} inquiry from ${inquiry.contact?.name || 'customer'}`} summary={<InquirySummary inquiry={inquiry} />}><InquiryDetail inquiry={inquiry} saving={saving === inquiry.id} updateStatus={updateStatus} /></AdminAccordionRow>)}</div>}
  </div>;
}
