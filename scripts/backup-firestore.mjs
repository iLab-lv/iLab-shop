import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentReference,
  GeoPoint,
  Timestamp,
  getFirestore,
} from 'firebase-admin/firestore';

const BACKUP_FORMAT = 'ilab-firestore-backup';
const BACKUP_VERSION = 1;
const TYPE_MARKER = '__ilabFirestoreBackupType';
const PROGRESS_INTERVAL = 100;

function requireEnvironmentVariables() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing one or more required environment variables: ' +
        'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  return { projectId, clientEmail, privateKey };
}

function encodeFirestoreValue(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (Number.isFinite(value)) {
      return value;
    }

    return {
      [TYPE_MARKER]: 'number',
      value: String(value),
    };
  }

  if (value instanceof Timestamp) {
    return {
      [TYPE_MARKER]: 'timestamp',
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  }

  if (value instanceof GeoPoint) {
    return {
      [TYPE_MARKER]: 'geopoint',
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }

  if (value instanceof DocumentReference) {
    return {
      [TYPE_MARKER]: 'documentReference',
      path: value.path,
    };
  }

  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return {
      [TYPE_MARKER]: 'bytes',
      encoding: 'base64',
      value: Buffer.from(value).toString('base64'),
    };
  }

  if (value instanceof Date) {
    return {
      [TYPE_MARKER]: 'date',
      value: value.toISOString(),
    };
  }

  if (Array.isArray(value)) {
    return value.map(encodeFirestoreValue);
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        encodeFirestoreValue(nestedValue),
      ])
    );
  }

  throw new Error(`Unsupported Firestore value type: ${typeof value}`);
}

function createFilesystemTimestamp(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function backUpCollection(collectionRef, state) {
  if (state.collectionPaths.has(collectionRef.path)) {
    return;
  }

  state.collectionPaths.add(collectionRef.path);

  const documentRefs = await collectionRef.listDocuments();
  documentRefs.sort((left, right) => left.path.localeCompare(right.path));

  for (const documentRef of documentRefs) {
    const snapshot = await documentRef.get();

    if (snapshot.exists) {
      state.documents.push({
        path: snapshot.ref.path,
        data: encodeFirestoreValue(snapshot.data()),
      });

      if (state.documents.length % PROGRESS_INTERVAL === 0) {
        console.log(`Backed up ${state.documents.length} documents...`);
      }
    }

    const subcollections = await documentRef.listCollections();
    subcollections.sort((left, right) => left.path.localeCompare(right.path));

    for (const subcollection of subcollections) {
      await backUpCollection(subcollection, state);
    }
  }
}

async function runBackup() {
  const started = new Date();
  const startedAt = started.toISOString();
  const { projectId, clientEmail, privateKey } = requireEnvironmentVariables();

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
  const db = getFirestore(app);

  const outputDirectory = path.resolve(
    'backups',
    'firestore',
    createFilesystemTimestamp(started)
  );
  const backupFile = path.join(outputDirectory, 'firestore-backup.json');
  const manifestFile = path.join(outputDirectory, 'manifest.json');

  console.log(`Firebase project: ${projectId}`);
  console.log(`Output directory: ${outputDirectory}`);

  const rootCollections = await db.listCollections();
  rootCollections.sort((left, right) => left.id.localeCompare(right.id));
  const rootCollectionNames = rootCollections.map((collection) => collection.id);
  const state = {
    collectionPaths: new Set(),
    documents: [],
  };

  for (const collection of rootCollections) {
    console.log(`Processing root collection: ${collection.id}`);
    await backUpCollection(collection, state);
  }

  state.documents.sort((left, right) => left.path.localeCompare(right.path));

  const finished = new Date();
  const finishedAt = finished.toISOString();
  const durationMs = finished.getTime() - started.getTime();
  const collectionCount = state.collectionPaths.size;
  const documentCount = state.documents.length;
  const backup = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    projectId,
    createdAt: finishedAt,
    rootCollections: rootCollectionNames,
    documentCount,
    collectionCount,
    documents: state.documents,
  };
  const manifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    projectId,
    startedAt,
    finishedAt,
    createdAt: finishedAt,
    durationMs,
    documentCount,
    collectionCount,
    rootCollections: rootCollectionNames,
    backupFilename: path.basename(backupFile),
  };

  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(backupFile, `${JSON.stringify(backup, null, 2)}\n`, 'utf8'),
    writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
  ]);

  console.log(`Backup complete: ${documentCount} documents`);
  console.log(`Collections discovered: ${collectionCount}`);
  console.log(`Backup file: ${backupFile}`);
  console.log(`Manifest file: ${manifestFile}`);
}

runBackup().catch((error) => {
  console.error('Firestore backup failed.');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
