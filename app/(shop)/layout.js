import ShopShell from '../components/shop/ShopShell';

export const metadata = {
  title: 'iLab Shop | Professional Repair Parts',
  description: 'iLab professional shop for device repair parts and components.',
};

export default function PublicShopLayout({ children }) {
  return <ShopShell>{children}</ShopShell>;
}
