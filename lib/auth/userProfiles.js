import 'server-only';

import { db, serverTimestamp } from '../firebaseAdmin';
import { PERMISSIONS, USER_STATUSES, hasPermission } from './roles.mjs';
import {
  createCustomerProfile,
  partnerApplicationUpdate,
  partnerDecisionUpdate,
  UserInputError,
  validateDiscountPercent,
  validateCompany,
  validateProfileName,
  assertActorMayManageTarget,
  validateAdministrativeRoleTransition,
} from './userModel.mjs';

const users = db.collection('users');

export async function getUserProfile(uid) {
  const snapshot = await users.doc(uid).get();
  return snapshot.exists ? snapshot.data() : null;
}

export async function ensureCustomerProfile(authUser) {
  const reference = users.doc(authUser.uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (snapshot.exists) return;
    transaction.create(reference, {
      ...createCustomerProfile({
        uid: authUser.uid,
        email: authUser.email,
        name: authUser.name,
      }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return getUserProfile(authUser.uid);
}

export async function requestPartnerAccess(uid, company) {
  const reference = users.doc(uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new UserInputError('User profile not found.');
    transaction.update(reference, {
      ...partnerApplicationUpdate(snapshot.data(), company),
      updatedAt: serverTimestamp(),
    });
  });
  return getUserProfile(uid);
}

function assertActorPermission(actorProfile, permission) {
  if (!hasPermission(actorProfile, permission)) {
    throw new UserInputError('The acting user does not have the required permission.');
  }
}

export async function decidePartnerApplication(actorProfile, uid, approved) {
  assertActorPermission(actorProfile, PERMISSIONS.APPROVE_PARTNERS);
  const reference = users.doc(uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new UserInputError('User profile not found.');
    assertActorMayManageTarget(actorProfile, snapshot.data());
    if (snapshot.data().role !== 'customer' || snapshot.data().status !== 'active') {
      throw new UserInputError('Only active customer applications can be reviewed.');
    }
    if (snapshot.data().partnerStatus !== 'pending') {
      throw new UserInputError('Only pending wholesale applications can be reviewed.');
    }
    transaction.update(reference, {
      ...partnerDecisionUpdate(approved),
      updatedAt: serverTimestamp(),
    });
  });
  return getUserProfile(uid);
}

export async function setPartnerDiscount(actorProfile, uid, discountPercent) {
  assertActorPermission(actorProfile, PERMISSIONS.SET_PARTNER_DISCOUNT);
  const reference = users.doc(uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference); if (!snapshot.exists) throw new UserInputError('User profile not found.');
    const profile = snapshot.data(); assertActorMayManageTarget(actorProfile, profile);
    if (profile.role !== 'partner' || profile.partnerStatus !== 'approved') throw new UserInputError('Discounts can only be assigned to approved partner accounts.');
    transaction.update(reference, { discountPercent: validateDiscountPercent(discountPercent), updatedAt: serverTimestamp() });
  });
  return getUserProfile(uid);
}

export async function setUserStatus(actorProfile, uid, status) {
  assertActorPermission(actorProfile, PERMISSIONS.MANAGE_USERS);
  if (!Object.values(USER_STATUSES).includes(status)) {
    throw new UserInputError('status must be active or disabled.');
  }
  const reference = users.doc(uid);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference); if (!snapshot.exists) throw new UserInputError('User profile not found.'); const target = snapshot.data(); assertActorMayManageTarget(actorProfile, target);
    if (actorProfile.uid === uid && status === USER_STATUSES.DISABLED) throw new UserInputError('Administrators cannot disable their own account.');
    if (target.role === 'admin' && target.status === 'active' && status === 'disabled') { const admins = await transaction.get(users.where('role', '==', 'admin')); if (admins.docs.filter((doc) => doc.get('status') === 'active').length <= 1) throw new UserInputError('The last active administrator cannot be disabled.'); }
    transaction.update(reference, { status, updatedAt: serverTimestamp() });
  });
  return getUserProfile(uid);
}

export async function updateManagedUser(actorProfile, uid, input) {
  assertActorPermission(actorProfile, PERMISSIONS.MANAGE_USERS); const reference = users.doc(uid);
  await db.runTransaction(async (transaction) => { const snapshot = await transaction.get(reference); if (!snapshot.exists) throw new UserInputError('User profile not found.'); const target = snapshot.data(); assertActorMayManageTarget(actorProfile, target); const update = { name: validateProfileName(input.name), updatedAt: serverTimestamp() }; if (target.partnerStatus === 'pending' || target.partnerStatus === 'approved' || target.company) update.company = validateCompany(input.company); transaction.update(reference, update); });
  return getUserProfile(uid);
}

export async function setAdministrativeRole(actorProfile, uid, role) {
  assertActorPermission(actorProfile, PERMISSIONS.MANAGE_USERS); const reference = users.doc(uid);
  await db.runTransaction(async (transaction) => { const snapshot = await transaction.get(reference); if (!snapshot.exists) throw new UserInputError('User profile not found.'); const target = snapshot.data(); validateAdministrativeRoleTransition(actorProfile, target, role); if (actorProfile.uid === uid && role !== 'admin') throw new UserInputError('Administrators cannot remove their own administrator role.'); if (target.role === 'admin' && target.status === 'active' && role !== 'admin') { const admins = await transaction.get(users.where('role', '==', 'admin')); if (admins.docs.filter((doc) => doc.get('status') === 'active').length <= 1) throw new UserInputError('The last active administrator cannot be demoted.'); } transaction.update(reference, { role, partnerStatus: 'none', discountPercent: 0, updatedAt: serverTimestamp() }); });
  return getUserProfile(uid);
}
