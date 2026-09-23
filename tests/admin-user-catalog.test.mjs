import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_USERS_PAGE_SIZE,
  deriveAdminUsers,
  getAdminUsersPage,
  summarizeAdminUsers,
} from '../lib/adminUserCatalog.mjs';

const users = [
  { uid: 'customer-pending', email: 'pending@example.com', name: 'Pending Customer', role: 'customer', status: 'active', partnerStatus: 'pending', discountPercent: 0, company: { name: 'Example SIA' }, createdAt: '2026-09-21T10:00:00.000Z' },
  { uid: 'partner', email: 'partner@example.com', name: 'Partner', role: 'partner', status: 'active', partnerStatus: 'approved', discountPercent: 12, company: { name: 'Partner SIA' }, createdAt: '2026-09-22T10:00:00.000Z' },
  { uid: 'staff', email: 'staff@example.com', name: '', role: 'staff', status: 'disabled', partnerStatus: 'none', discountPercent: 0, company: null, createdAt: null },
  { uid: 'admin', email: 'admin@example.com', name: 'Admin', role: 'admin', status: 'active', partnerStatus: 'none', discountPercent: 0, company: null, createdAt: '2026-09-23T10:00:00.000Z' },
];

const query = { search: '', role: '', status: '', partnerStatus: '', sort: 'newest', pendingOnly: false };

test('user summary counts customers, approved partners, and pending applications', () => {
  assert.deepEqual(summarizeAdminUsers(users), { total: 4, customers: 1, approvedPartners: 1, pendingApplications: 1 });
});

test('pending applications include customer applicants and combine with other filters', () => {
  assert.deepEqual(deriveAdminUsers(users, { ...query, pendingOnly: true }).map((user) => user.uid), ['customer-pending']);
  assert.deepEqual(deriveAdminUsers(users, { ...query, pendingOnly: true, role: 'partner' }), []);
});

test('search covers name, email, company name, and UID case-insensitively', () => {
  assert.deepEqual(deriveAdminUsers(users, { ...query, search: 'EXAMPLE SIA' }).map((user) => user.uid), ['customer-pending']);
  assert.deepEqual(deriveAdminUsers(users, { ...query, search: 'staff@' }).map((user) => user.uid), ['staff']);
  assert.deepEqual(deriveAdminUsers(users, { ...query, search: 'customer-pending' }).map((user) => user.uid), ['customer-pending']);
});

test('role, account, and wholesale filters combine', () => {
  assert.deepEqual(deriveAdminUsers(users, { ...query, role: 'partner', status: 'active', partnerStatus: 'approved' }).map((user) => user.uid), ['partner']);
  assert.deepEqual(deriveAdminUsers(users, { ...query, status: 'disabled' }).map((user) => user.uid), ['staff']);
});

test('sorting handles dates, names, missing dates, and stable UID ties', () => {
  assert.deepEqual(deriveAdminUsers(users, query).map((user) => user.uid), ['admin', 'partner', 'customer-pending', 'staff']);
  assert.deepEqual(deriveAdminUsers(users, { ...query, sort: 'oldest' }).map((user) => user.uid), ['customer-pending', 'partner', 'admin', 'staff']);
  assert.deepEqual(deriveAdminUsers(users, { ...query, sort: 'nameAsc' }).map((user) => user.uid), ['admin', 'partner', 'customer-pending', 'staff']);
});

test('pagination applies after derivation and returns at most 25 users', () => {
  const manyUsers = Array.from({ length: 52 }, (_, index) => ({ ...users[0], uid: `user-${String(index).padStart(2, '0')}` }));
  assert.equal(getAdminUsersPage(manyUsers, 1).length, ADMIN_USERS_PAGE_SIZE);
  assert.equal(getAdminUsersPage(manyUsers, 2).length, ADMIN_USERS_PAGE_SIZE);
  assert.equal(getAdminUsersPage(manyUsers, 3).length, 2);
});
