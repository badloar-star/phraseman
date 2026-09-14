import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rename, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const verifier = path.resolve('scripts/verify_control_evidence.mjs');
const asOf = '2026-09-11';
const securityCriteria = [
  'CC1.1', 'CC1.2', 'CC1.3', 'CC1.4', 'CC1.5',
  'CC2.1', 'CC2.2', 'CC2.3',
  'CC3.1', 'CC3.2', 'CC3.3', 'CC3.4',
  'CC4.1', 'CC4.2',
  'CC5.1', 'CC5.2', 'CC5.3',
  'CC6.1', 'CC6.2', 'CC6.3', 'CC6.4', 'CC6.5', 'CC6.6', 'CC6.7', 'CC6.8',
  'CC7.1', 'CC7.2', 'CC7.3', 'CC7.4', 'CC7.5',
  'CC8.1',
  'CC9.1', 'CC9.2',
];
const availabilityCriteria = ['A1.1', 'A1.2', 'A1.3'];
const riskIds = [
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

function source(id, evidenceClass = 'design', cycleId) {
  return {
    evidenceId: id,
    path: `evidence/${id}.${evidenceClass === 'operating' ? 'json' : 'md'}`,
    evidenceClass,
    description: `Repository evidence source for ${id}`,
    collectedOn: '2026-09-10',
    maxAgeDays: 30,
    ...(cycleId ? { cycleId } : {}),
  };
}

function operatingManifest(sourceEntry, controlId) {
  return {
    schemaVersion: 2,
    evidenceId: sourceEntry.evidenceId,
    controlId,
    cycleId: sourceEntry.cycleId,
    populationScope: 'Complete fixture population for the control during this cycle.',
    performer: { type: 'system', identifier: 'fixture-ci-runner' },
    performerPersonId: null,
    executionResult: 'pass',
    exceptions: { count: 0, disposition: 'none', items: [] },
    provenanceType: 'repository',
    externalSource: null,
    artifactPath: `evidence/${sourceEntry.evidenceId}.artifact.txt`,
    sourceRevision: '',
    sourceChecksum: '',
    startedAt: '2026-09-10T10:00:00.000Z',
    completedAt: '2026-09-10T10:05:00.000Z',
  };
}

function securityControl(overrides = {}) {
  return {
    controlId: 'CTRL-CC6.1-ACCESS',
    proposedCriterion: 'CC6.1',
    category: 'Security',
    description: 'Privileged access is authenticated, authorized and reviewed against the approved boundary.',
    ownerRole: 'Security engineering',
    ownerStatus: 'human_pending',
    cadence: 'per_change',
    evidenceSources: [source('access-design')],
    retentionMonths: 18,
    exceptionSlaDays: 14,
    implementationStatus: 'designed',
    linkedRisks: [...riskIds],
    ...overrides,
  };
}

function availabilityControl(overrides = {}) {
  return securityControl({
    controlId: 'CTRL-A1.2-RECOVERY',
    proposedCriterion: 'A1.2',
    category: 'Availability',
    description: 'Recovery responsibilities and evidence requirements are defined for service interruptions.',
    evidenceSources: [source('recovery-design'), source('recovery-planning', 'planning')],
    implementationStatus: 'designed',
    linkedRisks: ['AUDIT-P1-RESPONSE-RECOVERY'],
    ...overrides,
  });
}

function criterionInventory(controls) {
  const securityId = controls.find((control) => control.category === 'Security')?.controlId ?? controls[0]?.controlId;
  const availabilityId = controls.find((control) => control.category === 'Availability')?.controlId ?? controls[0]?.controlId;
  return [
    ...securityCriteria.map((criterion) => ({
      criterion,
      category: 'Security',
      coverageStatus: 'Mapped',
      rationale: `Fixture maps ${criterion} to the explicit Security control for structural validation.`,
      controlIds: [securityId],
    })),
    ...availabilityCriteria.map((criterion) => ({
      criterion,
      category: 'Availability',
      coverageStatus: 'Mapped',
      rationale: `Fixture maps ${criterion} to the explicit Availability control for structural validation.`,
      controlIds: [availabilityId],
    })),
  ];
}

function matrix(controls = [securityControl(), availabilityControl()]) {
  return {
    schemaVersion: 3,
    matrixStatus: 'Draft',
    asOf,
    scopeCategories: ['Security', 'Availability'],
    requiredControlIds: controls.map((control) => control.controlId),
    criterionInventory: criterionInventory(controls),
    operatingCycles: [],
    controls,
  };
}

function riskRegister(linkedControls) {
  return riskIds.map((riskId, index) => [
    `## ${riskId}`,
    `- Linked control: ${linkedControls[index] ?? linkedControls[0]}`,
  ].join('\n')).join('\n\n');
}

async function fixture(data, linkedControls = riskIds.map(() => data.controls[0].controlId)) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'control-evidence-'));
  await mkdir(path.join(root, 'evidence'), { recursive: true });
  const operatingEntries = [];
  for (const controlEntry of data.controls) {
    for (const item of controlEntry.evidenceSources ?? []) {
      if (typeof item.path === 'string' && item.path.startsWith('evidence/')) {
        if (item.evidenceClass === 'operating') {
          const manifest = operatingManifest(item, controlEntry.controlId);
          const artifactBody = `immutable artifact for ${item.evidenceId}\n`;
          await writeFile(path.join(root, manifest.artifactPath), artifactBody, 'utf8');
          operatingEntries.push({ item, controlEntry, manifest, artifactBody });
        } else {
          await writeFile(path.join(root, item.path), '# fixture evidence\n', 'utf8');
        }
      }
    }
  }
  await writeFile(path.join(root, 'fixture-anchor.txt'), 'control evidence fixture\n', 'utf8');
  const git = (...args) => spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  assert.equal(git('init', '--quiet').status, 0);
  assert.equal(git('config', 'user.email', 'fixture@example.invalid').status, 0);
  assert.equal(git('config', 'user.name', 'Control Evidence Fixture').status, 0);
  assert.equal(git('add', '--', 'fixture-anchor.txt', ...operatingEntries.map(({ manifest }) => manifest.artifactPath)).status, 0);
  assert.equal(git('-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=', 'commit', '--quiet', '-m', 'fixture evidence artifacts').status, 0);
  const revision = git('rev-parse', 'HEAD').stdout.trim();
  for (const { item, controlEntry, manifest, artifactBody } of operatingEntries) {
    manifest.sourceRevision = revision;
    manifest.sourceChecksum = `sha256:${createHash('sha256').update(artifactBody).digest('hex')}`;
    await writeFile(path.join(root, item.path), JSON.stringify(manifest), 'utf8');
  }
  const matrixPath = path.join(root, 'matrix.json');
  const riskPath = path.join(root, 'risk-register.md');
  await writeFile(matrixPath, JSON.stringify(data), 'utf8');
  await writeFile(riskPath, riskRegister(linkedControls), 'utf8');
  return { root, matrixPath, riskPath };
}

