export const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  PARTNER: 'partner',
  STAFF: 'staff',
  ADMIN: 'admin',
});

export const USER_STATUSES = Object.freeze({
  ACTIVE: 'active',
  DISABLED: 'disabled',
});

export const PARTNER_STATUSES = Object.freeze({
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

export const PERMISSIONS = Object.freeze({
  ACCESS_SHOP_ADMIN: 'canAccessShopAdmin',
  MANAGE_CATALOG: 'canManageCatalog',
  MANAGE_USERS: 'canManageUsers',
  MANAGE_PARTNERS: 'canManagePartners',
  APPROVE_PARTNERS: 'canApprovePartners',
  SET_PARTNER_DISCOUNT: 'canSetPartnerDiscount',
  ACCESS_SERVICE_ADMIN: 'canAccessServiceAdmin',
});

const NO_PERMISSIONS = Object.freeze([]);
const SHOP_MANAGEMENT_PERMISSIONS = Object.freeze([
  PERMISSIONS.ACCESS_SHOP_ADMIN,
  PERMISSIONS.MANAGE_CATALOG,
  PERMISSIONS.MANAGE_USERS,
  PERMISSIONS.MANAGE_PARTNERS,
  PERMISSIONS.APPROVE_PARTNERS,
  PERMISSIONS.SET_PARTNER_DISCOUNT,
]);

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.CUSTOMER]: NO_PERMISSIONS,
  [ROLES.PARTNER]: NO_PERMISSIONS,
  [ROLES.STAFF]: SHOP_MANAGEMENT_PERMISSIONS,
  [ROLES.ADMIN]: Object.freeze([
    ...SHOP_MANAGEMENT_PERMISSIONS,
    PERMISSIONS.ACCESS_SERVICE_ADMIN,
  ]),
});

export function isActiveUser(profile) {
  return profile?.status === USER_STATUSES.ACTIVE;
}

export function hasPermission(profile, permission) {
  return (
    isActiveUser(profile) &&
    Object.values(PERMISSIONS).includes(permission) &&
    ROLE_PERMISSIONS[profile?.role]?.includes(permission) === true
  );
}

export function isActivePartner(profile) {
  return (
    isActiveUser(profile) &&
    profile?.role === ROLES.PARTNER &&
    profile?.partnerStatus === PARTNER_STATUSES.APPROVED
  );
}
