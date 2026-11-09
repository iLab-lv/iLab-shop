import { createRoot } from 'react-dom/client';
import ShopShell from '../../app/components/shop/ShopShell';
import { useCart } from '../../app/components/shop/CartContext';
import PartInquiryCard from '../../app/components/shop/PartInquiryCard';
import { SHOP_SETTINGS_DEFAULTS } from '../../lib/shopSettingsDefaults.mjs';

window.__authCalls = [];
const product = { id: 'fixture-product', name: 'Fixture screen', slug: 'fixture-screen', sku: 123, stockQty: 0, retailPriceCents: null };
function Content() {
  const cart = useCart();
  return <div style={{ minHeight: 2400, padding: 40 }}>
    <button id="background-action" onClick={() => { cart.addItem(product.id); cart.openCart(); }}>Add fixture item</button>
    <PartInquiryCard source="product" product={product} />
    <p>Isolated overlay regression fixture. All API traffic is mocked.</p>
  </div>;
}
const brands = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Google', 'Nokia', 'OnePlus'].map(name => ({ id: name.toLowerCase(), name, slug: name.toLowerCase() }));
createRoot(document.getElementById('root')).render(<ShopShell settings={SHOP_SETTINGS_DEFAULTS} brands={brands}><Content /></ShopShell>);
