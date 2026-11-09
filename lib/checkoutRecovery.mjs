export const ORDER_REQUEST_COLLECTION = 'shopOrderRequests';
export const isOrderRequestId = (value) => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const key = (uid) => `ilab_shop_checkout_v1:${uid}`;

// Persist only identity, never customer details, prices or authorization.
export function readCheckoutAttempt(storage, uid) {
  const value = storage.getItem(key(uid));
  if (value !== null && !isOrderRequestId(value)) throw new Error('The saved checkout reference needs review. Check your Account orders or contact support.');
  return value;
}
export function beginCheckoutAttempt(storage, uid, uuid) {
  const existing = readCheckoutAttempt(storage, uid);
  if (existing) return existing;
  const requestId = uuid();
  if (!isOrderRequestId(requestId)) throw new Error('Unable to create a checkout reference.');
  storage.setItem(key(uid), requestId);
  return requestId;
}
export function forgetCheckoutAttempt(storage, uid, requestId) {
  if (readCheckoutAttempt(storage, uid) === requestId) storage.removeItem(key(uid));
}
