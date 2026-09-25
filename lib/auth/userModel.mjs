import {
  PARTNER_STATUSES,
  ROLES,
  USER_STATUSES,
} from './roles.mjs';

export const MAX_DISCOUNT_PERCENT = 100;

export class UserInputError extends Error {}

export function validatePhone(value, { required = false } = {}) {
  if (typeof value !== 'string' || value.trim().length > 40) {
    throw new UserInputError('phone must be a string of at most 40 characters.');
  }
  const phone = value.trim();
  if (required && !phone) throw new UserInputError('Phone is required.');
  return phone;
}

export function createCustomerProfile({ uid, email, name = '', phone = '', company, wholesale = false }) {
  if (typeof uid !== 'string' || !uid.trim()) throw new UserInputError('A UID is required.');
  const normalizedName = validateProfileName(name);
  if (!normalizedName) throw new UserInputError('Name is required.');
  const normalizedPhone = validatePhone(phone, { required: true });
  const normalizedCompany = company?.name?.trim()
    ? validateCompany(company, { registrationRequired: wholesale })
    : null;
  if (wholesale && !normalizedCompany) throw new UserInputError('Company name is required for wholesale registration.');

  return {
    uid,
    email: typeof email === 'string' ? email : '',
    name: normalizedName,
    phone: normalizedPhone,
    role: ROLES.CUSTOMER,
    status: wholesale ? USER_STATUSES.PENDING : USER_STATUSES.ACTIVE,
    partnerStatus: wholesale ? PARTNER_STATUSES.PENDING : PARTNER_STATUSES.NONE,
    discountPercent: 0,
    ...(normalizedCompany ? { company: normalizedCompany } : {}),
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

export function validateCompany(company, { required = true, registrationRequired = false } = {}) {
  if (!company || typeof company !== 'object' || Array.isArray(company)) {
    if (!required) return null;
    throw new UserInputError('Company details are required.');
  }

  const allowedFields = ['name', 'registrationNumber', 'vatNumber'];
  const normalized = {};

  for (const field of allowedFields) {
    const value = company[field];
    if (value !== undefined && typeof value !== 'string') {
      throw new UserInputError(`company.${field} must be a string.`);
    }
    normalized[field] = value?.trim() ?? '';
  }

  if (!normalized.name) {
    if (!required) return null;
    throw new UserInputError('company.name is required.');
  }
  if (registrationRequired && !normalized.registrationNumber) {
    throw new UserInputError('company.registrationNumber is required for wholesale access.');
  }
  return normalized;
}

export function validateProfileName(value) {
  if (typeof value !== 'string' || value.trim().length > 160) throw new UserInputError('name must be a string of at most 160 characters.');
  return value.trim();
}

export function assertActorMayManageTarget(actor, target) {
  if (!actor || !target) throw new UserInputError('User profile not found.');
  if (actor.role === ROLES.STAFF && [ROLES.STAFF, ROLES.ADMIN].includes(target.role)) throw new UserInputError('Staff cannot modify staff or administrator accounts.');
}

export function validateAdministrativeRoleTransition(actor, target, role) {
  if (actor?.role !== ROLES.ADMIN || actor?.status !== USER_STATUSES.ACTIVE) throw new UserInputError('Only active administrators may change administrative roles.');
  if (![ROLES.CUSTOMER, ROLES.STAFF, ROLES.ADMIN].includes(role)) throw new UserInputError('Unsupported administrative role transition.');
  if (target.role === ROLES.PARTNER || target.partnerStatus === PARTNER_STATUSES.PENDING || target.partnerStatus === PARTNER_STATUSES.APPROVED) throw new UserInputError('Wholesale accounts must be managed through the wholesale workflow.');
  return role;
}

export function partnerApplicationUpdate(profile, company) {
  if (profile?.status !== USER_STATUSES.ACTIVE || profile?.role !== ROLES.CUSTOMER) {
    throw new UserInputError('Only active customer accounts can apply for wholesale access.');
  }

  return {
    role: ROLES.CUSTOMER,
    status: USER_STATUSES.PENDING,
    partnerStatus: PARTNER_STATUSES.PENDING,
    discountPercent: 0,
    company: validateCompany(company, { registrationRequired: true }),
  };
}

export function partnerDecisionUpdate(approved) {
  return approved
    ? { role: ROLES.PARTNER, status: USER_STATUSES.ACTIVE, partnerStatus: PARTNER_STATUSES.APPROVED }
    : {
        role: ROLES.CUSTOMER,
        status: USER_STATUSES.ACTIVE,
        partnerStatus: PARTNER_STATUSES.REJECTED,
        discountPercent: 0,
      };
}

export function wholesaleAccessUpdate(profile, enabled, discountPercent = 0) {
  if (profile?.status !== USER_STATUSES.ACTIVE) throw new UserInputError('Wholesale access can only be changed for active accounts.');
  if (enabled) {
    if (profile.role !== ROLES.CUSTOMER || ![PARTNER_STATUSES.NONE, PARTNER_STATUSES.REJECTED].includes(profile.partnerStatus)) {
      throw new UserInputError('Wholesale access can only be enabled for an ordinary or rejected customer account.');
    }
    return { role: ROLES.PARTNER, status: USER_STATUSES.ACTIVE, partnerStatus: PARTNER_STATUSES.APPROVED, discountPercent: validateDiscountPercent(discountPercent) };
  }
  if (profile.role !== ROLES.PARTNER || profile.partnerStatus !== PARTNER_STATUSES.APPROVED) {
    throw new UserInputError('Wholesale access can only be removed from an approved partner account.');
  }
  return { role: ROLES.CUSTOMER, status: USER_STATUSES.ACTIVE, partnerStatus: PARTNER_STATUSES.NONE, discountPercent: 0 };
}
