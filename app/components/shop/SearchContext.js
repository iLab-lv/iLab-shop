'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../lib/firebaseClient';

const SearchContext = createContext(null);
const SEARCH_ENDPOINT = '/shop/api/catalog/search-data';

export function SearchProvider({ children }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const requestRef = useRef(null);
  const authKeyRef = useRef(undefined);
  const generationRef = useRef(0);

  const invalidate = useCallback(() => {
    generationRef.current += 1;
    requestRef.current = null;
    setData(null);
    setStatus('idle');
    setError('');
  }, []);
  const load = useCallback(async ({ retry = false } = {}) => {
    if (data && !retry) return data;
    if (requestRef.current && !retry) return requestRef.current;
    setStatus('loading'); setError('');
    const generation = generationRef.current;
    const request = fetch(SEARCH_ENDPOINT, { cache: 'no-store', headers: { Accept: 'application/json' } }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to load search data.');
      if (generation === generationRef.current) { setData(result); setStatus('loaded'); requestRef.current = null; }
      return result;
    }).catch((loadError) => {
      if (generation === generationRef.current) { setStatus('error'); setError(loadError.message || 'Unable to load search data.'); requestRef.current = null; }
      throw loadError;
    });
    requestRef.current = request;
    return request;
  }, [data]);

  useEffect(() => onAuthStateChanged(auth, (user) => {
    const nextKey = user?.uid ?? null;
    if (authKeyRef.current !== undefined && authKeyRef.current !== nextKey) invalidate();
    authKeyRef.current = nextKey;
  }), [invalidate]);

  return <SearchContext.Provider value={{ data, status, error, load, invalidate }}>{children}</SearchContext.Provider>;
}

export function useSearchData() {
  const value = useContext(SearchContext);
  if (!value) throw new Error('useSearchData must be used within SearchProvider.');
  return value;
}
