/**
 * Read-only snapshot of the iLab shop catalog for analysis and import planning.
 * Run from the iLab-shop repository root: node scripts/export-shop-catalog.mjs
 * Requires firebase-admin and FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL,
 * FIREBASE_PRIVATE_KEY (same environment as the existing migration scripts).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { DocumentReference, GeoPoint, Timestamp, getFirestore } from 'firebase-admin/firestore';

const REQUIRED_PROJECT_ID = 'ilab-v2';
const COLLECTIONS = ['shopProducts', 'shopDevices', 'shopProductTypes'];
const COUNTER_PATH = 'shopSettings/counters';
const TYPE_MARKER = '__ilabFirestoreBackupType';

function requireCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (projectId !== REQUIRED_PROJECT_ID) {
    throw new Error(`Project safety check failed: FIREBASE_PROJECT_ID must equal ${REQUIRED_PROJECT_ID}.`);
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) {
    throw new Error('Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY.');
  }
  return { projectId, clientEmail, privateKey };
}

function encode(value) {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : { [TYPE_MARKER]: 'number', value: String(value) };
  }
  if (value instanceof Timestamp) {
    return { [TYPE_MARKER]: 'timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  }
  if (value instanceof GeoPoint) {
    return { [TYPE_MARKER]: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof DocumentReference) {
    return { [TYPE_MARKER]: 'documentReference', path: value.path };
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return { [TYPE_MARKER]: 'bytes', encoding: 'base64', value: Buffer.from(value).toString('base64') };
  }
  if (value instanceof Date) {
    return { [TYPE_MARKER]: 'date', value: value.toISOString() };
  }
  if (Array.isArray(value)) return value.map(encode);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry)]));
  }
  throw new Error(`Unsupported Firestore value type: ${typeof value}`);
}

async function saveJson(destination, data) {
  await writeFile(destination, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function main() {
  if (process.argv.length > 2) throw new Error('No CLI arguments are supported. This tool only reads Firestore.');
  const credentials = requireCredentials();
  const app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert(credentials),
    projectId: credentials.projectId,
  });
  const db = getFirestore(app);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.resolve('exports', 'shop-catalog', stamp);
  await mkdir(directory, { recursive: true });
  console.log(`Project: ${credentials.projectId}`);
  console.log('Mode: READ ONLY (no Firestore or Storage writes)');

  const manifest = {
    projectId: credentials.projectId,
    exportedAt: new Date().toISOString(),
    collections: {},
    settingsDocument: COUNTER_PATH,
    format: 'Firestore records with document ID preserved; special values tagged as in backup-firestore.mjs',
  };

  for (const collectionName of COLLECTIONS) {
    const snapshot = await db.collection(collectionName).get();
    const records = snapshot.docs
      .map((doc) => ({ ...encode(doc.data()), _firestoreId: doc.id }))
      .sort((a, b) => a._firestoreId.localeCompare(b._firestoreId));
    await saveJson(path.join(directory, `${collectionName}.json`), records);
    const mismatchedIds = records.filter((record) => record.id !== record._firestoreId).length;
    manifest.collections[collectionName] = { count: records.length, mismatchedIds };
    console.log(`${collectionName}: ${records.length} documents (id mismatches: ${mismatchedIds})`);
  }

  const counter = await db.doc(COUNTER_PATH).get();
  const counterData = counter.exists ? encode(counter.data()) : null;
  await saveJson(path.join(directory, 'shopSettings-counters.json'), {
    _firestorePath: COUNTER_PATH,
    exists: counter.exists,
    data: counterData,
  });
  manifest.nextProductSku = counterData?.nextProductSku ?? null;
  console.log(`Current nextProductSku: ${manifest.nextProductSku ?? 'not found'}`);
  await saveJson(path.join(directory, 'manifest.json'), manifest);
  console.log(`Export complete: ${directory}`);
  console.log('Files contain product/business data. Keep the export private.');
}

main().catch((error) => {
  console.error('Shop catalog export failed.');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
