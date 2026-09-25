import process from 'node:process';
import nextEnv from '@next/env';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const REQUIRED_PROJECT_ID = 'ilab-v2';

// Standalone Node scripts do not receive Next.js's automatic .env* loading.
nextEnv.loadEnvConfig(process.cwd());

function parseArguments() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const uidIndex = args.indexOf('--uid');
  const emailIndex = args.indexOf('--email');
  const uid = uidIndex >= 0 ? args[uidIndex + 1] : undefined;
  const email = emailIndex >= 0 ? args[emailIndex + 1] : undefined;
  const expected = (uid ? 2 : 0) + (email ? 2 : 0) + (write ? 1 : 0);

  if (args.length !== expected || Boolean(uid) === Boolean(email)) {
    throw new Error('Usage: npm run bootstrap-admin -- (--uid UID | --email EMAIL) [--write]');
  }
  return { uid, email, write };
}

function initializeAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId !== REQUIRED_PROJECT_ID) {
    throw new Error(`Safety check failed: FIREBASE_PROJECT_ID must be ${REQUIRED_PROJECT_ID}.`);
  }
  if (!clientEmail || !privateKey) throw new Error('Firebase Admin credentials are missing.');
  return getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

async function main() {
  const { uid, email, write } = parseArguments();
  const app = initializeAdmin();
  const auth = getAuth(app);
  const db = getFirestore(app);
  const authUser = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
  const reference = db.collection('users').doc(authUser.uid);
  const snapshot = await reference.get();
  const existing = snapshot.exists ? snapshot.data() : null;

  console.log(`Target Firebase project: ${REQUIRED_PROJECT_ID}`);
  console.log(`Auth user: ${authUser.uid} <${authUser.email ?? 'no email'}>`);
  console.log('Existing profile:', existing ?? '(none)');
  console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN (add --write to apply)'}`);
  if (!write) return;

  const now = FieldValue.serverTimestamp();
  await reference.set(
    {
      uid: authUser.uid,
      email: existing?.email || authUser.email || '',
      name: existing?.name || authUser.displayName || '',
      role: 'admin',
      status: 'active',
      partnerStatus: 'none',
      discountPercent: 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    },
    { merge: true }
  );
  console.log(`Promoted users/${authUser.uid} to active admin.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
