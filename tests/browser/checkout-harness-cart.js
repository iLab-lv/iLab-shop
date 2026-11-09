import React, {createContext,useContext,useMemo,useState} from 'react';
const Context=createContext(null);
const product={productId:'test-product',name:'Test product',quantity:1,applicableUnitPriceCents:2900,lineTotalCents:2900,priceSource:'retail'};
const noop=()=>{};
export function HarnessCartProvider({children}) {
  const [items]=useState(window.__emptyCart ? [] : [{productId:'test-product',quantity:1}]);
  const value=useMemo(()=>({items,lines:items.length?[product]:[],totalCents:items.length?2900:0,valid:!!items.length,status:'ready',accountUserId:'test-user',closeCart:noop,resolve:noop,completeOrder:async()=>{window.__completed=(window.__completed||0)+1}}),[items]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useCart=()=>useContext(Context);
