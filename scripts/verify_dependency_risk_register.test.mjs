import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

function run(rootPath, extra = []) {
  return spawnSync(process.execPath, ['scripts/verify_dependency_risk_register.mjs', '--root', rootPath, '--as-of', '2026-09-11', ...extra], {
    cwd: root,
    encoding: 'utf8',
  });
}

async function fixture() {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'dependency-register-'));
  await copyFile(path.join(root, 'docs/security/DEPENDENCY_RISK_REGISTER.json'), path.join(fixtureRoot, 'register.json'));
  return fixtureRoot;
}

test('accepts the sanitized dependency risk register', () => {
  const result = run(root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('rejects duplicate IDs and missing owners', async () => {
  const fixtureRoot = await fixture();
  const file = path.join(fixtureRoot, 'register.json');
  const register = JSON.parse(await readFile(file, 'utf8'));
  register.risks[1].riskId = register.risks[0].riskId;
  delete register.risks[0].ownerRole;
  await writeFile(file, JSON.stringify(register));
  const result = run(fixtureRoot, ['--register', 'register.json']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate riskId|ownerRole/);
});

test('rejects expired open risk and invalid advisory identity', async () => {
  const fixtureRoot = await fixture();
  const file = path.join(fixtureRoot, 'register.json');
  const register = JSON.parse(await readFile(file, 'utf8'));
  register.risks[0].dueDate = '2026-09-10';
  register.risks[0].advisoryIds = ['not-an-advisory'];
  await writeFile(file, JSON.stringify(register));
  const result = run(fixtureRoot, ['--register', 'register.json']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /dueDate|advisoryIds/);
});

function test(name, fn) {
  Promise.resolve(fn()).then(
    () => console.log(`PASS ${name}`),
    (error) => { console.error(`FAIL ${name}\n${error.stack}`); process.exitCode = 1; },
  );
}
