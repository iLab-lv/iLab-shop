export const CART_STORAGE_KEY = 'ilab_shop_cart_v1';
export const CURRENCY = 'EUR';
export const ORDER_STATUSES = Object.freeze(['new', 'processing', 'ready', 'completed', 'cancelled']);
export const PAYMENT_STATUSES = Object.freeze(['pending', 'unpaid', 'paid']);
export const PAYMENT_METHODS = Object.freeze(['bank_transfer', 'cash_on_pickup']);
export const MAX_CART_QUANTITY = 99;

export function applicableSellingPrice(product, canUseWholesale = false) {
  if (canUseWholesale && Number.isInteger(product?.wholesalePriceCents)) return { unitPriceCents: product.wholesalePriceCents, priceSource: 'wholesale' };
  if (Number.isInteger(product?.retailPriceCents)) return { unitPriceCents: product.retailPriceCents, priceSource: 'retail' };
  return { unitPriceCents: null, priceSource: null };
}

export function normalizeCartItems(value) {
  if (!Array.isArray(value) || value.length > 100) throw new Error('Invalid cart items.');
  const quantities = new Map();
  for (const item of value) {
    if (!item || typeof item.productId !== 'string' || !item.productId || item.productId.length > 160 || item.productId.includes('/') || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_CART_QUANTITY) throw new Error('Invalid cart item.');
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    if (quantities.get(item.productId) > MAX_CART_QUANTITY) throw new Error('Invalid cart quantity.');
  }
  return [...quantities].map(([productId, quantity]) => ({ productId, quantity }));
}

export function resolveProductLine(product, quantity, canUseWholesale = false) {
  const price = applicableSellingPrice(product, canUseWholesale);
  const stockQty = Number.isInteger(product?.stockQty) && product.stockQty > 0 ? product.stockQty : 0;
  let unavailableReason = null;
  if (!product) unavailableReason = 'missing_product';
  else if (product.status !== 'active') unavailableReason = 'inactive';
  else if (price.unitPriceCents === null) unavailableReason = 'missing_price';
  else if (stockQty === 0) unavailableReason = 'out_of_stock';
  else if (quantity > stockQty) unavailableReason = 'insufficient_stock';
  return { applicableUnitPriceCents: price.unitPriceCents, priceSource: price.priceSource, stockQty, purchasable: unavailableReason === null, unavailableReason, lineTotalCents: price.unitPriceCents === null ? null : price.unitPriceCents * quantity };
}

export function cartTotal(lines) {
  return lines.reduce((sum, line) => sum + (Number.isInteger(line.lineTotalCents) ? line.lineTotalCents : 0), 0);
}
