import {
  PARTNER_STATUSES,
  ROLES,
  USER_STATUSES,
} from './roles.mjs';

export const MAX_DISCOUNT_PERCENT = 100;

export class UserInputError extends Error {}

export function createCustomerProfile({ uid, email, name = '' }) {
  if (typeof uid !== 'string' || !uid.trim()) throw new UserInputError('A UID is required.');

  return {
    uid,
    email: typeof email === 'string' ? email : '',
    name: typeof name === 'string' ? name.trim() : '',
    role: ROLES.CUSTOMER,
    status: USER_STATUSES.ACTIVE,
    partnerStatus: PARTNER_STATUSES.NONE,
    discountPercent: 0,
  };
}

export function validateDiscountPercent(value) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_DISCOUNT_PERCENT
  ) {
    throw new UserInputError(
      `discountPercent must be a number from 0 to ${MAX_DISCOUNT_PERCENT}.`
    );
  }

  return value;
}

export function validateCompany(company) {
  if (!company || typeof company !== 'object' || Array.isArray(company)) {
    throw new UserInputError('Company details are required.');
  }

  const allowedFields = [
    'name',
    'registrationNumber',
    'vatNumber',
    'phone',
    'billingAddress',
  ];
  const normalized = {};

  for (const field of allowedFields) {
    const value = company[field];
    if (value !== undefined && typeof value !== 'string') {
      throw new UserInputError(`company.${field} must be a string.`);
    }
    normalized[field] = value?.trim() ?? '';
  }

  if (!normalized.name) throw new UserInputError('company.name is required.');
  return normalized;
}

export function partnerApplicationUpdate(profile, company) {
  if (profile?.status !== USER_STATUSES.ACTIVE || profile?.role !== ROLES.CUSTOMER) {
    throw new UserInputError('Only active customer accounts can apply for wholesale access.');
  }

  return {
    role: ROLES.CUSTOMER,
    partnerStatus: PARTNER_STATUSES.PENDING,
    discountPercent: 0,
    company: validateCompany(company),
  };
}

export function partnerDecisionUpdate(approved) {
  return approved
    ? { role: ROLES.PARTNER, partnerStatus: PARTNER_STATUSES.APPROVED }
    : {
        role: ROLES.CUSTOMER,
        partnerStatus: PARTNER_STATUSES.REJECTED,
        discountPercent: 0,
      };
}
