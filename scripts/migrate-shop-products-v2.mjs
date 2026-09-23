import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

const REQUIRED_PROJECT_ID = 'ilab-v2';
const EXPECTED_PRODUCT_COUNT = 605;
const FIRST_SKU = 20000;
const LAST_SKU = 20604;
const NEXT_SKU = 20605;
const PRODUCT_COLLECTION = 'shopProducts';
const COUNTER_PATH = 'shopSettings/counters';
const RESULT_PATH = path.resolve('migrations', 'product-schema-v2-result.json');
const PRESERVED_FIELDS = [
  'id', 'slug', 'name', 'description', 'productTypeId',
  'modelIds', 'seriesIds', 'brandIds', 'imagePaths', 'status',
];
const ARRAY_FIELDS = ['modelIds', 'seriesIds', 'brandIds', 'imagePaths'];
const MIGRATION_FIELDS = [
  'sku', 'purchasePriceCents', 'wholesalePriceCents', 'retailPriceCents',
  'metaTitle', 'metaDescription', 'createdAt', 'updatedAt',
];
const SAMPLE_IDS = [
  'battery_for_iphone_12_12_pro',
  'back_camera_for_iphone_se',
  'audio_jack_flex_for_ipad_air',
  'back_camera_for_iphone_6',
];

function parseMode() {
  const args = process.argv.slice(2);
  const unsupported = args.filter((argument) => argument !== '--write');
  if (unsupported.length) throw new Error(`Unsupported argument(s): ${unsupported.join(', ')}`);
  if (args.filter((argument) => argument === '--write').length > 1) {
    throw new Error('--write may only be provided once.');
  }
  return { writeMode: args.includes('--write') };
}

function requireCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (projectId !== REQUIRED_PROJECT_ID) {
    throw new Error(`Project safety check failed: FIREBASE_PROJECT_ID must be ${REQUIRED_PROJECT_ID}.`);
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!clientEmail || !privateKey) {
    throw new Error('Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY.');
  }
  console.log(`Target Firebase project: ${projectId}`);
  return { projectId, clientEmail, privateKey };
}

function initializeFirestore(credentials) {
  const app = getApps().length ? getApps()[0] : initializeApp({
    credential: cert(credentials),
    projectId: credentials.projectId,
  });
  return getFirestore(app);
}

function hasOwn(record, field) {
  return Object.prototype.hasOwnProperty.call(record, field);
}

function classifyProduct(data) {
  const legacy = hasOwn(data, 'priceCents') &&
    !MIGRATION_FIELDS.some((field) => hasOwn(data, field));
  const migrated = !hasOwn(data, 'priceCents') &&
    MIGRATION_FIELDS.every((field) => hasOwn(data, field));
  return legacy ? 'LEGACY' : migrated ? 'MIGRATED' : 'MIXED/PARTIAL';
}

function classifyCatalog(products) {
  const groups = { LEGACY: [], MIGRATED: [], 'MIXED/PARTIAL': [] };
  for (const product of products) groups[classifyProduct(product.data)].push(product.id);
  if (groups.LEGACY.length === products.length) return { state: 'LEGACY', groups };
  if (groups.MIGRATED.length === products.length) return { state: 'MIGRATED', groups };
  return { state: 'MIXED/PARTIAL', groups };
}

function validateCommonProducts(products) {
  const errors = [];
  if (products.length !== EXPECTED_PRODUCT_COUNT) {
    errors.push(`Expected ${EXPECTED_PRODUCT_COUNT} products; found ${products.length}.`);
  }
  const documentIds = new Set();
  for (const product of products) {
    const { id, data } = product;
    if (!id || id.includes('/')) errors.push(`Invalid document ID: ${id}`);
    if (documentIds.has(id)) errors.push(`Duplicate document ID: ${id}`);
    documentIds.add(id);
    if (typeof data.id !== 'string' || data.id !== id) errors.push(`${id}: id field must equal document ID.`);
    if (typeof data.name !== 'string' || !data.name.trim()) errors.push(`${id}: name is required.`);
    for (const field of ARRAY_FIELDS) {
      if (!Array.isArray(data[field])) errors.push(`${id}: ${field} must be an array.`);
    }
  }
  if (errors.length) throw new Error(`Product validation failed:\n- ${errors.join('\n- ')}`);
}

