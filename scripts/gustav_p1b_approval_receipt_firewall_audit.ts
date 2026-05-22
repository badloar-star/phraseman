import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  filePath?: string;
};

type ReceiptProbe = {
  id: string;
  filePath: string;
  exists: boolean;
  source: 'real_candidate' | 'temp_fixture';
  parseableJson: boolean;
  schemaValid: boolean;
  runIdMatches: boolean;
  approvedSliceMatches: boolean;
  approvedFilesMatch: boolean;
  approvalTextMatches: boolean;
  approvedAfterP1A: boolean;
  freshReadRequired: boolean;
  approvedAtIso: boolean;
  acceptedReceiptPath: boolean;
  wouldUnlockP1B: boolean;
  expectedUnlock: boolean;
  rejectionReason: string;
};

type Audit = {
  schemaVersion: 'gustav-p1b-approval-receipt-firewall-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1bPreflightAudit: string;
    p1bDirtyOverlapSnapshotAudit: string;
    postP1ANextSliceAudit: string;
  };
  summary: {
    realReceiptCandidates: number;
    realReceiptsPresent: number;
    exactApprovalMatches: number;
    tempFixtures: number;
    rejectedTempFixtures: number;
    acceptedShapeFixtures: number;
    tempExactShapeBlockedByPath: number;
    implicitCommandFixtures: number;
    implicitCommandsRejected: number;
    blockers: number;
    warnings: number;
    firewallPassed: boolean;
    requiresP1ACompletion: boolean;
    requiresFreshReadBeforeEdit: boolean;
    requiresExactP1BApproval: boolean;
    approvalStillMissing: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  approvalContract: {
    requiredApprovalText: string;
    approvedSlice: 'P1B_DEV_TARGET_ISOLATION';
    approvedFiles: string[];
    acceptedReceiptPaths: string[];
    rejectedImplicitCommands: string[];
  };
  tempFixtureRoot: string;
  receiptProbes: ReceiptProbe[];
  findings: Finding[];
  notes: string[];
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function sameStringArray(left: unknown, right: string[]): boolean {
  const values = arr<string>(left).filter((entry) => typeof entry === 'string');
  return values.length === right.length && values.every((entry, index) => entry === right[index]);
}

function isIsoTimestamp(value: unknown): boolean {
  return typeof value === 'string' && value.includes('T') && !Number.isNaN(Date.parse(value));
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function validateReceipt(
  id: string,
  filePath: string,
  source: 'real_candidate' | 'temp_fixture',
  acceptedReceiptPaths: string[],
  expectedRunId: string,
  expectedApprovalText: string,
  expectedFiles: string[],
  expectedUnlock: boolean,
): ReceiptProbe {
  const acceptedReceiptPath = acceptedReceiptPaths.includes(filePath);
  const exists = fs.existsSync(filePath);
  let parsed: Record<string, unknown> | null = null;
  let parseableJson = false;

  if (exists && filePath.endsWith('.json')) {
    try {
      parsed = readJson<Record<string, unknown>>(filePath);
      parseableJson = true;
    } catch {
      parsed = null;
    }
  }

  const schemaValid = parsed?.schemaVersion === 'gustav-p1b-approval-receipt-v0';
  const runIdMatches = parsed?.runId === expectedRunId;
  const approvedSliceMatches = parsed?.approvedSlice === 'P1B_DEV_TARGET_ISOLATION';
  const approvedFilesMatch = sameStringArray(parsed?.approvedFiles, expectedFiles);
  const approvalTextMatches = parsed?.approvalText === expectedApprovalText;
  const approvedAfterP1A = parsed?.approvedAfterP1A === true;
  const freshReadRequired = parsed?.freshReadRequired === true;
  const approvedAtIso = isIsoTimestamp(parsed?.approvedAt);
  const wouldUnlockP1B =
    exists &&
    parseableJson &&
    schemaValid &&
    runIdMatches &&
    approvedSliceMatches &&
    approvedFilesMatch &&
    approvalTextMatches &&
    approvedAfterP1A &&
    freshReadRequired &&
    approvedAtIso &&
    acceptedReceiptPath;
  const rejectionReason = wouldUnlockP1B
    ? 'accepted'
    : !exists
      ? 'receipt_absent'
      : !parseableJson
        ? 'not_parseable_json'
        : !schemaValid
          ? 'schema_mismatch'
          : !runIdMatches
            ? 'run_id_mismatch'
            : !approvedSliceMatches
              ? 'approved_slice_mismatch'
              : !approvedFilesMatch
                ? 'approved_files_mismatch'
                : !approvalTextMatches
                  ? 'approval_text_mismatch'
                  : !approvedAfterP1A
                    ? 'approved_after_p1a_missing'
                    : !freshReadRequired
                      ? 'fresh_read_required_missing'
                      : !approvedAtIso
                        ? 'approved_at_not_iso'
                        : !acceptedReceiptPath
                          ? 'receipt_path_not_accepted'
                          : 'unknown';

  return {
    id,
    filePath,
    exists,
    source,
    parseableJson,
    schemaValid,
    runIdMatches,
    approvedSliceMatches,
    approvedFilesMatch,
    approvalTextMatches,
    approvedAfterP1A,
    freshReadRequired,
    approvedAtIso,
    acceptedReceiptPath,
    wouldUnlockP1B,
    expectedUnlock,
    rejectionReason,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Approval Receipt Firewall Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Real receipt candidates: ${audit.summary.realReceiptCandidates}`,
    `- Real receipts present: ${audit.summary.realReceiptsPresent}`,
    `- Exact approval matches: ${audit.summary.exactApprovalMatches}`,
    `- Temp fixtures: ${audit.summary.tempFixtures}`,
    `- Rejected temp fixtures: ${audit.summary.rejectedTempFixtures}`,
    `- Accepted shape fixtures: ${audit.summary.acceptedShapeFixtures}`,
    `- Temp exact shape blocked by path: ${audit.summary.tempExactShapeBlockedByPath}`,
    `- Implicit command fixtures: ${audit.summary.implicitCommandFixtures}`,
    `- Implicit commands rejected: ${audit.summary.implicitCommandsRejected}`,
    `- Firewall passed: ${audit.summary.firewallPassed ? 'yes' : 'no'}`,
    `- Requires P1A completion: ${audit.summary.requiresP1ACompletion ? 'yes' : 'no'}`,
    `- Requires fresh read before edit: ${audit.summary.requiresFreshReadBeforeEdit ? 'yes' : 'no'}`,
    `- Requires exact P1B approval: ${audit.summary.requiresExactP1BApproval ? 'yes' : 'no'}`,
    `- Approval still missing: ${audit.summary.approvalStillMissing ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Production files still absent: ${audit.summary.productionFilesStillAbsent ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Probe Results',
    '',
  ];

  for (const probe of audit.receiptProbes) {
    lines.push(`- \`${probe.id}\`: unlock=${probe.wouldUnlockP1B ? 'yes' : 'no'}, expected=${probe.expectedUnlock ? 'yes' : 'no'}, reason=\`${probe.rejectionReason}\`, path=\`${probe.filePath}\``);
  }

  lines.push('', '## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
      if (finding.filePath) lines.push(`  - file: \`${finding.filePath}\``);
    }
  }

  lines.push('', '## Notes', '');
  for (const note of audit.notes) lines.push(`- ${note}`);
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_p1b_approval_receipt_firewall_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const preflightPath = path.join(runDir, 'audits', 'p1b_preflight_audit.json');
  const snapshotPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_audit.json');
  const nextSlicePath = path.join(runDir, 'audits', 'post_p1a_next_slice_audit.json');
  const preflight = readJson<Record<string, unknown>>(preflightPath);
  const snapshot = readJson<Record<string, unknown>>(snapshotPath);
  const nextSlice = readJson<Record<string, unknown>>(nextSlicePath);
  const findings: Finding[] = [];

  const preflightSummary = object(preflight.summary);
  const snapshotSummary = object(snapshot.summary);
  const nextSliceSummary = object(nextSlice.summary);
  if (preflight.status !== 'PASS' || preflightSummary.preflightPassed !== true || preflightSummary.canStartP1BNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_preflight_not_locked',
      message: 'P1B preflight must be PASS and locked before P1B approval firewall.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }
  if (snapshot.status !== 'PASS' || snapshotSummary.dirtyOverlapPreserved !== true || snapshotSummary.canStartP1BNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_snapshot_not_locked',
      message: 'P1B dirty-overlap snapshot must be PASS and locked before P1B approval firewall.',
      filePath: path.relative(repoRoot, snapshotPath),
    });
  }
  if (nextSlice.status !== 'PASS' || nextSliceSummary.nextSliceId !== 'P1B_DEV_TARGET_ISOLATION') {
    findings.push({
      severity: 'blocker',
      code: 'p1b_next_slice_not_declared',
      message: 'Post-P1A next slice must declare P1B_DEV_TARGET_ISOLATION before P1B approval firewall.',
      filePath: path.relative(repoRoot, nextSlicePath),
    });
  }

  const approvalGate = object(preflight.approvalGate);
  const requiredApprovalText = String(approvalGate.requiredApprovalText || '');
  const acceptedReceiptPaths = arr<string>(approvalGate.approvalReceiptCandidates).filter((entry) => typeof entry === 'string');
  const rejectedImplicitCommands = arr<string>(approvalGate.rejectedImplicitCommands).filter((entry) => typeof entry === 'string');
  const approvedFiles = [
    'app/(tabs)/settings.tsx',
    'app/spanish_content_gate.ts',
    'app/study_target_lang_dev.ts',
    'components/StudyTargetContext.tsx',
  ];
  if (!requiredApprovalText.includes('P1B dev target isolation packet')) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_required_approval_text_missing',
      message: 'P1B approval firewall requires exact P1B approval text from preflight.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }
  if (acceptedReceiptPaths.length !== 1 || !acceptedReceiptPaths[0].endsWith('p1b_dev_target_isolation_approval_receipt.json')) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_receipt_path_invalid',
      message: 'P1B approval firewall must have exactly one canonical receipt path.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }
  if (!rejectedImplicitCommands.includes('дальше') || !rejectedImplicitCommands.includes('approve')) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_implicit_commands_not_rejected',
      message: 'P1B approval firewall must reject continuation and plain approval commands.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }

  const tempFixtureRoot = path.join('/private/tmp', `gustav-p1b-approval-firewall-${runId}`);
  fs.rmSync(tempFixtureRoot, { recursive: true, force: true });
  ensureDir(tempFixtureRoot);

  const exactReceipt = {
    schemaVersion: 'gustav-p1b-approval-receipt-v0',
    runId,
    approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
    approvedFiles,
    approvalText: requiredApprovalText,
    approvedAfterP1A: true,
    freshReadRequired: true,
    approvedAt: new Date().toISOString(),
  };
  const fixtureDefinitions: Array<{ id: string; fileName: string; body: unknown; expectedUnlock: boolean }> = [
    {
      id: 'TMP-IMPLICIT-DALSHE',
      fileName: 'implicit_dalshe.json',
      body: 'дальше',
      expectedUnlock: false,
    },
    {
      id: 'TMP-PLAIN-APPROVE',
      fileName: 'plain_approve.json',
      body: { approvalText: 'approve' },
      expectedUnlock: false,
    },
    {
      id: 'TMP-WRONG-RUN',
      fileName: 'wrong_run.json',
      body: { ...exactReceipt, runId: `${runId}_wrong` },
      expectedUnlock: false,
    },
    {
      id: 'TMP-WRONG-SLICE',
      fileName: 'wrong_slice.json',
      body: { ...exactReceipt, approvedSlice: 'P1A_CORE_CONTRACTS' },
      expectedUnlock: false,
    },
    {
      id: 'TMP-WRONG-FILES',
      fileName: 'wrong_files.json',
      body: { ...exactReceipt, approvedFiles: ['app/(tabs)/settings.tsx'] },
      expectedUnlock: false,
    },
    {
      id: 'TMP-WRONG-TEXT',
      fileName: 'wrong_text.json',
      body: { ...exactReceipt, approvalText: `${requiredApprovalText} extra` },
      expectedUnlock: false,
    },
    {
      id: 'TMP-EXACT-SHAPE-WRONG-PATH',
      fileName: 'exact_shape_wrong_path.json',
      body: exactReceipt,
      expectedUnlock: false,
    },
  ];

  const probes: ReceiptProbe[] = [];
  for (const receiptPath of acceptedReceiptPaths) {
    probes.push(validateReceipt(
      `REAL-${path.basename(receiptPath).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`,
      receiptPath,
      'real_candidate',
      acceptedReceiptPaths,
      runId,
      requiredApprovalText,
      approvedFiles,
      false,
    ));
  }

  for (const fixture of fixtureDefinitions) {
    const fixturePath = path.join(tempFixtureRoot, fixture.fileName);
    writeJson(fixturePath, fixture.body);
    probes.push(validateReceipt(
      fixture.id,
      fixturePath,
      'temp_fixture',
      acceptedReceiptPaths,
      runId,
      requiredApprovalText,
      approvedFiles,
      fixture.expectedUnlock,
    ));
  }

  for (const probe of probes.filter((entry) => entry.wouldUnlockP1B !== entry.expectedUnlock)) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_receipt_firewall_expectation_mismatch',
      message: `${probe.id} unlock result ${String(probe.wouldUnlockP1B)} did not match expected ${String(probe.expectedUnlock)}.`,
      filePath: probe.filePath,
    });
  }

  const realProbes = probes.filter((probe) => probe.source === 'real_candidate');
  const tempProbes = probes.filter((probe) => probe.source === 'temp_fixture');
  const realReceiptsPresent = realProbes.filter((probe) => probe.exists).length;
  const exactApprovalMatches = realProbes.filter((probe) => probe.wouldUnlockP1B).length;
  const acceptedShapeFixtures = tempProbes.filter((probe) =>
    probe.schemaValid &&
    probe.runIdMatches &&
    probe.approvedSliceMatches &&
    probe.approvedFilesMatch &&
    probe.approvalTextMatches &&
    probe.approvedAfterP1A &&
    probe.freshReadRequired &&
    probe.approvedAtIso
  ).length;
  const tempExactShapeBlockedByPath = tempProbes.filter((probe) =>
    probe.id === 'TMP-EXACT-SHAPE-WRONG-PATH' &&
    probe.rejectionReason === 'receipt_path_not_accepted' &&
    probe.wouldUnlockP1B === false
  ).length;
  const implicitCommandFixtures = tempProbes.filter((probe) => probe.id === 'TMP-IMPLICIT-DALSHE' || probe.id === 'TMP-PLAIN-APPROVE').length;
  const implicitCommandsRejected = tempProbes.filter((probe) =>
    (probe.id === 'TMP-IMPLICIT-DALSHE' || probe.id === 'TMP-PLAIN-APPROVE') &&
    probe.wouldUnlockP1B === false
  ).length;
  if (realReceiptsPresent > 0 || exactApprovalMatches > 0) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_real_approval_receipt_present',
      message: 'A real P1B approval receipt is present; this audit is pre-approval only.',
    });
  }
  if (acceptedShapeFixtures !== 1 || tempExactShapeBlockedByPath !== 1) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_temp_exact_shape_not_path_blocked',
      message: 'The exact-shape temp P1B receipt must be valid by shape but blocked because it is outside accepted receipt paths.',
    });
  }
  if (implicitCommandsRejected !== implicitCommandFixtures || implicitCommandFixtures !== 2) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_implicit_command_fixture_not_rejected',
      message: 'P1B implicit continuation/approval fixtures must all be rejected.',
    });
  }

  const productionFilesStillAbsent = [
    'app/study_target.ts',
    'app/target_storage_keys.ts',
    'tests/gustav_surface_target_switch.test.ts',
    'tests/gustav_target_storage_keys.test.ts',
  ].every((filePath) => !fs.existsSync(path.join(repoRoot, filePath)));
  if (!productionFilesStillAbsent) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_firewall_p1a_file_exists',
      message: 'A planned P1A production/test file exists before exact approval.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const firewallPassed =
    blockers === 0 &&
    realProbes.length === 1 &&
    realReceiptsPresent === 0 &&
    exactApprovalMatches === 0 &&
    tempProbes.length === 7 &&
    tempProbes.every((probe) => probe.wouldUnlockP1B === false) &&
    acceptedShapeFixtures === 1 &&
    tempExactShapeBlockedByPath === 1 &&
    implicitCommandFixtures === 2 &&
    implicitCommandsRejected === 2 &&
    productionFilesStillAbsent;

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-approval-receipt-firewall-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1bPreflightAudit: path.relative(repoRoot, preflightPath),
      p1bDirtyOverlapSnapshotAudit: path.relative(repoRoot, snapshotPath),
      postP1ANextSliceAudit: path.relative(repoRoot, nextSlicePath),
    },
    summary: {
      realReceiptCandidates: realProbes.length,
      realReceiptsPresent,
      exactApprovalMatches,
      tempFixtures: tempProbes.length,
      rejectedTempFixtures: tempProbes.filter((probe) => probe.wouldUnlockP1B === false).length,
      acceptedShapeFixtures,
      tempExactShapeBlockedByPath,
      implicitCommandFixtures,
      implicitCommandsRejected,
      blockers,
      warnings,
      firewallPassed,
      requiresP1ACompletion: true,
      requiresFreshReadBeforeEdit: true,
      requiresExactP1BApproval: true,
      approvalStillMissing: true,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent,
    },
    approvalContract: {
      requiredApprovalText,
      approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
      approvedFiles,
      acceptedReceiptPaths,
      rejectedImplicitCommands,
    },
    tempFixtureRoot,
    receiptProbes: probes,
    findings,
    notes: [
      'This audit tests P1B approval receipt handling with temp fixtures only; it does not create a real approval receipt.',
      'A syntactically exact P1B receipt in /private/tmp is rejected because only the configured run receipt path can unlock P1B.',
      'P1B also requires P1A completion and fresh re-read of the dirty overlap before any future approved edit.',
      'French generation remains blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_approval_receipt_firewall_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_approval_receipt_firewall_audit.md');
  const outReadme = path.join(runDir, 'audits', 'p1b_approval_receipt_firewall', 'README.md');
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV P1B approval receipt firewall audit: ${audit.status}`);
  console.log(`Real receipt candidates: ${audit.summary.realReceiptCandidates}`);
  console.log(`Real receipts present: ${audit.summary.realReceiptsPresent}`);
  console.log(`Exact approval matches: ${audit.summary.exactApprovalMatches}`);
  console.log(`Temp fixtures: ${audit.summary.tempFixtures}`);
  console.log(`Rejected temp fixtures: ${audit.summary.rejectedTempFixtures}`);
  console.log(`Temp exact shape blocked by path: ${audit.summary.tempExactShapeBlockedByPath}`);
  console.log(`Implicit commands rejected: ${audit.summary.implicitCommandsRejected}`);
  console.log(`Firewall passed: ${audit.summary.firewallPassed ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
