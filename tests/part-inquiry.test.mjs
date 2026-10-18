import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterAdminInquiries, inquirySourceLabel, INQUIRY_STATUSES, normalizeShopSourcePath, resolveProductAvailabilitySnapshot, validateInquiryPayload } from '../lib/partInquiry.mjs';

const valid = (overrides = {}) => ({ source: 'model', modelId: 'iphone_15_pro', brandId: 'iphone', requestedPart: 'Charging port flex', contact: { name: 'Ada Customer', email: 'ada@example.com' }, sourcePath: '/shop/iphone/iphone-15-pro', ...overrides });
const source = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Model inquiry keeps the manually entered requested part independent of Product filters', () => {
  const result = validateInquiryPayload(valid({ activeProductType: 'Displays', filter: 'Displays' }));
  assert.equal(result.ok, true);
  assert.equal(result.inquiry.modelId, 'iphone_15_pro');
  assert.equal(result.inquiry.requestedPart, 'Charging port flex');
  assert.equal(Object.hasOwn(result.inquiry, 'activeProductType'), false);
  assert.equal(validateInquiryPayload(valid({ modelName: 'Tampered browser value' })).inquiry.modelName, '');
});

test('Brand inquiry accepts an unknown manually entered Model and leaves model ID null', () => {
  const result = validateInquiryPayload(valid({ source: 'brand', brandId: 'samsung', modelName: 'Galaxy S99 Ultra' }));
  assert.equal(result.ok, true);
  assert.equal(result.inquiry.modelName, 'Galaxy S99 Ultra');
  assert.equal(result.inquiry.modelId, null);
});

test('Search text is context only and never fills manual model or requested part', () => {
  const result = validateInquiryPayload(valid({ source: 'search', modelName: 'iPhone 15 Pro', searchQuery: 'iphone camera glass', requestedPart: 'Rear camera glass' }));
  assert.equal(result.ok, true);
  assert.equal(result.inquiry.searchQuery, 'iphone camera glass');
  assert.equal(result.inquiry.modelName, 'iPhone 15 Pro');
  assert.equal(result.inquiry.requestedPart, 'Rear camera glass');
  assert.equal(validateInquiryPayload(valid({ source: 'search', searchQuery: 'iphone camera glass' })).ok, false);
});

test('Product availability request needs Product identity, not a manually entered requested part', () => {
  const result = validateInquiryPayload(valid({ source: 'product', productId: 'product-123', productName: 'Fake name', sku: 'FAKE', requestedPart: '' }));
  assert.equal(result.ok, true);
  assert.equal(result.inquiry.productId, 'product-123');
  assert.equal(result.inquiry.requestedPart, '');
  assert.equal(validateInquiryPayload(valid({ source: 'product', productId: 'bad/id', requestedPart: '' })).ok, false);
  assert.equal(validateInquiryPayload(valid({ source: 'product', requestedPart: '' })).ok, false);
});

test('availability snapshot trusts canonical Product fields, requires stock to be the purchase blocker, and keeps model context', () => {
  const product = { id: 'product-123', name: 'Display for iPhone 15 Pro', slug: 'display-iphone-15-pro', sku: 20316, status: 'active', stockQty: 0, retailPriceCents: 5000, wholesalePriceCents: 4200 };
  const request = resolveProductAvailabilitySnapshot(product, { compatibleModelNames: ['iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 15 Pro'] });
  assert.deepEqual(request, { ok: true, snapshot: { productId: 'product-123', productName: 'Display for iPhone 15 Pro', productSlug: 'display-iphone-15-pro', sku: 20316, requestedPart: 'Display for iPhone 15 Pro', stockQtyAtRequest: 0, compatibleModelNames: ['iPhone 15 Pro', 'iPhone 15 Pro Max'] } });
  assert.equal(resolveProductAvailabilitySnapshot({ ...product, stockQty: 2 }).reason, 'available');
  assert.equal(resolveProductAvailabilitySnapshot({ ...product, retailPriceCents: null, wholesalePriceCents: null }).reason, 'missing_price');
  assert.equal(resolveProductAvailabilitySnapshot({ ...product, status: 'inactive' }).reason, 'not_available');
});

test('name and manually entered requested part are required; message is optional', () => {
  assert.equal(validateInquiryPayload(valid({ requestedPart: '' })).ok, false);
  assert.equal(validateInquiryPayload(valid({ contact: { email: 'ada@example.com' } })).ok, false);
  assert.equal(validateInquiryPayload(valid({ message: '' })).ok, true);
});

