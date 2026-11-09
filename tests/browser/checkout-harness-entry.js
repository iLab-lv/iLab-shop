import React from 'react';
import { createRoot } from 'react-dom/client';
import CheckoutClient from '../../app/(shop)/checkout/CheckoutClient';
import { ShopSettingsProvider } from '../../app/components/shop/ShopSettingsContext';
import { ShopCheckoutActionProvider } from '../../app/components/shop/ShopCheckoutActionContext';
import { HarnessCartProvider } from './checkout-harness-cart';

const customer={name:'Test Customer',email:'test@example.invalid',phone:'12345678',company:{name:'',registrationNumber:'',vatNumber:''},billingAddress:''};
createRoot(document.getElementById('root')).render(<ShopSettingsProvider settings={{tax:{vatRatePercent:21},delivery:{courierPriceCents:500,omnivaParcelMachinePriceCents:300}}}><HarnessCartProvider><ShopCheckoutActionProvider><CheckoutClient accountUid="test-user" initialCustomer={customer} locations={[{id:'test',name:'Test pickup',address:'Test street'}]} /></ShopCheckoutActionProvider></HarnessCartProvider></ShopSettingsProvider>);
