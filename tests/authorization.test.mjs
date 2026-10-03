import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PARTNER_STATUSES,
  PERMISSIONS,
  ROLES,
  USER_STATUSES,
  hasPermission,
  isActivePartner,
  canViewWholesalePrices,
} from '../lib/auth/roles.mjs';
import {
  createCustomerProfile,
  partnerApplicationUpdate,
  partnerDecisionUpdate,
  validateDiscountPercent,
} from '../lib/auth/userModel.mjs';

const profile = (role, overrides = {}) => ({
  role,
  status: USER_STATUSES.ACTIVE,
  partnerStatus: PARTNER_STATUSES.NONE,
  ...overrides,
});

test('customer and partner roles have no administration permissions', () => {
  for (const role of [ROLES.CUSTOMER, ROLES.PARTNER]) {
    for (const permission of Object.values(PERMISSIONS)) {
      assert.equal(hasPermission(profile(role), permission), false);
    }
  }
});

test('staff has full shop permissions but not service admin access', () => {
  const staff = profile(ROLES.STAFF);
  for (const permission of [
    PERMISSIONS.ACCESS_SHOP_ADMIN,
    PERMISSIONS.MANAGE_CATALOG,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_PARTNERS,
    PERMISSIONS.APPROVE_PARTNERS,
    PERMISSIONS.SET_PARTNER_DISCOUNT,
  ]) {
    assert.equal(hasPermission(staff, permission), true);
  }
  assert.equal(hasPermission(staff, PERMISSIONS.ACCESS_SERVICE_ADMIN), false);
});

test('admin has every permission', () => {
  const admin = profile(ROLES.ADMIN);
  for (const permission of Object.values(PERMISSIONS)) {
    assert.equal(hasPermission(admin, permission), true);
  }
});

test('disabled staff and admin have no permissions', () => {
  for (const role of [ROLES.STAFF, ROLES.ADMIN]) {
    const disabled = profile(role, { status: USER_STATUSES.DISABLED });
    for (const permission of Object.values(PERMISSIONS)) {
      assert.equal(hasPermission(disabled, permission), false);
    }
  }
});

test('only active, approved partner-role profiles receive partner status', () => {
  const pending = profile(ROLES.CUSTOMER, { partnerStatus: PARTNER_STATUSES.PENDING });
  const rejected = profile(ROLES.CUSTOMER, { partnerStatus: PARTNER_STATUSES.REJECTED });
  const approved = profile(ROLES.PARTNER, { partnerStatus: PARTNER_STATUSES.APPROVED });
  const disabled = { ...approved, status: USER_STATUSES.DISABLED };
  assert.equal(isActivePartner(pending), false);
  assert.equal(isActivePartner(rejected), false);
  assert.equal(isActivePartner(approved), true);
  assert.equal(isActivePartner(disabled), false);
});

test('new profiles and wholesale transitions preserve required role rules', () => {
  const customer = createCustomerProfile({ uid: 'uid-1', email: 'a@example.com', name: ' A ', phone: ' 123 ' });
  assert.deepEqual(customer, {
    uid: 'uid-1',
    email: 'a@example.com',
    name: 'A',
    phone: '123',
    role: ROLES.CUSTOMER,
    status: USER_STATUSES.ACTIVE,
    partnerStatus: PARTNER_STATUSES.NONE,
    discountPercent: 0,
  });
  const application = partnerApplicationUpdate(customer, { name: 'Example SIA', registrationNumber: '4000' });
  assert.equal(application.role, ROLES.CUSTOMER);
  assert.equal(application.status, USER_STATUSES.PENDING);
  assert.equal(application.partnerStatus, PARTNER_STATUSES.PENDING);
  assert.deepEqual(partnerDecisionUpdate(true), {
    role: ROLES.PARTNER,
    status: USER_STATUSES.ACTIVE,
    partnerStatus: PARTNER_STATUSES.APPROVED,
  });
  assert.deepEqual(partnerDecisionUpdate(false), {
    role: ROLES.CUSTOMER,
    status: USER_STATUSES.ACTIVE,
    partnerStatus: PARTNER_STATUSES.REJECTED,
    discountPercent: 0,
  });
});

test('new wholesale registration requires company identity and remains pending', () => {
  assert.throws(() => createCustomerProfile({ uid: 'u', email: 'a@b.test', name: 'A', phone: '' }));
  assert.throws(() => createCustomerProfile({ uid: 'u', email: 'a@b.test', name: 'A', phone: '123', wholesale: true, company: { name: 'ACME' } }));
  const applicant = createCustomerProfile({ uid: 'u', email: 'a@b.test', name: 'A', phone: '123', wholesale: true, company: { name: ' ACME ', registrationNumber: ' 4000 ', vatNumber: '' } });
  assert.equal(applicant.role, ROLES.CUSTOMER);
  assert.equal(applicant.status, USER_STATUSES.PENDING);
  assert.equal(applicant.partnerStatus, PARTNER_STATUSES.PENDING);
  assert.equal(applicant.company.registrationNumber, '4000');
});

test('wholesale prices require an active approved partner or active staff/admin', () => {
  assert.equal(canViewWholesalePrices(null), false);
  assert.equal(canViewWholesalePrices(profile(ROLES.CUSTOMER)), false);
  assert.equal(canViewWholesalePrices(profile(ROLES.PARTNER, { partnerStatus: PARTNER_STATUSES.PENDING })), false);
  assert.equal(canViewWholesalePrices(profile(ROLES.PARTNER, { partnerStatus: PARTNER_STATUSES.APPROVED })), true);
  assert.equal(canViewWholesalePrices(profile(ROLES.STAFF)), true);
  assert.equal(canViewWholesalePrices(profile(ROLES.ADMIN)), true);
  assert.equal(canViewWholesalePrices(profile(ROLES.ADMIN, { status: USER_STATUSES.DISABLED })), false);
});

test('discount validation accepts sensible percentages only', () => {
  assert.equal(validateDiscountPercent(0), 0);
  assert.equal(validateDiscountPercent(12.5), 12.5);
  assert.equal(validateDiscountPercent(100), 100);
  for (const invalid of [-1, 101, Number.NaN, '10', null]) {
    assert.throws(() => validateDiscountPercent(invalid));
  }
});
