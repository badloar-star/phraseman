import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');

test('automated SOC2 evidence collections are admin-readable and client immutable', () => {
  for (const collection of ['soc2_evidence_manifests', 'soc2_automated_control_projection', 'soc2_automation_state', 'soc2_evidence_runs']) {
    const start = rules.indexOf(`match /${collection}/`);
    assert.ok(start >= 0, `${collection}_rule_missing`);
    const end = rules.indexOf('\n  }', start);
    const block = rules.slice(start, end > start ? end : start + 1600);
    assert.match(block, /allow read: if isAdmin\(\)/);
    assert.match(block, /allow (create, update, delete|write): if false/);
  }
  const runStart = rules.indexOf('match /soc2_evidence_runs/{runId}');
  const runEnd = rules.indexOf('\n  }', runStart);
  assert.match(rules.slice(runStart, runEnd > runStart ? runEnd + 600 : runStart + 1800), /match \/events\/{eventId}/);
  assert.match(rules, /collection != 'soc2_control_evidence'/);
});
