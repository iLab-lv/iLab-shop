export const FULFILLMENT_METHODS = Object.freeze(['pickup', 'courier', 'omniva_parcel_machine']);
export const FULFILLMENT_LABELS = Object.freeze({ pickup: 'Pickup', courier: 'Courier delivery', omniva_parcel_machine: 'Omniva parcel machine' });

export function fulfillmentFeeCents(method, deliverySettings) {
  if (method === 'pickup') return 0;
  if (method === 'courier') return deliverySettings.courierPriceCents;
  if (method === 'omniva_parcel_machine') return deliverySettings.omnivaParcelMachinePriceCents;
  throw new Error('invalid_checkout');
}

export function orderFulfillmentLabel(order) {
  return FULFILLMENT_LABELS[order?.fulfillmentMethod] ?? (order?.pickupLocation ? 'Pickup' : 'Pickup (legacy order)');
}

export function orderDeliveryDescription(order) {
  if (order?.fulfillmentMethod === 'pickup' || (!order?.fulfillmentMethod && order?.pickupLocation)) {
    const location = order.pickupLocation;
    return location ? [location.name, location.address].filter(Boolean).join(', ') : 'Pickup location unavailable';
  }
  if (order?.fulfillmentMethod === 'courier') return order.delivery?.address || 'Delivery address unavailable';
  if (order?.fulfillmentMethod === 'omniva_parcel_machine') return [order.delivery?.city, order.delivery?.address].filter(Boolean).join(', ') || 'Parcel machine unavailable';
  return 'Fulfillment details unavailable';
}

export function orderItemsSubtotalCents(order) {
  if (Number.isSafeInteger(order?.itemsSubtotalCents)) return order.itemsSubtotalCents;
  return Array.isArray(order?.items) ? order.items.reduce((sum, item) => sum + (Number.isSafeInteger(item.lineTotalCents) ? item.lineTotalCents : 0), 0) : 0;
}
