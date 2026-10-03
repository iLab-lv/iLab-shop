'use client';
import { createContext, useContext, useMemo, useState } from 'react';
const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [items] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ items, itemCount: items.reduce((sum, item) => sum + (item.quantity ?? 1), 0), isOpen, openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false) }), [items, isOpen]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used within CartProvider.');
  return value;
}
