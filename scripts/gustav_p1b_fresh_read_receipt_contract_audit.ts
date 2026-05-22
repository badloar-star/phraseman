import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  filePath?: string;
};

type StaleReadProbe = {
  id: string;
  description: string;
  receiptPathAccepted: boolean;
  filePathMatches: boolean;
  hashMatchesCurrent: boolean;
  readAfterApproval: boolean;
  p1bApprovalReceiptLinked: boolean;
  wouldSatisfyFreshRead: boolean;
  expectedFreshRead: boolean;
  rejectionReasons: string[];
};

type ContractField = {
  name: string;
  required: boolean;
  expected: string;
};

type Audit = {
  schemaVersion: 'gustav-p1b-fresh-read-receipt-contract-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1bDirtyOverlapSnapshotAudit: string;
    p1bApprovalReceiptContractAudit: string;
    p1bUnlockPrerequisiteMatrixAudit: string;
  };
  currentDirtyOverlap: {
    filePath: 'app/(tabs)/settings.tsx';
    gitStatus: string;
    exists: boolean;
    bytes: number;
    lineCount: number;
    snapshotWorkingTreeSha256: string;
    currentWorkingTreeSha256: string;
    currentHashMatchesSnapshot: boolean;
    requiresFreshReadBeforeEdit: boolean;
    freshReadReceiptPath: string;
    freshReadReceiptPresent: boolean;
  };
  summary: {
    dirtyOverlapFiles: number;
    canonicalFreshReadReceiptPaths: number;
    requiredFields: number;
    staleReadProbes: number;
    rejectedStaleReadProbes: number;
    blockers: number;
    warnings: number;
    contractReady: boolean;
    freshReadReceiptPresent: boolean;
    currentWorkingTreeHashRecorded: boolean;
    currentWorkingTreeHashMatchesSnapshot: boolean;
    snapshotHashDriftDetected: boolean;
    snapshotRefreshRequiredBeforeP1B: boolean;
    staleReadRejected: boolean;
    requiresP1ACompletion: boolean;
    requiresExactP1BApproval: boolean;
    requiresFreshReadAfterApproval: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  freshReadReceiptContract: {
    lockState: 'locked_until_fresh_read_after_p1b_approval';
    canonicalFreshReadReceiptPath: string;
    dirtyOverlapFile: 'app/(tabs)/settings.tsx';
    linkedP1BApprovalReceiptPath: string;
    requiredFields: ContractField[];
    acceptedReceiptShape: {
      schemaVersion: 'gustav-p1b-fresh-read-receipt-v0';
      runId: string;
      approvedSlice: 'P1B_DEV_TARGET_ISOLATION';
      filePath: 'app/(tabs)/settings.tsx';
      linkedP1BApprovalReceiptPath: string;
      snapshotWorkingTreeSha256: string;
      currentWorkingTreeSha256: string;
      currentGitStatus: string;
      readAfterApproval: true;
      readAt: 'ISO-8601 timestamp';
    };
    rejectionPolicy: string[];
  };
  staleReadProbes: StaleReadProbe[];
  findings: Finding[];
  notes: string[];
};

const P1A_FILES = [
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

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayOfObjects(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)) : [];
}

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function lineCount(filePath: string): number {
  return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).length;
}

