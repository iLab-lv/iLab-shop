import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAdminOrders, formatOrderDate, formatOrderReference, getOrderCustomerLabels, getOrderDisplayReference, getOrderFulfillmentSummary } from '../lib/orderDisplay.mjs';
import { formatInvoiceNumber } from '../lib/invoices/invoiceModel.mjs';

test('Order display reference reuses the Invoice year and sequence without another counter', () => {
  const order = { id: 'internal-uuid', orderSequenceYear: 2026, orderSequenceNumber: 15 };
  assert.equal(formatOrderReference(2026, 15), '#2026-000015');
  assert.equal(getOrderDisplayReference(order), '#2026-000015');
  assert.equal(formatInvoiceNumber('SH', 2026, 15), 'SH - 2026 - 000015');
});

test('Order reference prefers its stored snapshot and can use structured legacy Invoice sequence', () => {
  assert.equal(getOrderDisplayReference({ id: 'uuid', orderReference: '#2026-000015', orderSequenceYear: 2026, orderSequenceNumber: 15 }), '#2026-000015');
  assert.equal(getOrderDisplayReference({ id: 'uuid', invoice: { sequenceYear: 2026, sequenceNumber: 15 } }), '#2026-000015');
});

test('legacy Order without sequence metadata falls back to a short UUID reference', () => {
  assert.equal(getOrderDisplayReference({ id: '0c05dd0f-fbcd-466b-95d6-a94943fbb19a' }), '#0c05dd0f');
});

test('company customer label takes priority while private customer remains primary', () => {
  assert.deepEqual(getOrderCustomerLabels({ customer: { name: 'Askold Makrikov', company: { name: 'SIA Example' } } }), { primary: 'SIA Example', secondary: 'Askold Makrikov' });
  assert.deepEqual(getOrderCustomerLabels({ customer: { name: 'Askold Makrikov' } }), { primary: 'Askold Makrikov', secondary: '' });
});

test('collapsed fulfillment summary is concise for pickup, courier, Omniva and legacy pickup', () => {
  assert.equal(getOrderFulfillmentSummary({ fulfillmentMethod: 'pickup', pickupLocation: { name: 'Domina', address: 'Long street address' } }), 'Pickup');
  assert.equal(getOrderFulfillmentSummary({ fulfillmentMethod: 'courier', delivery: { address: 'Long street address' } }), 'Courier');
  assert.equal(getOrderFulfillmentSummary({ fulfillmentMethod: 'omniva_parcel_machine', delivery: { city: 'Rīga', address: 'Long street address' } }), 'Omniva');
  assert.equal(getOrderFulfillmentSummary({ pickupLocation: { name: 'Spice', address: 'Long street address' } }), 'Pickup');
});

test('local order search matches references, invoice, customer, company and email case-insensitively', () => {
  const orders = [{ id: 'uuid-1', orderReference: '#2026-000015', invoice: { number: 'SH - 2026 - 000015' }, customer: { name: 'Askold Makrikov', email: 'askold@example.com', company: { name: 'SIA Example' } }, orderStatus: 'new', paymentStatus: 'pending' }];
  for (const search of ['#2026-000015', 'sh - 2026', 'ASKOLD', 'sia example', 'ASKOLD@EXAMPLE.COM']) assert.equal(filterAdminOrders(orders, { search }).length, 1, search);
  assert.equal(filterAdminOrders(orders, { search: 'not found' }).length, 0);
});

test('status, payment and text filters combine as an intersection', () => {
  const orders = [
    { id: 'a', orderReference: '#2026-000001', customer: { name: 'Ava' }, orderStatus: 'new', paymentStatus: 'pending' },
    { id: 'b', orderReference: '#2026-000002', customer: { name: 'Ava' }, orderStatus: 'ready', paymentStatus: 'paid' },
  ];
  assert.deepEqual(filterAdminOrders(orders, { search: 'ava', orderStatus: 'ready', paymentStatus: 'paid' }).map((order) => order.id), ['b']);
  assert.deepEqual(filterAdminOrders(orders, { orderStatus: 'new', paymentStatus: 'paid' }), []);
});

test('collapsed date is Riga-local and omits the time', () => {
  const date = formatOrderDate(new Date('2026-10-15T10:38:57.000Z'));
  assert.equal(date, '15 Oct');
});