function validateLegacyProducts(products) {
  const errors = [];
  for (const { id, data } of products) {
    if (!Number.isInteger(data.priceCents) || data.priceCents < 0) {
      errors.push(`${id}: priceCents must be a non-negative integer.`);
    }
    if (!hasOwn(data, 'trackStock')) errors.push(`${id}: expected legacy trackStock field.`);
  }
  if (errors.length) throw new Error(`Legacy product validation failed:\n- ${errors.join('\n- ')}`);
}

function migrationData(product, sku, timestamp) {
  return {
    sku,
    purchasePriceCents: product.priceCents,
    wholesalePriceCents: null,
    retailPriceCents: null,
    stockQty: 99,
    metaTitle: `iLab | ${product.name}`,
    metaDescription: product.description ?? '',
    createdAt: timestamp,
    updatedAt: timestamp,
    priceCents: FieldValue.delete(),
    trackStock: FieldValue.delete(),
  };
}

function printableAfter(product, sku) {
  return {
    ...Object.fromEntries(PRESERVED_FIELDS.map((field) => [field, product[field]])),
    sku,
    purchasePriceCents: product.priceCents,
    wholesalePriceCents: null,
    retailPriceCents: null,
    stockQty: 99,
    metaTitle: `iLab | ${product.name}`,
    metaDescription: product.description ?? '',
    createdAt: '<one migration Timestamp on --write>',
    updatedAt: '<same migration Timestamp on --write>',
  };
}

