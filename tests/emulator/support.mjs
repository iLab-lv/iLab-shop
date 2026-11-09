import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync } from 'node:crypto';
import assert from 'node:assert/strict';
import { initializeApp as initializeClientApp, deleteApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore as getClientFirestore } from 'firebase/firestore';
import { getStorage as getClientStorage } from 'firebase/storage';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export const EMULATOR_PROJECT_ID = 'demo-ilab-shop-s21';
export const EMULATOR_HOSTS = Object.freeze({
  auth: Object.freeze({ host: '127.0.0.1', port: 9099 }),
  firestore: Object.freeze({ host: '127.0.0.1', port: 8080 }),
  storage: Object.freeze({ host: '127.0.0.1', port: 9199 }),
});

let testEnvironment;
let adminApp;
let adminStorageBucket;
let identityCounter = 0;

function parseHostPort(value, variable) {
  const match = typeof value === 'string' && /^(127\.0\.0\.1):(\d+)$/.exec(value);
  if (!match) throw new Error(`${variable} must point to the local Firebase emulator.`);
  return { host: match[1], port: Number(match[2]) };
}

// Call before creating any Firebase app or SDK client. The harness never loads
// .env files or reads production Firebase credentials.
export function assertEmulatorConfiguration() {
  const projectValues = ['GCLOUD_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'FIREBASE_PROJECT_ID']
    .map((key) => process.env[key])
    .filter((value) => value !== undefined && value !== '');
  if (!projectValues.length || projectValues.some((value) => value !== EMULATOR_PROJECT_ID)) {
    throw new Error('Refusing Firebase tests: project environment must be explicitly set to demo-ilab-shop-s21.');
  }
  const credentialVariables = ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
  if (credentialVariables.some((key) => process.env[key])) throw new Error('Refusing emulator tests while external Firebase credentials are present.');
  const configured = {
    auth: parseHostPort(process.env.FIREBASE_AUTH_EMULATOR_HOST, 'FIREBASE_AUTH_EMULATOR_HOST'),
    firestore: parseHostPort(process.env.FIRESTORE_EMULATOR_HOST, 'FIRESTORE_EMULATOR_HOST'),
    storage: parseHostPort(process.env.FIREBASE_STORAGE_EMULATOR_HOST, 'FIREBASE_STORAGE_EMULATOR_HOST'),
  };
  for (const name of Object.keys(EMULATOR_HOSTS)) {
    const expected = EMULATOR_HOSTS[name];
    if (configured[name].host !== expected.host || configured[name].port !== expected.port) {
      throw new Error(`Refusing Firebase test: ${name} emulator must be ${expected.host}:${expected.port}.`);
    }
  }
  process.env.GCLOUD_PROJECT = EMULATOR_PROJECT_ID;
  process.env.FIREBASE_PROJECT_ID = EMULATOR_PROJECT_ID;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_HOSTS.auth.host}:${EMULATOR_HOSTS.auth.port}`;
  process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOSTS.firestore.host}:${EMULATOR_HOSTS.firestore.port}`;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${EMULATOR_HOSTS.storage.host}:${EMULATOR_HOSTS.storage.port}`;
  process.env.STORAGE_EMULATOR_HOST = `http://${EMULATOR_HOSTS.storage.host}:${EMULATOR_HOSTS.storage.port}`;
  return true;
}

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function startFirebaseEmulatorTest() {
  assertEmulatorConfiguration();
  if (!testEnvironment) {
    const firestoreRules = await readFile(path.join(repositoryRoot, 'firebase/firestore.proposed.rules'), 'utf8');
    const storageRules = await readFile(path.join(repositoryRoot, 'firebase/storage.rules'), 'utf8');
    testEnvironment = await initializeTestEnvironment({
      projectId: EMULATOR_PROJECT_ID,
      firestore: { host: EMULATOR_HOSTS.firestore.host, port: EMULATOR_HOSTS.firestore.port, rules: firestoreRules },
      storage: { host: EMULATOR_HOSTS.storage.host, port: EMULATOR_HOSTS.storage.port, rules: storageRules },
    });
    if (!admin.apps.length) {
      const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
      adminApp = admin.initializeApp({
        projectId: EMULATOR_PROJECT_ID,
        storageBucket: `${EMULATOR_PROJECT_ID}.appspot.com`,
        credential: admin.credential.cert({ projectId: EMULATOR_PROJECT_ID, clientEmail: 'synthetic-emulator-test@demo-ilab-shop-s21.invalid', privateKey }),
      }, `shop-s21-emulator-${process.pid}`);
    } else {
      adminApp = admin.apps.find((app) => app.name === `shop-s21-emulator-${process.pid}`);
    }
    if (!adminApp || adminApp.options.projectId !== EMULATOR_PROJECT_ID) throw new Error('Admin SDK did not initialize for the guarded emulator project.');
    adminStorageBucket = getStorage(adminApp).bucket(`${EMULATOR_PROJECT_ID}.appspot.com`);
  }
  return { environment: testEnvironment, db: getFirestore(adminApp), auth: admin.auth(adminApp), bucket: adminStorageBucket };
}

