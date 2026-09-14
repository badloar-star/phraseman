import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const adminSource = fs.readFileSync('admin/v2/legacy.html', 'utf8');
const rules = fs.readFileSync('firestore.rules', 'utf8');

test('SOC 2 readiness evidence has an admin-only append-audited persistence contract', () => {
  assert.match(adminSource, /pmSoc2ReadinessBackend/);
  assert.match(adminSource, /soc2_control_evidence/);
  assert.match(adminSource, /pm:soc2-backend-ready/);
  assert.match(adminSource, /persistControl/);

  assert.match(rules, /match \/soc2_control_evidence\/{controlId}/);
  assert.match(rules, /match \/events\/{eventId}/);
  assert.match(rules, /allow read: if isAdmin\(\)/);
  assert.match(rules, /allow create, update: if isAdmin\(\)/);
  assert.match(rules, /allow create: if isAdmin\(\)/);
  assert.match(rules, /collection != 'soc2_control_evidence'/);
  assert.match(rules, /allow delete: if false/);
});
