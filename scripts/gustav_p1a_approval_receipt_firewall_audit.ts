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
  approvedPacketMatches: boolean;
  approvalTextMatches: boolean;
  approvedAtIso: boolean;
  acceptedReceiptPath: boolean;
  wouldUnlockApply: boolean;
  expectedUnlock: boolean;
  rejectionReason: string;
};

type Audit = {
  schemaVersion: 'gustav-p1a-approval-receipt-firewall-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aMinimalApplyPacket: string;
    p1aApprovalLockAudit: string;
    p1aApplyTransactionAudit: string;
    p1aTransactionSimulationAudit: string;
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
    exactApprovalRequired: boolean;
    approvalStillMissing: boolean;
    canApplyNow: boolean;
    dryRunOnly: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  approvalContract: {
    requiredApprovalText: string;
    approvedPacket: string;
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

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isIsoTimestamp(value: unknown): boolean {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && value.includes('T');
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
  expectedPacket: string,
  expectedApprovalText: string,
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

  const schemaValid = parsed?.schemaVersion === 'gustav-p1a-approval-receipt-v0';
  const runIdMatches = parsed?.runId === expectedRunId;
  const approvedPacketMatches = parsed?.approvedPacket === expectedPacket;
  const approvalTextMatches = parsed?.approvalText === expectedApprovalText;
  const approvedAtIso = isIsoTimestamp(parsed?.approvedAt);
  const wouldUnlockApply =
    exists &&
    parseableJson &&
    schemaValid &&
    runIdMatches &&
    approvedPacketMatches &&
    approvalTextMatches &&
    approvedAtIso &&
    acceptedReceiptPath;
  const rejectionReason = wouldUnlockApply
    ? 'accepted'
    : !exists
      ? 'receipt_absent'
      : !parseableJson
        ? 'not_parseable_json'
        : !schemaValid
          ? 'schema_mismatch'
          : !runIdMatches
            ? 'run_id_mismatch'
            : !approvedPacketMatches
              ? 'approved_packet_mismatch'
              : !approvalTextMatches
                ? 'approval_text_mismatch'
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
    approvedPacketMatches,
    approvalTextMatches,
    approvedAtIso,
    acceptedReceiptPath,
    wouldUnlockApply,
    expectedUnlock,
    rejectionReason,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Approval Receipt Firewall Audit',
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
    `- Exact approval required: ${audit.summary.exactApprovalRequired ? 'yes' : 'no'}`,
    `- Approval still missing: ${audit.summary.approvalStillMissing ? 'yes' : 'no'}`,
    `- Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`,
    `- Dry-run only: ${audit.summary.dryRunOnly ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Probe Results',
    '',
  ];

  for (const probe of audit.receiptProbes) {
    lines.push(`- \`${probe.id}\`: unlock=${probe.wouldUnlockApply ? 'yes' : 'no'}, expected=${probe.expectedUnlock ? 'yes' : 'no'}, reason=\`${probe.rejectionReason}\`, path=\`${probe.filePath}\``);
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
    console.error('Usage: npx tsx scripts/gustav_p1a_approval_receipt_firewall_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const approvalLockPath = path.join(runDir, 'audits', 'p1a_approval_lock_audit.json');
  const transactionPath = path.join(runDir, 'audits', 'p1a_apply_transaction_audit.json');
  const simulationPath = path.join(runDir, 'audits', 'p1a_transaction_simulation_audit.json');
  const packet = readJson<Record<string, unknown>>(packetPath);
  const approvalLock = readJson<Record<string, unknown>>(approvalLockPath);
  const transaction = readJson<Record<string, unknown>>(transactionPath);
  const simulation = readJson<Record<string, unknown>>(simulationPath);
  const findings: Finding[] = [];

  const packetSummary = object(packet.summary);
  const lockSummary = object(approvalLock.summary);
  const transactionSummary = object(transaction.summary);
  const simulationSummary = object(simulation.summary);
  if (packet.status !== 'PASS' || packetSummary.readyForApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'packet_not_ready',
      message: 'P1A minimal apply packet must be PASS and readyForApproval before receipt firewall audit.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (approvalLock.status !== 'PASS' || lockSummary.exactApprovalRequired !== true || lockSummary.approvalStatusLocked !== true) {
    findings.push({
      severity: 'blocker',
      code: 'approval_lock_not_ready',
      message: 'P1A approval lock must be PASS, exactApprovalRequired and locked.',
      filePath: path.relative(repoRoot, approvalLockPath),
    });
  }
  if (transaction.status !== 'PASS' || transactionSummary.canApplyNow !== false || transactionSummary.dryRunOnly !== true) {
    findings.push({
      severity: 'blocker',
      code: 'transaction_not_locked',
      message: 'P1A apply transaction must remain dry-run locked before receipt firewall audit.',
      filePath: path.relative(repoRoot, transactionPath),
    });
  }
  if (simulation.status !== 'PASS' || simulationSummary.transactionSimulationPassed !== true) {
    findings.push({
      severity: 'blocker',
      code: 'simulation_not_passed',
      message: 'P1A transaction simulation must pass before receipt firewall audit.',
      filePath: path.relative(repoRoot, simulationPath),
    });
  }

  const approvalGate = object(approvalLock.approvalGate);
  const requiredApprovalText = str(approvalGate.requiredApprovalText) || str(packet.requiredApprovalText);
  const approvedPacket = path.relative(repoRoot, packetPath);
  const acceptedReceiptPaths = arr(approvalGate.approvalReceiptPaths).filter((entry): entry is string => typeof entry === 'string');
  const rejectedImplicitCommands = arr(approvalGate.rejectedImplicitCommands).filter((entry): entry is string => typeof entry === 'string');
  if (!requiredApprovalText || requiredApprovalText !== packet.requiredApprovalText) {
    findings.push({
      severity: 'blocker',
      code: 'required_approval_text_mismatch',
      message: 'Approval lock required text must match p1a_minimal_apply_packet.requiredApprovalText.',
      filePath: path.relative(repoRoot, approvalLockPath),
    });
  }
  if (!acceptedReceiptPaths.includes(path.relative(repoRoot, path.join(runDir, 'apply_plan', 'p1a_approval_receipt.json')))) {
    findings.push({
      severity: 'blocker',
      code: 'json_receipt_path_missing',
      message: 'Approval lock must include the canonical JSON receipt path.',
      filePath: path.relative(repoRoot, approvalLockPath),
    });
  }
  if (!rejectedImplicitCommands.includes('дальше') || !rejectedImplicitCommands.includes('approve')) {
    findings.push({
      severity: 'blocker',
      code: 'implicit_commands_not_rejected',
      message: 'Approval lock must reject both continuation commands and plain approve/approved strings.',
      filePath: path.relative(repoRoot, approvalLockPath),
    });
  }

  const tempFixtureRoot = path.join('/private/tmp', `gustav-p1a-approval-firewall-${runId}`);
  fs.rmSync(tempFixtureRoot, { recursive: true, force: true });
  ensureDir(tempFixtureRoot);

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
      body: {
        schemaVersion: 'gustav-p1a-approval-receipt-v0',
        runId: `${runId}_wrong`,
        approvedPacket,
        approvalText: requiredApprovalText,
        approvedAt: new Date().toISOString(),
      },
      expectedUnlock: false,
    },
    {
      id: 'TMP-BROAD-PLAN',
      fileName: 'broad_plan.json',
      body: {
        schemaVersion: 'gustav-p1a-approval-receipt-v0',
        runId,
        approvedPacket: path.relative(repoRoot, path.join(runDir, 'apply_plan', 'file_changes.json')),
        approvalText: requiredApprovalText,
        approvedAt: new Date().toISOString(),
      },
      expectedUnlock: false,
    },
    {
      id: 'TMP-WRONG-TEXT',
      fileName: 'wrong_text.json',
      body: {
        schemaVersion: 'gustav-p1a-approval-receipt-v0',
        runId,
        approvedPacket,
        approvalText: `${requiredApprovalText} extra`,
        approvedAt: new Date().toISOString(),
      },
      expectedUnlock: false,
    },
    {
      id: 'TMP-EXACT-SHAPE-WRONG-PATH',
      fileName: 'exact_shape_wrong_path.json',
      body: {
        schemaVersion: 'gustav-p1a-approval-receipt-v0',
        runId,
        approvedPacket,
        approvalText: requiredApprovalText,
        approvedAt: new Date().toISOString(),
      },
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
      approvedPacket,
      requiredApprovalText,
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
      approvedPacket,
      requiredApprovalText,
      fixture.expectedUnlock,
    ));
  }

  const mismatchedExpectations = probes.filter((probe) => probe.wouldUnlockApply !== probe.expectedUnlock);
  for (const probe of mismatchedExpectations) {
    findings.push({
      severity: 'blocker',
      code: 'receipt_firewall_expectation_mismatch',
      message: `${probe.id} unlock result ${String(probe.wouldUnlockApply)} did not match expected ${String(probe.expectedUnlock)}.`,
      filePath: probe.filePath,
    });
  }

  const realProbes = probes.filter((probe) => probe.source === 'real_candidate');
  const tempProbes = probes.filter((probe) => probe.source === 'temp_fixture');
  const realReceiptsPresent = realProbes.filter((probe) => probe.exists).length;
  const exactApprovalMatches = realProbes.filter((probe) => probe.wouldUnlockApply).length;
  const acceptedShapeFixtures = tempProbes.filter((probe) =>
    probe.schemaValid &&
    probe.runIdMatches &&
    probe.approvedPacketMatches &&
    probe.approvalTextMatches &&
    probe.approvedAtIso
  ).length;
  const tempExactShapeBlockedByPath = tempProbes.filter((probe) =>
    probe.id === 'TMP-EXACT-SHAPE-WRONG-PATH' &&
    probe.rejectionReason === 'receipt_path_not_accepted' &&
    probe.wouldUnlockApply === false
  ).length;
  const implicitCommandFixtures = tempProbes.filter((probe) => probe.id === 'TMP-IMPLICIT-DALSHE' || probe.id === 'TMP-PLAIN-APPROVE').length;
  const implicitCommandsRejected = tempProbes.filter((probe) =>
    (probe.id === 'TMP-IMPLICIT-DALSHE' || probe.id === 'TMP-PLAIN-APPROVE') &&
    probe.wouldUnlockApply === false
  ).length;

  if (realReceiptsPresent > 0 || exactApprovalMatches > 0) {
    findings.push({
      severity: 'blocker',
      code: 'real_approval_receipt_present',
      message: 'A real P1A approval receipt is present; apply remains out of scope for this audit turn.',
    });
  }
  if (acceptedShapeFixtures !== 1 || tempExactShapeBlockedByPath !== 1) {
    findings.push({
      severity: 'blocker',
      code: 'temp_exact_shape_not_path_blocked',
      message: 'The exact-shape temp receipt must be accepted as a shape but blocked because it is outside accepted receipt paths.',
    });
  }
  if (implicitCommandsRejected !== implicitCommandFixtures || implicitCommandFixtures !== 2) {
    findings.push({
      severity: 'blocker',
      code: 'implicit_command_fixture_not_rejected',
      message: 'Implicit continuation/approval fixtures must all be rejected.',
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
      code: 'planned_p1a_file_exists',
      message: 'A planned P1A production/test file exists before exact approval.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const firewallPassed =
    blockers === 0 &&
    realProbes.length === 3 &&
    realReceiptsPresent === 0 &&
    exactApprovalMatches === 0 &&
    tempProbes.length === 6 &&
    tempProbes.every((probe) => probe.wouldUnlockApply === false) &&
    acceptedShapeFixtures === 1 &&
    tempExactShapeBlockedByPath === 1 &&
    implicitCommandFixtures === 2 &&
    implicitCommandsRejected === 2 &&
    productionFilesStillAbsent;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-approval-receipt-firewall-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aMinimalApplyPacket: path.relative(repoRoot, packetPath),
      p1aApprovalLockAudit: path.relative(repoRoot, approvalLockPath),
      p1aApplyTransactionAudit: path.relative(repoRoot, transactionPath),
      p1aTransactionSimulationAudit: path.relative(repoRoot, simulationPath),
    },
    summary: {
      realReceiptCandidates: realProbes.length,
      realReceiptsPresent,
      exactApprovalMatches,
      tempFixtures: tempProbes.length,
      rejectedTempFixtures: tempProbes.filter((probe) => probe.wouldUnlockApply === false).length,
      acceptedShapeFixtures,
      tempExactShapeBlockedByPath,
      implicitCommandFixtures,
      implicitCommandsRejected,
      blockers,
      warnings,
      firewallPassed,
      exactApprovalRequired: true,
      approvalStillMissing: true,
      canApplyNow: false,
      dryRunOnly: true,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    approvalContract: {
      requiredApprovalText,
      approvedPacket,
      acceptedReceiptPaths,
      rejectedImplicitCommands,
    },
    tempFixtureRoot,
    receiptProbes: probes,
    findings,
    notes: [
      'This audit tests the approval receipt firewall with temp fixtures only; it does not create a real approval receipt.',
      'A syntactically exact receipt in /private/tmp is still rejected because only configured run receipt paths can unlock apply.',
      'Short continuation commands and plain approve/approved strings remain non-approval.',
      'canApplyNow remains false and production app/test files remain absent.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_approval_receipt_firewall_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_approval_receipt_firewall_audit.md');
  const outReadme = path.join(runDir, 'audits', 'p1a_approval_receipt_firewall', 'README.md');
  ensureDir(path.dirname(outJson));
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV P1A approval receipt firewall audit: ${audit.status}`);
  console.log(`Real receipt candidates: ${audit.summary.realReceiptCandidates}`);
  console.log(`Real receipts present: ${audit.summary.realReceiptsPresent}`);
  console.log(`Exact approval matches: ${audit.summary.exactApprovalMatches}`);
  console.log(`Temp fixtures: ${audit.summary.tempFixtures}`);
  console.log(`Rejected temp fixtures: ${audit.summary.rejectedTempFixtures}`);
  console.log(`Temp exact shape blocked by path: ${audit.summary.tempExactShapeBlockedByPath}`);
  console.log(`Implicit commands rejected: ${audit.summary.implicitCommandsRejected}`);
  console.log(`Firewall passed: ${audit.summary.firewallPassed ? 'yes' : 'no'}`);
  console.log(`Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