function run(args) {
  return spawnSync(process.execPath, [verifier, ...args], { encoding: 'utf8' });
}

async function runMatrix(data, options = {}) {
  const { root, matrixPath, riskPath } = await fixture(data, options.linkedControls);
  return run([
    '--matrix', matrixPath,
    '--risk-register', riskPath,
    '--repo-root', root,
    '--as-of', asOf,
    '--dry-run',
    ...(options.extra ?? []),
  ]);
}

function approvedControl(control, ownerName, ownerPersonId, cycleId, operatingIds = [`${control.controlId}-run`]) {
  return {
    ...control,
    ownerStatus: 'assigned',
    ownerName,
    ownerPersonId,
    implementationStatus: 'operating',
    evidenceSources: [
      ...control.evidenceSources.filter((item) => item.evidenceClass === 'design'),
      ...operatingIds.map((id) => source(id, 'operating', cycleId)),
    ],
  };
}

function approvedMatrix({ incomplete = false, fragments = 1 } = {}) {
  const cycleId = '2026-Q3-01';
  const first = approvedControl(securityControl(), 'Alice Owner', 'person:alice-owner', cycleId,
    Array.from({ length: fragments }, (_, index) => `access-run-${index + 1}`));
  const secondBase = availabilityControl({
    evidenceSources: [source('recovery-design')],
    implementationStatus: 'designed',
  });
  const second = incomplete
    ? { ...secondBase, ownerStatus: 'assigned', ownerName: 'Carol Owner', ownerPersonId: 'person:carol-owner' }
    : approvedControl(secondBase, 'Carol Owner', 'person:carol-owner', cycleId, ['recovery-run']);
  const approved = matrix([first, second]);
  approved.matrixStatus = 'Approved';
  approved.operatingCycles = [{
    cycleId,
    reviewedOn: '2026-09-10T12:00:00.000Z',
    reviewerName: 'Bob Reviewer',
    reviewerPersonId: 'person:bob-reviewer',
    reviewerRole: 'Independent compliance reviewer',
    decision: 'clean',
    decisionDetail: 'The complete required population passed independent review without open exceptions.',
  }];
  return approved;
}

