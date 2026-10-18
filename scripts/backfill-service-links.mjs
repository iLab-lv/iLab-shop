import process from 'node:process';
import nextEnv from '@next/env';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { planServiceLinkBackfill, serviceLinksEqual } from '../lib/serviceLinkBackfill.mjs';

const EXPECTED_PROJECT = 'ilab-v2';
nextEnv.loadEnvConfig(process.cwd());

function initializeFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId !== EXPECTED_PROJECT) throw new Error(`Safety check failed: FIREBASE_PROJECT_ID must be ${EXPECTED_PROJECT}.`);
  if (!clientEmail || !privateKey) throw new Error('Firebase Admin credentials are missing.');
  const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  return getFirestore(app);
}

function printReport(report, write, plan) {
  console.log(`Firebase project: ${EXPECTED_PROJECT}`);
  console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN (pass --write to apply)'}`);
  console.log('\nBRANDS');
  console.log(`Total: ${report.brands.total}`);
  console.log(`Exact/hub mappings: ${report.brands.hub}`);
  console.log(`Service-brand mappings: ${report.brands.brand}`);
  console.log(`Homepage fallbacks: ${report.brands.home}`);
  console.log(`Upgraded to localized paths: ${report.brands.upgraded}`);
  console.log(`Home fallbacks upgraded: ${report.brands.homeUpgraded}`);
  console.log(`Already correct: ${report.brands.alreadyCorrect}`);
  console.log(`Unresolved / ambiguous: ${report.brands.unresolved}`);
  console.log('\nMODELS');
  console.log(`Total: ${report.models.total}`);
  console.log(`Slug matches: ${report.models.slug}`);
  console.log(`Normalized name matches: ${report.models.name}`);
  console.log(`Existing exact mappings: ${report.models.existing}`);
  console.log(`Upgraded to localized paths: ${report.models.upgraded}`);
  console.log(`Already correct: ${report.models.alreadyCorrect}`);
  console.log(`Unmatched / Brand fallback: ${report.models.unmatched}`);
  console.log(`Unresolved target/parent: ${report.models.unresolved}`);
  console.log(`Legacy Model links cleared to Brand fallback: ${plan.modelClears.size}`);
  if (report.ambiguous.length) {
    console.log('\nAMBIGUOUS CANDIDATES (manual review required)');
    for (const item of report.ambiguous) console.log(`${item.type}: ${item.name} -> ${item.candidates.map((entry) => `${entry.name}${entry.path ? ` (${entry.path})` : entry.slug ? ` (${entry.slug})` : ''}`).join(', ')}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !['--write', '--inspect'].includes(arg))) throw new Error('Usage: node scripts/backfill-service-links.mjs [--inspect] [--write]');
  const write = args.includes('--write');
  const inspect = args.includes('--inspect');
  const db = initializeFirebase();
  const [shopSnapshot, categorySnapshot, serviceDeviceSnapshot] = await Promise.all([
    db.collection('shopDevices').get(), db.collection('categories').get(), db.collection('devices').get(),
  ]);
  const shopDevices = shopSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const categories = categorySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const serviceDevices = serviceDeviceSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const plan = planServiceLinkBackfill(shopDevices, categories, serviceDevices);
  printReport(plan.report, write, plan);
  if (inspect) {
    console.log('\nSHOP BRANDS');
    for (const brand of shopDevices.filter((item) => item.type === 'brand')) {
      const series = shopDevices.filter((item) => item.type === 'series' && item.parentId === brand.id);
      const seriesIds = new Set(series.map((item) => item.id));
      const models = shopDevices.filter((item) => item.type === 'model' && seriesIds.has(item.parentId));
      const paths = plan.brandLinks.get(brand.id)?.paths;
      console.log(`${brand.name} [${brand.slug}] -> LV ${paths?.lv || '/'} | RU ${paths?.ru || '/ru'}: ${models.length} Models; ${models.slice(0, 8).map((item) => item.name).join(', ')}`);
    }
    console.log('\nSERVICE CATEGORIES AND BRAND ROUTES');
    for (const category of categories) {
      const brands = (category.brands || []).map((item) => `${item.name || item.labels?.lv || item.key || item.slug} [${item.key || item.slug}]${item.route?.preferDedicatedHub ? ` hub=${item.route.dedicatedHubPath || ''}` : ''}`).join('; ');
      console.log(`${category.name || category.labels?.lv || category.slug || category.id} [${category.slug || category.id}]: ${brands}`);
    }
  }
  if (!write) return;

  let batch = db.batch();
  let pending = 0, writes = 0;
  const commitIfNeeded = async (force = false) => {
    if (pending >= 450 || (force && pending)) { await batch.commit(); batch = db.batch(); pending = 0; }
  };
  for (const [id, serviceLink] of plan.brandLinks) {
    const existing = shopDevices.find((item) => item.id === id)?.serviceLink;
    if (serviceLinksEqual(existing, serviceLink)) continue;
    batch.update(db.collection('shopDevices').doc(id), { serviceLink });
    pending += 1; writes += 1; await commitIfNeeded();
  }
  for (const [id, serviceLink] of plan.modelLinks) {
    const existing = shopDevices.find((item) => item.id === id)?.serviceLink;
    if (serviceLinksEqual(existing, serviceLink)) continue;
    batch.update(db.collection('shopDevices').doc(id), { serviceLink });
    pending += 1; writes += 1; await commitIfNeeded();
  }
  for (const id of plan.modelClears) {
    batch.update(db.collection('shopDevices').doc(id), { serviceLink: FieldValue.delete() });
    pending += 1; writes += 1; await commitIfNeeded();
  }
  await commitIfNeeded(true);
  console.log(`\nUpdated serviceLink on ${writes} Brand/Model records. Series and Products were not written.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