async function readProducts(db) {
  const snapshot = await db.collection(PRODUCT_COLLECTION).get();
  return snapshot.docs
    .map((document) => ({ id: document.id, data: document.data(), ref: document.ref }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function validateCounter(db, catalogState) {
  const snapshot = await db.doc(COUNTER_PATH).get();
  const existing = snapshot.exists ? snapshot.get('nextProductSku') : undefined;
  if (existing !== undefined && existing !== NEXT_SKU) {
    throw new Error(`Counter conflict: ${COUNTER_PATH}.nextProductSku is ${existing}; expected ${NEXT_SKU}.`);
  }
  if (catalogState === 'MIGRATED' && existing !== NEXT_SKU) {
    throw new Error(`Migrated catalog is missing ${COUNTER_PATH}.nextProductSku = ${NEXT_SKU}.`);
  }
  console.log(`SKU counter: ${existing === undefined ? 'not set' : existing}`);
  return existing;
}

function showDryRun(products) {
  console.log('');
  console.log('DRY RUN — zero Firestore writes');
  console.log(`Products: ${products.length}`);
  console.log(`SKU range: ${FIRST_SKU}–${LAST_SKU}`);
  console.log(`Next SKU: ${NEXT_SKU}`);
  console.log(`priceCents → purchasePriceCents: ${products.length}`);
  console.log(`wholesalePriceCents: ${products.length} → null`);
  console.log(`retailPriceCents: ${products.length} → null`);
  console.log(`stockQty: ${products.length} → 99`);
  console.log(`trackStock fields to remove: ${products.filter(({ data }) => hasOwn(data, 'trackStock')).length}`);
  console.log(`metaDescription generated: ${products.length}`);
  console.log('createdAt/updatedAt: one shared migration Timestamp on write');
  console.log('metaTitle examples:');
  for (const { data } of products.slice(0, 3)) console.log(`- iLab | ${data.name}`);
  console.log('');
  console.log('Sample BEFORE → AFTER transformations:');
  for (const sampleId of SAMPLE_IDS) {
    const index = products.findIndex(({ id }) => id === sampleId);
    if (index < 0) throw new Error(`Required sample product not found: ${sampleId}`);
    const { data } = products[index];
    console.log(`\n${sampleId}`);
    console.log('BEFORE:', JSON.stringify(data, null, 2));
    console.log('AFTER:', JSON.stringify(printableAfter(data, FIRST_SKU + index), null, 2));
  }
}

function runBackup() {
  console.log('');
  console.log('Starting required Firestore backup...');
  const result = spawnSync(process.execPath, ['scripts/backup-firestore.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Backup failed with exit code ${result.status}.`);
  console.log('Required Firestore backup: PASS');
}

async function writeProducts(db, products, timestamp) {
  const writer = db.bulkWriter();
  let completed = 0;
  const failures = [];
  writer.onWriteResult(() => {
    completed += 1;
    if (completed % 100 === 0 || completed === products.length) {
      console.log(`Migrated products: ${completed} / ${products.length}`);
    }
  });
  writer.onWriteError((error) => {
    failures.push(`${error.documentRef.path}: ${error.message}`);
    return false;
  });
  for (const [index, product] of products.entries()) {
    writer.update(product.ref, migrationData(product.data, FIRST_SKU + index, timestamp));
  }
  await writer.close();
  if (failures.length) throw new Error(`Product writes failed:\n- ${failures.join('\n- ')}`);
  if (completed !== products.length) {
    throw new Error(`Expected ${products.length} completed writes; observed ${completed}.`);
  }
}

function verifyMigratedProducts(beforeProducts, afterProducts) {
  const errors = [];
  const beforeById = new Map(beforeProducts.map((product) => [product.id, product.data]));
  const expectedIds = beforeProducts.map((product) => product.id);
  const actualIds = afterProducts.map((product) => product.id);
  if (!isDeepStrictEqual(actualIds, expectedIds)) errors.push('Product document IDs changed or disappeared.');
  const skus = new Set();
  let sharedTimestamp = null;
  for (const [index, product] of afterProducts.entries()) {
    const { id, data } = product;
    const before = beforeById.get(id);
    const expectedSku = FIRST_SKU + index;
    if (!Number.isInteger(data.sku) || data.sku !== expectedSku) errors.push(`${id}: invalid SKU.`);
    skus.add(data.sku);
    if (data.purchasePriceCents !== before.priceCents) errors.push(`${id}: purchase price changed.`);
    if (data.wholesalePriceCents !== null) errors.push(`${id}: wholesale price must be null.`);
    if (data.retailPriceCents !== null) errors.push(`${id}: retail price must be null.`);
    if (data.stockQty !== 99) errors.push(`${id}: stockQty must be 99.`);
    if (data.metaTitle !== `iLab | ${data.name}`) errors.push(`${id}: invalid metaTitle.`);
    if (data.metaDescription !== (data.description ?? '')) errors.push(`${id}: invalid metaDescription.`);
    if (!(data.createdAt instanceof Timestamp) || !(data.updatedAt instanceof Timestamp)) {
      errors.push(`${id}: timestamps are missing or invalid.`);
    } else {
      if (!data.createdAt.isEqual(data.updatedAt)) errors.push(`${id}: createdAt and updatedAt differ.`);
      if (!sharedTimestamp) sharedTimestamp = data.createdAt;
      else if (!data.createdAt.isEqual(sharedTimestamp)) errors.push(`${id}: migration timestamp is not shared.`);
    }
    if (hasOwn(data, 'priceCents')) errors.push(`${id}: priceCents still exists.`);
    if (hasOwn(data, 'trackStock')) errors.push(`${id}: trackStock still exists.`);
    for (const field of PRESERVED_FIELDS) {
      if (!isDeepStrictEqual(data[field], before[field])) errors.push(`${id}: preserved field changed: ${field}.`);
    }
  }
  if (afterProducts.length !== EXPECTED_PRODUCT_COUNT) errors.push('Post-migration count is not 605.');
  if (skus.size !== EXPECTED_PRODUCT_COUNT) errors.push('SKUs are not unique.');
  if (errors.length) throw new Error(`Post-migration verification failed:\n- ${errors.join('\n- ')}`);
  return sharedTimestamp;
}

function verifyAlreadyMigrated(products) {
  const errors = [];
  const skus = new Set();
  let sharedTimestamp = null;
  for (const [index, { id, data }] of products.entries()) {
    if (data.sku !== FIRST_SKU + index) errors.push(`${id}: unexpected SKU.`);
    skus.add(data.sku);
    if (!Number.isInteger(data.purchasePriceCents) || data.purchasePriceCents < 0) errors.push(`${id}: invalid purchasePriceCents.`);
    if (data.wholesalePriceCents !== null || data.retailPriceCents !== null) errors.push(`${id}: migrated prices are not null.`);
    if (data.stockQty !== 99) errors.push(`${id}: stockQty is not 99.`);
    if (data.metaTitle !== `iLab | ${data.name}`) errors.push(`${id}: invalid metaTitle.`);
    if (data.metaDescription !== (data.description ?? '')) errors.push(`${id}: invalid metaDescription.`);
    if (!(data.createdAt instanceof Timestamp) || !(data.updatedAt instanceof Timestamp) ||
        !data.createdAt.isEqual(data.updatedAt)) errors.push(`${id}: invalid timestamps.`);
    else if (!sharedTimestamp) sharedTimestamp = data.createdAt;
    else if (!data.createdAt.isEqual(sharedTimestamp)) errors.push(`${id}: timestamps are not shared.`);
    if (hasOwn(data, 'priceCents') || hasOwn(data, 'trackStock')) errors.push(`${id}: legacy field remains.`);
  }
  if (skus.size !== EXPECTED_PRODUCT_COUNT) errors.push('SKUs are not unique.');
  if (errors.length) throw new Error(`Migrated catalog verification failed:\n- ${errors.join('\n- ')}`);
  return sharedTimestamp;
}

async function writeReport(projectId, timestamp) {
  const report = {
    projectId,
    timestamp: timestamp.toDate().toISOString(),
    productCount: EXPECTED_PRODUCT_COUNT,
    sku: { first: FIRST_SKU, last: LAST_SKU, next: NEXT_SKU },
    fieldsAdded: [
      'sku', 'purchasePriceCents', 'wholesalePriceCents', 'retailPriceCents',
      'metaTitle', 'metaDescription', 'createdAt', 'updatedAt',
    ],
    fieldsUpdated: ['stockQty'],
    fieldsRemoved: ['priceCents', 'trackStock'],
    priceValuesPreservedCount: EXPECTED_PRODUCT_COUNT,
    seoGeneratedCount: EXPECTED_PRODUCT_COUNT,
    stockUpdatedCount: EXPECTED_PRODUCT_COUNT,
    timestampsAddedCount: EXPECTED_PRODUCT_COUNT,
    counterDocument: { path: COUNTER_PATH, nextProductSku: NEXT_SKU },
    futureProductCreationContract: {
      sku: 'Assigned server-side from shopSettings/counters in a Firestore transaction and immutable.',
      purchasePriceCents: 'Worker-entered euro amount stored as integer cents.',
      wholesalePriceCents: 'Nullable until entered.',
      retailPriceCents: 'Nullable until entered.',
      stockQty: 'Defaults to 0.',
      timestamps: 'createdAt and updatedAt begin equal; edits preserve createdAt and advance updatedAt.',
      seo: 'metaTitle starts as iLab | {name}; metaDescription starts as description; manual form overrides stop automatic updates.',
    },
    verification: 'PASS',
  };
  await mkdir(path.dirname(RESULT_PATH), { recursive: true });
  await writeFile(RESULT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Migration report: ${RESULT_PATH}`);
}

async function main() {
  const { writeMode } = parseMode();
  const credentials = requireCredentials();
  const db = initializeFirestore(credentials);
  const products = await readProducts(db);
  validateCommonProducts(products);
  const classification = classifyCatalog(products);
  console.log(`Catalog state: ${classification.state}`);
  await validateCounter(db, classification.state);

  if (classification.state === 'MIXED/PARTIAL') {
    const details = Object.entries(classification.groups)
      .filter(([, ids]) => ids.length)
      .map(([state, ids]) => `${state}: ${ids.join(', ')}`)
      .join('\n');
    throw new Error(`Mixed/partial migration state detected. No repair attempted.\n${details}`);
  }

  if (classification.state === 'MIGRATED') {
    const timestamp = verifyAlreadyMigrated(products);
    console.log(`Already migrated; verification PASS (${products.length} products).`);
    if (writeMode) console.log('--write requested, but no writes were necessary.');
    await writeReport(credentials.projectId, timestamp);
    return;
  }

  validateLegacyProducts(products);
  showDryRun(products);
  if (!writeMode) {
    console.log('');
    console.log('Dry run verification: PASS');
    console.log('Run again with --write to back up and migrate.');
    return;
  }

  runBackup();
  const migrationTimestamp = Timestamp.now();
  console.log(`Migration timestamp: ${migrationTimestamp.toDate().toISOString()}`);
  await writeProducts(db, products, migrationTimestamp);
  await db.doc(COUNTER_PATH).set({ nextProductSku: NEXT_SKU }, { merge: true });
  console.log(`${COUNTER_PATH}.nextProductSku: ${NEXT_SKU}`);

  const migratedProducts = await readProducts(db);
  const verifiedTimestamp = verifyMigratedProducts(products, migratedProducts);
  const counter = await db.doc(COUNTER_PATH).get();
  if (counter.get('nextProductSku') !== NEXT_SKU) throw new Error('Post-migration counter verification failed.');
  console.log(`Post-migration verification: PASS (${migratedProducts.length} products)`);
  await writeReport(credentials.projectId, verifiedTimestamp);
}

main().catch((error) => {
  console.error('Product schema v2 migration failed.');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