test('accepts complete criterion coverage with separate design and planning evidence', async () => {
  const result = await runMatrix(matrix());

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /controls=2 criteria=36 mapped_criteria=36 planned_criteria=0 gap_criteria=0 pending_cpa_criteria=0 design_sources=2 planning_sources=1 gap_sources=0 operating_sources=0 operating_cycles=0 status=Draft/);
});

test('counts one approved cycle only when every required control has operating evidence and independent clean review', async () => {
  const result = await runMatrix(approvedMatrix());

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /operating_sources=2 operating_cycles=1 status=Approved/);
});

test('uses stable person IDs and requires review after all human performance', async () => {
  const ownerCollision = approvedMatrix();
  ownerCollision.operatingCycles[0].reviewerPersonId = ownerCollision.controls[0].ownerPersonId;
  const ownerResult = await runMatrix(ownerCollision);
  assert.notEqual(ownerResult.status, 0);
  assert.match(ownerResult.stderr, /reviewerPersonId matches a required control owner/);

  const performerCollision = approvedMatrix();
  const performerFixture = await fixture(performerCollision);
  const performerSource = performerCollision.controls[0].evidenceSources.find((item) => item.evidenceClass === 'operating');
  const performerPath = path.join(performerFixture.root, performerSource.path);
  const performerManifest = JSON.parse(await readFile(performerPath, 'utf8'));
  performerManifest.performer = { type: 'human', identifier: 'Bob Reviewer' };
  performerManifest.performerPersonId = 'person:bob-reviewer';
  await writeFile(performerPath, JSON.stringify(performerManifest), 'utf8');
  const performerResult = run([
    '--matrix', performerFixture.matrixPath,
    '--risk-register', performerFixture.riskPath,
    '--repo-root', performerFixture.root,
    '--as-of', asOf,
    '--dry-run',
  ]);
  assert.notEqual(performerResult.status, 0);
  assert.match(performerResult.stderr, /reviewerPersonId matches a human control performer/);

  const earlyReview = approvedMatrix();
  earlyReview.operatingCycles[0].reviewedOn = '2026-09-10T09:00:00.000Z';
  const earlyResult = await runMatrix(earlyReview);
  assert.notEqual(earlyResult.status, 0);
  assert.match(earlyResult.stderr, /reviewedOn precedes latest manifest completion/);
});

test('does not count an incomplete operating cycle', async () => {
  const result = await runMatrix(approvedMatrix({ incomplete: true }));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cycle 2026-Q3-01 missing operating evidence for CTRL-A1\.2-RECOVERY/);
});

