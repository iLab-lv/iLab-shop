// lib/firebaseClient.js
import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

function assertFirebaseClientConfig(config) {
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missing = required.filter((key) => !config[key]);

  if (missing.length) {
    throw new Error(
      `Missing NEXT_PUBLIC Firebase env vars: ${missing.join(', ')}`
    );
  }
}

assertFirebaseClientConfig(firebaseConfig);

export const firebaseApp =
  getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);
const authEmulatorUrl = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL;
if (authEmulatorUrl) {
  const emulator = new URL(authEmulatorUrl);
  const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);
  if (process.env.NODE_ENV === 'production' || emulator.protocol !== 'http:' || !loopbackHosts.has(emulator.hostname)) {
    throw new Error('Firebase Auth Emulator must use a local HTTP loopback URL in a non-production build.');
  }
  connectAuthEmulator(auth, emulator.href, { disableWarnings: true });
}
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
