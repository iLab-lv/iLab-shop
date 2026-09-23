'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ADMIN_USERS_PAGE_SIZE,
  deriveAdminUsers,
  getAdminUsersPage,
  summarizeAdminUsers,
} from '../../../lib/adminUserCatalog.mjs';
import AdminPageHeader from '../components/AdminPageHeader';
import styles from './users.module.css';

const API_ENDPOINT = '/shop/api/admin/users';
const DEFAULT_QUERY = { search: '', role: '', status: '', partnerStatus: '', sort: 'newest', pendingOnly: false, page: 1 };

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(date);
}

function label(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown';
}

function Detail({ term, children, wide = false }) {
  if (children === null || children === undefined || children === '') return null;
  return <div className={wide ? styles.wideDetail : undefined}><dt>{term}</dt><dd>{children}</dd></div>;
}

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);
  const [expandedUid, setExpandedUid] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(API_ENDPOINT, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load users.');
        setUsers(Array.isArray(body.users) ? body.users : []);
        setError('');
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError('Unable to load users.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [requestVersion]);

  const summary = useMemo(() => summarizeAdminUsers(users), [users]);
  const filteredUsers = useMemo(() => deriveAdminUsers(users, query), [users, query]);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ADMIN_USERS_PAGE_SIZE));
  const currentPage = Math.min(query.page, totalPages);
  const pageUsers = useMemo(() => getAdminUsersPage(filteredUsers, currentPage), [filteredUsers, currentPage]);

  function changeQuery(changes) {
    setExpandedUid(null);
    setQuery((current) => ({ ...current, ...changes, page: 1 }));
  }

  function retry() {
    setLoading(true);
    setError('');
    setRequestVersion((version) => version + 1);
  }

  return (
    <section className={styles.manager}>
      <AdminPageHeader title="Users" description="Manage customer accounts, wholesale partners and staff access." />

      <div className={styles.summary} aria-label="User summary">
        <div><span>Total users</span><strong>{summary.total}</strong></div>
        <div><span>Customers</span><strong>{summary.customers}</strong></div>
        <div><span>Approved partners</span><strong>{summary.approvedPartners}</strong></div>
        <div><span>Pending applications</span><strong>{summary.pendingApplications}</strong></div>
      </div>

      <div className={styles.pendingBar}>
        <button type="button" className={query.pendingOnly ? styles.pendingActive : ''}
          aria-pressed={query.pendingOnly} disabled={loading}
          onClick={() => changeQuery({ pendingOnly: !query.pendingOnly, partnerStatus: '' })}>
          Pending Applications <span>{summary.pendingApplications}</span>
        </button>
      </div>

      <div className={styles.filters}>
        <label className={styles.searchField}><span>Search</span><input type="search" value={query.search}
          placeholder="Search name, email, company, or UID…" disabled={loading}
          onChange={(event) => changeQuery({ search: event.target.value })} /></label>
        <div className={styles.filterGrid}>
          <label><span>Role</span><select value={query.role} disabled={loading} onChange={(event) => changeQuery({ role: event.target.value })}>
            <option value="">All roles</option><option value="customer">Customer</option><option value="partner">Partner</option><option value="staff">Staff</option><option value="admin">Admin</option>
          </select></label>
          <label><span>Account status</span><select value={query.status} disabled={loading} onChange={(event) => changeQuery({ status: event.target.value })}>
            <option value="">All</option><option value="active">Active</option><option value="disabled">Disabled</option>
          </select></label>
          <label><span>Wholesale status</span><select value={query.partnerStatus} disabled={loading || query.pendingOnly} onChange={(event) => changeQuery({ partnerStatus: event.target.value })}>
            <option value="">All</option><option value="none">None</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
          </select></label>
          <label><span>Sort</span><select value={query.sort} disabled={loading} onChange={(event) => changeQuery({ sort: event.target.value })}>
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="nameAsc">Name A–Z</option><option value="nameDesc">Name Z–A</option>
          </select></label>
        </div>
      </div>

      {error ? <div className={styles.error} role="alert"><p>Unable to load users.</p><button type="button" onClick={retry}>Retry</button></div> : null}
      {!error && loading ? <div className={styles.state} aria-live="polite">Loading users…</div> : null}
      {!error && !loading && users.length === 0 ? <div className={styles.state}>No users exist.</div> : null}
      {!error && !loading && users.length > 0 && pageUsers.length === 0 ? <div className={styles.state}>{query.pendingOnly ? 'No pending applications to review.' : 'No users match the current search and filters.'}</div> : null}

      {!error && !loading && pageUsers.length > 0 ? <>
        <div className={styles.listHeader} aria-hidden="true"><span>User</span><span>Role</span><span>Account status</span><span>Wholesale status</span><span>Discount</span><span>Registered</span><span>Details</span></div>
        <div className={styles.userList}>
          {pageUsers.map((user) => {
            const expanded = expandedUid === user.uid;
            const approvedPartner = user.role === 'partner' && user.partnerStatus === 'approved';
            return <article className={styles.userRow} key={user.uid}>
              <div className={styles.rowSummary}>
                <div className={styles.identity}><strong>{user.name || user.email || user.uid}</strong>{user.name && user.email ? <span>{user.email}</span> : null}{user.partnerStatus === 'pending' && user.company?.name ? <small>{user.company.name}</small> : null}</div>
                <span className={`${styles.badge} ${styles.roleBadge}`}>{label(user.role)}</span>
                <span className={`${styles.badge} ${user.status === 'active' ? styles.activeBadge : styles.disabledBadge}`}>{label(user.status)}</span>
                <span className={`${styles.badge} ${styles[`partner${label(user.partnerStatus)}`] ?? ''}`}>{label(user.partnerStatus)}</span>
                <span className={styles.discount}>{approvedPartner && Number.isFinite(user.discountPercent) ? `${user.discountPercent}%` : '—'}</span>
                <span className={styles.registered}>{formatDate(user.createdAt)}</span>
                <button className={styles.detailsButton} type="button" aria-expanded={expanded} aria-controls={`user-${user.uid}`}
                  onClick={() => setExpandedUid(expanded ? null : user.uid)}>{expanded ? 'Hide' : 'Details'}</button>
              </div>
              {expanded ? <div className={styles.expanded} id={`user-${user.uid}`}><dl>
                <Detail term="UID" wide>{user.uid}</Detail><Detail term="Name">{user.name}</Detail><Detail term="Email">{user.email}</Detail>
                <Detail term="Role">{label(user.role)}</Detail><Detail term="Account status">{label(user.status)}</Detail><Detail term="Wholesale status">{label(user.partnerStatus)}</Detail>
                {approvedPartner ? <Detail term="Discount">{Number.isFinite(user.discountPercent) ? `${user.discountPercent}%` : 'Not set'}</Detail> : null}
                <Detail term="Registered">{formatDate(user.createdAt)}</Detail><Detail term="Last updated">{formatDate(user.updatedAt)}</Detail>
                <Detail term="Company name">{user.company?.name}</Detail><Detail term="Registration number">{user.company?.registrationNumber}</Detail>
                <Detail term="VAT number">{user.company?.vatNumber}</Detail><Detail term="Phone">{user.company?.phone}</Detail>
                <Detail term="Billing address" wide>{user.company?.billingAddress}</Detail>
              </dl></div> : null}
            </article>;
          })}
        </div>
        <nav className={styles.pagination} aria-label="Users pagination">
          <button type="button" disabled={currentPage === 1} onClick={() => setQuery((current) => ({ ...current, page: currentPage - 1 }))}>Previous</button>
          <span>{pageUsers.length} of {filteredUsers.length} users · Page {currentPage} of {totalPages}</span>
          <button type="button" disabled={currentPage === totalPages} onClick={() => setQuery((current) => ({ ...current, page: currentPage + 1 }))}>Next</button>
        </nav>
      </> : null}
    </section>
  );
}
