import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLOSED_EDITOR_STATE,
  createSubmissionGuard,
  isAccordionActivationKey,
  transitionEditorAccordion,
} from '../lib/adminEditingState.mjs';

test('only one editor is open within an accordion state', () => {
  const first = transitionEditorAccordion(CLOSED_EDITOR_STATE, { type: 'open', id: 'a' }).state;
  const second = transitionEditorAccordion(first, { type: 'open', id: 'b' }).state;
  assert.deepEqual(first, { openId: 'a', dirty: false });
  assert.deepEqual(second, { openId: 'b', dirty: false });
});

test('separate section states remain independent', () => {
  const products = transitionEditorAccordion(CLOSED_EDITOR_STATE, { type: 'open', id: 'product-a' }).state;
  const devices = transitionEditorAccordion(CLOSED_EDITOR_STATE, { type: 'open', id: 'device-a' }).state;
  const nextProducts = transitionEditorAccordion(products, { type: 'open', id: 'product-b' }).state;
  assert.equal(nextProducts.openId, 'product-b');
  assert.equal(devices.openId, 'device-a');
});

test('dirty editors require confirmation before close or switch', () => {
  const dirty = { openId: 'a', dirty: true };
  const rejected = transitionEditorAccordion(dirty, { type: 'open', id: 'b' });
  assert.equal(rejected.needsConfirmation, true);
  assert.equal(rejected.state, dirty);
  assert.deepEqual(transitionEditorAccordion(dirty, { type: 'close' }, true).state, CLOSED_EDITOR_STATE);
  assert.deepEqual(transitionEditorAccordion(dirty, { type: 'open', id: 'b' }, true).state, { openId: 'b', dirty: false });
});

test('saved editors clear dirty state without closing', () => {
  assert.deepEqual(
    transitionEditorAccordion({ openId: 'a', dirty: true }, { type: 'saved' }).state,
    { openId: 'a', dirty: false }
  );
});

test('Enter and Space are accordion activation keys', () => {
  assert.equal(isAccordionActivationKey('Enter'), true);
  assert.equal(isAccordionActivationKey(' '), true);
  assert.equal(isAccordionActivationKey('Escape'), false);
});

test('submission guard prevents duplicate requests and unlocks after completion', async () => {
  let release;
  let calls = 0;
  const pending = new Promise((resolve) => { release = resolve; });
  const run = createSubmissionGuard();
  const first = run(async () => { calls += 1; await pending; });
  const duplicate = await run(async () => { calls += 1; });
  assert.equal(duplicate, false);
  assert.equal(calls, 1);
  release();
  assert.equal(await first, true);
  assert.equal(await run(async () => { calls += 1; }), true);
  assert.equal(calls, 2);
});

test('submission guard unlocks after a failed save while preserving the error', async () => {
  const run = createSubmissionGuard();
  await assert.rejects(run(async () => { throw new Error('save failed'); }), /save failed/);
  assert.equal(await run(async () => {}), true);
});
