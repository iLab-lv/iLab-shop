'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../lib/firebaseClient';
import { CART_STORAGE_KEY, MAX_CART_QUANTITY } from '../../../lib/commerce.mjs';
const CartContext = createContext(null);
const ENDPOINT = '/shop/api/cart/resolve';
function readStoredCart() { try { const value = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '[]'); return Array.isArray(value) ? value.filter((item) => typeof item?.productId === 'string' && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= MAX_CART_QUANTITY).map(({ productId, quantity }) => ({ productId, quantity })) : []; } catch { return []; } }
export function CartProvider({ children }) {
  const [items, setItems] = useState([]), [resolved, setResolved] = useState({ lines: [], currency: 'EUR' }), [status, setStatus] = useState('loading'), [error, setError] = useState(''), [isOpen, setIsOpen] = useState(false);
  const hydrated = useRef(false), itemsRef = useRef(items);
  const resolve = useCallback(async (nextItems = itemsRef.current) => {
    if (!nextItems.length) { setResolved({ lines: [], currency: 'EUR' }); setStatus('ready'); setError(''); return; }
    setStatus('loading'); setError('');
    try { const response = await fetch(ENDPOINT, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: nextItems }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to refresh the cart.'); setResolved(result); setStatus('ready'); }
    catch (resolveError) { setStatus('error'); setError(resolveError.message || 'Unable to refresh the cart.'); }
  }, []);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { const stored = readStoredCart(); hydrated.current = true; queueMicrotask(() => { setItems(stored); resolve(stored); }); }, [resolve]);
  useEffect(() => { if (hydrated.current) localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items.map(({ productId, quantity }) => ({ productId, quantity })))); }, [items]);
  useEffect(() => { let first = true; const unsubscribe = onAuthStateChanged(auth, () => { if (first) { first = false; return; } window.setTimeout(() => resolve(), 350); }); const refresh = () => resolve(); window.addEventListener('shop:auth-changed', refresh); return () => { unsubscribe(); window.removeEventListener('shop:auth-changed', refresh); }; }, [resolve]);
  const changeItems = useCallback((updater, refresh = false) => setItems((current) => { const next = updater(current); if (refresh) queueMicrotask(() => resolve(next)); return next; }), [resolve]);
  const addItem = useCallback((productId, quantity = 1) => changeItems((current) => { const existing = current.find((item) => item.productId === productId); return existing ? current.map((item) => item.productId === productId ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, item.quantity + quantity) } : item) : [...current, { productId, quantity }]; }, true), [changeItems]);
  const removeItem = useCallback((productId) => changeItems((current) => current.filter((item) => item.productId !== productId), true), [changeItems]);
  const setQuantity = useCallback((productId, quantity) => { if (!Number.isInteger(quantity) || quantity < 1) return; changeItems((current) => current.map((item) => item.productId === productId ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, quantity) } : item)); }, [changeItems]);
  const clearCart = useCallback(() => { setItems([]); setResolved({ lines: [], currency: 'EUR' }); }, []);
  const openCart = useCallback(() => setIsOpen(true), []), closeCart = useCallback(() => setIsOpen(false), []);
  const lines = useMemo(() => resolved.lines.map((line) => { const quantity = items.find((item) => item.productId === line.productId)?.quantity ?? line.quantity; const baseReason = line.unavailableReason === 'insufficient_stock' ? null : line.unavailableReason; return { ...line, quantity, lineTotalCents: Number.isInteger(line.applicableUnitPriceCents) ? line.applicableUnitPriceCents * quantity : null, purchasable: baseReason === null && quantity <= line.stockQty, unavailableReason: quantity > line.stockQty ? 'insufficient_stock' : baseReason }; }), [items, resolved.lines]);
  const totalCents = lines.reduce((sum, line) => sum + (line.lineTotalCents ?? 0), 0);
  const value = useMemo(() => ({ items, lines, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), uniqueItemCount: items.length, totalCents, currency: resolved.currency, valid: status === 'ready' && lines.length === items.length && lines.every((line) => line.purchasable), status, error, isOpen, addItem, removeItem, setQuantity, increment: (id) => { const line = lines.find((item) => item.productId === id); if (line && line.quantity < line.stockQty) setQuantity(id, line.quantity + 1); }, decrement: (id) => { const item = items.find((entry) => entry.productId === id); if (item?.quantity > 1) setQuantity(id, item.quantity - 1); }, clearCart, resolve, openCart, closeCart }), [items, lines, totalCents, resolved.currency, status, error, isOpen, addItem, removeItem, setQuantity, clearCart, resolve, openCart, closeCart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error('useCart must be used within CartProvider.'); return value; }
