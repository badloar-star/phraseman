import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

test('dependency reachability report is reproducible and classified', () => {
  const output = execFileSync(process.execPath, ['scripts/build_dependency_reachability.mjs'], { encoding: 'utf8' });
  assert.match(output, /dependency_reachability_ok packages=/);
  const report = JSON.parse(fs.readFileSync('docs/security/DEPENDENCY_REACHABILITY.json', 'utf8'));
  assert.equal(report.status, 'evidence_only');
  assert.ok(report.targets.includes('shell-quote'));
  assert.ok(report.packages.every((entry) => ['build-or-tooling', 'runtime-or-platform', 'unknown'].includes(entry.category)));
  assert.ok(report.packages.some((entry) => entry.name === 'websocket-driver'));
});