test('does not treat multiple evidence fragments from one control as a complete cycle', async () => {
  const result = await runMatrix(approvedMatrix({ incomplete: true, fragments: 2 }));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /cycle 2026-Q3-01 missing operating evidence for CTRL-A1\.2-RECOVERY/);
  assert.doesNotMatch(result.stdout, /operating_cycles=1/);
});

test('rejects a generic document as operating evidence', async () => {
  const approved = approvedMatrix();
  approved.controls[0].evidenceSources.find((item) => item.evidenceClass === 'operating').path = 'evidence/generic.md';
  const result = await runMatrix(approved);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /operating evidence must reference a JSON manifest/);
});

test('rejects malformed and mismatched operating manifests', async () => {
  const malformedMatrix = approvedMatrix();
  const malformedFixture = await fixture(malformedMatrix);
  const malformedSource = malformedMatrix.controls[0].evidenceSources.find((item) => item.evidenceClass === 'operating');
  await writeFile(path.join(malformedFixture.root, malformedSource.path), '{bad json', 'utf8');
  const malformed = run([
    '--matrix', malformedFixture.matrixPath,
    '--risk-register', malformedFixture.riskPath,
    '--repo-root', malformedFixture.root,
    '--as-of', asOf,
    '--dry-run',
  ]);
  assert.notEqual(malformed.status, 0);
  assert.match(malformed.stderr, /operating evidence manifest is not valid JSON/);

  const mismatchMatrix = approvedMatrix();
  const mismatchFixture = await fixture(mismatchMatrix);
  const mismatchSource = mismatchMatrix.controls[0].evidenceSources.find((item) => item.evidenceClass === 'operating');
  const mismatchManifest = operatingManifest(mismatchSource, 'CTRL-WRONG-CONTROL');
  mismatchManifest.evidenceId = 'WRONG-EVIDENCE';
  mismatchManifest.cycleId = '2026-Q4-WRONG';
  await writeFile(path.join(mismatchFixture.root, mismatchSource.path), JSON.stringify(mismatchManifest), 'utf8');
  const mismatch = run([
    '--matrix', mismatchFixture.matrixPath,
    '--risk-register', mismatchFixture.riskPath,
    '--repo-root', mismatchFixture.root,
    '--as-of', asOf,
    '--dry-run',
  ]);
  assert.notEqual(mismatch.status, 0);
  assert.match(mismatch.stderr, /manifest evidenceId WRONG-EVIDENCE does not match/);
  assert.match(mismatch.stderr, /manifest controlId CTRL-WRONG-CONTROL does not match/);
  assert.match(mismatch.stderr, /manifest cycleId 2026-Q4-WRONG does not match/);
});

test('verifies artifact bytes and reachable Git provenance', async () => {
  const invalidRevisionMatrix = approvedMatrix();
  const invalidRevisionFixture = await fixture(invalidRevisionMatrix);
  const invalidRevisionSource = invalidRevisionMatrix.controls[0].evidenceSources.find((item) => item.evidenceClass === 'operating');
  const invalidRevisionPath = path.join(invalidRevisionFixture.root, invalidRevisionSource.path);
  const invalidRevisionManifest = JSON.parse(await readFile(invalidRevisionPath, 'utf8'));
  invalidRevisionManifest.sourceRevision = 'deadbeef';
  await writeFile(invalidRevisionPath, JSON.stringify(invalidRevisionManifest), 'utf8');
  const revisionResult = run([
    '--matrix', invalidRevisionFixture.matrixPath,
    '--risk-register', invalidRevisionFixture.riskPath,
    '--repo-root', invalidRevisionFixture.root,
    '--as-of', asOf,
    '--dry-run',
  ]);
  assert.notEqual(revisionResult.status, 0);
  assert.match(revisionResult.stderr, /sourceRevision is not a reachable Git commit/);

  const digestMatrix = approvedMatrix();
  const digestFixture = await fixture(digestMatrix);
  const digestSource = digestMatrix.controls[0].evidenceSources.find((item) => item.evidenceClass === 'operating');
  const digestManifest = JSON.parse(await readFile(path.join(digestFixture.root, digestSource.path), 'utf8'));
  await writeFile(path.join(digestFixture.root, digestManifest.artifactPath), 'tampered artifact bytes\n', 'utf8');
  const digestResult = run([
    '--matrix', digestFixture.matrixPath,
    '--risk-register', digestFixture.riskPath,
    '--repo-root', digestFixture.root,
    '--as-of', asOf,
    '--dry-run',
  ]);
  assert.notEqual(digestResult.status, 0);
  assert.match(digestResult.stderr, /artifact SHA-256 does not match sourceChecksum/);
});