test('at least one valid contact channel is required; email-only, phone-only, and both are accepted', () => {
  assert.equal(validateInquiryPayload(valid({ contact: { name: 'Ada', email: '', phone: '' } })).ok, false);
  assert.equal(validateInquiryPayload(valid({ contact: { name: 'Ada', email: 'ada@example.com', phone: '' } })).ok, true);
  assert.equal(validateInquiryPayload(valid({ contact: { name: 'Ada', email: '', phone: '+371 20000000' } })).ok, true);
  assert.equal(validateInquiryPayload(valid({ contact: { name: 'Ada', email: 'ada@example.com', phone: '+371 20000000' } })).ok, true);
  assert.equal(validateInquiryPayload(valid({ contact: { name: 'Ada', email: 'not-an-email', phone: '' } })).ok, false);
});

test('guest and authenticated IDs are represented safely by the server writer; honeypot is ignored', async () => {
  const route = await source('../app/api/inquiries/route.js');
  const writer = await source('../lib/shopInquiries.js');
  assert.match(route, /let userId = null/);
  assert.match(route, /verifyFirebaseRequest\(request\)/);
  assert.match(writer, /userId: typeof userId === 'string' && userId \? userId : null/);
  assert.match(writer, /if \(validation\.ignored\) return \{ ok: true, ignored: true \}/);
  assert.equal(validateInquiryPayload(valid({ website: 'bot-filled' })).ignored, true);
});

test('known Model and Brand names are resolved from active Shop catalog records on the server', async () => {
  const writer = await source('../lib/shopInquiries.js');
  assert.match(writer, /collection\('shopDevices'\)\.doc\(inquiry\.modelId\)/);
  assert.match(writer, /collection\('shopDevices'\)\.doc\(inquiry\.brandId\)/);
  assert.match(writer, /modelName: model\.name \|\| modelSnapshot\.id/);
  assert.match(writer, /brandName: brand\.name \|\| brandSnapshot\.id/);
  assert.match(writer, /brandId: brandSnapshot\.id[\s\S]*modelName: model\.name/);
});

test('public form is shared by Model, Brand, and actual Search panel, with blank requestedPart state', async () => {
  const [component, modelPage, brandPage, directory, searchPanel] = await Promise.all([
    source('../app/components/shop/PartInquiryCard.js'),
    source('../app/(shop)/[brand]/[device]/page.js'),
    source('../app/(shop)/[brand]/page.js'),
    source('../app/components/shop/BrandModelDirectory.js'),
    source('../app/components/shop/SearchPanel.js'),
  ]);
  assert.match(component, /\[requestedPart, setRequestedPart\] = useState\(''\)/);
  assert.match(modelPage, /PartInquiryCard source="model"/);
  assert.match(brandPage, /<BrandModelDirectory brand=\{data\.brand\} series=\{data\.series\} \/>/);
  assert.match(directory, /PartInquiryCard source="brand"/);
  assert.match(searchPanel, /PartInquiryCard source="search"/);
  assert.match(searchPanel, /prominent=\{products\.length === 0\}/);
});

test('out-of-stock Product cards, Search results, and Product page use the shared availability inquiry', async () => {
  const [card, searchPanel, purchase, productPage, inquiry] = await Promise.all([
    source('../app/components/ProductCard.js'), source('../app/components/shop/SearchPanel.js'), source('../app/components/shop/ProductPurchase.js'), source('../app/(shop)/product/[slug]/page.js'), source('../app/components/shop/PartInquiryCard.js'),
  ]);
  for (const component of [card, searchPanel, purchase]) {
    assert.match(component, /resolveProductLine/);
    assert.match(component, /unavailableReason === 'out_of_stock'/);
    assert.match(component, /PartInquiryCard source="product"/);
  }
  assert.match(productPage, /compatibleModelNames/);
  assert.match(inquiry, /inquiry\.productId = product\?\.id/);
  assert.doesNotMatch(inquiry, /productName:\s*product/);
  assert.doesNotMatch(inquiry, /sku:\s*product/);
  assert.match(inquiry, /Request availability/);
  assert.match(inquiry, /Send request/);
});

