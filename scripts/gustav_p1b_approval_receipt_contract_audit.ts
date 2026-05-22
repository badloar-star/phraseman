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

type ContractField = {
  name: string;
  required: boolean;
  expected: string;
};

type Audit = {
  schemaVersion: 'gustav-p1b-approval-receipt-contract-audit-v0';
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
    p1bApprovalReceiptFirewallAudit: string;
    postP1ANextSliceAudit: string;
  };
  summary: {
    approvedFiles: number;
    canonicalReceiptPaths: number;
    requiredFields: number;
    unlockPreconditions: number;
    rejectedImplicitCommands: number;
    blockers: number;
    warnings: number;
    contractReady: boolean;
    realReceiptPresent: boolean;
    exactApprovalMatches: number;
    p1bUnlockStillBlocked: boolean;
    requiresP1ACompletion: boolean;
    requiresFreshReadBeforeEdit: boolean;
    requiresExactP1BApproval: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  approvalReceiptContract: {
    lockState: 'locked_until_exact_p1b_receipt';
    approvedSlice: 'P1B_DEV_TARGET_ISOLATION';
    canonicalReceiptPath: string;
    requiredApprovalText: string;
    requiredFields: ContractField[];
    acceptedReceiptShape: {
      schemaVersion: 'gustav-p1b-approval-receipt-v0';
      runId: string;
      approvedSlice: 'P1B_DEV_TARGET_ISOLATION';
      approvalText: string;
      approvedFiles: string[];
      approvedAfterP1A: true;
      freshReadBeforeEdit: true;
      approvedAt: 'ISO-8601 timestamp';
    };
    unlockPreconditions: string[];
    rejectedImplicitCommands: string[];
    unlockScope: {
      allowedSlice: 'P1B_DEV_TARGET_ISOLATION';
      allowedFiles: string[];
      forbiddenScopes: string[];
    };
    nonReceiptExamples: string[];
  };
  findings: Finding[];
  notes: string[];
};

const EXPECTED_P1B_FILES = [
  'app/(tabs)/settings.tsx',
  'app/spanish_content_gate.ts',
  'app/study_target_lang_dev.ts',
  'components/StudyTargetContext.tsx',
];