test('models external imports without treating provider metadata as authenticity', async () => {
  const imported = approvedMatrix();
  const importedFixture = await fixture(imported);
  const importedSource = imported.controls[0].evidenceSources.find((item) => item.evidenceClass === 'operating');
  const importedPath = path.join(importedFixture.root, importedSource.path);
  const importedManifest = JSON.parse(await readFile(importedPath, 'utf8'));
  importedManifest.provenanceType = 'external_import';
  importedManifest.externalSource = {
    system: 'Fixture evidence provider',
    reference: 'sanitized-export-123',
    importedAt: '2026-09-10T10:06:00.000Z',
  };
  await writeFile(importedPath, JSON.stringify(importedManifest), 'utf8');
  const result = run([
    '--matrix', importedFixture.matrixPath,
    '--risk-register', importedFixture.riskPath,
    '--repo-root', importedFixture.root,
    '--as-of', asOf,
    '--dry-run',
  ]);
  assert.equal(result.status, 0, result.stderr);
});

test('rejects linked evidence and artifact paths plus canonical containment escapes', async () => {
  const linkedManifestMatrix = approvedMatrix();
  const linkedManifestFixture = await fixture(linkedManifestMatrix);
  const linkedManifestSource = linkedManifestMatrix.controls[0].evidenceSources.find((item) => item.evidenceClass === 'operating');
  const linkedManifestPath = path.join(linkedManifestFixture.root, linkedManifestSource.path);
  const realManifestDirectory = path.join(linkedManifestFixture.root, 'real-manifests');
  const linkedManifestDirectory = path.join(linkedManifestFixture.root, 'linked-manifests');
  await mkdir(realManifestDirectory);
  await rename(linkedManifestPath, path.join(realManifestDirectory, path.basename(linkedManifestPath)));
  await symlink(realManifestDirectory, linkedManifestDirectory, process.platform === 'win32' ? 'junction' : 'dir');
  linkedManifestSource.path = `linked-manifests/${path.basename(linkedManifestPath)}`;
  await writeFile(linkedManifestFixture.matrixPath, JSON.stringify(linkedManifestMatrix), 'utf8');
  const linkedManifestResult = run([
    '--matrix', linkedManifestFixture.matrixPath,
    '--risk-register', linkedManifestFixture.riskPath,
    '--repo-root', linkedManifestFixture.root,
    '--as-of', asOf,
    '--dry-run',
  ]);
  assert.notEqual(linkedManifestResult.status, 0);
  assert.match(linkedManifestResult.stderr, /evidence path must not contain a symlink or junction/);

  const linkedArtifactMatrix = approvedMatrix();
  const linkedArtifactFixture = await fixture(linkedArtifactMatrix);
  const linkedArtifactSource = linkedArtifactMatrix.controls[0].evidenceSources.find((item) => item.evidenceClass === 'operating');
  const linkedArtifactManifest = JSON.parse(await readFile(path.join(linkedArtifactFixture.root, linkedArtifactSource.path), 'utf8'));
  const linkedArtifactPath = path.join(linkedArtifactFixture.root, linkedArtifactManifest.artifactPath);
  const realArtifactDirectory = path.join(linkedArtifactFixture.root, 'real-artifacts');
  const linkedArtifactDirectory = path.join(linkedArtifactFixture.root, 'linked-artifacts');
  await mkdir(realArtifactDirectory);
  await rename(linkedArtifactPath, path.join(realArtifactDirectory, path.basename(linkedArtifactPath)));
  await symlink(realArtifactDirectory, linkedArtifactDirectory, process.platform === 'win32' ? 'junction' : 'dir');
  linkedArtifactManifest.artifactPath = `linked-artifacts/${path.basename(linkedArtifactPath)}`;
  await writeFile(path.join(linkedArtifactFixture.root, linkedArtifactSource.path), JSON.stringify(linkedArtifactManifest), 'utf8');
  const linkedArtifactResult = run([
    '--matrix', linkedArtifactFixture.matrixPath,
    '--risk-register', linkedArtifactFixture.riskPath,
    '--repo-root', linkedArtifactFixture.root,
    '--as-of', asOf,
    '--dry-run',
  ]);
  assert.notEqual(linkedArtifactResult.status, 0);
  assert.match(linkedArtifactResult.stderr, /artifact path must not contain a symlink or junction/);

  const escapedMatrix = approvedMatrix();
  const escapedFixture = await fixture(escapedMatrix);
  const escapedSource = escapedMatrix.controls[0].evidenceSources.find((item) => item.evidenceClass === 'operating');
  const originalManifest = await readFile(path.join(escapedFixture.root, escapedSource.path));
  const outsideRoot = await mkdtemp(path.join(os.tmpdir(), 'control-evidence-outside-'));
  await writeFile(path.join(outsideRoot, 'escaped.json'), originalManifest);
  const linkPath = path.join(escapedFixture.root, 'linked-evidence');
  await symlink(outsideRoot, linkPath, process.platform === 'win32' ? 'junction' : 'dir');
  escapedSource.path = 'linked-evidence/escaped.json';
  await writeFile(escapedFixture.matrixPath, JSON.stringify(escapedMatrix), 'utf8');
  const escapedResult = run([
    '--matrix', escapedFixture.matrixPath,
    '--risk-register', escapedFixture.riskPath,
    '--repo-root', escapedFixture.root,
    '--as-of', asOf,
    '--dry-run',
  ]);
  assert.notEqual(escapedResult.status, 0);
  assert.match(escapedResult.stderr, /evidence path must not contain a symlink or junction|evidence real path must stay within repository/);
});

