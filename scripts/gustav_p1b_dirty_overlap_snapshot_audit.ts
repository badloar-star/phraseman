import * as childProcess from 'node:child_process';
import * as crypto from 'node:crypto';
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

type SnapshotFile = {
  filePath: string;
  gitStatus: string;
  headExists: boolean;
  workingTreeExists: boolean;
  headSha256: string;
  workingTreeSha256: string;
  hashChanged: boolean;
  additions: number;
  deletions: number;
  plannedDirtyOverlap: boolean;
  observedDirtyWorktree: boolean;
  userOwnedDirtyWorktree: boolean;
  requiresFreshReadBeforeEdit: boolean;
  preservationPolicy: 'do_not_overwrite_without_exact_re_read_and_approval';
};

type Audit = {
  schemaVersion: 'gustav-p1b-dirty-overlap-snapshot-audit-v0';
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
    postP1ANextSliceAudit: string;
  };
  summary: {
    snapshotFiles: number;
    dirtyOverlapFiles: number;
    userOwnedDirtyFiles: number;
    freshReadRequiredFiles: number;
    filesWithHeadSnapshot: number;
    filesWithWorkingTreeSnapshot: number;
    filesWithHashChange: number;
    diffAdditions: number;
    diffDeletions: number;
    exactApprovalReceiptsPresent: number;
    blockers: number;
    warnings: number;
    snapshotPassed: boolean;
    dirtyOverlapPreserved: boolean;
    requiresFreshReadBeforeEdit: boolean;
    requiresExactP1BApproval: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  files: SnapshotFile[];
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

function sha256Text(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function runGit(repoRoot: string, args: string[]): childProcess.SpawnSyncReturns<string> {
  return childProcess.spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function gitShow(repoRoot: string, filePath: string): { exists: boolean; content: string } {
  const result = runGit(repoRoot, ['show', `HEAD:${filePath}`]);
  if (result.status !== 0) return { exists: false, content: '' };
  return { exists: true, content: result.stdout || '' };
}

function gitStatus(repoRoot: string, filePath: string): string {
  const result = runGit(repoRoot, ['status', '--short', '--', filePath]);
  if (result.status !== 0) throw new Error(`git status failed for ${filePath}: ${result.stderr || result.stdout}`);
  const line = (result.stdout || '').split('\n').find((entry) => entry.trim().endsWith(filePath));
  return line ? line.slice(0, 2) : '';
}

function gitNumstat(repoRoot: string, filePath: string): { additions: number; deletions: number } {
  const result = runGit(repoRoot, ['diff', '--numstat', '--', filePath]);
  if (result.status !== 0) throw new Error(`git diff --numstat failed for ${filePath}: ${result.stderr || result.stdout}`);
  const line = (result.stdout || '').split('\n').find((entry) => entry.includes(filePath));
  if (!line) return { additions: 0, deletions: 0 };
  const [additions, deletions] = line.split(/\s+/);
  return {
    additions: Number(additions) || 0,
    deletions: Number(deletions) || 0,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Dirty Overlap Snapshot Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Snapshot files: ${audit.summary.snapshotFiles}`,
    `- Dirty overlap files: ${audit.summary.dirtyOverlapFiles}`,
    `- User-owned dirty files: ${audit.summary.userOwnedDirtyFiles}`,
    `- Fresh-read required files: ${audit.summary.freshReadRequiredFiles}`,
    `- Files with HEAD snapshot: ${audit.summary.filesWithHeadSnapshot}`,
    `- Files with working-tree snapshot: ${audit.summary.filesWithWorkingTreeSnapshot}`,
    `- Files with hash change: ${audit.summary.filesWithHashChange}`,
    `- Diff additions: ${audit.summary.diffAdditions}`,
    `- Diff deletions: ${audit.summary.diffDeletions}`,
    `- Exact approval receipts present: ${audit.summary.exactApprovalReceiptsPresent}`,
    `- Snapshot passed: ${audit.summary.snapshotPassed ? 'yes' : 'no'}`,
    `- Dirty overlap preserved: ${audit.summary.dirtyOverlapPreserved ? 'yes' : 'no'}`,
    `- Requires fresh read before edit: ${audit.summary.requiresFreshReadBeforeEdit ? 'yes' : 'no'}`,
    `- Requires exact P1B approval: ${audit.summary.requiresExactP1BApproval ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Production files still absent: ${audit.summary.productionFilesStillAbsent ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Snapshots',
    '',
  ];

  for (const file of audit.files) {
    lines.push(`- \`${file.filePath}\`: status=\`${file.gitStatus || 'clean'}\`, head=${file.headSha256 || 'none'}, worktree=${file.workingTreeSha256 || 'none'}, additions=${file.additions}, deletions=${file.deletions}, policy=\`${file.preservationPolicy}\``);
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
    console.error('Usage: npx tsx scripts/gustav_p1b_dirty_overlap_snapshot_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const preflightPath = path.join(runDir, 'audits', 'p1b_preflight_audit.json');
  const nextSlicePath = path.join(runDir, 'audits', 'post_p1a_next_slice_audit.json');
  const preflight = readJson<Record<string, unknown>>(preflightPath);
  const nextSlice = readJson<Record<string, unknown>>(nextSlicePath);
  const findings: Finding[] = [];

  const preflightSummary = object(preflight.summary);
  const nextSliceSummary = object(nextSlice.summary);
  if (preflight.status !== 'PASS' || preflightSummary.preflightPassed !== true || preflightSummary.canStartP1BNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_preflight_not_locked',
      message: 'P1B preflight must be PASS, locked and read-only before dirty-overlap snapshot.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }
  if (nextSlice.status !== 'PASS' || nextSliceSummary.nextSliceId !== 'P1B_DEV_TARGET_ISOLATION') {
    findings.push({
      severity: 'blocker',
      code: 'p1b_next_slice_not_declared',
      message: 'Post-P1A next slice must declare P1B_DEV_TARGET_ISOLATION before dirty-overlap snapshot.',
      filePath: path.relative(repoRoot, nextSlicePath),
    });
  }

  const preflightFiles = arr<Record<string, unknown>>(preflight.files);
  const dirtyPreflightFiles = preflightFiles.filter((file) => file.plannedDirtyOverlap === true || file.observedDirtyWorktree === true);
  const files: SnapshotFile[] = [];
  for (const preflightFile of dirtyPreflightFiles) {
    const filePath = String(preflightFile.filePath || '');
    const absolute = path.join(repoRoot, filePath);
    const head = gitShow(repoRoot, filePath);
    const workingTreeExists = fs.existsSync(absolute);
    const workingTreeContent = workingTreeExists ? fs.readFileSync(absolute, 'utf8') : '';
    const git = gitStatus(repoRoot, filePath);
    const numstat = gitNumstat(repoRoot, filePath);
    const snapshot: SnapshotFile = {
      filePath,
      gitStatus: git,
      headExists: head.exists,
      workingTreeExists,
      headSha256: head.exists ? sha256Text(head.content) : '',
      workingTreeSha256: workingTreeExists ? sha256Text(workingTreeContent) : '',
      hashChanged: head.exists && workingTreeExists ? sha256Text(head.content) !== sha256Text(workingTreeContent) : false,
      additions: numstat.additions,
      deletions: numstat.deletions,
      plannedDirtyOverlap: preflightFile.plannedDirtyOverlap === true,
      observedDirtyWorktree: preflightFile.observedDirtyWorktree === true,
      userOwnedDirtyWorktree: git.trim().length > 0,
      requiresFreshReadBeforeEdit: preflightFile.requiresFreshReadBeforeEdit === true,
      preservationPolicy: 'do_not_overwrite_without_exact_re_read_and_approval',
    };
    files.push(snapshot);
  }

  if (files.length !== 1 || files[0]?.filePath !== 'app/(tabs)/settings.tsx') {
    findings.push({
      severity: 'blocker',
      code: 'p1b_snapshot_file_mismatch',
      message: 'P1B dirty-overlap snapshot must cover exactly app/(tabs)/settings.tsx.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }
  for (const file of files) {
    if (!file.headExists || !file.workingTreeExists || !file.headSha256 || !file.workingTreeSha256) {
      findings.push({
        severity: 'blocker',
        code: 'p1b_snapshot_hash_missing',
        message: `P1B snapshot must include HEAD and working-tree hashes for ${file.filePath}.`,
        filePath: file.filePath,
      });
    }
    if (!file.hashChanged || file.additions <= 0 || file.deletions <= 0) {
      findings.push({
        severity: 'blocker',
        code: 'p1b_snapshot_diff_missing',
        message: `P1B snapshot must record a non-empty dirty diff for ${file.filePath}.`,
        filePath: file.filePath,
      });
    }
    if (!file.userOwnedDirtyWorktree || !file.requiresFreshReadBeforeEdit) {
      findings.push({
        severity: 'blocker',
        code: 'p1b_snapshot_preservation_guard_missing',
        message: `P1B dirty file ${file.filePath} must be marked user-owned and fresh-read required.`,
        filePath: file.filePath,
      });
    }
  }

  const approvalGate = object(preflight.approvalGate);
  const receiptCandidates = arr<string>(approvalGate.approvalReceiptCandidates).filter((entry) => typeof entry === 'string');
  const exactApprovalReceiptsPresent = receiptCandidates.filter((receiptPath) => fs.existsSync(path.resolve(repoRoot, receiptPath))).length;
  if (exactApprovalReceiptsPresent > 0) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_approval_receipt_present',
      message: 'P1B approval receipt is present, but this snapshot is pre-approval only.',
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
  const snapshotFiles = files.length;
  const dirtyOverlapFiles = files.filter((file) => file.plannedDirtyOverlap && file.observedDirtyWorktree).length;
  const userOwnedDirtyFiles = files.filter((file) => file.userOwnedDirtyWorktree).length;
  const freshReadRequiredFiles = files.filter((file) => file.requiresFreshReadBeforeEdit).length;
  const filesWithHeadSnapshot = files.filter((file) => file.headExists && /^[a-f0-9]{64}$/.test(file.headSha256)).length;
  const filesWithWorkingTreeSnapshot = files.filter((file) => file.workingTreeExists && /^[a-f0-9]{64}$/.test(file.workingTreeSha256)).length;
  const filesWithHashChange = files.filter((file) => file.hashChanged).length;
  const diffAdditions = files.reduce((sum, file) => sum + file.additions, 0);
  const diffDeletions = files.reduce((sum, file) => sum + file.deletions, 0);
  const snapshotPassed =
    blockers === 0 &&
    snapshotFiles === 1 &&
    dirtyOverlapFiles === 1 &&
    userOwnedDirtyFiles === 1 &&
    freshReadRequiredFiles === 1 &&
    filesWithHeadSnapshot === 1 &&
    filesWithWorkingTreeSnapshot === 1 &&
    filesWithHashChange === 1 &&
    diffAdditions > 0 &&
    diffDeletions > 0 &&
    exactApprovalReceiptsPresent === 0 &&
    productionFilesStillAbsent;

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-dirty-overlap-snapshot-audit-v0',
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
      postP1ANextSliceAudit: path.relative(repoRoot, nextSlicePath),
    },
    summary: {
      snapshotFiles,
      dirtyOverlapFiles,
      userOwnedDirtyFiles,
      freshReadRequiredFiles,
      filesWithHeadSnapshot,
      filesWithWorkingTreeSnapshot,
      filesWithHashChange,
      diffAdditions,
      diffDeletions,
      exactApprovalReceiptsPresent,
      blockers,
      warnings,
      snapshotPassed,
      dirtyOverlapPreserved: snapshotPassed,
      requiresFreshReadBeforeEdit: freshReadRequiredFiles === 1,
      requiresExactP1BApproval: true,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent,
    },
    files,
    findings,
    notes: [
      'This audit records metadata and hashes only; it does not copy or edit app/(tabs)/settings.tsx.',
      'The dirty overlap is treated as user-owned worktree state and must not be overwritten by future P1B.',
      'Future P1B may proceed only after P1A completion, exact P1B approval and a fresh re-read of settings.tsx.',
      'French generation remains blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1B dirty overlap snapshot audit: ${audit.status}`);
  console.log(`Snapshot files: ${audit.summary.snapshotFiles}`);
  console.log(`Dirty overlap files: ${audit.summary.dirtyOverlapFiles}`);
  console.log(`User-owned dirty files: ${audit.summary.userOwnedDirtyFiles}`);
  console.log(`Diff additions: ${audit.summary.diffAdditions}`);
  console.log(`Diff deletions: ${audit.summary.diffDeletions}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
