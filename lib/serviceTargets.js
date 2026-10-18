import 'server-only';

import { db } from './firebaseAdmin.js';
import { buildServiceTargets, normalizeServiceLink, serviceLinkFromTarget, serviceLinkKey } from './shopServiceLinks.mjs';

export async function getServiceTargets() {
  const [categorySnapshot, deviceSnapshot] = await Promise.all([
    db.collection('categories').get(),
    db.collection('devices').get(),
  ]);
  const categories = categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const devices = deviceSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return buildServiceTargets(categories, devices);
}

export async function validateStoredServiceLink(value, deviceType) {
  const link = normalizeServiceLink(value);
  if (!link || (deviceType === 'brand' && link.type === 'device') || (deviceType === 'model' && link.type !== 'device')) return false;
  if (deviceType === 'series') return false;
  if (link.type === 'home') return true;
  const targets = await getServiceTargets();
  return [...targets.allTargets, ...targets.deviceTargets].some((target) => {
    const expected = serviceLinkFromTarget(target);
    if (serviceLinkKey(expected) !== serviceLinkKey(link) || expected.paths.lv !== link.paths.lv) return false;
    if (link.paths.ru) return expected.paths.ru === link.paths.ru;
    return typeof value?.path === 'string' && value.path === expected.paths.lv;
  });
}
