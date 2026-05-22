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

type ContractField = {
  name: string;
  required: boolean;
  expected: string;
};

type RefreshProbe = {
  id: string;
  description: string;
  refreshPathAccepted: boolean;
  linkedP1BApproval: boolean;
  filePathMatches: boolean;
  currentHashRecorded: boolean;
  afterApproval: boolean;
  pairedFreshReadReceipt: boolean;
  wouldAuthorizeP1B: boolean;
  expectedAuthorizeP1B: boolean;
  rejectionReasons: string[];
};

type Audit = {
  schemaVersion: 'gustav-p1b-dirty-overlap-snapshot-refresh-contract-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1bDirtyOverlapDriftResponseAudit: string;
    p1bFreshReadReceiptContractAudit: string;
    p1bApprovalReceiptContractAudit: string;
  };
  currentDirtyOverlap: {
    filePath: 'app/(tabs)/settings.tsx';
    gitStatus: string;
    exists: boolean;
    previousSnapshotWorkingTreeSha256: string;
    currentWorkingTreeSha256: string;
    hashDriftDetected: boolean;
    currentBytes: number;
    currentLineCount: number;
  };
  summary: {
    canonicalRefreshAuditPaths: number;
    requiredFields: number;
    rejectionRules: number;
    refreshProbes: number;
    rejectedRefreshProbes: number;
    blockers: number;
    warnings: number;
    contractReady: boolean;
    refreshAuditPresent: boolean;
    currentWorkingTreeHashRecorded: boolean;
    snapshotHashDriftDetected: boolean;
    refreshRequiresExactP1BApproval: boolean;
    refreshRequiresPostApprovalRead: boolean;
    refreshRequiresFreshReadReceiptPair: boolean;
    refreshAuditAloneMayAuthorizeP1B: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  snapshotRefreshContract: {
    lockState: 'locked_until_snapshot_refresh_after_exact_p1b_approval';
    canonicalRefreshAuditPath: string;
    dirtyOverlapFile: 'app/(tabs)/settings.tsx';
    linkedP1BApprovalReceiptPath: string;
    pairedFreshReadReceiptPath: string;
    requiredFields: ContractField[];
    acceptedRefreshShape: {
      schemaVersion: 'gustav-p1b-dirty-overlap-snapshot-refresh-audit-v0';
      runId: string;
      approvedSlice: 'P1B_DEV_TARGET_ISOLATION';
      filePath: 'app/(tabs)/settings.tsx';
      linkedP1BApprovalReceiptPath: string;
      pairedFreshReadReceiptPath: string;
      previousSnapshotWorkingTreeSha256: string;
      refreshedWorkingTreeSha256: string;
      refreshedGitStatus: string;
      refreshedBytes: number;
      refreshedLineCount: number;
      hashDriftFromPreviousSnapshot: true;
      refreshedAfterApproval: true;
      refreshedAt: 'ISO-8601 timestamp';
    };
    rejectionPolicy: string[];
  };
  refreshProbes: RefreshProbe[];
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

function evaluateProbe(input: Omit<RefreshProbe, 'wouldAuthorizeP1B' | 'rejectionReasons'>): RefreshProbe {
  const rejectionReasons: string[] = [];
  if (!input.refreshPathAccepted) rejectionReasons.push('refresh_audit_path_not_accepted');
  if (!input.linkedP1BApproval) rejectionReasons.push('p1b_approval_not_linked');
  if (!input.filePathMatches) rejectionReasons.push('dirty_overlap_file_mismatch');
  if (!input.currentHashRecorded) rejectionReasons.push('current_hash_missing');
  if (!input.afterApproval) rejectionReasons.push('refresh_not_after_approval');
  if (!input.pairedFreshReadReceipt) rejectionReasons.push('fresh_read_receipt_not_paired');
  const wouldAuthorizeP1B = rejectionReasons.length === 0;
  return {
    ...input,
    wouldAuthorizeP1B,
    rejectionReasons,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Dirty-Overlap Snapshot Refresh Contract Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Canonical refresh audit paths: ${audit.summary.canonicalRefreshAuditPaths}`,
    `- Required fields: ${audit.summary.requiredFields}`,
    `- Rejection rules: ${audit.summary.rejectionRules}`,
    `- Refresh probes: ${audit.summary.refreshProbes}`,
    `- Rejected refresh probes: ${audit.summary.rejectedRefreshProbes}`,
    `- Contract ready: ${audit.summary.contractReady ? 'yes' : 'no'}`,
    `- Refresh audit present: ${audit.summary.refreshAuditPresent ? 'yes' : 'no'}`,
    `- Snapshot hash drift detected: ${audit.summary.snapshotHashDriftDetected ? 'yes' : 'no'}`,
    `- Refresh audit alone may authorize P1B: ${audit.summary.refreshAuditAloneMayAuthorizeP1B ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Current Dirty Overlap',
    '',
    `- File: \`${audit.currentDirtyOverlap.filePath}\``,
    `- Git status: \`${audit.currentDirtyOverlap.gitStatus || 'clean'}\``,
    `- Previous snapshot SHA-256: \`${audit.currentDirtyOverlap.previousSnapshotWorkingTreeSha256}\``,
    `- Current SHA-256: \`${audit.currentDirtyOverlap.currentWorkingTreeSha256}\``,
    '',
    '## Required Fields',
    '',
  ];

  for (const field of audit.snapshotRefreshContract.requiredFields) {
    lines.push(`- \`${field.name}\`: ${field.expected}`);
  }

  lines.push('', '## Rejection Policy', '');
  for (const rule of audit.snapshotRefreshContract.rejectionPolicy) lines.push(`- ${rule}`);

  lines.push('', '## Refresh Probes', '');
  for (const probe of audit.refreshProbes) {
    lines.push(`- \`${probe.id}\`: authorize=${probe.wouldAuthorizeP1B ? 'yes' : 'no'}, expected=${probe.expectedAuthorizeP1B ? 'yes' : 'no'}, reasons=${probe.rejectionReasons.length ? probe.rejectionReasons.map((reason) => `\`${reason}\``).join(', ') : '`none`'}`);
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
    console.error('Usage: npx tsx scripts/gustav_p1b_dirty_overlap_snapshot_refresh_contract_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const driftResponsePath = path.join(runDir, 'audits', 'p1b_dirty_overlap_drift_response_audit.json');
  const freshReadContractPath = path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract_audit.json');
  const approvalContractPath = path.join(runDir, 'audits', 'p1b_approval_receipt_contract_audit.json');
  const driftResponse = readJson<Record<string, unknown>>(driftResponsePath);
  const freshReadContract = readJson<Record<string, unknown>>(freshReadContractPath);
  const approvalContract = readJson<Record<string, unknown>>(approvalContractPath);
  const findings: Finding[] = [];

  const driftSummary = object(driftResponse.summary);
  const driftPlan = object(driftResponse.driftResponsePlan);
  const currentDrift = object(driftResponse.currentDirtyOverlap);
  const freshContract = object(freshReadContract.freshReadReceiptContract);
  const approvalReceiptContract = object(approvalContract.approvalReceiptContract);
  const dirtyOverlapFile = 'app/(tabs)/settings.tsx' as const;
  const dirtyOverlapAbs = path.join(repoRoot, dirtyOverlapFile);
  const exists = fs.existsSync(dirtyOverlapAbs);
  const currentWorkingTreeSha256 = exists ? sha256File(dirtyOverlapAbs) : '';
  const previousSnapshotWorkingTreeSha256 = typeof currentDrift.snapshotWorkingTreeSha256 === 'string' ? currentDrift.snapshotWorkingTreeSha256 : '';
  const hashDriftDetected = Boolean(currentWorkingTreeSha256 && previousSnapshotWorkingTreeSha256 && currentWorkingTreeSha256 !== previousSnapshotWorkingTreeSha256);
  const gitStatus = gitShortStatus(repoRoot, dirtyOverlapFile);
  const canonicalRefreshAuditPath = typeof driftPlan.requiredRefreshPath === 'string'
    ? driftPlan.requiredRefreshPath
    : path.join('docs/gustav/runs', runId, 'audits/p1b_dirty_overlap_snapshot_refresh_audit.json');
  const pairedFreshReadReceiptPath = typeof driftPlan.freshReadReceiptPath === 'string'
    ? driftPlan.freshReadReceiptPath
    : String(freshContract.canonicalFreshReadReceiptPath || '');
  const linkedP1BApprovalReceiptPath = typeof driftPlan.p1bApprovalReceiptPath === 'string'
    ? driftPlan.p1bApprovalReceiptPath
    : String(approvalReceiptContract.canonicalReceiptPath || '');
  const refreshAuditPresent = fs.existsSync(path.join(repoRoot, canonicalRefreshAuditPath));

  if (driftResponse.status !== 'PASS' || driftSummary.snapshotRefreshRequiredBeforeP1B !== true || driftSummary.oldSnapshotMayAuthorizeP1B !== false) {
    findings.push({
      severity: 'blocker',
      code: 'drift_response_not_refresh_locked',
      message: 'P1B drift response must require snapshot refresh and forbid old snapshot authorization.',
      filePath: path.relative(repoRoot, driftResponsePath),
    });
  }
  if (freshReadContract.status !== 'PASS' || object(freshReadContract.summary).snapshotRefreshRequiredBeforeP1B !== true) {
    findings.push({
      severity: 'blocker',
      code: 'fresh_read_contract_not_refresh_locked',
      message: 'P1B fresh-read contract must require snapshot refresh before P1B.',
      filePath: path.relative(repoRoot, freshReadContractPath),
    });
  }
  if (approvalContract.status !== 'PASS' || object(approvalContract.summary).realReceiptPresent !== false) {
    findings.push({
      severity: 'blocker',
      code: 'approval_contract_not_preapproval_locked',
      message: 'P1B approval receipt contract must remain pre-approval locked.',
      filePath: path.relative(repoRoot, approvalContractPath),
    });
  }
  if (!exists || gitStatus !== ' M' || !hashDriftDetected) {
    findings.push({
      severity: 'blocker',
      code: 'dirty_overlap_refresh_state_invalid',
      message: 'Expected app/(tabs)/settings.tsx to exist, remain modified and differ from the previous snapshot.',
      filePath: dirtyOverlapFile,
    });
  }
  if (refreshAuditPresent) {
    findings.push({
      severity: 'blocker',
      code: 'snapshot_refresh_audit_present_before_approval',
      message: 'A real P1B snapshot refresh audit is present; this contract audit is for the pre-refresh locked state.',
      filePath: canonicalRefreshAuditPath,
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
    { name: 'schemaVersion', required: true, expected: 'gustav-p1b-dirty-overlap-snapshot-refresh-audit-v0' },
    { name: 'runId', required: true, expected: runId },
    { name: 'approvedSlice', required: true, expected: 'P1B_DEV_TARGET_ISOLATION' },
    { name: 'filePath', required: true, expected: dirtyOverlapFile },
    { name: 'linkedP1BApprovalReceiptPath', required: true, expected: linkedP1BApprovalReceiptPath },
    { name: 'pairedFreshReadReceiptPath', required: true, expected: pairedFreshReadReceiptPath },
    { name: 'previousSnapshotWorkingTreeSha256', required: true, expected: 'stale preserved dirty-overlap snapshot hash' },
    { name: 'refreshedWorkingTreeSha256', required: true, expected: 'latest working-tree hash after approval' },
    { name: 'refreshedGitStatus', required: true, expected: 'fresh git status for dirty overlap' },
    { name: 'refreshedBytes', required: true, expected: 'latest byte count' },
    { name: 'refreshedLineCount', required: true, expected: 'latest line count' },
    { name: 'hashDriftFromPreviousSnapshot', required: true, expected: 'true' },
    { name: 'refreshedAfterApproval', required: true, expected: 'true' },
    { name: 'refreshedAt', required: true, expected: 'ISO-8601 timestamp' },
  ];

  const rejectionPolicy = [
    'Reject refresh audits outside the canonical run path.',
    'Reject refresh audits not linked to the exact P1B approval receipt.',
    'Reject refresh audits for any file other than app/(tabs)/settings.tsx.',
    'Reject refresh audits without the latest working-tree hash and metadata.',
    'Reject refresh audits created before exact P1B approval.',
    'Reject using the refresh audit alone as authorization without paired fresh-read receipt.',
    'Reject refresh audits that widen P1B beyond the four approved files.',
  ];

  const refreshProbes = [
    evaluateProbe({
      id: 'NO-REFRESH-AUDIT',
      description: 'No snapshot refresh audit exists in the current locked state.',
      refreshPathAccepted: false,
      linkedP1BApproval: false,
      filePathMatches: true,
      currentHashRecorded: false,
      afterApproval: false,
      pairedFreshReadReceipt: false,
      expectedAuthorizeP1B: false,
    }),
    evaluateProbe({
      id: 'REFRESH-WRONG-PATH',
      description: 'Refresh audit exists outside the canonical run path.',
      refreshPathAccepted: false,
      linkedP1BApproval: true,
      filePathMatches: true,
      currentHashRecorded: true,
      afterApproval: true,
      pairedFreshReadReceipt: true,
      expectedAuthorizeP1B: false,
    }),
    evaluateProbe({
      id: 'REFRESH-BEFORE-APPROVAL',
      description: 'Refresh audit is created before exact P1B approval.',
      refreshPathAccepted: true,
      linkedP1BApproval: false,
      filePathMatches: true,
      currentHashRecorded: true,
      afterApproval: false,
      pairedFreshReadReceipt: true,
      expectedAuthorizeP1B: false,
    }),
    evaluateProbe({
      id: 'REFRESH-WRONG-FILE',
      description: 'Refresh audit targets a file other than the dirty overlap.',
      refreshPathAccepted: true,
      linkedP1BApproval: true,
      filePathMatches: false,
      currentHashRecorded: true,
      afterApproval: true,
      pairedFreshReadReceipt: true,
      expectedAuthorizeP1B: false,
    }),
    evaluateProbe({
      id: 'REFRESH-NO-FRESH-READ-PAIR',
      description: 'Refresh audit has current metadata but no paired fresh-read receipt.',
      refreshPathAccepted: true,
      linkedP1BApproval: true,
      filePathMatches: true,
      currentHashRecorded: true,
      afterApproval: true,
      pairedFreshReadReceipt: false,
      expectedAuthorizeP1B: false,
    }),
    evaluateProbe({
      id: 'FUTURE-REFRESH-WITH-FRESH-READ',
      description: 'The future full refresh evidence set that can satisfy this contract but still only within narrow P1B.',
      refreshPathAccepted: true,
      linkedP1BApproval: true,
      filePathMatches: true,
      currentHashRecorded: true,
      afterApproval: true,
      pairedFreshReadReceipt: true,
      expectedAuthorizeP1B: true,
    }),
  ];

  for (const probe of refreshProbes.filter((entry) => entry.wouldAuthorizeP1B !== entry.expectedAuthorizeP1B)) {
    findings.push({
      severity: 'blocker',
      code: 'refresh_probe_expectation_mismatch',
      message: `${probe.id} result ${String(probe.wouldAuthorizeP1B)} did not match expected ${String(probe.expectedAuthorizeP1B)}.`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const rejectedRefreshProbes = refreshProbes.filter((probe) => probe.wouldAuthorizeP1B === false).length;
  const contractReady =
    blockers === 0 &&
    requiredFields.length === 14 &&
    rejectionPolicy.length === 7 &&
    refreshProbes.length === 6 &&
    rejectedRefreshProbes === 5 &&
    refreshAuditPresent === false &&
    hashDriftDetected;

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-dirty-overlap-snapshot-refresh-contract-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1bDirtyOverlapDriftResponseAudit: path.relative(repoRoot, driftResponsePath),
      p1bFreshReadReceiptContractAudit: path.relative(repoRoot, freshReadContractPath),
      p1bApprovalReceiptContractAudit: path.relative(repoRoot, approvalContractPath),
    },
    currentDirtyOverlap: {
      filePath: dirtyOverlapFile,
      gitStatus,
      exists,
      previousSnapshotWorkingTreeSha256,
      currentWorkingTreeSha256,
      hashDriftDetected,
      currentBytes: exists ? fs.statSync(dirtyOverlapAbs).size : 0,
      currentLineCount: exists ? lineCount(dirtyOverlapAbs) : 0,
    },
    summary: {
      canonicalRefreshAuditPaths: canonicalRefreshAuditPath ? 1 : 0,
      requiredFields: requiredFields.length,
      rejectionRules: rejectionPolicy.length,
      refreshProbes: refreshProbes.length,
      rejectedRefreshProbes,
      blockers,
      warnings,
      contractReady,
      refreshAuditPresent,
      currentWorkingTreeHashRecorded: currentWorkingTreeSha256.length === 64,
      snapshotHashDriftDetected: hashDriftDetected,
      refreshRequiresExactP1BApproval: true,
      refreshRequiresPostApprovalRead: true,
      refreshRequiresFreshReadReceiptPair: true,
      refreshAuditAloneMayAuthorizeP1B: false,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent: P1A_FILES.every((filePath) => !fs.existsSync(path.join(repoRoot, filePath))),
    },
    snapshotRefreshContract: {
      lockState: 'locked_until_snapshot_refresh_after_exact_p1b_approval',
      canonicalRefreshAuditPath,
      dirtyOverlapFile,
      linkedP1BApprovalReceiptPath,
      pairedFreshReadReceiptPath,
      requiredFields,
      acceptedRefreshShape: {
        schemaVersion: 'gustav-p1b-dirty-overlap-snapshot-refresh-audit-v0',
        runId,
        approvedSlice: 'P1B_DEV_TARGET_ISOLATION',
        filePath: dirtyOverlapFile,
        linkedP1BApprovalReceiptPath,
        pairedFreshReadReceiptPath,
        previousSnapshotWorkingTreeSha256,
        refreshedWorkingTreeSha256: currentWorkingTreeSha256,
        refreshedGitStatus: gitStatus,
        refreshedBytes: exists ? fs.statSync(dirtyOverlapAbs).size : 0,
        refreshedLineCount: exists ? lineCount(dirtyOverlapAbs) : 0,
        hashDriftFromPreviousSnapshot: true,
        refreshedAfterApproval: true,
        refreshedAt: 'ISO-8601 timestamp',
      },
      rejectionPolicy,
    },
    refreshProbes,
    findings,
    notes: [
      'This audit defines the future snapshot refresh audit contract; it does not create the refresh audit.',
      'A snapshot refresh audit alone cannot authorize P1B without exact approval and paired fresh-read receipt.',
      'The current dirty overlap is read for metadata only and is not edited.',
      'French generation remains blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_refresh_contract_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_refresh_contract_audit.md');
  const outReadme = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_refresh_contract', 'README.md');
  ensureDir(path.dirname(outJson));
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV P1B dirty-overlap snapshot refresh contract audit: ${audit.status}`);
  console.log(`Canonical refresh audit paths: ${audit.summary.canonicalRefreshAuditPaths}`);
  console.log(`Required fields: ${audit.summary.requiredFields}`);
  console.log(`Rejection rules: ${audit.summary.rejectionRules}`);
  console.log(`Refresh probes: ${audit.summary.refreshProbes}`);
  console.log(`Rejected refresh probes: ${audit.summary.rejectedRefreshProbes}`);
  console.log(`Refresh audit present: ${audit.summary.refreshAuditPresent ? 'yes' : 'no'}`);
  console.log(`Refresh audit alone may authorize P1B: ${audit.summary.refreshAuditAloneMayAuthorizeP1B ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
