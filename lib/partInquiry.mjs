import { resolveProductLine } from './commerce.mjs';

export const INQUIRY_SOURCES = Object.freeze(['model', 'brand', 'search', 'product']);
export const INQUIRY_STATUSES = Object.freeze(['new', 'contacted', 'resolved']);

const text = (value) => typeof value === 'string' ? value.trim() : '';
const within = (value, max) => value.length <= max;

export function normalizeShopSourcePath(value) {
  const raw = text(value);
  if (!raw || raw.length > 500 || (raw !== '/shop' && !raw.startsWith('/shop/'))) return '';
  try {
    const url = new URL(raw, 'https://shop.invalid');
    if (url.origin !== 'https://shop.invalid' || (url.pathname !== '/shop' && !url.pathname.startsWith('/shop/'))) return '';
    return url.pathname;
  } catch { return ''; }
}

export function validateInquiryPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Please check the inquiry details and try again.' };
  if (text(input.website)) return { ok: true, ignored: true };
  const source = text(input.source);
  if (!INQUIRY_SOURCES.includes(source)) return { ok: false, error: 'This inquiry source is not valid.' };
  const contactInput = input.contact && typeof input.contact === 'object' ? input.contact : {};
  const contact = { name: text(contactInput.name), email: text(contactInput.email), phone: text(contactInput.phone) };
  const modelName = text(input.modelName), requestedPart = text(input.requestedPart), message = text(input.message);
  const productId = text(input.productId);
  const searchQuery = text(input.searchQuery);
  const sourcePath = normalizeShopSourcePath(input.sourcePath);
  if (!contact.name || !within(contact.name, 120)) return { ok: false, error: 'Enter your name (up to 120 characters).' };
  if (!within(contact.email, 254) || (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))) return { ok: false, error: 'Enter a valid email address.' };
  if (!within(contact.phone, 50)) return { ok: false, error: 'Phone must be 50 characters or fewer.' };
  if (!contact.email && !contact.phone) return { ok: false, error: 'Add an email address or phone number so we can contact you.' };
  if (source === 'product' && (!productId || productId.length > 256 || productId.includes('/') || /[\u0000-\u001f\u007f]/.test(productId))) return { ok: false, error: 'The product context is missing. Please refresh and try again.' };
  if (source !== 'product' && (!requestedPart || !within(requestedPart, 250))) return { ok: false, error: 'Enter the part you need (up to 250 characters).' };
  if (!within(message, 2000)) return { ok: false, error: 'Additional details must be 2,000 characters or fewer.' };
  if ((source === 'brand' || source === 'search') && (!modelName || !within(modelName, 150))) return { ok: false, error: 'Enter the device or model (up to 150 characters).' };
  if (source === 'model' && (input.modelId == null || typeof input.modelId !== 'string' || !input.modelId.trim())) return { ok: false, error: 'The device context is missing. Please refresh and try again.' };
  if (source === 'brand' && (input.brandId == null || typeof input.brandId !== 'string' || !input.brandId.trim())) return { ok: false, error: 'The brand context is missing. Please refresh and try again.' };
  if (source === 'search' && !within(searchQuery, 300)) return { ok: false, error: 'Search context is too long.' };
  if (!sourcePath) return { ok: false, error: 'The page context is not valid. Please refresh and try again.' };
  return { ok: true, inquiry: { source, productId: source === 'product' ? productId : null, brandId: source === 'brand' ? input.brandId.trim() : null, modelId: source === 'model' ? input.modelId.trim() : null, modelName: source === 'model' || source === 'product' ? '' : modelName, requestedPart: source === 'product' ? '' : requestedPart, message, searchQuery: source === 'search' && searchQuery ? searchQuery.slice(0, 300) : null, sourcePath, contact } };
}

export function resolveProductAvailabilitySnapshot(product, { canUseWholesale = false, compatibleModelNames = [] } = {}) {
  if (!product || product.status !== 'active') return { ok: false, reason: 'not_available' };
  const line = resolveProductLine(product, 1, canUseWholesale);
  if (line.unavailableReason !== 'out_of_stock') return { ok: false, reason: line.unavailableReason || 'available' };
  const productName = text(product.name);
  if (!productName) return { ok: false, reason: 'not_available' };
  return { ok: true, snapshot: {
    productId: product.id,
    productName,
    productSlug: text(product.slug),
    sku: Number.isInteger(product.sku) ? product.sku : null,
    requestedPart: productName,
    stockQtyAtRequest: line.stockQty,
    compatibleModelNames: [...new Set(compatibleModelNames.map(text).filter(Boolean))],
  } };
}

export function filterAdminInquiries(inquiries, { search = '', status = 'all' } = {}) {
  const query = text(search).toLocaleLowerCase();
  return (Array.isArray(inquiries) ? inquiries : []).filter((item) => {
    if (status !== 'all' && item.status !== status) return false;
    if (!query) return true;
    const haystack = [item.contact?.name, item.contact?.email, item.contact?.phone, item.modelName, item.brandName, item.requestedPart, item.productName, item.sku, ...(item.compatibleModelNames ?? []), item.message, item.searchQuery].filter(Boolean).join(' ').toLocaleLowerCase();
    return haystack.includes(query);
  });
}

export function inquirySourceLabel(source) {
  return ({ model: 'Model page', brand: 'Brand page', search: 'Search', product: 'Availability' })[source] ?? 'Unknown';
}