test('draft matrices cannot claim operating cycles', async () => {
  const draft = approvedMatrix();
  draft.matrixStatus = 'Draft';
  const result = await runMatrix(draft);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Draft matrix cannot claim operating cycles/);
});

test('fails duplicate control and evidence IDs', async () => {
  const duplicate = securityControl({ proposedCriterion: 'CC7.1', evidenceSources: [source('access-design')] });
  const result = await runMatrix(matrix([securityControl(), availabilityControl(), duplicate]));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate control ID CTRL-CC6\.1-ACCESS/);
  assert.match(result.stderr, /duplicate evidence ID access-design/);
});

test('fails missing or placeholder owners', async () => {
  const result = await runMatrix(matrix([securityControl({ ownerRole: 'PENDING' }), availabilityControl()]));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing accountable owner/);
});

test('fails approved matrices without named-human owners', async () => {
  const approved = approvedMatrix();
  delete approved.controls[0].ownerName;
  delete approved.controls[0].ownerPersonId;
  const result = await runMatrix(approved);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /assigned owner requires ownerName/);
  assert.match(result.stderr, /assigned owner requires ownerPersonId/);
});

test('fails stale evidence', async () => {
  const stale = source('stale-design');
  stale.collectedOn = '2026-01-01';
  stale.maxAgeDays = 30;
  const result = await runMatrix(matrix([securityControl({ evidenceSources: [stale] }), availabilityControl()]));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /stale evidence stale-design/);
});

test('fails when any Task 2.1 linked control is absent or not linked back to its risk', async () => {
  const linkedControls = riskIds.map(() => 'CTRL-CC6.1-ACCESS');
  linkedControls[4] = 'PLANNED-A1.2-MISSING';
  const result = await runMatrix(matrix(), { linkedControls });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /AUDIT-P1-RESPONSE-RECOVERY: linked control PLANNED-A1\.2-MISSING is absent from matrix/);
});

