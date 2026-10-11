import 'server-only';
import { cache } from 'react';
import { db, serverTimestamp } from './firebaseAdmin';
import { normalizeShopSettings, publicShopSettings, validateShopSettings } from './shopSettingsModel.mjs';

export const SHOP_SETTINGS_PATH = 'shopSettings/general';
const reference = () => db.doc(SHOP_SETTINGS_PATH);
export async function getAdminShopSettings() { const snapshot = await reference().get(); return { settings: normalizeShopSettings(snapshot.exists ? snapshot.data() : null), exists: snapshot.exists }; }
export const getPublicShopSettings = cache(async () => { try { return publicShopSettings((await reference().get()).data()); } catch (error) { console.error('Unable to load public Shop settings; using defaults.', error); return publicShopSettings(null); } });
export async function updateShopSettings(input) { const settings = validateShopSettings(input); await reference().set({ ...settings, updatedAt: serverTimestamp() }, { merge: true }); return settings; }
