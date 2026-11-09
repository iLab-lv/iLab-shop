import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const env = { ...process.env };
// A demo project plus explicit loopback endpoints: never load .env.local.
delete env.GOOGLE_APPLICATION_CREDENTIALS;
delete env.FIREBASE_TOKEN;
delete env.FIREBASE_PRIVATE_KEY;
delete env.FIREBASE_CLIENT_EMAIL;
Object.assign(env, {
  GCLOUD_PROJECT: 'demo-ilab-shop-s21', GOOGLE_CLOUD_PROJECT: 'demo-ilab-shop-s21', FIREBASE_PROJECT_ID: 'demo-ilab-shop-s21',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
  FIREBASE_EMULATORS_PATH: path.join(root, '.local-tools/firebase-emulators'), CI: 'true',
  XDG_CONFIG_HOME: path.join(root, '.local-tools/firebase-config'),
});
const portable = path.join(root, '.local-tools/java21');
if (existsSync(portable)) {
  const java = readdirSync(portable).map((name) => path.join(portable, name)).find((dir) => existsSync(path.join(dir, 'bin/java.exe')));
  if (java) { env.JAVA_HOME = java; env.PATH = `${path.join(java, 'bin')}${path.delimiter}${env.PATH ?? env.Path ?? ''}`; delete env.Path; }
}
const args = process.argv.includes('--running')
  ? ['--test', '--test-concurrency=1', 'tests/emulator/*.test.mjs']
  : ['node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:exec', '--config', 'firebase.emulators.json', '--project', 'demo-ilab-shop-s21', '--only', 'auth,firestore,storage', 'node --test --test-concurrency=1 tests/emulator/*.test.mjs'];
const child = spawn(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 1; });
