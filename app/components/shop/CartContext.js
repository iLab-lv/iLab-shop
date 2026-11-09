'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../lib/firebaseClient';
import { createCartSync } from '../../../lib/cartSync.mjs';

const CartContext = createContext(null);
async function accountRequest(uid, operation) {
  const response = await fetch('/shop/api/cart/account', {
    method: operation ? 'POST' : 'GET', cache: 'no-store',
    ...(operation ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...operation, expectedUid: uid }) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error || 'Unable to save your cart. Please retry.'), { status: response.status });
  return result;
}
export function CartProvider({ children }) {
  const [basket, setBasket] = useState({ items: [], userId: null, status: 'loading', error: '', notice: '' });
  const [resolved, setResolved] = useState({ lines: [], currency: 'EUR' });
  const [resolutionStatus, setResolutionStatus] = useState('loading');
  const [resolutionError, setResolutionError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const controller = useRef(null), resolutionGeneration = useRef(0), basketRef = useRef(basket);
  const resolve = useCallback(async () => {
    const currentGeneration = ++resolutionGeneration.current, current = basketRef.current;
    if (!current.items.length) { setResolved({ lines: [], currency: 'EUR' }); setResolutionStatus('ready'); setResolutionError(''); return; }
    setResolutionStatus('loading'); setResolutionError('');
    try {
      const response = await fetch('/shop/api/cart/resolve', { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: current.items }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to refresh the cart.');
      if (currentGeneration !== resolutionGeneration.current) return;
      setResolved(result); setResolutionStatus('ready');
    } catch (error) {
      if (currentGeneration !== resolutionGeneration.current) return;
      setResolutionStatus('error'); setResolutionError(error.message || 'Unable to refresh the cart.');
    }
  }, []);
  useEffect(() => {
    const sync = createCartSync({
      storage: window.localStorage, uuid: () => crypto.randomUUID(), getAccount: (uid) => accountRequest(uid), postOperation: accountRequest,
      onChange: (next) => { resolutionGeneration.current += 1; basketRef.current = next; setBasket(next); },
    });
    controller.current = sync; sync.hydrate();
    const unsubscribe = onAuthStateChanged(auth, (user) => { if (!user) sync.signOut(); });
    return () => { unsubscribe(); controller.current = null; resolutionGeneration.current += 1; };
  }, []);
  useEffect(() => { void resolve(); }, [basket.items, basket.userId, resolve]);
  const associateAccount = useCallback((uid) => controller.current?.associate(uid) ?? Promise.resolve(false), []);
  const retry = useCallback(async () => { await controller.current?.retry(); await resolve(); }, [resolve]);
  const completeOrder = useCallback(() => controller.current?.completeOrder() ?? Promise.resolve(false), []);
  const change = useCallback((type, fields) => controller.current?.mutate(type, fields), []);
  const addItem = useCallback((productId, quantity = 1) => change('add', { productId, quantity }), [change]);
  const removeItem = useCallback((productId) => change('remove', { productId }), [change]);
  const setQuantity = useCallback((productId, quantity) => change('set', { productId, quantity }), [change]);
  const clearCart = useCallback(() => change('clear'), [change]);
  const openCart = useCallback(() => setIsOpen(true), []), closeCart = useCallback(() => setIsOpen(false), []);
  const lines = useMemo(() => basket.items.flatMap((item) => {
    const line = resolved.lines.find((entry) => entry.productId === item.productId);
    if (!line) return [];
    const baseReason = line.unavailableReason === 'insufficient_stock' ? null : line.unavailableReason;
    const reason = baseReason ?? (item.quantity > line.stockQty ? 'insufficient_stock' : null);
    return [{ ...line, quantity: item.quantity, lineTotalCents: Number.isInteger(line.applicableUnitPriceCents) ? line.applicableUnitPriceCents * item.quantity : null, purchasable: reason === null, unavailableReason: reason }];
  }), [basket.items, resolved.lines]);
  const status = basket.status === 'syncing' || basket.status === 'loading' ? 'loading' : basket.error || resolutionError ? 'error' : resolutionStatus;
  const totalCents = lines.reduce((sum, line) => sum + (line.lineTotalCents ?? 0), 0);
  const value = useMemo(() => ({
    items: basket.items, lines, itemCount: basket.items.reduce((sum, item) => sum + item.quantity, 0), uniqueItemCount: basket.items.length,
    totalCents, currency: resolved.currency, valid: status === 'ready' && lines.length === basket.items.length && lines.every((line) => line.purchasable),
    status, error: basket.error || resolutionError, notice: basket.notice, accountUserId: basket.userId, isOpen,
    addItem, removeItem, setQuantity, clearCart, completeOrder, associateAccount, retry,
    increment: (id) => { const line = lines.find((item) => item.productId === id); if (line && line.quantity < line.stockQty) return setQuantity(id, line.quantity + 1); },
    decrement: (id) => { const item = basket.items.find((entry) => entry.productId === id); if (item?.quantity > 1) return setQuantity(id, item.quantity - 1); },
    resolve, openCart, closeCart,
  }), [basket, lines, totalCents, resolved.currency, status, resolutionError, isOpen, addItem, removeItem, setQuantity, clearCart, completeOrder, associateAccount, retry, resolve, openCart, closeCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error('useCart must be used within CartProvider.'); return value; }
