import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateDashboardData, calculateComparison, customerDisplayName, getDashboardMonthWindow } from '../lib/adminDashboardMetrics.mjs';

const order = (id, createdAt, totalCents, overrides = {}) => ({ id, createdAt, totalCents, orderStatus: 'processing', items: [], ...overrides });
const input = (overrides = {}) => ({ orders: [], users: [], pendingApplications: [], recentOrders: [], now: new Date('2026-01-15T12:00:00Z'), ...overrides });

test('uses Europe/Riga calendar month boundaries across a year change', () => {
  const month = getDashboardMonthWindow(new Date('2026-01-15T12:00:00Z'));
  assert.equal(month.previousStart.toISOString(), '2025-11-30T22:00:00.000Z');
  assert.equal(month.currentStart.toISOString(), '2025-12-31T22:00:00.000Z');
  assert.equal(month.nextStart.toISOString(), '2026-01-31T22:00:00.000Z');
  assert.equal(month.currentLabel, 'January 2026');
  assert.equal(month.previousLabel, 'December 2025');
  assert.equal(month.daysInCurrentMonth, 31);
});

test('calculates current KPIs, excludes cancelled orders, and compares with previous month', () => {
  const result = aggregateDashboardData(input({ orders: [
    order('previous', '2025-12-15T10:00:00Z', 10_000),
    order('one', '2026-01-02T10:00:00Z', 12_000),
    order('two', '2026-01-31T21:59:59Z', 8_000),
    order('cancelled', '2026-01-12T10:00:00Z', 99_000, { orderStatus: 'cancelled' }),
    order('next', '2026-01-31T22:00:00Z', 50_000),
  ] }));
  assert.equal(result.kpis.sales.value, 20_000);
  assert.equal(result.kpis.orders.value, 2);
  assert.deepEqual(Object.keys(result.kpis), ['sales', 'orders', 'customers']);
  assert.deepEqual(result.kpis.sales.comparison, { kind: 'percent', percent: 100 });
});

test('represents zero-baseline comparisons without dividing by zero', () => {
  assert.deepEqual(calculateComparison(0, 0), { kind: 'neutral', percent: null });
  assert.deepEqual(calculateComparison(12, 0), { kind: 'new', percent: null });
});

test('counts new customers while excluding administrative roles', () => {
  const result = aggregateDashboardData(input({ users: [
    { uid: 'customer', role: 'customer', createdAt: '2026-01-03T10:00:00Z' },
    { uid: 'applicant', role: 'customer', partnerStatus: 'pending', createdAt: '2026-01-04T10:00:00Z' },
    { uid: 'partner', role: 'partner', createdAt: '2026-01-05T10:00:00Z' },
    { uid: 'staff', role: 'staff', createdAt: '2026-01-06T10:00:00Z' },
    { uid: 'admin', role: 'admin', createdAt: '2026-01-07T10:00:00Z' },
    { uid: 'old', role: 'customer', createdAt: '2025-12-07T10:00:00Z' },
  ] }));
  assert.equal(result.kpis.customers.value, 3);
  assert.deepEqual(result.kpis.customers.comparison, { kind: 'percent', percent: 200 });
});

test('reports full pending-application counts while limiting and sorting previews', () => {
  const pendingApplications = Array.from({ length: 7 }, (_, index) => ({ uid: `u${index}`, partnerStatus: 'pending', createdAt: `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00Z` }));
  const result = aggregateDashboardData(input({ pendingApplications, pendingApplicationCount: 7 }));
  assert.equal(result.pendingApplications.count, 7);
  assert.deepEqual(result.pendingApplications.preview.map((item) => item.uid), ['u6', 'u5', 'u4', 'u3', 'u2']);
  assert.equal(Object.hasOwn(result, 'newOrders'), false);
});

test('limits recent orders to the ten newest and retains cancelled history', () => {
  const recentOrders = Array.from({ length: 12 }, (_, index) => order(`r${index}`, `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00Z`, 100, index === 10 ? { orderStatus: 'cancelled' } : {}));
  const result = aggregateDashboardData(input({ recentOrders }));
  assert.equal(result.recentOrders.length, 10);
  assert.equal(result.recentOrders[0].id, 'r11');
  assert.equal(result.recentOrders.at(-1).id, 'r2');
  assert.ok(result.recentOrders.some((item) => item.orderStatus === 'cancelled'));
});

test('groups daily sales in Riga and leaves days without sales at zero', () => {
  const result = aggregateDashboardData(input({ orders: [
    order('late', '2026-01-02T22:30:00Z', 700),
    order('same-day', '2026-01-03T10:00:00Z', 300),
    order('cancelled', '2026-01-03T11:00:00Z', 900, { orderStatus: 'cancelled' }),
  ] }));
  assert.equal(result.dailySales[2].salesCents, 1_000);
  assert.equal(result.dailySales[1].salesCents, 0);
});

test('uses stored line priceSource for sales breakdown and isolates legacy value', () => {
  const result = aggregateDashboardData(input({ orders: [
    order('mixed', '2026-01-03T10:00:00Z', 3_500, { deliveryFeeCents: 250, items: [{ lineTotalCents: 1_000, priceSource: 'retail' }, { lineTotalCents: 2_000, priceSource: 'wholesale' }] }),
    order('cancelled', '2026-01-04T10:00:00Z', 9_000, { orderStatus: 'cancelled', items: [{ lineTotalCents: 9_000, priceSource: 'retail' }] }),
  ] }));
  assert.deepEqual(result.breakdown, { retailCents: 1_000, wholesaleCents: 2_000, deliveryCents: 250, unclassifiedCents: 250 });
});

test('uses the canonical customer display fallback order', () => {
  assert.equal(customerDisplayName({ customer: { company: { name: 'Company' }, name: 'Person', email: 'person@example.com' } }), 'Company');
  assert.equal(customerDisplayName({ customer: {} }), 'Guest');
});
