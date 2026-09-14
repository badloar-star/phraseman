import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = process.cwd();

async function fixture(value) {
  const dir = await mkdtemp(path.join(tmpdir(), 'suite-metrics-'));
  const input = path.join(dir, 'jest.json');
  const output = path.join(dir, 'metrics.json');
  await writeFile(input, JSON.stringify(value));
  return { input, output };
}

test('normalizes Jest JSON into sanitized suite metrics', async () => {
  const files = await fixture({
    startTime: 1789120000000,
    numTotalTestSuites: 1,
    numPassedTestSuites: 1,
    numFailedTestSuites: 0,
    numTotalTests: 2,
    numPassedTests: 2,
    numFailedTests: 0,
    numPendingTests: 0,
    testResults: [{ name: 'tests/auth_identity.test.ts', startTime: 1789120000000, endTime: 1789120001250, numFailingTests: 0, assertionResults: [{ status: 'passed' }, { status: 'passed' }] }],
  });
  const result = spawnSync(process.execPath, ['scripts/test_suite_metrics.mjs', '--input', files.input, '--output', files.output], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const metrics = JSON.parse(await readFile(files.output, 'utf8'));
  assert.equal(metrics.totalTests, 2);
  assert.equal(metrics.suites[0].durationMs, 1250);
  assert.equal(metrics.isolationChange, 'none');
  assert.equal(metrics.environment, undefined);
});

test('rejects malformed or incomplete runner JSON', async () => {
  const files = await fixture({ numTotalTests: 2 });
  const result = spawnSync(process.execPath, ['scripts/test_suite_metrics.mjs', '--input', files.input, '--output', files.output], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing required Jest metrics/);
});

function test(name, fn) {
  Promise.resolve(fn()).then(
    () => console.log(`PASS ${name}`),
    (error) => { console.error(`FAIL ${name}\n${error.stack}`); process.exitCode = 1; },
  );
}
