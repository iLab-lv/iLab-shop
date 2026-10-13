import { normalizeCartItems, PAYMENT_METHODS } from './commerce.mjs';
import { validateCustomerProfileDefaults } from './auth/userModel.mjs';

function cleanText(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max) throw new Error('invalid_checkout');
  const result = value.trim();
  if (required && !result) throw new Error('invalid_checkout');
  return result;
}

export function validateCheckoutInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_checkout');
  if (typeof input.saveToProfile !== 'boolean') throw new Error('invalid_checkout');

  const email = cleanText(input.customer?.email, 254, true).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('invalid_checkout');

  let customer;
  try {
    customer = validateCustomerProfileDefaults({
      name: input.customer?.name,
      phone: input.customer?.phone,
      company: {
        name: cleanText(input.customer?.company?.name ?? '', 200),
        registrationNumber: cleanText(input.customer?.company?.registrationNumber ?? '', 80),
        vatNumber: cleanText(input.customer?.company?.vatNumber ?? '', 80),
      },
      billingAddress: cleanText(input.customer?.billingAddress ?? '', 500),
    });
  } catch {
    throw new Error('invalid_checkout');
  }

  const pickupLocationId = cleanText(input.pickupLocationId, 80, true);
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) throw new Error('invalid_checkout');

  return {
    customer: { ...customer, email },
    saveToProfile: input.saveToProfile,
    pickupLocationId,
    paymentMethod: input.paymentMethod,
    items: normalizeCartItems(input.items),
    expectedTotalCents: Number.isInteger(input.expectedTotalCents) && input.expectedTotalCents >= 0 ? input.expectedTotalCents : null,
    requestId: typeof input.requestId === 'string' && /^[a-f0-9-]{36}$/i.test(input.requestId) ? input.requestId : null,
  };
}
