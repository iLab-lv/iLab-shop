import 'server-only';

import { db } from './firebaseAdmin.js';

const USER_FIELDS = [
  'uid', 'email', 'name', 'phone', 'role', 'status', 'partnerStatus',
  'discountPercent', 'company', 'createdAt', 'updatedAt',
];

function timestampToIso(value) {
  return value?.toDate?.().toISOString() ?? null;
}

function serializeCompany(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const company = {};
  for (const field of ['name', 'registrationNumber', 'vatNumber']) {
    if (typeof value[field] === 'string' && value[field].trim()) company[field] = value[field].trim();
  }
  return Object.keys(company).length ? company : null;
}

export function serializeAdminUser(data, fallbackUid = '') {
  return {
    uid: typeof data?.uid === 'string' && data.uid ? data.uid : fallbackUid,
    email: typeof data?.email === 'string' ? data.email : '',
    name: typeof data?.name === 'string' ? data.name : '',
    phone: typeof data?.phone === 'string' ? data.phone : '',
    role: typeof data?.role === 'string' ? data.role : 'unknown',
    status: typeof data?.status === 'string' ? data.status : 'unknown',
    partnerStatus: typeof data?.partnerStatus === 'string' ? data.partnerStatus : 'none',
    discountPercent: Number.isFinite(data?.discountPercent) ? data.discountPercent : null,
    company: serializeCompany(data?.company),
    createdAt: timestampToIso(data?.createdAt),
    updatedAt: timestampToIso(data?.updatedAt),
  };
}

export async function getAdminUsers() {
  const snapshot = await db.collection('users').select(...USER_FIELDS).get();
  return snapshot.docs.map((document) => serializeAdminUser(document.data(), document.id));
}
