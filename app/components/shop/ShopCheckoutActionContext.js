'use client';
import { createContext, useContext, useMemo, useState } from 'react';

export const CHECKOUT_FORM_ID = 'shop-checkout-form';

const ShopCheckoutActionContext = createContext(null);

export function ShopCheckoutActionProvider({ children }) {
  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const value = useMemo(() => ({ submitting, setSubmitting, orderPlaced, setOrderPlaced }), [submitting, orderPlaced]);
  return <ShopCheckoutActionContext.Provider value={value}>{children}</ShopCheckoutActionContext.Provider>;
}

export function useShopCheckoutAction() {
  const value = useContext(ShopCheckoutActionContext);
  if (!value) throw new Error('useShopCheckoutAction must be used within ShopCheckoutActionProvider.');
  return value;
}
