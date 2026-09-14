import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const functionSource = fs.readFileSync('functions/src/soc2_readiness_collector.ts', 'utf8');
const adminSource = fs.readFileSync('admin/v2/legacy.html', 'utf8');

test('scheduled SOC2 collector has bounded server-owned evidence contracts', () => {
  for (const marker of [
    'soc2_evidence_manifests', 'soc2_automated_control_projection', 'soc2_automation_state',
    'soc2_evidence_runs', "schemaVersion: SOC2_SCHEMA_VERSION", 'onSchedule', 'runId',
    'population_truncated', 'not-integrated',
  ]) assert.match(functionSource, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(functionSource, /SOC2_MAX_AUTH_USERS = 1000/);
  assert.match(functionSource, /SOC2_MAX_AUDIT_ROWS = 500/);
  assert.match(functionSource, /sha256Text/);
  assert.match(functionSource, /schedule: '0 4 \* \* 1'/);
  assert.doesNotMatch(functionSource, /schedule: '0 4 \* \* \*'/);
});

test('admin surface exposes automatic SOC2 status without client writes', () => {
  for (const marker of ['soc2-automation-status', 'soc2-automation-last-run', 'soc2-automation-summary', 'loadAutomatedProjection', 'Автоматически', 'Вручную', 'Заблокировано']) {
    assert.match(adminSource, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const runtimeStart = adminSource.indexOf('<script id="pm-soc2-readiness-runtime">');
  const runtimeEnd = adminSource.indexOf('</script>', runtimeStart);
  const runtime = adminSource.slice(runtimeStart, runtimeEnd);
  assert.doesNotMatch(runtime, /soc2_automated_control_projection|soc2_evidence_manifests|soc2_evidence_runs/);
});
