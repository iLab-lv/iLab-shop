import { SHOP_SETTINGS_DEFAULTS } from './shopSettingsDefaults.mjs';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const idPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
const repairKnownEncodingDamage = (value) => value.replaceAll('IeriÄ·u', 'Ieriķu').replaceAll('RÄ«ga', 'Rīga').replaceAll('â€“', '–');
const text = (value, fallback, max) => typeof value === 'string' && value.trim() && value.trim().length <= max ? repairKnownEncodingDamage(value.trim()) : fallback;
const url = (value, fallback) => { try { const parsed = new URL(value); return ['http:', 'https:'].includes(parsed.protocol) && value.length <= 2000 ? value : fallback; } catch { return fallback; } };
const cloneDefaults = () => ({ currency: 'EUR', tax: { ...SHOP_SETTINGS_DEFAULTS.tax }, contact: { ...SHOP_SETTINGS_DEFAULTS.contact }, pickupLocations: SHOP_SETTINGS_DEFAULTS.pickupLocations.map((location) => ({ ...location, hours: [...location.hours] })) });

export function normalizeShopSettings(value) {
  const defaults = cloneDefaults(), data = value && typeof value === 'object' ? value : {};
  const rate = data.tax?.vatRatePercent;
  const locations = Array.isArray(data.pickupLocations) ? data.pickupLocations : defaults.pickupLocations;
  return { currency: 'EUR', tax: { pricesIncludeVat: true, vatRatePercent: Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : defaults.tax.vatRatePercent }, contact: { email: emailPattern.test(data.contact?.email ?? '') ? data.contact.email.trim().toLowerCase() : defaults.contact.email, phone: text(data.contact?.phone, defaults.contact.phone, 40) }, pickupLocations: locations.map((item, index) => normalizeLocation(item, defaults.pickupLocations[index] ?? {}, index)).filter(Boolean) };
}

function normalizeLocation(item, fallback, index) {
  if (!item || typeof item !== 'object') return null;
  const id = idPattern.test(item.id ?? '') ? item.id : fallback.id;
  if (!id) return null;
  return { id, name: text(item.name, fallback.name ?? id, 160), address: text(item.address, fallback.address ?? '', 300), phone: text(item.phone, fallback.phone ?? '', 40), email: emailPattern.test(item.email ?? '') ? item.email.trim().toLowerCase() : fallback.email ?? '', whatsapp: url(item.whatsapp, fallback.whatsapp ?? ''), directions: url(item.directions, fallback.directions ?? ''), hours: (Array.isArray(item.hours) ? item.hours : fallback.hours ?? []).map((line) => text(line, '', 120)).filter(Boolean).slice(0, 20), status: item.status === 'inactive' ? 'inactive' : 'active', order: Number.isInteger(item.order) ? item.order : index };
}

function required(value, name, max) { if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new Error(`invalid_${name}`); return value.trim(); }
function validUrl(value, name) { const result = required(value, name, 2000); try { if (!['http:', 'https:'].includes(new URL(result).protocol)) throw new Error(); } catch { throw new Error(`invalid_${name}`); } return result; }
export function validateShopSettings(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.pickupLocations) || !input.pickupLocations.length || input.pickupLocations.length > 50) throw new Error('invalid_settings');
  const vatRatePercent = Number(input.tax?.vatRatePercent); if (!Number.isFinite(vatRatePercent) || vatRatePercent < 0 || vatRatePercent > 100) throw new Error('invalid_vat');
  const email = required(input.contact?.email, 'email', 254).toLowerCase(); if (!emailPattern.test(email)) throw new Error('invalid_email');
  const ids = new Set();
  const pickupLocations = input.pickupLocations.map((item, index) => { const id = required(item?.id, 'location', 80); if (!idPattern.test(id) || ids.has(id)) throw new Error('invalid_location_id'); ids.add(id); const locationEmail = required(item.email, 'location_email', 254).toLowerCase(); if (!emailPattern.test(locationEmail)) throw new Error('invalid_location_email'); if (!Array.isArray(item.hours) || item.hours.length > 20) throw new Error('invalid_hours'); return { id, name: required(item.name, 'location_name', 160), address: required(item.address, 'location_address', 300), phone: required(item.phone, 'location_phone', 40), email: locationEmail, whatsapp: validUrl(item.whatsapp, 'whatsapp'), directions: validUrl(item.directions, 'directions'), hours: item.hours.map((line) => required(line, 'hours', 120)), status: item.status === 'inactive' ? 'inactive' : 'active', order: Number.isInteger(Number(item.order)) ? Number(item.order) : index }; });
  return { currency: 'EUR', tax: { pricesIncludeVat: true, vatRatePercent }, contact: { email, phone: required(input.contact?.phone, 'phone', 40) }, pickupLocations };
}
export function publicShopSettings(settings) { const normalized = normalizeShopSettings(settings); return { ...normalized, pickupLocations: normalized.pickupLocations.filter((location) => location.status === 'active').sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)) }; }
