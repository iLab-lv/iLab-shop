import { MAX_CART_QUANTITY, normalizeCartItems } from './commerce.mjs';

export const ACCOUNT_CART_COLLECTION = 'shopCarts';
export const MAX_ACCOUNT_CART_OPERATIONS = 100;
const OPERATION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AccountCartInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AccountCartInputError';
  }
}

function cartItems(value) {
  try {
    return normalizeCartItems(value);
  } catch {
    throw new AccountCartInputError('Use at most 100 products with quantities from 1 to 99. Your cart has not been changed.');
  }
}

export function normalizeAccountCartState(value) {
  return {
    items: cartItems(value?.items ?? []),
    revision: Number.isSafeInteger(value?.revision) && value.revision >= 0 ? value.revision : 0,
    appliedOperationIds: Array.isArray(value?.appliedOperationIds)
      ? value.appliedOperationIds.filter((id) => typeof id === 'string' && OPERATION_ID.test(id)).map((id) => id.toLowerCase()).slice(-MAX_ACCOUNT_CART_OPERATIONS)
      : [],
  };
}

export function applyAccountCartOperation(value, input) {
  const state = normalizeAccountCartState(value);
  if (!input || typeof input.operationId !== 'string' || !OPERATION_ID.test(input.operationId)) {
    throw new AccountCartInputError('A valid cart request identifier is required.');
  }
  const operationId = input.operationId.toLowerCase();
  if (state.appliedOperationIds.includes(operationId)) return { ...state, repeated: true };

  let items;
  if (input.type === 'merge') {
    const quantities = new Map(state.items.map((item) => [item.productId, item.quantity]));
    for (const item of cartItems(input.items)) {
      quantities.set(item.productId, Math.max(quantities.get(item.productId) ?? 0, item.quantity));
    }
    items = cartItems([...quantities].map(([productId, quantity]) => ({ productId, quantity })));
  } else if (input.type === 'add' || input.type === 'set') {
    const [line] = cartItems([{ productId: input.productId, quantity: input.quantity }]);
    const existing = state.items.find((item) => item.productId === line.productId);
    const quantity = line.quantity + (input.type === 'add' ? existing?.quantity ?? 0 : 0);
    if (quantity > MAX_CART_QUANTITY) throw new AccountCartInputError('A product quantity cannot exceed 99. Your cart has not been changed.');
    items = cartItems(existing
      ? state.items.map((item) => item.productId === line.productId ? { ...line, quantity } : item)
      : [...state.items, line]);
  } else if (input.type === 'remove') {
    const [line] = cartItems([{ productId: input.productId, quantity: 1 }]);
    items = state.items.filter((item) => item.productId !== line.productId);
  } else if (input.type === 'clear') {
    items = [];
  } else {
    throw new AccountCartInputError('Choose a valid cart action.');
  }
  return {
    items,
    revision: state.revision + 1,
    appliedOperationIds: [...state.appliedOperationIds, operationId].slice(-MAX_ACCOUNT_CART_OPERATIONS),
    repeated: false,
  };
}

// Used in the successful Order transaction; concurrent additions remain saved.
export function subtractPurchasedCartItems(value, purchasedValue) {
  const purchased = new Map(cartItems(purchasedValue).map((item) => [item.productId, item.quantity]));
  return cartItems(value).flatMap((item) => {
    const quantity = item.quantity - (purchased.get(item.productId) ?? 0);
    return quantity > 0 ? [{ productId: item.productId, quantity }] : [];
  });
}