function gitShortStatus(repoRoot: string, filePath: string): string {
  try {
    const output = execFileSync('git', ['status', '--short', '--', filePath], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trimEnd();
    return output ? output.slice(0, 2) : '';
  } catch {
    return '??';
  }
}

function evaluateProbe(input: Omit<StaleReadProbe, 'wouldSatisfyFreshRead' | 'rejectionReasons'>): StaleReadProbe {
  const rejectionReasons: string[] = [];
  if (!input.receiptPathAccepted) rejectionReasons.push('fresh_read_receipt_path_not_accepted');
  if (!input.filePathMatches) rejectionReasons.push('dirty_overlap_file_mismatch');
  if (!input.hashMatchesCurrent) rejectionReasons.push('current_hash_mismatch');
  if (!input.readAfterApproval) rejectionReasons.push('read_not_after_approval');
  if (!input.p1bApprovalReceiptLinked) rejectionReasons.push('p1b_approval_receipt_not_linked');
  const wouldSatisfyFreshRead = rejectionReasons.length === 0;
  return {
    ...input,
    wouldSatisfyFreshRead,
    rejectionReasons,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Fresh-Read Receipt Contract Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Dirty overlap files: ${audit.summary.dirtyOverlapFiles}`,
    `- Canonical fresh-read receipt paths: ${audit.summary.canonicalFreshReadReceiptPaths}`,
    `- Required fields: ${audit.summary.requiredFields}`,
    `- Stale-read probes: ${audit.summary.staleReadProbes}`,
    `- Rejected stale-read probes: ${audit.summary.rejectedStaleReadProbes}`,
    `- Contract ready: ${audit.summary.contractReady ? 'yes' : 'no'}`,
    `- Fresh-read receipt present: ${audit.summary.freshReadReceiptPresent ? 'yes' : 'no'}`,
    `- Current hash recorded: ${audit.summary.currentWorkingTreeHashRecorded ? 'yes' : 'no'}`,
    `- Current hash matches snapshot: ${audit.summary.currentWorkingTreeHashMatchesSnapshot ? 'yes' : 'no'}`,
    `- Snapshot hash drift detected: ${audit.summary.snapshotHashDriftDetected ? 'yes' : 'no'}`,
    `- Snapshot refresh required before P1B: ${audit.summary.snapshotRefreshRequiredBeforeP1B ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Current Dirty Overlap',
    '',
    `- File: \`${audit.currentDirtyOverlap.filePath}\``,
    `- Git status: \`${audit.currentDirtyOverlap.gitStatus || 'clean'}\``,
    `- Snapshot SHA-256: \`${audit.currentDirtyOverlap.snapshotWorkingTreeSha256}\``,
    `- Current SHA-256: \`${audit.currentDirtyOverlap.currentWorkingTreeSha256}\``,
    '',
    '## Required Fields',
    '',
  ];

  for (const field of audit.freshReadReceiptContract.requiredFields) {
    lines.push(`- \`${field.name}\`: ${field.expected}`);
  }

  lines.push('', '## Stale-Read Probes', '');
  for (const probe of audit.staleReadProbes) {
    lines.push(`- \`${probe.id}\`: satisfies=${probe.wouldSatisfyFreshRead ? 'yes' : 'no'}, expected=${probe.expectedFreshRead ? 'yes' : 'no'}, reasons=${probe.rejectionReasons.length ? probe.rejectionReasons.map((reason) => `\`${reason}\``).join(', ') : '`none`'}`);
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
    console.error('Usage: npx tsx scripts/gustav_p1b_fresh_read_receipt_contract_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const dirtySnapshotPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_audit.json');
  const receiptContractPath = path.join(runDir, 'audits', 'p1b_approval_receipt_contract_audit.json');
  const unlockMatrixPath = path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix_audit.json');
  const dirtySnapshot = readJson<Record<string, unknown>>(dirtySnapshotPath);
  const receiptContract = readJson<Record<string, unknown>>(receiptContractPath);
  const unlockMatrix = readJson<Record<string, unknown>>(unlockMatrixPath);
  const findings: Finding[] = [];

  const dirtySummary = object(dirtySnapshot.summary);
  const dirtyFiles = arrayOfObjects(dirtySnapshot.files);
  const dirtyFile = dirtyFiles.find((entry) => entry.filePath === 'app/(tabs)/settings.tsx') ?? {};
  const approvalContract = object(receiptContract.approvalReceiptContract);
  const unlockLogic = object(unlockMatrix.unlockLogic);
  const dirtyOverlapFile = 'app/(tabs)/settings.tsx' as const;
  const dirtyOverlapAbs = path.join(repoRoot, dirtyOverlapFile);
  const freshReadReceiptPath = typeof unlockLogic.freshReadReceiptPath === 'string'
    ? unlockLogic.freshReadReceiptPath
    : path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dirty_overlap_fresh_read_receipt.json');
  const linkedP1BApprovalReceiptPath = typeof approvalContract.canonicalReceiptPath === 'string'
    ? approvalContract.canonicalReceiptPath
    : path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dev_target_isolation_approval_receipt.json');
  const exists = fs.existsSync(dirtyOverlapAbs);
  const currentWorkingTreeSha256 = exists ? sha256File(dirtyOverlapAbs) : '';
  const snapshotWorkingTreeSha256 = typeof dirtyFile.workingTreeSha256 === 'string' ? dirtyFile.workingTreeSha256 : '';
  const currentHashMatchesSnapshot = Boolean(currentWorkingTreeSha256 && snapshotWorkingTreeSha256 && currentWorkingTreeSha256 === snapshotWorkingTreeSha256);
  const gitStatus = gitShortStatus(repoRoot, dirtyOverlapFile);
  const freshReadReceiptPresent = fs.existsSync(path.join(repoRoot, freshReadReceiptPath));

  if (dirtySnapshot.status !== 'PASS' || dirtySummary.requiresFreshReadBeforeEdit !== true || dirtySummary.dirtyOverlapPreserved !== true) {
    findings.push({
      severity: 'blocker',
      code: 'dirty_overlap_snapshot_not_fresh_read_locked',
      message: 'P1B dirty-overlap snapshot must be PASS, preserved and require fresh read before edit.',
      filePath: path.relative(repoRoot, dirtySnapshotPath),
    });
  }
  if (!exists) {
    findings.push({
      severity: 'blocker',
      code: 'dirty_overlap_file_missing',
      message: 'The P1B dirty overlap file must exist for a future fresh-read receipt.',
      filePath: dirtyOverlapFile,
    });
  }
  if (gitStatus !== ' M') {
    findings.push({
      severity: 'blocker',
      code: 'dirty_overlap_status_changed',
      message: 'The P1B dirty overlap must remain the observed user-owned modified file before future P1B edits.',
      filePath: dirtyOverlapFile,
    });
  }
  if (receiptContract.status !== 'PASS' || object(receiptContract.summary).contractReady !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_receipt_contract_not_ready',
      message: 'P1B approval receipt contract must be PASS before the fresh-read receipt contract is trusted.',
      filePath: path.relative(repoRoot, receiptContractPath),
    });
  }
  if (unlockMatrix.status !== 'PASS' || object(unlockMatrix.summary).freshReadRequired !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_unlock_matrix_not_fresh_read_locked',
      message: 'P1B unlock matrix must require fresh-read before edit.',
      filePath: path.relative(repoRoot, unlockMatrixPath),
    });
  }
  if (freshReadReceiptPresent) {
    findings.push({
      severity: 'blocker',
      code: 'fresh_read_receipt_present_before_approval',
      message: 'A real P1B fresh-read receipt is present; this contract audit is for the pre-approval locked state.',
      filePath: freshReadReceiptPath,
    });
  }
  for (const forbidden of P1A_FILES) {
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
    { name: 'schemaVersion', required: true, expected: 'gustav-p1b-fresh-read-receipt-v0' },
    { name: 'runId', required: true, expected: runId },
    { name: 'approvedSlice', required: true, expected: 'P1B_DEV_TARGET_ISOLATION' },
    { name: 'filePath', required: true, expected: dirtyOverlapFile },
    { name: 'linkedP1BApprovalReceiptPath', required: true, expected: linkedP1BApprovalReceiptPath },
    { name: 'snapshotWorkingTreeSha256', required: true, expected: 'preserved dirty-overlap snapshot hash' },
    { name: 'currentWorkingTreeSha256', required: true, expected: 'fresh hash read immediately before edit' },
    { name: 'currentGitStatus', required: true, expected: 'fresh git status for dirty overlap' },
    { name: 'readAfterApproval', required: true, expected: 'true' },
    { name: 'readAt', required: true, expected: 'ISO-8601 timestamp' },
  ];

  const staleReadProbes = [
    evaluateProbe({
      id: 'NO-FRESH-READ-RECEIPT',
      description: 'No fresh-read receipt exists in the current locked state.',
      receiptPathAccepted: false,
      filePathMatches: true,
      hashMatchesCurrent: false,
      readAfterApproval: false,
      p1bApprovalReceiptLinked: false,
      expectedFreshRead: false,
    }),
    evaluateProbe({
      id: 'SNAPSHOT-HASH-AS-FRESH-READ',
      description: 'The old snapshot hash is reused as if it were a fresh read.',
      receiptPathAccepted: true,
      filePathMatches: true,
      hashMatchesCurrent: false,
      readAfterApproval: false,
      p1bApprovalReceiptLinked: true,
      expectedFreshRead: false,
    }),
    evaluateProbe({
      id: 'WRONG-FILE-FRESH-READ',
      description: 'Fresh-read receipt points at a file outside the dirty overlap.',
      receiptPathAccepted: true,
      filePathMatches: false,
      hashMatchesCurrent: true,
      readAfterApproval: true,
      p1bApprovalReceiptLinked: true,
      expectedFreshRead: false,
    }),
    evaluateProbe({
      id: 'READ-BEFORE-APPROVAL',
      description: 'Fresh read happened before P1B approval was linked.',
      receiptPathAccepted: true,
      filePathMatches: true,
      hashMatchesCurrent: true,
      readAfterApproval: false,
      p1bApprovalReceiptLinked: true,
      expectedFreshRead: false,
    }),
    evaluateProbe({
      id: 'UNLINKED-P1B-APPROVAL',
      description: 'Fresh-read receipt is not linked to the exact P1B approval receipt.',
      receiptPathAccepted: true,
      filePathMatches: true,
      hashMatchesCurrent: true,
      readAfterApproval: true,
      p1bApprovalReceiptLinked: false,
      expectedFreshRead: false,
    }),
  ];

  for (const probe of staleReadProbes.filter((entry) => entry.wouldSatisfyFreshRead !== entry.expectedFreshRead)) {
    findings.push({
      severity: 'blocker',
      code: 'fresh_read_probe_expectation_mismatch',
      message: `${probe.id} result ${String(probe.wouldSatisfyFreshRead)} did not match expected ${String(probe.expectedFreshRead)}.`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const rejectedStaleReadProbes = staleReadProbes.filter((probe) => probe.wouldSatisfyFreshRead === false).length;
  const snapshotHashDriftDetected = !currentHashMatchesSnapshot;
  const snapshotRefreshRequiredBeforeP1B = snapshotHashDriftDetected;
  const contractReady =
    blockers === 0 &&
    requiredFields.length === 10 &&
    freshReadReceiptPresent === false &&
    currentWorkingTreeSha256.length === 64 &&
    rejectedStaleReadProbes === staleReadProbes.length;

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-fresh-read-receipt-contract-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1bDirtyOverlapSnapshotAudit: path.relative(repoRoot, dirtySnapshotPath),
      p1bApprovalReceiptContractAudit: path.relative(repoRoot, receiptContractPath),
      p1bUnlockPrerequisiteMatrixAudit: path.relative(repoRoot, unlockMatrixPath),
    },
    currentDirtyOverlap: {
      filePath: dirtyOverlapFile,
      gitStatus,
      exists,
      bytes: exists ? fs.statSync(dirtyOverlapAbs).size : 0,
      lineCount: exists ? lineCount(dirtyOverlapAbs) : 0,
      snapshotWorkingTreeSha256,
      currentWorkingTreeSha256,
      currentHashMatchesSnapshot,
      requiresFreshReadBeforeEdit: true,
      freshReadReceiptPath,
      freshReadReceiptPresent,
    },
    summary: {
      dirtyOverlapFiles: 1,
      canonicalFreshReadReceiptPaths: 1,
      requiredFields: requiredFields.length,
      staleReadProbes: staleReadProbes.length,
      rejectedStaleReadProbes,
      blockers,
      warnings,
      contractReady,
      freshReadReceiptPresent,
      currentWorkingTreeHashRecorded: currentWorkingTreeSha256.length === 64,
      currentWorkingTreeHashMatchesSnapshot: currentHashMatchesSnapshot,
      snapshotHashDriftDetected,
      snapshotRefreshRequiredBeforeP1B,
      staleReadRejected: rejectedStaleReadProbes === staleReadProbes.length,
      requiresP1ACompletion: true,
      requiresExactP1BApproval: true,
      requiresFreshReadAfterApproval: true,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent: P1A_FILES.every((filePath) => !fs.existsSync(path.join(repoRoot, filePath))),
    },
    freshReadReceiptContract: {
      lockState: 'locked_until_fresh_read_after_p1b_approval',
      canonicalFreshReadReceiptPath: freshReadReceiptPath,
      dirtyOverlapFile,
      linkedP1BApprovalReceiptPath,
      requiredFields,
      acceptedReceiptShape: {
        schemaVersion: 'gustav-p1b-fresh-read-receipt-v0',
        runId,
        approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
        filePath: dirtyOverlapFile,
        linkedP1BApprovalReceiptPath,
        snapshotWorkingTreeSha256,
        currentWorkingTreeSha256,
        currentGitStatus: gitStatus,
        readAfterApproval: true,
        readAt: 'ISO-8601 timestamp',
      },
      rejectionPolicy: [
        'Reject any fresh-read receipt outside the canonical run path.',
        'Reject any fresh-read receipt for a file other than app/(tabs)/settings.tsx.',
        'Reject stale hashes that do not match the current working tree at read time.',
        'Reject reads that happened before the exact P1B approval receipt.',
        'Reject receipts not linked to the exact P1B approval receipt path.',
      ],
    },
    staleReadProbes,
    findings,
    notes: [
      'This audit defines the future P1B fresh-read receipt contract; it does not create the receipt.',
      'The preserved dirty overlap is read for hash verification only and is not edited.',
      'The old dirty-overlap snapshot is not allowed to substitute for a fresh read after P1B approval.',
      snapshotHashDriftDetected
        ? 'The dirty-overlap hash has drifted since the preserved snapshot, so the future P1B path must refresh the snapshot/fresh-read evidence before any edit.'
        : 'The dirty-overlap hash still matches the preserved snapshot, but a future fresh read after approval is still required.',
      'French generation remains blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract_audit.md');
  const outReadme = path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract', 'README.md');
  ensureDir(path.dirname(outJson));
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV P1B fresh-read receipt contract audit: ${audit.status}`);
  console.log(`Dirty overlap files: ${audit.summary.dirtyOverlapFiles}`);
  console.log(`Canonical fresh-read receipt paths: ${audit.summary.canonicalFreshReadReceiptPaths}`);
  console.log(`Required fields: ${audit.summary.requiredFields}`);
  console.log(`Stale-read probes: ${audit.summary.staleReadProbes}`);
  console.log(`Rejected stale-read probes: ${audit.summary.rejectedStaleReadProbes}`);
  console.log(`Fresh-read receipt present: ${audit.summary.freshReadReceiptPresent ? 'yes' : 'no'}`);
  console.log(`Current hash matches snapshot: ${audit.summary.currentWorkingTreeHashMatchesSnapshot ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