test('profile prefill is read-only and submission uses only the inquiry endpoint', async () => {
  const component = await source('../app/components/shop/PartInquiryCard.js');
  assert.match(component, /fetch\('\/shop\/api\/users\/me'/);
  assert.match(component, /fetch\('\/shop\/api\/inquiries'/);
  assert.doesNotMatch(component, /method:\s*'PATCH'/);
  assert.doesNotMatch(component, /updateCustomerProfileDefaults/);
});

test('status values, Admin search/filter, and labels are exact', async () => {
  const items = [
    { status: 'new', source: 'model', modelName: 'iPhone 15 Pro', requestedPart: 'OLED display', contact: { name: 'Ada', email: 'ada@example.com' } },
    { status: 'contacted', source: 'brand', modelName: 'Galaxy S99 Ultra', requestedPart: 'Flex cable', contact: { name: 'Bob', phone: '200' } },
    { status: 'resolved', source: 'search', modelName: 'Pixel 9', requestedPart: 'Glass', searchQuery: 'pixel screen', contact: { name: 'Cara' } },
  ];
  assert.deepEqual(filterAdminInquiries(items, { search: 'ADA@EXAMPLE.COM', status: 'new' }), [items[0]]);
  assert.deepEqual(filterAdminInquiries(items, { search: 'galaxy' }), [items[1]]);
  assert.deepEqual(filterAdminInquiries(items, { status: 'resolved' }), [items[2]]);
  assert.deepEqual(INQUIRY_STATUSES, ['new', 'contacted', 'resolved']);
  assert.deepEqual(['model', 'brand', 'search'].map(inquirySourceLabel), ['Model page', 'Brand page', 'Search']);
  assert.equal(inquirySourceLabel('product'), 'Availability');
  const availability = { status: 'new', source: 'product', requestedPart: 'Display for iPhone 15 Pro', productName: 'Display for iPhone 15 Pro', sku: 20316, compatibleModelNames: ['iPhone 15 Pro', 'iPhone 15 Pro Max'], contact: { name: 'Dee', email: 'dee@example.com' } };
  assert.deepEqual(filterAdminInquiries([availability], { search: '20316' }), [availability]);
  assert.deepEqual(filterAdminInquiries([availability], { search: 'iphone 15 pro max' }), [availability]);
  const admin = await source('../app/admin/inquiries/InquiriesManager.js');
  assert.match(admin, /Availability at request time/);
  assert.match(admin, /productSlug/);
  assert.match(admin, /compatibleModelNames/);
});

test('Admin list and mutation APIs are protected; public API has no inquiry read method', async () => {
  const [publicRoute, adminList, adminItem, helper] = await Promise.all([
    source('../app/api/inquiries/route.js'), source('../app/api/admin/inquiries/route.js'), source('../app/api/admin/inquiries/[id]/route.js'), source('../lib/shopInquiries.js'),
  ]);
  assert.match(publicRoute, /export async function POST/);
  assert.doesNotMatch(publicRoute, /export async function GET/);
  assert.match(adminList, /getShopAdminSession\(\)/);
  assert.match(adminItem, /authorizeAdminMutation\(request, PERMISSIONS\.ACCESS_SHOP_ADMIN\)/);
  assert.match(helper, /status, updatedAt: serverTimestamp\(\)/);
  assert.match(helper, /status: 'new'/);
  assert.match(helper, /orderBy\('createdAt', 'desc'\)\.get\(\)/);
  assert.match(helper, /collection\('shopProducts'\)\.doc\(inquiry\.productId\)/);
  assert.match(helper, /This product is now available to order/);
  assert.match(helper, /compatibleModelNames: modelIds\.map/);
  assert.doesNotMatch(helper, /input\.(?:productName|sku|productSlug)/);
  const dashboard = await source('../lib/adminDashboard.js');
  assert.match(dashboard, /countNewInquiries\(\)/);
  assert.match(dashboard, /newInquiriesCount:\s*newInquiryCount/);
});

test('source paths must be same-site Shop paths and query/hash are not retained', () => {
  assert.equal(normalizeShopSourcePath('/shop/iphone/iphone-15-pro?type=display#results'), '/shop/iphone/iphone-15-pro');
  assert.equal(normalizeShopSourcePath('/shop'), '/shop');
  assert.equal(normalizeShopSourcePath('https://example.com/shop/iphone'), '');
  assert.equal(normalizeShopSourcePath('/admin/inquiries'), '');
});
