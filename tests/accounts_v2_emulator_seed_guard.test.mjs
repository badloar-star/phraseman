import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  SEED_LOCAL_FILE,
  SeedRefusedError,
  assertEmulatorOnly,
  buildSeedAccounts,
  main,
  parseArgs,
} from '../scripts/accounts-v2-emulator-seed.mjs';

// Account V2, Пакет 6D — сидер эмулятора обязан быть недостижим для прода.

const LOCAL = { FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' };

test('refuses without both emulator host variables', () => {
  assert.throws(() => assertEmulatorOnly({}), (e) => e instanceof SeedRefusedError && e.code === 'auth_emulator_host_unset');
  assert.throws(() => assertEmulatorOnly({ FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' }),
    (e) => e.code === 'firestore_emulator_host_unset');
  assert.throws(() => assertEmulatorOnly({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }),
    (e) => e.code === 'auth_emulator_host_unset');
});

test('refuses non-loopback or malformed hosts (prod, LAN, emulator-from-android address)', () => {
  for (const host of ['firestore.googleapis.com:443', '10.0.2.2:8080', '192.168.1.5:8080', '8.8.8.8:80', '127.0.0.1', 'http://127.0.0.1:8080']) {
    assert.throws(() => assertEmulatorOnly({ ...LOCAL, FIRESTORE_EMULATOR_HOST: host }), SeedRefusedError, host);
  }
  assert.deepEqual({ ...assertEmulatorOnly(LOCAL) }, { authHost: '127.0.0.1:9099', firestoreHost: '127.0.0.1:8080' });
  assert.equal(assertEmulatorOnly({ ...LOCAL, FIRESTORE_EMULATOR_HOST: 'localhost:8080' }).firestoreHost, 'localhost:8080');
});

test('main refuses BEFORE any network call and before writing the local file', async () => {
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (...args) => { calls.push(args); throw new Error('must_not_be_called'); };
  const existedBefore = fs.existsSync(SEED_LOCAL_FILE);
  const mtimeBefore = existedBefore ? fs.statSync(SEED_LOCAL_FILE).mtimeMs : null;
  try {
    await assert.rejects(main(['--project', 'phraseman-ea0b3'], {}), SeedRefusedError);
    await assert.rejects(main(['--project', 'phraseman-ea0b3'], { ...LOCAL, FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443' }), SeedRefusedError);
    await assert.rejects(main([], LOCAL), (e) => e.code === 'project_invalid');
  } finally {
    globalThis.fetch = realFetch;
  }
  assert.equal(calls.length, 0);
  assert.equal(fs.existsSync(SEED_LOCAL_FILE), existedBefore);
  if (existedBefore) assert.equal(fs.statSync(SEED_LOCAL_FILE).mtimeMs, mtimeBefore);
});

test('args: project required, flags only on/off', () => {
  assert.equal(parseArgs(['--project', 'phraseman-ea0b3']).clientFlag, 'on');
  assert.equal(parseArgs(['--project', 'demo-phraseman', '--client-flag', 'off']).clientFlag, 'off');
  assert.throws(() => parseArgs(['--project', 'x']), SeedRefusedError);
  assert.throws(() => parseArgs(['--project', 'phraseman-ea0b3', '--server-flag', 'yes']), SeedRefusedError);
  assert.throws(() => parseArgs(['--project', 'phraseman-ea0b3', '--prod']), SeedRefusedError);
});

test('accounts: 3 local .test emails, random passwords, reused on rerun', () => {
  const fresh = buildSeedAccounts(null);
  assert.deepEqual(fresh.map((a) => a.label), ['a', 'b', 'c']);
  for (const account of fresh) {
    assert.match(account.email, /^accounts-v2-e2e-[abc]@phraseman\.test$/);
    assert.ok(account.password.length >= 24);
  }
  assert.equal(new Set(fresh.map((a) => a.password)).size, 3);
  const again = buildSeedAccounts({ accounts: fresh });
  assert.deepEqual(again, fresh);
});

test('source: no Admin SDK, no service account, no production endpoints', () => {
  const source = fs.readFileSync(new URL('../scripts/accounts-v2-emulator-seed.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /firebase-admin|GOOGLE_APPLICATION_CREDENTIALS|serviceAccount/);
  assert.doesNotMatch(source, /https:\/\//);
  assert.ok(source.indexOf('assertEmulatorOnly(env)') < source.indexOf('parseArgs(argv)'));
  assert.ok(fs.readFileSync(new URL('../.gitignore', import.meta.url), 'utf8').includes('scripts/accounts-v2-emulator-seed.local.json'));
});
