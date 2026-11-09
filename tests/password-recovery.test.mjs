import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getPasswordRecoveryCopy, requestPasswordRecovery } from '../lib/passwordRecovery.mjs';

test('password recovery validates the address before contacting Firebase', async () => {
  let calls = 0;
  const auth = { languageCode: 'de' };
  for (const [email, key] of [['', 'required'], ['not-an-email', 'invalid']]) {
    const result = await requestPasswordRecovery({ auth, email, locale: 'ru', sendResetEmail: async () => { calls++; } });
    assert.equal(result.error, getPasswordRecoveryCopy('ru')[key]);
  }
  assert.equal(calls, 0);
  assert.equal(auth.languageCode, 'de');
});

test('successful Firebase request returns identical neutral confirmation without revealing account existence', async () => {
  const auth = { languageCode: 'de' };
  let args;
  const result = await requestPasswordRecovery({
    auth, email: '  buyer@example.com  ', locale: 'lv',
    sendResetEmail: async (...values) => { args = values; },
  });
  assert.deepEqual(args, [auth, 'buyer@example.com']);
  assert.equal(auth.languageCode, 'de');
  assert.equal(result.message, getPasswordRecoveryCopy('lv').sent);
  assert.match(result.message, /Ja konts.*eksistē/);
});

test('network and Firebase rate-limit failures use the same non-enumerating message', async () => {
  const copy = getPasswordRecoveryCopy('en');
  for (const error of [new TypeError('offline'), Object.assign(new Error('limited'), { code: 'auth/too-many-requests' })]) {
    const result = await requestPasswordRecovery({ auth: {}, email: 'buyer@example.com', sendResetEmail: async () => { throw error; } });
    assert.deepEqual(result, { ok: false, error: copy.failed });
    assert.doesNotMatch(result.error, /registered|user-not-found|too-many-requests/i);
  }
});

test('Firebase user-not-found returns the same confirmation as a successful reset request', async () => {
  const auth = {};
  const success = await requestPasswordRecovery({ auth, email: 'buyer@example.com', sendResetEmail: async () => {} });
  const missing = await requestPasswordRecovery({ auth, email: 'buyer@example.com', sendResetEmail: async () => { throw Object.assign(new Error(), { code: 'auth/user-not-found' }); } });
  assert.deepEqual(missing, success);
});

test('English, Latvian and Russian copy is available and unknown locales safely fall back to English', () => {
  assert.equal(getPasswordRecoveryCopy('en').forgot, 'Forgot password?');
  assert.equal(getPasswordRecoveryCopy('lv').forgot, 'Aizmirsāt paroli?');
  assert.equal(getPasswordRecoveryCopy('ru').forgot, 'Забыли пароль?');
  assert.equal(getPasswordRecoveryCopy('xx'), getPasswordRecoveryCopy('en'));
});

test('AuthControl keeps recovery inside its drawer and does not alter checkout-intent handling', async () => {
  const source = await readFile(new URL('../app/components/AuthControl.js', import.meta.url), 'utf8');
  assert.match(source, /modalMode === 'recovery'/);
  assert.match(source, /setModalMode\('recovery'\)/);
  assert.match(source, /setModalMode\('login'\).*setRecoveryError/);
  assert.match(source, /if \(checkoutRequested && cartReady\) \{ router\.push\('\/checkout'\)/);
  assert.match(source, /sendPasswordResetEmail/);
  assert.doesNotMatch(source, /ActionCodeSettings|continueUrl|window\.location\.origin/);
});