test('fails control risk links that do not exist in Task 2.1 register', async () => {
  const dangling = matrix();
  dangling.controls[0].linkedRisks.push('AUDIT-P2-NOT-REGISTERED');
  const result = await runMatrix(dangling);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /CTRL-CC6\.1-ACCESS: linked risk AUDIT-P2-NOT-REGISTERED is absent from risk register/);
});

test('fails incomplete or duplicate criterion inventory mappings', async () => {
  const incomplete = matrix();
  incomplete.criterionInventory = incomplete.criterionInventory.filter((item) => item.criterion !== 'CC4.2');
  const missing = await runMatrix(incomplete);
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /missing criterion mapping CC4\.2/);

  const duplicate = matrix();
  duplicate.criterionInventory.push({ ...duplicate.criterionInventory[0] });
  const repeated = await runMatrix(duplicate);
  assert.notEqual(repeated.status, 0);
  assert.match(repeated.stderr, /duplicate criterion mapping CC1\.1/);
});

test('enforces criterion coverage status semantics', async () => {
  const mappedWithoutControl = matrix();
  mappedWithoutControl.criterionInventory[0].controlIds = [];
  const missingMapping = await runMatrix(mappedWithoutControl);
  assert.notEqual(missingMapping.status, 0);
  assert.match(missingMapping.stderr, /Mapped criterion requires one or more control IDs/);

  const gapMasqueradingAsMapped = matrix();
  gapMasqueradingAsMapped.criterionInventory[0] = {
    ...gapMasqueradingAsMapped.criterionInventory[0],
    coverageStatus: 'Gap',
  };
  const gapResult = await runMatrix(gapMasqueradingAsMapped);
  assert.notEqual(gapResult.status, 0);
  assert.match(gapResult.stderr, /Gap criterion must not claim mapped control IDs/);

  const approvedWithGap = approvedMatrix();
  approvedWithGap.criterionInventory[0] = {
    ...approvedWithGap.criterionInventory[0],
    coverageStatus: 'PendingCPA',
    controlIds: [],
    rationale: 'CPA scope and semantic alignment require an explicit documented decision.',
  };
  const approvalResult = await runMatrix(approvedWithGap);
  assert.notEqual(approvalResult.status, 0);
  assert.match(approvalResult.stderr, /Approved matrix requires Mapped criterion coverage/);

  const designedPrimaryGap = matrix();
  designedPrimaryGap.criterionInventory.find((item) => item.criterion === 'CC6.1').coverageStatus = 'Gap';
  designedPrimaryGap.criterionInventory.find((item) => item.criterion === 'CC6.1').controlIds = [];
  const designedPrimaryResult = await runMatrix(designedPrimaryGap);
  assert.notEqual(designedPrimaryResult.status, 0);
  assert.match(designedPrimaryResult.stderr, /proposedCriterion CC6\.1 cannot target Gap coverage/);
});

test('fails unsupported categories and category-criterion mismatches', async () => {
  const invalid = matrix();
  invalid.scopeCategories.push('Privacy');
  invalid.controls[0].category = 'Availability';
  const result = await runMatrix(invalid);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unsupported scope category Privacy/);
  assert.match(result.stderr, /criterion CC6\.1 does not belong to Availability/);
});

test('fails invalid enums and calendar dates', async () => {
  const invalid = matrix();
  invalid.asOf = '11-09-2026';
  invalid.controls[0].cadence = 'sometimes';
  invalid.controls[0].ownerStatus = 'maybe';
  invalid.controls[0].evidenceSources[0].collectedOn = '2026-02-30';
  const result = await runMatrix(invalid);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /invalid matrix asOf/);
  assert.match(result.stderr, /invalid ownerStatus maybe/);
  assert.match(result.stderr, /invalid cadence sometimes/);
  assert.match(result.stderr, /invalid collectedOn 2026-02-30/);
});

