import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { isDeepStrictEqual } from 'node:util';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const REQUIRED_PROJECT_ID = 'ilab-v2';
const STORAGE_BUCKET = 'ilab-v2.firebasestorage.app';
const EXPECTED_COUNTS = {
  shopDevices: 168,
  shopProductTypes: 8,
  shopProducts: 605,
};
const EXPECTED_IMAGE_PATHS = 1015;
const PRODUCT_WITHOUT_IMAGES = 'back_camera_for_iphone_se';
const TARGET_COLLECTIONS = [
  'shopDevices',
  'shopProductTypes',
  'shopProducts',
];
const CONTROL_PRODUCT_IDS = [
  'battery_for_iphone_12_12_pro',
  'battery_for_watch_series_5_se_se_2022_40mm',
  'battery_for_macbook_air_133_a1369_a1466',
  'back_camera_for_iphone_se',
];
const CONTROL_DEVICE_IDS = [
  'iphone_12',
  'ipad_air_2013',
  'apple-watch-se-40mm',
];

function requireCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (projectId !== REQUIRED_PROJECT_ID) {
    throw new Error(
      `Project safety check failed: FIREBASE_PROJECT_ID must be ${REQUIRED_PROJECT_ID}.`
    );
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY environment variable.'
    );
  }

  console.log(`Target Firebase project: ${projectId}`);
  return { projectId, clientEmail, privateKey };
}

function parseMode() {
  const argumentsProvided = process.argv.slice(2);
  const unsupportedArguments = argumentsProvided.filter(
    (argument) => !['--write', '--allow-missing-images'].includes(argument)
  );

  if (unsupportedArguments.length > 0) {
    throw new Error(
      `Unsupported argument(s): ${unsupportedArguments.join(', ')}.`
    );
  }

  for (const argument of ['--write', '--allow-missing-images']) {
    if (argumentsProvided.filter((value) => value === argument).length > 1) {
      throw new Error(`${argument} may only be provided once.`);
    }
  }

  const writeMode = argumentsProvided.includes('--write');
  const allowMissingImages = argumentsProvided.includes('--allow-missing-images');

  if (allowMissingImages && !writeMode) {
    throw new Error('--allow-missing-images may only be used together with --write.');
  }

  return { writeMode, allowMissingImages };
}

async function readJson(relativePath) {
  const absolutePath = path.resolve(relativePath);
  const contents = await readFile(absolutePath, 'utf8');
  return JSON.parse(contents);
}

