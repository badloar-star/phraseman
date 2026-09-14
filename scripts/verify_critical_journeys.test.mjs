import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

test('critical journey verifier passes the baseline contract', () => {
  const output = execFileSync(process.execPath, ['scripts/verify_critical_journeys.mjs'], { encoding: 'utf8' });
  assert.match(output, /critical_journeys_ok journeys=8 status=baseline_pending/);
});
