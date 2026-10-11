'use client';
import { createContext, useContext } from 'react';
const ShopSettingsContext = createContext(null);
export function ShopSettingsProvider({ settings, children }) { return <ShopSettingsContext.Provider value={settings}>{children}</ShopSettingsContext.Provider>; }
export function useShopSettings() { const value = useContext(ShopSettingsContext); if (!value) throw new Error('useShopSettings must be used within ShopSettingsProvider.'); return value; }
