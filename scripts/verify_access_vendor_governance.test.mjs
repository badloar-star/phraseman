import assert from 'node:assert/strict';
import { copyFile, mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

function run(args = []) {
  return spawnSync(process.execPath, ['scripts/verify_access_vendor_governance.mjs', '--root', root, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

async function fixture() {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'access-vendor-'));
  await mkdir(path.join(fixtureRoot, 'docs', 'security'), { recursive: true });
  await mkdir(path.join(fixtureRoot, '.github'), { recursive: true });
  for (const relative of [
    'docs/security/VENDOR_REGISTER.json',
    'SECURITY.md',
    '.github/CODEOWNERS',
    '.github/dependabot.yml',
  ]) {
    await copyFile(path.join(root, relative), path.join(fixtureRoot, relative));
  }
  return fixtureRoot;
}

test('accepts repository-safe access and vendor governance artifacts', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('rejects duplicate vendor IDs and missing evidence status', async () => {
  const fixtureRoot = await fixture();
  const file = path.join(fixtureRoot, 'docs', 'security', 'VENDOR_REGISTER.json');
  const register = JSON.parse(await readFile(file, 'utf8'));
  register.vendors[1].vendorId = register.vendors[0].vendorId;
  delete register.vendors[0].evidenceStatus;
  await writeFile(file, JSON.stringify(register));
  const result = spawnSync(process.execPath, ['scripts/verify_access_vendor_governance.mjs', '--root', fixtureRoot], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate vendorId|evidenceStatus/);
});

test('rejects secret-like vendor values', async () => {
  const fixtureRoot = await fixture();
  const file = path.join(fixtureRoot, 'docs', 'security', 'VENDOR_REGISTER.json');
  const register = JSON.parse(await readFile(file, 'utf8'));
  register.vendors[0].notes = 'sk-1234567890abcdef';
  await writeFile(file, JSON.stringify(register));
  const result = spawnSync(process.execPath, ['scripts/verify_access_vendor_governance.mjs', '--root', fixtureRoot], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /secret-like/);
});

function test(name, fn) {
  Promise.resolve(fn()).then(
    () => console.log(`PASS ${name}`),
    (error) => {
      console.error(`FAIL ${name}\n${error.stack}`);
      process.exitCode = 1;
    },
  );
}
