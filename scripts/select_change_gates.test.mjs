import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();

function run(files) {
  return spawnSync(process.execPath, ['scripts/select_change_gates.mjs', '--files', ...files], {
    cwd: root,
    encoding: 'utf8',
  });
}

function plan(files) {
  const result = run(files);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test('website changes select universal and website packs without critical review', () => {
  const result = plan(['knowly-www/index.html']);
  assert.deepEqual(result.packs, ['website']);
  assert.equal(result.independentReview, false);
  assert.ok(result.universal.includes('secret_scan'));
});

test('auth, economy and admin changes select all critical packs', () => {
  const result = plan(['app/auth_provider.ts', 'firestore.rules', 'admin/v2/legacy.html']);
  assert.deepEqual(result.packs, ['admin-mutation', 'app-ui', 'auth-privacy', 'economy']);
  assert.equal(result.independentReview, true);
});

test('functions schema and release changes select their packs', () => {
  const result = plan(['functions/src/account_delete.ts', 'functions/package.json', 'firebase.json']);
  assert.deepEqual(result.packs, ['auth-privacy', 'functions-schema', 'release']);
  assert.equal(result.independentReview, true);
});

test('unknown paths fail closed to manual triage', () => {
  const result = plan(['new/unknown.surface']);
  assert.deepEqual(result.packs, ['manual-triage']);
  assert.equal(result.independentReview, true);
});

test('malformed CLI fails closed', () => {
  const result = spawnSync(process.execPath, ['scripts/select_change_gates.mjs', '--files'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
});

function test(name, fn) {
  try { fn(); console.log(`PASS ${name}`); }
  catch (error) { console.error(`FAIL ${name}\n${error.stack}`); process.exitCode = 1; }
}
