export const SERVICE_LOCALE_COOKIE = 'ilab_service_locale';
export const SERVICE_LOCALES = Object.freeze(['lv', 'ru']);

export function normalizeServiceLocale(value) {
  return typeof value === 'string' && SERVICE_LOCALES.includes(value) ? value : null;
}

export function serviceLocaleCookie(locale, { secure = false } = {}) {
  const value = normalizeServiceLocale(locale) || 'lv';
  return `${SERVICE_LOCALE_COOKIE}=${value}; Max-Age=31536000; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`;
}

export function serviceLocaleFromReferrer(referrer, origin) {
  if (typeof referrer !== 'string' || typeof origin !== 'string' || !referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.origin !== origin) return null;
    const pathname = url.pathname;
    if (pathname === '/shop' || pathname.startsWith('/shop/')) return null;
    return pathname === '/ru' || pathname.startsWith('/ru/') ? 'ru' : 'lv';
  } catch {
    return null;
  }
}

export function resolveServiceLocale({ incoming, cookie, referrer, origin } = {}) {
  return normalizeServiceLocale(incoming)
    || normalizeServiceLocale(cookie)
    || serviceLocaleFromReferrer(referrer, origin)
    || 'lv';
}

export function cleanServiceLocaleParam(url) {
  const parsed = url instanceof URL ? new URL(url.href) : new URL(String(url), 'https://ilab.lv');
  if (!parsed.searchParams.has('serviceLocale')) return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  parsed.searchParams.delete('serviceLocale');
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