const FORBIDDEN_PRODUCTION_FILES = [
  'app/study_target.ts',
  'app/target_storage_keys.ts',
  'tests/gustav_surface_target_switch.test.ts',
  'tests/gustav_target_storage_keys.test.ts',
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function safeReadJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function bool(value: unknown): boolean {
  return value === true;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function sameStringArray(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && expected.every((entry, index) => actual[index] === entry);
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Approval Receipt Contract Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Approved files: ${audit.summary.approvedFiles}`,
    `- Canonical receipt paths: ${audit.summary.canonicalReceiptPaths}`,
    `- Required fields: ${audit.summary.requiredFields}`,
    `- Unlock preconditions: ${audit.summary.unlockPreconditions}`,
    `- Rejected implicit commands: ${audit.summary.rejectedImplicitCommands}`,
    `- Contract ready: ${audit.summary.contractReady ? 'yes' : 'no'}`,
    `- Real receipt present: ${audit.summary.realReceiptPresent ? 'yes' : 'no'}`,
    `- Exact approval matches: ${audit.summary.exactApprovalMatches}`,
    `- P1B unlock still blocked: ${audit.summary.p1bUnlockStillBlocked ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Canonical Receipt Path',
    '',
    `- \`${audit.approvalReceiptContract.canonicalReceiptPath}\``,
    '',
    '## Required Approval Text',
    '',
    '```text',
    audit.approvalReceiptContract.requiredApprovalText,
    '```',
    '',
    '## Required Fields',
    '',
  ];

  for (const field of audit.approvalReceiptContract.requiredFields) {
    lines.push(`- \`${field.name}\`: ${field.expected}`);
  }

  lines.push('', '## Unlock Preconditions', '');
  for (const precondition of audit.approvalReceiptContract.unlockPreconditions) lines.push(`- ${precondition}`);

  lines.push('', '## Allowed P1B Files', '');
  for (const filePath of audit.approvalReceiptContract.unlockScope.allowedFiles) lines.push(`- \`${filePath}\``);

  lines.push('', '## Rejected Implicit Commands', '');
  for (const command of audit.approvalReceiptContract.rejectedImplicitCommands) lines.push(`- \`${command}\``);

  lines.push('', '## Non-Receipt Examples', '');
  for (const example of audit.approvalReceiptContract.nonReceiptExamples) lines.push(`- ${example}`);

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
    console.error('Usage: npx tsx scripts/gustav_p1b_approval_receipt_contract_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const preflightPath = path.join(runDir, 'audits', 'p1b_preflight_audit.json');
  const dirtySnapshotPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_audit.json');
  const firewallPath = path.join(runDir, 'audits', 'p1b_approval_receipt_firewall_audit.json');
  const nextSlicePath = path.join(runDir, 'audits', 'post_p1a_next_slice_audit.json');

  const preflight = readJson<Record<string, unknown>>(preflightPath);
  const dirtySnapshot = readJson<Record<string, unknown>>(dirtySnapshotPath);
  const firewall = readJson<Record<string, unknown>>(firewallPath);
  const nextSlice = readJson<Record<string, unknown>>(nextSlicePath);
  const findings: Finding[] = [];

  const preflightSummary = object(preflight.summary);
  const dirtySummary = object(dirtySnapshot.summary);
  const firewallSummary = object(firewall.summary);
  const preflightGate = object(preflight.approvalGate);
  const firewallContract = object(firewall.approvalContract);
  const nextSliceSummary = object(nextSlice.summary);

  const requiredApprovalText = str(preflightGate.requiredApprovalText);
  const receiptCandidates = arrayOfStrings(preflightGate.approvalReceiptCandidates);
  const firewallReceiptPaths = arrayOfStrings(firewallContract.acceptedReceiptPaths);
  const approvedFiles = arrayOfStrings(firewallContract.approvedFiles);
  const rejectedImplicitCommands = Array.from(new Set([
    ...arrayOfStrings(preflightGate.rejectedImplicitCommands),
    ...arrayOfStrings(firewallContract.rejectedImplicitCommands),
  ]));
  const canonicalReceiptPath = receiptCandidates[0] ?? '';
  const canonicalReceiptAbs = canonicalReceiptPath ? path.resolve(repoRoot, canonicalReceiptPath) : '';
  const realReceipt = canonicalReceiptAbs ? safeReadJson<Record<string, unknown>>(canonicalReceiptAbs) : null;
  const realReceiptPresent = canonicalReceiptAbs ? fs.existsSync(canonicalReceiptAbs) : false;
  const exactApprovalMatches = realReceipt &&
    realReceipt.schemaVersion === 'gustav-p1b-approval-receipt-v0' &&
    realReceipt.runId === runId &&
    realReceipt.approvedSlice === 'P1B_DEV_TARGET_ISOLATION' &&
    realReceipt.approvalText === requiredApprovalText &&
    sameStringArray(arrayOfStrings(realReceipt.approvedFiles), EXPECTED_P1B_FILES) &&
    realReceipt.approvedAfterP1A === true &&
    realReceipt.freshReadBeforeEdit === true &&
    typeof realReceipt.approvedAt === 'string'
      ? 1
      : 0;

  if (preflight.status !== 'PASS' || bool(preflightSummary.canStartP1BNow) !== false || bool(preflightSummary.requiresExactP1BApproval) !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_preflight_not_locked',
      message: 'P1B preflight must be PASS, require exact P1B approval and keep canStartP1BNow=false.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }

  if (dirtySnapshot.status !== 'PASS' || bool(dirtySummary.requiresFreshReadBeforeEdit) !== true || bool(dirtySummary.canStartP1BNow) !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_dirty_snapshot_not_locked',
      message: 'P1B dirty-overlap snapshot must be PASS, require fresh read and keep canStartP1BNow=false.',
      filePath: path.relative(repoRoot, dirtySnapshotPath),
    });
  }

  if (firewall.status !== 'PASS' || bool(firewallSummary.firewallPassed) !== true || bool(firewallSummary.approvalStillMissing) !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_firewall_not_preapproval_locked',
      message: 'P1B approval receipt firewall must be PASS and still missing a real approval receipt.',
      filePath: path.relative(repoRoot, firewallPath),
    });
  }

  if (nextSlice.status !== 'PASS' || nextSliceSummary.nextSliceId !== 'P1B_DEV_TARGET_ISOLATION') {
    findings.push({
      severity: 'blocker',
      code: 'post_p1a_next_slice_not_p1b',
      message: 'Post-P1A next slice must remain P1B_DEV_TARGET_ISOLATION.',
      filePath: path.relative(repoRoot, nextSlicePath),
    });
  }

  if (!requiredApprovalText.includes('P1B dev target isolation packet') || !requiredApprovalText.includes(runId)) {
    findings.push({
      severity: 'blocker',
      code: 'required_approval_text_not_specific',
      message: 'P1B approval text must name the P1B dev target isolation packet and run id.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }

  if (receiptCandidates.length !== 1 || firewallReceiptPaths.length !== 1 || receiptCandidates[0] !== firewallReceiptPaths[0] || !canonicalReceiptPath.endsWith('p1b_dev_target_isolation_approval_receipt.json')) {
    findings.push({
      severity: 'blocker',
      code: 'canonical_receipt_path_mismatch',
      message: 'P1B contract must have exactly one canonical receipt path shared by preflight and firewall.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }

  if (!sameStringArray(approvedFiles, EXPECTED_P1B_FILES)) {
    findings.push({
      severity: 'blocker',
      code: 'approved_files_mismatch',
      message: 'P1B contract approved files must match the four-file P1B slice in order.',
      filePath: path.relative(repoRoot, firewallPath),
    });
  }

  if (!rejectedImplicitCommands.includes('дальше') || !rejectedImplicitCommands.includes('approve')) {
    findings.push({
      severity: 'blocker',
      code: 'implicit_commands_not_rejected',
      message: 'P1B contract must explicitly reject continuation and plain approval commands.',
      filePath: path.relative(repoRoot, firewallPath),
    });
  }

  if (realReceiptPresent) {
    findings.push({
      severity: 'blocker',
      code: 'real_p1b_receipt_present_before_user_approval',
      message: 'A real P1B receipt is present; this contract audit is for the pre-approval locked state only.',
      filePath: canonicalReceiptPath,
    });
  }

  for (const forbidden of FORBIDDEN_PRODUCTION_FILES) {
    if (fs.existsSync(path.join(repoRoot, forbidden))) {
      findings.push({
        severity: 'blocker',
        code: 'p1a_production_file_exists_before_approval',
        message: `P1A planned production/test file exists before approval: ${forbidden}`,
        filePath: forbidden,
      });
    }
  }

  const requiredFields: ContractField[] = [
    { name: 'schemaVersion', required: true, expected: 'gustav-p1b-approval-receipt-v0' },
    { name: 'runId', required: true, expected: runId },
    { name: 'approvedSlice', required: true, expected: 'P1B_DEV_TARGET_ISOLATION' },
    { name: 'approvalText', required: true, expected: 'exact requiredApprovalText' },
    { name: 'approvedFiles', required: true, expected: 'exact ordered four-file P1B slice' },
    { name: 'approvedAfterP1A', required: true, expected: 'true' },
    { name: 'freshReadBeforeEdit', required: true, expected: 'true' },
    { name: 'approvedAt', required: true, expected: 'ISO-8601 timestamp' },
  ];

  const unlockPreconditions = [
    'P1A completion must be verified before any P1B edit.',
    'The dirty overlap app/(tabs)/settings.tsx must be freshly re-read before edit.',
    'The exact P1B approval receipt must exist at the canonical run path.',
    'The receipt must match the run id, slice id, ordered file list and approval text exactly.',
    'The receipt must not unlock French generation or broad production apply.',
  ];

  const nonReceiptExamples = [
    'Continuation commands such as дальше, давай, работа or продолжай.',
    'Plain approval words such as approve, approved, yes or go.',
    'Receipts with the right JSON shape outside the canonical run path.',
    'Receipts for the wrong run id, wrong slice id, wrong file list or changed approval text.',
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const contractReady = blockers === 0 &&
    requiredFields.length === 8 &&
    unlockPreconditions.length === 5 &&
    rejectedImplicitCommands.length >= 6 &&
    realReceiptPresent === false &&
    exactApprovalMatches === 0;

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-approval-receipt-contract-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1bPreflightAudit: path.relative(repoRoot, preflightPath),
      p1bDirtyOverlapSnapshotAudit: path.relative(repoRoot, dirtySnapshotPath),
      p1bApprovalReceiptFirewallAudit: path.relative(repoRoot, firewallPath),
      postP1ANextSliceAudit: path.relative(repoRoot, nextSlicePath),
    },
    summary: {
      approvedFiles: EXPECTED_P1B_FILES.length,
      canonicalReceiptPaths: canonicalReceiptPath ? 1 : 0,
      requiredFields: requiredFields.length,
      unlockPreconditions: unlockPreconditions.length,
      rejectedImplicitCommands: rejectedImplicitCommands.length,
      blockers,
      warnings,
      contractReady,
      realReceiptPresent,
      exactApprovalMatches,
      p1bUnlockStillBlocked: true,
      requiresP1ACompletion: true,
      requiresFreshReadBeforeEdit: true,
      requiresExactP1BApproval: true,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent: FORBIDDEN_PRODUCTION_FILES.every((filePath) => !fs.existsSync(path.join(repoRoot, filePath))),
    },
    approvalReceiptContract: {
      lockState: 'locked_until_exact_p1b_receipt',
      approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
      canonicalReceiptPath,
      requiredApprovalText,
      requiredFields,
      acceptedReceiptShape: {
        schemaVersion: 'gustav-p1b-approval-receipt-v0',
        runId,
        approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
        approvalText: requiredApprovalText,
        approvedFiles: EXPECTED_P1B_FILES,
        approvedAfterP1A: true,
        freshReadBeforeEdit: true,
        approvedAt: 'ISO-8601 timestamp',
      },
      unlockPreconditions,
      rejectedImplicitCommands,
      unlockScope: {
        allowedSlice: 'P1B_DEV_TARGET_ISOLATION',
        allowedFiles: EXPECTED_P1B_FILES,
        forbiddenScopes: [
          'French content generation',
          'broad production apply',
          'P1A file creation',
          'route surface integration',
          'storage/cloud migration changes',
        ],
      },
      nonReceiptExamples,
    },
    findings,
    notes: [
      'This audit defines the future P1B approval receipt contract; it does not create the real receipt.',
      'The contract is intentionally pre-approval: P1B remains locked until P1A completion, fresh read and exact receipt.',
      'The exact receipt can authorize only the four-file P1B_DEV_TARGET_ISOLATION slice, not French generation.',
      'Production app and test files remain untouched by this audit.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_approval_receipt_contract_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_approval_receipt_contract_audit.md');
  const outReadme = path.join(runDir, 'audits', 'p1b_approval_receipt_contract', 'README.md');
  ensureDir(path.dirname(outJson));
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV P1B approval receipt contract audit: ${audit.status}`);
  console.log(`Approved files: ${audit.summary.approvedFiles}`);
  console.log(`Canonical receipt paths: ${audit.summary.canonicalReceiptPaths}`);
  console.log(`Required fields: ${audit.summary.requiredFields}`);
  console.log(`Unlock preconditions: ${audit.summary.unlockPreconditions}`);
  console.log(`Rejected implicit commands: ${audit.summary.rejectedImplicitCommands}`);
  console.log(`Contract ready: ${audit.summary.contractReady ? 'yes' : 'no'}`);
  console.log(`Real receipt present: ${audit.summary.realReceiptPresent ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
