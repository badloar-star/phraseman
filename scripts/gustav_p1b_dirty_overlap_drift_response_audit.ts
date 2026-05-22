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

type Audit = {
  schemaVersion: 'gustav-p1b-dirty-overlap-drift-response-audit-v0';
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
    p1bFreshReadReceiptContractAudit: string;
    p1bUnlockPrerequisiteMatrixAudit: string;
  };
  currentDirtyOverlap: {
    filePath: 'app/(tabs)/settings.tsx';
    gitStatus: string;
    exists: boolean;
    snapshotWorkingTreeSha256: string;
    currentWorkingTreeSha256: string;
    hashDriftDetected: boolean;
    snapshotBytes: number;
    currentBytes: number;
    snapshotLineCount: number;
    currentLineCount: number;
    diffAdditions: number;
    diffDeletions: number;
  };
  summary: {
    dirtyOverlapFiles: number;
    driftedDirtyOverlapFiles: number;
    refreshSteps: number;
    forbiddenActions: number;
    acceptanceCriteria: number;
    blockers: number;
    warnings: number;
    driftResponsePlanReady: boolean;
    oldSnapshotMayAuthorizeP1B: boolean;
    snapshotRefreshRequiredBeforeP1B: boolean;
    freshReadReceiptRequiredAfterApproval: boolean;
    exactP1BApprovalRequired: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  driftResponsePlan: {
    lockState: 'locked_until_snapshot_refresh_and_fresh_read_after_approval';
    staleSnapshotPolicy: 'cannot_authorize_p1b';
    requiredRefreshPath: string;
    freshReadReceiptPath: string;
    p1bApprovalReceiptPath: string;
    refreshSteps: string[];
    forbiddenActions: string[];
    acceptanceCriteria: string[];
  };
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

function gitNumstat(repoRoot: string, filePath: string): { additions: number; deletions: number } {
  try {
    const output = execFileSync('git', ['diff', '--numstat', '--', filePath], {
      cwd: repoRoot,
      encoding: 'utf8',
    }).trim();
    const [additions, deletions] = output.split(/\s+/);
    return {
      additions: Number(additions) || 0,
      deletions: Number(deletions) || 0,
    };
  } catch {
    return { additions: 0, deletions: 0 };
  }
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Dirty-Overlap Drift Response Audit',
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
    `- Drifted dirty overlap files: ${audit.summary.driftedDirtyOverlapFiles}`,
    `- Refresh steps: ${audit.summary.refreshSteps}`,
    `- Forbidden actions: ${audit.summary.forbiddenActions}`,
    `- Acceptance criteria: ${audit.summary.acceptanceCriteria}`,
    `- Drift response plan ready: ${audit.summary.driftResponsePlanReady ? 'yes' : 'no'}`,
    `- Old snapshot may authorize P1B: ${audit.summary.oldSnapshotMayAuthorizeP1B ? 'yes' : 'no'}`,
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
    `- Hash drift detected: ${audit.currentDirtyOverlap.hashDriftDetected ? 'yes' : 'no'}`,
    `- Diff: +${audit.currentDirtyOverlap.diffAdditions}/-${audit.currentDirtyOverlap.diffDeletions}`,
    '',
    '## Refresh Steps',
    '',
  ];

  for (const step of audit.driftResponsePlan.refreshSteps) lines.push(`- ${step}`);

  lines.push('', '## Forbidden Actions', '');
  for (const action of audit.driftResponsePlan.forbiddenActions) lines.push(`- ${action}`);

  lines.push('', '## Acceptance Criteria', '');
  for (const criterion of audit.driftResponsePlan.acceptanceCriteria) lines.push(`- ${criterion}`);

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
    console.error('Usage: npx tsx scripts/gustav_p1b_dirty_overlap_drift_response_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const preflightPath = path.join(runDir, 'audits', 'p1b_preflight_audit.json');
  const snapshotPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_audit.json');
  const freshReadContractPath = path.join(runDir, 'audits', 'p1b_fresh_read_receipt_contract_audit.json');
  const unlockMatrixPath = path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix_audit.json');
  const preflight = readJson<Record<string, unknown>>(preflightPath);
  const snapshot = readJson<Record<string, unknown>>(snapshotPath);
  const freshReadContract = readJson<Record<string, unknown>>(freshReadContractPath);
  const unlockMatrix = readJson<Record<string, unknown>>(unlockMatrixPath);
  const findings: Finding[] = [];

  const preflightFiles = arrayOfObjects(preflight.files);
  const preflightFile = preflightFiles.find((entry) => entry.filePath === 'app/(tabs)/settings.tsx') ?? {};
  const snapshotSummary = object(snapshot.summary);
  const freshSummary = object(freshReadContract.summary);
  const unlockSummary = object(unlockMatrix.summary);
  const snapshotFile = arrayOfObjects(snapshot.files).find((entry) => entry.filePath === 'app/(tabs)/settings.tsx') ?? {};
  const currentFresh = object(freshReadContract.currentDirtyOverlap);
  const freshContract = object(freshReadContract.freshReadReceiptContract);
  const dirtyOverlapFile = 'app/(tabs)/settings.tsx' as const;
  const dirtyOverlapAbs = path.join(repoRoot, dirtyOverlapFile);
  const exists = fs.existsSync(dirtyOverlapAbs);
  const currentWorkingTreeSha256 = exists ? sha256File(dirtyOverlapAbs) : '';
  const snapshotWorkingTreeSha256 = typeof snapshotFile.workingTreeSha256 === 'string' ? snapshotFile.workingTreeSha256 : '';
  const hashDriftDetected = Boolean(currentWorkingTreeSha256 && snapshotWorkingTreeSha256 && currentWorkingTreeSha256 !== snapshotWorkingTreeSha256);
  const numstat = gitNumstat(repoRoot, dirtyOverlapFile);
  const gitStatus = gitShortStatus(repoRoot, dirtyOverlapFile);
  const freshReadReceiptPath = typeof freshContract.canonicalFreshReadReceiptPath === 'string'
    ? freshContract.canonicalFreshReadReceiptPath
    : path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dirty_overlap_fresh_read_receipt.json');
  const p1bApprovalReceiptPath = typeof freshContract.linkedP1BApprovalReceiptPath === 'string'
    ? freshContract.linkedP1BApprovalReceiptPath
    : path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dev_target_isolation_approval_receipt.json');
  const requiredRefreshPath = path.join('docs/gustav/runs', runId, 'audits/p1b_dirty_overlap_snapshot_refresh_audit.json');

  if (snapshot.status !== 'PASS' || snapshotSummary.dirtyOverlapPreserved !== true) {
    findings.push({
      severity: 'blocker',
      code: 'dirty_overlap_snapshot_not_preserved',
      message: 'P1B dirty-overlap snapshot must be preserved before drift response can be trusted.',
      filePath: path.relative(repoRoot, snapshotPath),
    });
  }
  if (freshReadContract.status !== 'PASS' || freshSummary.snapshotHashDriftDetected !== true || freshSummary.snapshotRefreshRequiredBeforeP1B !== true) {
    findings.push({
      severity: 'blocker',
      code: 'fresh_read_contract_not_drift_locked',
      message: 'P1B fresh-read contract must detect snapshot drift and require refresh before P1B.',
      filePath: path.relative(repoRoot, freshReadContractPath),
    });
  }
  if (unlockMatrix.status !== 'PASS' || unlockSummary.canStartP1BNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'unlock_matrix_not_locked',
      message: 'P1B unlock matrix must remain locked while drift response is defined.',
      filePath: path.relative(repoRoot, unlockMatrixPath),
    });
  }
  if (!exists || gitStatus !== ' M' || !hashDriftDetected) {
    findings.push({
      severity: 'blocker',
      code: 'dirty_overlap_drift_state_invalid',
      message: 'Expected app/(tabs)/settings.tsx to exist, remain modified and differ from the preserved snapshot.',
      filePath: dirtyOverlapFile,
    });
  }
  if (currentFresh.currentWorkingTreeSha256 !== currentWorkingTreeSha256 || currentFresh.snapshotWorkingTreeSha256 !== snapshotWorkingTreeSha256) {
    findings.push({
      severity: 'blocker',
      code: 'fresh_read_contract_hash_mismatch',
      message: 'Fresh-read contract hash values must match the drift response audit inputs.',
      filePath: path.relative(repoRoot, freshReadContractPath),
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

  const refreshSteps = [
    'Keep app/(tabs)/settings.tsx read-only until P1A completion and exact P1B approval receipt exist.',
    'Immediately before P1B work, re-read app/(tabs)/settings.tsx from the working tree.',
    'Record a new current SHA-256, byte count, line count and git short status.',
    'Compare the new read with the preserved dirty-overlap snapshot and mark drift explicitly.',
    'Write a fresh-read receipt only at the canonical run path after exact P1B approval.',
    'Link the fresh-read receipt to the exact P1B approval receipt path.',
    'Abort P1B if the dirty overlap changed again between fresh-read and edit.',
    'Allow edits only to the approved four-file P1B_DEV_TARGET_ISOLATION slice.',
  ];
  const forbiddenActions = [
    'Do not use the old dirty-overlap snapshot as permission to edit settings.tsx.',
    'Do not create a fresh-read receipt before exact P1B approval.',
    'Do not edit app/(tabs)/settings.tsx while a hash drift is only documented but not freshly approved.',
    'Do not widen P1B into route surface, storage, cloud or French content work.',
    'Do not overwrite user-owned dirty worktree changes.',
    'Do not treat continuation commands as P1B approval.',
  ];
  const acceptanceCriteria = [
    'P1A completion proof exists.',
    'Exact P1B approval receipt exists at the canonical path.',
    'Dirty-overlap snapshot refresh audit records the latest working-tree hash.',
    'Fresh-read receipt exists at the canonical path after P1B approval.',
    'Fresh-read receipt links the exact P1B approval receipt path.',
    'Current git status and SHA-256 still match between fresh-read and edit start.',
    'Production writes remain limited to the four approved P1B files.',
  ];

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const driftResponsePlanReady =
    blockers === 0 &&
    hashDriftDetected &&
    refreshSteps.length === 8 &&
    forbiddenActions.length === 6 &&
    acceptanceCriteria.length === 7;

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-dirty-overlap-drift-response-audit-v0',
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
      p1bDirtyOverlapSnapshotAudit: path.relative(repoRoot, snapshotPath),
      p1bFreshReadReceiptContractAudit: path.relative(repoRoot, freshReadContractPath),
      p1bUnlockPrerequisiteMatrixAudit: path.relative(repoRoot, unlockMatrixPath),
    },
    currentDirtyOverlap: {
      filePath: dirtyOverlapFile,
      gitStatus,
      exists,
      snapshotWorkingTreeSha256,
      currentWorkingTreeSha256,
      hashDriftDetected,
      snapshotBytes: typeof preflightFile.bytes === 'number' ? preflightFile.bytes : 0,
      currentBytes: exists ? fs.statSync(dirtyOverlapAbs).size : 0,
      snapshotLineCount: typeof preflightFile.lineCount === 'number' ? preflightFile.lineCount : 0,
      currentLineCount: exists ? lineCount(dirtyOverlapAbs) : 0,
      diffAdditions: numstat.additions,
      diffDeletions: numstat.deletions,
    },
    summary: {
      dirtyOverlapFiles: 1,
      driftedDirtyOverlapFiles: hashDriftDetected ? 1 : 0,
      refreshSteps: refreshSteps.length,
      forbiddenActions: forbiddenActions.length,
      acceptanceCriteria: acceptanceCriteria.length,
      blockers,
      warnings,
      driftResponsePlanReady,
      oldSnapshotMayAuthorizeP1B: false,
      snapshotRefreshRequiredBeforeP1B: true,
      freshReadReceiptRequiredAfterApproval: true,
      exactP1BApprovalRequired: true,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent: P1A_FILES.every((filePath) => !fs.existsSync(path.join(repoRoot, filePath))),
    },
    driftResponsePlan: {
      lockState: 'locked_until_snapshot_refresh_and_fresh_read_after_approval',
      staleSnapshotPolicy: 'cannot_authorize_p1b',
      requiredRefreshPath,
      freshReadReceiptPath,
      p1bApprovalReceiptPath,
      refreshSteps,
      forbiddenActions,
      acceptanceCriteria,
    },
    findings,
    notes: [
      'This audit records a drift response plan only; it does not refresh the snapshot or edit app/(tabs)/settings.tsx.',
      'The preserved dirty-overlap snapshot is stale relative to the current working tree and cannot authorize P1B.',
      'Future P1B requires a refreshed snapshot/fresh-read receipt after exact P1B approval.',
      'French generation remains blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_dirty_overlap_drift_response_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_dirty_overlap_drift_response_audit.md');
  const outReadme = path.join(runDir, 'audits', 'p1b_dirty_overlap_drift_response', 'README.md');
  ensureDir(path.dirname(outJson));
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV P1B dirty-overlap drift response audit: ${audit.status}`);
  console.log(`Dirty overlap files: ${audit.summary.dirtyOverlapFiles}`);
  console.log(`Drifted dirty overlap files: ${audit.summary.driftedDirtyOverlapFiles}`);
  console.log(`Refresh steps: ${audit.summary.refreshSteps}`);
  console.log(`Forbidden actions: ${audit.summary.forbiddenActions}`);
  console.log(`Acceptance criteria: ${audit.summary.acceptanceCriteria}`);
  console.log(`Old snapshot may authorize P1B: ${audit.summary.oldSnapshotMayAuthorizeP1B ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