function addError(errors, condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function validateIds(records, collectionName, errors) {
  const ids = new Set();

  for (const [index, record] of records.entries()) {
    const validId =
      typeof record?.id === 'string' &&
      record.id.length > 0 &&
      !record.id.includes('/');
    addError(
      errors,
      validId,
      `${collectionName}[${index}] must have a non-empty id without slashes.`
    );

    if (validId) {
      addError(
        errors,
        !ids.has(record.id),
        `${collectionName} contains duplicate id: ${record.id}`
      );
      ids.add(record.id);
    }
  }

  return ids;
}

function setsMatch(leftValues, rightValues) {
  const left = new Set(leftValues);
  const right = new Set(rightValues);
  return (
    left.size === leftValues.length &&
    right.size === rightValues.length &&
    left.size === right.size &&
    [...left].every((value) => right.has(value))
  );
}

function validateMigrationData({ devices, productTypes, products, report }) {
  const errors = [];

  addError(errors, Array.isArray(devices), 'shopDevices.json must contain an array.');
  addError(
    errors,
    Array.isArray(productTypes),
    'shopProductTypes.json must contain an array.'
  );
  addError(errors, Array.isArray(products), 'shopProducts.json must contain an array.');

  if (errors.length > 0) {
    throw new Error(`Migration validation failed:\n- ${errors.join('\n- ')}`);
  }

  addError(
    errors,
    devices.length === EXPECTED_COUNTS.shopDevices,
    `Expected ${EXPECTED_COUNTS.shopDevices} devices; found ${devices.length}.`
  );
  addError(
    errors,
    productTypes.length === EXPECTED_COUNTS.shopProductTypes,
    `Expected ${EXPECTED_COUNTS.shopProductTypes} product types; found ${productTypes.length}.`
  );
  addError(
    errors,
    products.length === EXPECTED_COUNTS.shopProducts,
    `Expected ${EXPECTED_COUNTS.shopProducts} products; found ${products.length}.`
  );
  addError(
    errors,
    report?.result === 'PASS',
    'verification-report.json result must be PASS.'
  );

  const deviceIds = validateIds(devices, 'shopDevices', errors);
  const productTypeIds = validateIds(productTypes, 'shopProductTypes', errors);
  validateIds(products, 'shopProducts', errors);

  const devicesById = new Map(devices.map((device) => [device.id, device]));

  for (const device of devices) {
    if (device.parentId !== null) {
      addError(
        errors,
        typeof device.parentId === 'string' && deviceIds.has(device.parentId),
        `Device ${device.id} has missing parentId: ${device.parentId}`
      );
    }

    if (device.type === 'model') {
      const series = devicesById.get(device.parentId);
      const brand = series ? devicesById.get(series.parentId) : undefined;
      addError(
        errors,
        series?.type === 'series',
        `Model ${device.id} does not have a valid series parent.`
      );
      addError(
        errors,
        brand?.type === 'brand',
        `Model ${device.id} does not resolve to a valid brand grandparent.`
      );
    } else if (device.type === 'series') {
      addError(
        errors,
        devicesById.get(device.parentId)?.type === 'brand',
        `Series ${device.id} does not have a valid brand parent.`
      );
    } else {
      addError(
        errors,
        device.type === 'brand' && device.parentId === null,
        `Device ${device.id} has invalid type or brand parent configuration.`
      );
    }
  }

  const imagePaths = [];

  for (const product of products) {
    addError(
      errors,
      productTypeIds.has(product.productTypeId),
      `Product ${product.id} has invalid productTypeId: ${product.productTypeId}`
    );
    addError(
      errors,
      Number.isInteger(product.priceCents) && product.priceCents >= 0,
      `Product ${product.id} has invalid priceCents.`
    );

    for (const field of ['modelIds', 'seriesIds', 'brandIds', 'imagePaths']) {
      addError(
        errors,
        Array.isArray(product[field]),
        `Product ${product.id} field ${field} must be an array.`
      );
    }

    if (
      !Array.isArray(product.modelIds) ||
      !Array.isArray(product.seriesIds) ||
      !Array.isArray(product.brandIds) ||
      !Array.isArray(product.imagePaths)
    ) {
      continue;
    }

    const derivedSeriesIds = [];
    const derivedBrandIds = [];

    for (const modelId of product.modelIds) {
      const model = devicesById.get(modelId);
      const series = model ? devicesById.get(model.parentId) : undefined;
      const brand = series ? devicesById.get(series.parentId) : undefined;

      addError(
        errors,
        model?.type === 'model',
        `Product ${product.id} references invalid model: ${modelId}`
      );
      addError(
        errors,
        series?.type === 'series',
        `Product ${product.id} model ${modelId} has invalid series ancestry.`
      );
      addError(
        errors,
        brand?.type === 'brand',
        `Product ${product.id} model ${modelId} has invalid brand ancestry.`
      );

      if (series && !derivedSeriesIds.includes(series.id)) {
        derivedSeriesIds.push(series.id);
      }
      if (brand && !derivedBrandIds.includes(brand.id)) {
        derivedBrandIds.push(brand.id);
      }
    }

    for (const seriesId of product.seriesIds) {
      addError(
        errors,
        devicesById.get(seriesId)?.type === 'series',
        `Product ${product.id} references invalid series: ${seriesId}`
      );
    }
    for (const brandId of product.brandIds) {
      addError(
        errors,
        devicesById.get(brandId)?.type === 'brand',
        `Product ${product.id} references invalid brand: ${brandId}`
      );
    }

    addError(
      errors,
      setsMatch(product.seriesIds, derivedSeriesIds),
      `Product ${product.id} seriesIds do not match its model ancestry.`
    );
    addError(
      errors,
      setsMatch(product.brandIds, derivedBrandIds),
      `Product ${product.id} brandIds do not match its model ancestry.`
    );

    if (product.id === PRODUCT_WITHOUT_IMAGES) {
      addError(
        errors,
        product.imagePaths.length === 0,
        `${PRODUCT_WITHOUT_IMAGES} must have zero image paths.`
      );
    } else {
      addError(
        errors,
        product.imagePaths.length > 0,
        `Product ${product.id} unexpectedly has no image paths.`
      );
    }

    for (const imagePath of product.imagePaths) {
      addError(
        errors,
        typeof imagePath === 'string' && imagePath.startsWith('shop/products/'),
        `Product ${product.id} has invalid image path: ${imagePath}`
      );
      imagePaths.push(imagePath);
    }
  }

  addError(
    errors,
    imagePaths.length === EXPECTED_IMAGE_PATHS,
    `Expected ${EXPECTED_IMAGE_PATHS} image paths; found ${imagePaths.length}.`
  );
  addError(
    errors,
    new Set(imagePaths).size === imagePaths.length,
    'Product image paths must be unique.'
  );

  if (errors.length > 0) {
    throw new Error(`Migration validation failed:\n- ${errors.join('\n- ')}`);
  }

  console.log('Migration JSON validation: PASS');
  console.log(`shopDevices: ${devices.length}`);
  console.log(`shopProductTypes: ${productTypes.length}`);
  console.log(`shopProducts: ${products.length}`);
  console.log(`Referenced Storage image paths: ${imagePaths.length}`);

  return imagePaths;
}

async function verifyStorage(bucket, imagePaths, allowMissingImages) {
  console.log(`Verifying Storage bucket: ${bucket.name}`);
  const missingPaths = [];
  let nextIndex = 0;
  let checkedCount = 0;
  const workerCount = Math.min(20, imagePaths.length);

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= imagePaths.length) {
        return;
      }

      const imagePath = imagePaths[index];
      const [exists] = await bucket.file(imagePath).exists();
      if (!exists) {
        missingPaths.push(imagePath);
      }

      checkedCount += 1;
      if (checkedCount % 100 === 0 || checkedCount === imagePaths.length) {
        console.log(`Storage: ${checkedCount} / ${imagePaths.length} checked`);
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  if (missingPaths.length > 0) {
    missingPaths.sort();
    console.error('Missing Storage objects:');
    for (const missingPath of missingPaths) {
      console.error(`- ${missingPath}`);
    }
    if (!allowMissingImages) {
      throw new Error(`${missingPaths.length} referenced Storage objects are missing.`);
    }

    console.warn(
      `WARNING: continuing with ${missingPaths.length} missing images because ` +
        '--allow-missing-images was explicitly provided.'
    );
  }

  const foundCount = imagePaths.length - missingPaths.length;
  console.log(`Storage verification: ${foundCount} / ${imagePaths.length} found`);
  return { foundCount, missingPaths };
}

async function getTargetCollectionCounts(db) {
  const entries = await Promise.all(
    TARGET_COLLECTIONS.map(async (collectionName) => {
      const snapshot = await db.collection(collectionName).count().get();
      return [collectionName, snapshot.data().count];
    })
  );
  const counts = Object.fromEntries(entries);

  console.log('Target Firestore collection counts:');
  for (const collectionName of TARGET_COLLECTIONS) {
    console.log(`${collectionName}: ${counts[collectionName]}`);
  }

  return counts;
}

function requireEmptyTargetCollections(counts) {
  const nonEmpty = TARGET_COLLECTIONS.filter(
    (collectionName) => counts[collectionName] !== 0
  );

  if (nonEmpty.length > 0) {
    throw new Error(
      `Import aborted because target collection(s) are not empty: ${nonEmpty.join(', ')}`
    );
  }

  console.log('Target Firestore collections: empty');
}

async function importCollection(db, collectionName, records) {
  console.log(`Importing ${collectionName}...`);
  const writer = db.bulkWriter();
  let completed = 0;

  writer.onWriteResult(() => {
    completed += 1;
    if (completed % 50 === 0 || completed === records.length) {
      console.log(`${collectionName}: ${completed} / ${records.length}`);
    }
  });
  writer.onWriteError((error) => {
    console.error(`Write failed for ${error.documentRef.path}: ${error.message}`);
    return false;
  });

  const writes = records.map((record) =>
    writer.create(db.collection(collectionName).doc(record.id), record)
  );

  await writer.close();
  const results = await Promise.allSettled(writes);
  const failures = results.filter((result) => result.status === 'rejected');

  if (failures.length > 0) {
    throw new Error(`${failures.length} writes failed in ${collectionName}.`);
  }
}

function normalizeForComparison(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeForComparison);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeForComparison(value[key])])
    );
  }

  return value;
}