test('requires proposedCriterion', async () => {
  const invalid = matrix();
  delete invalid.controls[0].proposedCriterion;
  const result = await runMatrix(invalid);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /proposedCriterion: missing or too short/);
});

test('enforces cadence freshness caps with the stricter limit winning', async () => {
  for (const [cadence, requestedMaxAge, cap] of [
    ['continuous', 2, 1],
    ['weekly', 9, 8],
    ['monthly', 33, 32],
  ]) {
    const invalid = matrix();
    invalid.controls[0].cadence = cadence;
    invalid.controls[0].evidenceSources[0].maxAgeDays = requestedMaxAge;
    const result = await runMatrix(invalid);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, new RegExp(`maxAgeDays ${requestedMaxAge} exceeds ${cadence} cadence cap ${cap}`));
  }
});

test('requires control description', async () => {
  const invalid = matrix();
  delete invalid.controls[0].description;
  const result = await runMatrix(invalid);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /description: missing or too short/);
});

test('requires evidenceSources', async () => {
  const invalid = matrix();
  delete invalid.controls[0].evidenceSources;
  const result = await runMatrix(invalid);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /evidenceSources must be a non-empty array/);
});

test('requires retentionMonths', async () => {
  const invalid = matrix();
  delete invalid.controls[0].retentionMonths;
  const result = await runMatrix(invalid);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /retentionMonths: must be an integer/);
});

test('requires exceptionSlaDays', async () => {
  const invalid = matrix();
  delete invalid.controls[0].exceptionSlaDays;
  const result = await runMatrix(invalid);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /exceptionSlaDays: must be an integer/);
});

test('requires planned controls to use planning or gap evidence and designed controls to use design evidence', async () => {
  const plannedAsDesign = matrix();
  plannedAsDesign.controls[1].evidenceSources = [source('recovery-misclassified', 'design')];
  plannedAsDesign.controls[1].implementationStatus = 'planned';
  const plannedResult = await runMatrix(plannedAsDesign);
  assert.notEqual(plannedResult.status, 0);
  assert.match(plannedResult.stderr, /planned control requires planning or gap evidence/);

  const designedAsPlanning = matrix();
  designedAsPlanning.controls[0].evidenceSources = [source('access-plan', 'planning')];
  const designedResult = await runMatrix(designedAsPlanning);
  assert.notEqual(designedResult.status, 0);
  assert.match(designedResult.stderr, /designed control requires design evidence/);
});

test('does not allow risk-register planning statements to be classified as design evidence', async () => {
  const invalid = matrix();
  invalid.controls[1].evidenceSources = [{
    ...source('risk-as-design', 'design'),
    path: 'risk-register.md',
  }];
  const result = await runMatrix(invalid);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /risk-register planning statement cannot be design evidence/);
});

test('fails missing or escaping evidence paths', async () => {
  const invalid = matrix();
  invalid.controls[0].evidenceSources[0].path = 'missing/does-not-exist.md';
  const { root, matrixPath, riskPath } = await fixture(invalid);
  const result = run(['--matrix', matrixPath, '--risk-register', riskPath, '--repo-root', root, '--as-of', asOf, '--dry-run']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /evidence path unavailable/);

  const escaping = matrix();
  escaping.controls[0].evidenceSources[0].path = '../outside.md';
  const escaped = await runMatrix(escaping);
  assert.notEqual(escaped.status, 0);
  assert.match(escaped.stderr, /evidence path must stay within repository/);
});

test('parses CLI arguments strictly', () => {
  const unknown = run(['--unknown', 'value']);
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /unknown argument: --unknown/);

  const duplicate = run(['--matrix', 'one.json', '--matrix', 'two.json']);
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /duplicate argument: --matrix/);

  const valueForFlag = run(['--risk-register', '--repo-root']);
  assert.notEqual(valueForFlag.status, 0);
  assert.match(valueForFlag.stderr, /missing value for --risk-register/);
});
