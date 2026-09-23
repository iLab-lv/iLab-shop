import 'server-only';

import { db, serverTimestamp } from '../firebaseAdmin';
import { PERMISSIONS, USER_STATUSES, hasPermission } from './roles.mjs';
import {
  createCustomerProfile,
  partnerApplicationUpdate,
  partnerDecisionUpdate,
  UserInputError,
  validateDiscountPercent,
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
  const profile = await getUserProfile(uid);
  if (!profile || profile.role !== 'partner' || profile.partnerStatus !== 'approved') {
    throw new UserInputError('Discounts can only be assigned to approved partner accounts.');
  }
  await reference.update({
    discountPercent: validateDiscountPercent(discountPercent),
    updatedAt: serverTimestamp(),
  });
  return getUserProfile(uid);
}

export async function setUserStatus(actorProfile, uid, status) {
  assertActorPermission(actorProfile, PERMISSIONS.MANAGE_USERS);
  if (!Object.values(USER_STATUSES).includes(status)) {
    throw new UserInputError('status must be active or disabled.');
  }
  await users.doc(uid).update({ status, updatedAt: serverTimestamp() });
  return getUserProfile(uid);
}