async function verifyControlRecords(db, collectionName, expectedRecords, ids) {
  const expectedById = new Map(
    expectedRecords.map((record) => [record.id, record])
  );
  const checkedPaths = [];

  for (const id of ids) {
    const expected = expectedById.get(id);
    if (!expected) {
      throw new Error(`Control record is missing from migration JSON: ${collectionName}/${id}`);
    }

    const snapshot = await db.collection(collectionName).doc(id).get();
    if (!snapshot.exists) {
      throw new Error(`Control record is missing from Firestore: ${collectionName}/${id}`);
    }

    const matches = isDeepStrictEqual(
      normalizeForComparison(snapshot.data()),
      normalizeForComparison(expected)
    );
    if (!matches) {
      throw new Error(`Control record mismatch: ${collectionName}/${id}`);
    }

    checkedPaths.push(`${collectionName}/${id}`);
    console.log(`Control record verified: ${collectionName}/${id}`);
  }

  return checkedPaths;
}

async function writeImportResult(result) {
  const outputPath = path.resolve('migrations', 'import-result.json');
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`Import result: ${outputPath}`);
}

async function main() {
  const credentials = requireCredentials();
  const { writeMode, allowMissingImages } = parseMode();
  console.log(`Mode: ${writeMode ? 'WRITE' : 'DRY RUN'}`);

  const [devices, productTypes, products, verificationReport] = await Promise.all([
    readJson('migrations/shopDevices.json'),
    readJson('migrations/shopProductTypes.json'),
    readJson('migrations/shopProducts.json'),
    readJson('migrations/verification-report.json'),
  ]);
  const imagePaths = validateMigrationData({
    devices,
    productTypes,
    products,
    report: verificationReport,
  });

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(credentials),
        projectId: credentials.projectId,
        storageBucket: STORAGE_BUCKET,
      });
  const db = getFirestore(app);
  const bucket = getStorage(app).bucket(STORAGE_BUCKET);

  const storageVerification = await verifyStorage(
    bucket,
    imagePaths,
    allowMissingImages
  );
  const beforeCounts = await getTargetCollectionCounts(db);
  requireEmptyTargetCollections(beforeCounts);

  if (!writeMode) {
    console.log('');
    console.log('DRY RUN PASSED');
    console.log(`Target project: ${credentials.projectId}`);
    console.log(`shopDevices: ${devices.length} ready`);
    console.log(`shopProductTypes: ${productTypes.length} ready`);
    console.log(`shopProducts: ${products.length} ready`);
    console.log(`Storage image paths: ${imagePaths.length} / ${imagePaths.length} found`);
    console.log('Target Firestore collections: empty');
    console.log('No writes performed.');
    return;
  }

  await importCollection(db, 'shopDevices', devices);
  await importCollection(db, 'shopProductTypes', productTypes);
  await importCollection(db, 'shopProducts', products);

  const afterCounts = await getTargetCollectionCounts(db);
  for (const collectionName of TARGET_COLLECTIONS) {
    if (afterCounts[collectionName] !== EXPECTED_COUNTS[collectionName]) {
      throw new Error(
        `Post-import count mismatch for ${collectionName}: ` +
          `expected ${EXPECTED_COUNTS[collectionName]}, found ${afterCounts[collectionName]}.`
      );
    }
  }

  const controlRecordsChecked = [
    ...(await verifyControlRecords(
      db,
      'shopProducts',
      products,
      CONTROL_PRODUCT_IDS
    )),
    ...(await verifyControlRecords(
      db,
      'shopDevices',
      devices,
      CONTROL_DEVICE_IDS
    )),
  ];

  const result = {
    projectId: credentials.projectId,
    timestamp: new Date().toISOString(),
    deviceCount: devices.length,
    productTypeCount: productTypes.length,
    productCount: products.length,
    imagePathsChecked: imagePaths.length,
    imagePathsVerified: storageVerification.foundCount,
    missingImagePaths: storageVerification.missingPaths,
    preImportFirestoreCounts: beforeCounts,
    postImportFirestoreCounts: afterCounts,
    controlRecordsChecked,
    result: 'PASS',
  };
  await writeImportResult(result);

  console.log('');
  console.log('IMPORT PASSED');
}

main().catch((error) => {
  console.error('Shop catalog import failed.');
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
