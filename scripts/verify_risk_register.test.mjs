import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { spawnSync } from 'node:child_process';

const verifier = path.resolve('scripts/verify_risk_register.mjs');
const requiredAuditIds = [
  'AUDIT-P1-DEPENDENCIES',
  'AUDIT-P1-CONTROL-SYSTEM',
  'AUDIT-P1-ADMIN-MONOLITH',
  'AUDIT-P1-RELEASE-CONTRACT',
  'AUDIT-P1-RESPONSE-RECOVERY',
  'AUDIT-P2-WEBSITE-HEADERS',
  'AUDIT-P2-DOM-SINKS',
  'AUDIT-P2-PERFORMANCE-BUDGET',
  'AUDIT-P2-REPO-GOVERNANCE',
  'AUDIT-P2-ARCHITECTURE-MAP',
  'AUDIT-P2-UX-JOURNEYS',
];

function record(id, overrides = {}) {
  const fields = {
    Priority: id.includes('-P1-') ? 'P1' : 'P2',
    Severity: id.includes('-P1-') ? 'High' : 'Medium',
    Status: 'Open',
    Asset: 'Documented asset',
    Threat: 'Documented threat',
    Impact: 'Documented impact',
    Likelihood: 'Possible',
    Treatment: 'Mitigate',
    Owner: 'Platform owner',
    'Owner status': 'Assigned',
    'Due/review date': '2026-12-31',
    'Linked control': 'CC1.1-PLANNED',
    'Acceptance decision': 'NotAccepted',
    'Acceptance expiry': 'N/A',
    ...overrides,
  };
  return [`## ${id}`, ...Object.entries(fields).map(([key, value]) => `- ${key}: ${value}`)].join('\n');
}

async function runFixture(records, buildArgs = (file) => ['--file', file, '--as-of', '2026-09-11']) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'risk-register-'));
  const file = path.join(dir, 'RISK_REGISTER.md');
  await writeFile(file, `# Risk register\n\n${records.join('\n\n')}\n`, 'utf8');
  return spawnSync(process.execPath, [verifier, ...buildArgs(file)], {
    encoding: 'utf8',
  });
}

test('accepts a complete register covering every P1/P2 audit finding', async () => {
  const result = await runFixture(requiredAuditIds.map((id) => record(id)));
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /risk_register_ok risks=11 audit_findings=11/);
});

test('rejects a record with a missing required field', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], { Threat: '' });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: missing Threat/);
});

test('rejects a high risk unless owner status is explicitly Assigned', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], { 'Owner status': 'Blocked' });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: high risk has no accountable owner/);
});

test('rejects Assigned high risk owner value No accountable owner', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], { Owner: 'No accountable owner' });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: high risk has no accountable owner/);
});

test('rejects Assigned high risk owner value To be determined', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], { Owner: 'To be determined' });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: high risk has no accountable owner/);
});

for (const placeholder of [
  'PENDING — named person not assigned',
  'Platform role (TBD)',
  'UNKNOWN: interim owner',
]) {
  test(`rejects punctuated owner placeholder despite Assigned: ${placeholder}`, async () => {
    const records = requiredAuditIds.map((id) => record(id));
    records[0] = record(requiredAuditIds[0], { Owner: placeholder });
    const result = await runFixture(records);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: high risk has no accountable owner/);
  });
}

test('rejects expired critical acceptance even when treatment due date is in the future', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], {
    Severity: 'Critical',
    Treatment: 'Accept',
    'Acceptance decision': 'Approved',
    'Acceptance expiry': '2026-09-10',
    'Due/review date': '2026-12-31',
  });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: approved acceptance expired/);
});

test('rejects expired approved Critical risk even when treatment is Mitigate and due date is future', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], {
    Severity: 'Critical',
    Treatment: 'Mitigate',
    'Acceptance decision': 'Approved',
    'Acceptance expiry': '2026-09-10',
    'Due/review date': '2026-12-31',
  });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: approved acceptance expired/);
});

test('requires approved Critical acceptance expiry to be after the as-of date', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], {
    Severity: 'Critical',
    Treatment: 'Mitigate',
    'Acceptance decision': 'Approved',
    'Acceptance expiry': '2026-09-11',
    'Due/review date': '2026-12-31',
  });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: approved acceptance expiry must be in the future/);
});

test('requires explicit future expiry for Approved High risk', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], {
    Severity: 'High',
    'Acceptance decision': 'Approved',
    'Acceptance expiry': 'N/A',
  });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: approved acceptance requires explicit expiry/);
});

test('rejects expired Approved Medium risk with future treatment date', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[5] = record(requiredAuditIds[5], {
    Severity: 'Medium',
    'Acceptance decision': 'Approved',
    'Acceptance expiry': '2026-09-10',
    'Due/review date': '2026-12-31',
  });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P2-WEBSITE-HEADERS: approved acceptance expired/);
});

test('requires Approved decision whenever treatment is Accept', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], {
    Severity: 'High',
    Treatment: 'Accept',
    'Acceptance decision': 'Pending',
    'Acceptance expiry': '2026-12-31',
  });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: acceptance treatment is not approved/);
});

test('rejects invalid Status enum', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], { Status: 'Waiting for somebody' });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: invalid Status Waiting for somebody/);
});

test('rejects invalid Likelihood enum', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], { Likelihood: 'Maybe' });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: invalid Likelihood Maybe/);
});

test('rejects invalid Treatment enum', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], { Treatment: 'Remediate later' });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: invalid Treatment Remediate later/);
});

test('rejects Priority that does not match AUDIT-Pn ID', async () => {
  const records = requiredAuditIds.map((id) => record(id));
  records[0] = record(requiredAuditIds[0], { Priority: 'P2' });
  const result = await runFixture(records);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-DEPENDENCIES: Priority P2 does not match ID priority P1/);
});

test('CLI rejects unknown flags', async () => {
  const result = await runFixture(
    requiredAuditIds.map((id) => record(id)),
    (file) => ['--file', file, '--as-of', '2026-09-11', '--mystery'],
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown argument: --mystery/);
});

test('CLI rejects duplicate flags', async () => {
  const result = await runFixture(
    requiredAuditIds.map((id) => record(id)),
    (file) => ['--file', file, '--file', file, '--as-of', '2026-09-11'],
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate argument: --file/);
});

test('CLI rejects flags with missing values', async () => {
  const result = await runFixture(
    requiredAuditIds.map((id) => record(id)),
    (file) => ['--file', file, '--as-of'],
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing value for --as-of/);
});

test('rejects a register that omits an audited P1/P2 finding', async () => {
  const result = await runFixture(requiredAuditIds.slice(0, -1).map((id) => record(id)));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing audit finding AUDIT-P2-UX-JOURNEYS/);
});