export async function stopFirebaseEmulatorTest() {
  if (testEnvironment) await testEnvironment.cleanup();
  testEnvironment = undefined;
  if (adminApp) await adminApp.delete();
  adminApp = undefined;
  adminStorageBucket = undefined;
}

export async function clearEmulatorData() {
  const { environment } = await startFirebaseEmulatorTest();
  await environment.clearFirestore();
  await environment.clearStorage();
  await admin.auth(adminApp).deleteUsers((await admin.auth(adminApp).listUsers(1000)).users.map((user) => user.uid));
}

export function newTestIdentity(label = 'customer') {
  const suffix = `${process.pid}-${++identityCounter}-${Math.random().toString(36).slice(2, 9)}`;
  return { uid: `${label}-${suffix}`, email: `${label}-${suffix}@example.invalid`, password: `S21-Test-${identityCounter}-Only!` };
}

export function clientApp(name = `shop-s21-client-${process.pid}-${++identityCounter}`) {
  assertEmulatorConfiguration();
  const app = initializeClientApp({ apiKey: 'demo-api-key', authDomain: `${EMULATOR_PROJECT_ID}.firebaseapp.com`, projectId: EMULATOR_PROJECT_ID, storageBucket: `${EMULATOR_PROJECT_ID}.appspot.com` }, name);
  return app;
}

export async function createAndVerifyIdentity(identity = newTestIdentity()) {
  assertEmulatorConfiguration();
  const app = clientApp(`shop-s21-auth-${process.pid}-${++identityCounter}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${EMULATOR_HOSTS.auth.host}:${EMULATOR_HOSTS.auth.port}`, { disableWarnings: true });
  const credential = await createUserWithEmailAndPassword(auth, identity.email, identity.password);
  const idToken = await credential.user.getIdToken(true);
  const verified = await (await startFirebaseEmulatorTest()).auth.verifyIdToken(idToken, true);
  if (verified.uid !== credential.user.uid) throw new Error('Auth emulator token verified to a different user.');
  await signOut(auth);
  const login = await signInWithEmailAndPassword(auth, identity.email, identity.password);
  if (login.user.uid !== verified.uid) throw new Error('Auth emulator sign-in returned a different user.');
  await deleteApp(app);
  return { identity, uid: verified.uid, idToken, token: verified };
}

export async function revokeIdentity(identityResult) {
  assertEmulatorConfiguration();
  const { auth } = await startFirebaseEmulatorTest();
  await auth.revokeRefreshTokens(identityResult.uid);
  return auth.verifyIdToken(identityResult.idToken, true);
}

export async function disableIdentityAndAssertSignInRejected(identityResult) {
  assertEmulatorConfiguration();
  const { auth: adminAuth } = await startFirebaseEmulatorTest();
  await adminAuth.updateUser(identityResult.uid, { disabled: true });
  const app = clientApp(`shop-s21-disabled-${process.pid}-${++identityCounter}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${EMULATOR_HOSTS.auth.host}:${EMULATOR_HOSTS.auth.port}`, { disableWarnings: true });
  try {
    await assert.rejects(signInWithEmailAndPassword(auth, identityResult.identity.email, identityResult.identity.password), /disabled|invalid|user/i);
  } finally {
    await signOut(auth).catch(() => {});
    await deleteApp(app);
  }
}

export function clientFirestore(app, identity = null) {
  assertEmulatorConfiguration();
  if (!testEnvironment) throw new Error('Start the guarded emulator test environment before creating Firestore clients.');
  if (app) getClientFirestore(app); // Assert the test app itself remains project-scoped.
  return identity ? testEnvironment.authenticatedContext(identity.uid, identity.claims ?? {}).firestore() : testEnvironment.unauthenticatedContext().firestore();
}

export function clientStorage(app, identity = null) {
  assertEmulatorConfiguration();
  if (!testEnvironment) throw new Error('Start the guarded emulator test environment before creating Storage clients.');
  if (app) getClientStorage(app); // Assert the test app itself remains project-scoped.
  return identity ? testEnvironment.authenticatedContext(identity.uid, identity.claims ?? {}).storage() : testEnvironment.unauthenticatedContext().storage();
}

export async function seedFirestore(documents) {
  const { db } = await startFirebaseEmulatorTest();
  const batch = db.batch();
  for (const [documentPath, value] of Object.entries(documents)) batch.set(db.doc(documentPath), value);
  await batch.commit();
}

export async function withActualFirebaseAdmin(relativePath, extraMocks = {}) {
  const { db, bucket } = await startFirebaseEmulatorTest();
  const { loadServerModule } = await import('../helpers/load-server-module.mjs');
  const registry = {
    'server-only': {},
    './firebaseAdmin': { db, firebaseStorageBucket: bucket, serverTimestamp: admin.firestore.FieldValue.serverTimestamp },
    ...extraMocks,
  };
  return loadServerModule(relativePath, registry);
}

export { assertFails, assertSucceeds };
