'use client';

import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import { cleanServiceLocaleParam, resolveServiceLocale, serviceLocaleCookie, SERVICE_LOCALE_COOKIE } from '../../../lib/serviceLocale.mjs';

const ServiceLocaleContext = createContext('lv');
const localeChangeEvent = 'ilab:service-locale-change';

function readCookie(name) {
  const prefix = `${name}=`;
  const value = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  if (!value) return null;
  try { return decodeURIComponent(value.slice(prefix.length)); } catch { return null; }
}

export function useServiceLocale() {
  return useContext(ServiceLocaleContext);
}

function getLocaleSnapshot() {
  if (typeof window === 'undefined') return 'lv';
  const currentUrl = new URL(window.location.href);
  return resolveServiceLocale({
    incoming: currentUrl.searchParams.get('serviceLocale'),
    cookie: readCookie(SERVICE_LOCALE_COOKIE),
    referrer: document.referrer,
    origin: window.location.origin,
  });
}

function subscribeToLocale(callback) {
  window.addEventListener(localeChangeEvent, callback);
  window.addEventListener('popstate', callback);
  return () => {
    window.removeEventListener(localeChangeEvent, callback);
    window.removeEventListener('popstate', callback);
  };
}

export default function ServiceLocaleProvider({ children }) {
  const locale = useSyncExternalStore(subscribeToLocale, getLocaleSnapshot, () => 'lv');

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const hasIncomingLocale = currentUrl.searchParams.has('serviceLocale');
    const preferred = getLocaleSnapshot();
    document.cookie = serviceLocaleCookie(preferred, { secure: window.location.protocol === 'https:' });

    if (hasIncomingLocale) {
      window.history.replaceState(window.history.state, '', cleanServiceLocaleParam(currentUrl));
    }
    window.dispatchEvent(new Event(localeChangeEvent));
  }, []);

  return <ServiceLocaleContext.Provider value={locale}>{children}</ServiceLocaleContext.Provider>;
}
