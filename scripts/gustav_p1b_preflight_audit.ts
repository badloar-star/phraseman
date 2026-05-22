import * as childProcess from 'node:child_process';
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

type P1BFile = {
  filePath: string;
  exists: boolean;
  bytes: number;
  lineCount: number;
  plannedDirtyOverlap: boolean;
  observedGitStatus: string;
  observedDirtyWorktree: boolean;
  requiresFreshReadBeforeEdit: boolean;
  allowedAction: 'read_only_preflight';
};

type Audit = {
  schemaVersion: 'gustav-p1b-preflight-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    postP1ANextSliceAudit: string;
    postP1AReadinessProjectionAudit: string;
    p1ExecutionSliceAudit: string;
  };
  summary: {
    p1bFiles: number;
    existingFiles: number;
    missingFiles: number;
    dirtyOverlapsPlanned: number;
    dirtyOverlapsObserved: number;
    freshReadRequiredFiles: number;
    exactApprovalReceiptCandidates: number;
    exactApprovalReceiptsPresent: number;
    blockers: number;
    warnings: number;
    preflightPassed: boolean;
    p1bPreflightReadyAfterP1AAndExactApproval: boolean;
    requiresP1ACompletion: boolean;
    requiresExactP1BApproval: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  approvalGate: {
    requiredApprovalText: string;
    approvalReceiptCandidates: string[];
    rejectedImplicitCommands: string[];
  };
  files: P1BFile[];
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

function gitStatus(repoRoot: string, files: string[]): Map<string, string> {
  const result = childProcess.spawnSync('git', ['status', '--short', '--', ...files], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`git status failed: ${result.stderr || result.stdout}`);
  }
  const statuses = new Map<string, string>();
  for (const line of (result.stdout || '').split('\n')) {
    if (!line.trim()) continue;
    const status = line.slice(0, 2);
    const filePath = line.slice(3).trim();
    statuses.set(filePath, status);
  }
  return statuses;
}

function fileInfo(repoRoot: string, filePath: string): { exists: boolean; bytes: number; lineCount: number } {
  const absolute = path.join(repoRoot, filePath);
  if (!fs.existsSync(absolute)) return { exists: false, bytes: 0, lineCount: 0 };
  const content = fs.readFileSync(absolute, 'utf8');
  return {
    exists: true,
    bytes: Buffer.byteLength(content, 'utf8'),
    lineCount: content.length === 0 ? 0 : content.split('\n').length,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Preflight Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- P1B files: ${audit.summary.p1bFiles}`,
    `- Existing files: ${audit.summary.existingFiles}`,
    `- Missing files: ${audit.summary.missingFiles}`,
    `- Dirty overlaps planned: ${audit.summary.dirtyOverlapsPlanned}`,
    `- Dirty overlaps observed: ${audit.summary.dirtyOverlapsObserved}`,
    `- Fresh-read required files: ${audit.summary.freshReadRequiredFiles}`,
    `- Exact approval receipt candidates: ${audit.summary.exactApprovalReceiptCandidates}`,
    `- Exact approval receipts present: ${audit.summary.exactApprovalReceiptsPresent}`,
    `- Preflight passed: ${audit.summary.preflightPassed ? 'yes' : 'no'}`,
    `- Ready after P1A and exact approval: ${audit.summary.p1bPreflightReadyAfterP1AAndExactApproval ? 'yes' : 'no'}`,
    `- Requires P1A completion: ${audit.summary.requiresP1ACompletion ? 'yes' : 'no'}`,
    `- Requires exact P1B approval: ${audit.summary.requiresExactP1BApproval ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Production files still absent: ${audit.summary.productionFilesStillAbsent ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Files',
    '',
  ];

  for (const file of audit.files) {
    lines.push(`- \`${file.filePath}\`: exists=${file.exists ? 'yes' : 'no'}, gitStatus=\`${file.observedGitStatus || 'clean'}\`, plannedDirty=${file.plannedDirtyOverlap ? 'yes' : 'no'}, observedDirty=${file.observedDirtyWorktree ? 'yes' : 'no'}, freshRead=${file.requiresFreshReadBeforeEdit ? 'yes' : 'no'}`);
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
    console.error('Usage: npx tsx scripts/gustav_p1b_preflight_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const nextSlicePath = path.join(runDir, 'audits', 'post_p1a_next_slice_audit.json');
  const projectionPath = path.join(runDir, 'audits', 'post_p1a_readiness_projection_audit.json');
  const p1SlicePath = path.join(runDir, 'audits', 'p1_execution_slice_audit.json');
  const nextSliceAudit = readJson<Record<string, unknown>>(nextSlicePath);
  const projectionAudit = readJson<Record<string, unknown>>(projectionPath);
  const p1SliceAudit = readJson<Record<string, unknown>>(p1SlicePath);
  const findings: Finding[] = [];

  const nextSummary = object(nextSliceAudit.summary);
  const projectionSummary = object(projectionAudit.summary);
  if (nextSliceAudit.status !== 'PASS' || nextSummary.nextSliceId !== 'P1B_DEV_TARGET_ISOLATION' || nextSummary.canStartNextSliceNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'next_slice_not_locked',
      message: 'Post-P1A next slice audit must be PASS, P1B and locked before P1B preflight.',
      filePath: path.relative(repoRoot, nextSlicePath),
    });
  }
  if (projectionAudit.status !== 'PASS' || projectionSummary.p1aDoesNotUnlockFrenchGeneration !== true) {
    findings.push({
      severity: 'blocker',
      code: 'projection_not_locked',
      message: 'Post-P1A projection must keep French generation locked before P1B preflight.',
      filePath: path.relative(repoRoot, projectionPath),
    });
  }
  if (p1SliceAudit.status !== 'PASS') {
    findings.push({
      severity: 'blocker',
      code: 'p1_slice_not_pass',
      message: 'P1 execution slice audit must be PASS before P1B preflight.',
      filePath: path.relative(repoRoot, p1SlicePath),
    });
  }

  const nextSlice = object(nextSliceAudit.nextSlice);
  const plannedFiles = arr<Record<string, unknown>>(nextSlice.files);
  const expectedFiles = [
    'app/(tabs)/settings.tsx',
    'app/spanish_content_gate.ts',
    'app/study_target_lang_dev.ts',
    'components/StudyTargetContext.tsx',
  ];
  const plannedPaths = plannedFiles.map((file) => String(file.path || '')).filter(Boolean);
  for (const expected of expectedFiles) {
    if (!plannedPaths.includes(expected)) {
      findings.push({
        severity: 'blocker',
        code: 'p1b_expected_file_missing',
        message: `P1B preflight missing expected file ${expected}.`,
        filePath: path.relative(repoRoot, nextSlicePath),
      });
    }
  }

  const statuses = gitStatus(repoRoot, expectedFiles);
  const files: P1BFile[] = expectedFiles.map((filePath) => {
    const planned = plannedFiles.find((file) => file.path === filePath) || {};
    const info = fileInfo(repoRoot, filePath);
    const observedGitStatus = statuses.get(filePath) || '';
    return {
      filePath,
      exists: info.exists,
      bytes: info.bytes,
      lineCount: info.lineCount,
      plannedDirtyOverlap: planned.dirtyWorktreeOverlap === true,
      observedGitStatus,
      observedDirtyWorktree: observedGitStatus.trim().length > 0,
      requiresFreshReadBeforeEdit: planned.requiredFreshReadBeforeEdit === true,
      allowedAction: 'read_only_preflight',
    };
  });

  for (const file of files) {
    if (!file.exists) {
      findings.push({
        severity: 'blocker',
        code: 'p1b_file_missing',
        message: `P1B preflight file is missing: ${file.filePath}`,
        filePath: file.filePath,
      });
    }
    if (file.plannedDirtyOverlap !== file.observedDirtyWorktree) {
      findings.push({
        severity: 'blocker',
        code: 'p1b_dirty_overlap_mismatch',
        message: `P1B dirty overlap mismatch for ${file.filePath}: planned=${String(file.plannedDirtyOverlap)} observed=${String(file.observedDirtyWorktree)}.`,
        filePath: file.filePath,
      });
    }
    if (file.filePath === 'app/(tabs)/settings.tsx' && (!file.plannedDirtyOverlap || !file.requiresFreshReadBeforeEdit)) {
      findings.push({
        severity: 'blocker',
        code: 'p1b_settings_fresh_read_missing',
        message: 'P1B settings dirty overlap must require fresh read before any future approved edit.',
        filePath: file.filePath,
      });
    }
  }

  const approvalPolicy = object(nextSlice.approvalPolicy);
  const approvalReceiptCandidates = [
    String(approvalPolicy.acceptedReceiptPath || path.relative(repoRoot, path.join(runDir, 'apply_plan', 'p1b_dev_target_isolation_approval_receipt.json'))),
  ];
  const exactApprovalReceiptsPresent = approvalReceiptCandidates.filter((receiptPath) => fs.existsSync(path.resolve(repoRoot, receiptPath))).length;
  if (exactApprovalReceiptsPresent > 0) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_approval_receipt_present',
      message: 'P1B approval receipt is present, but this turn is preflight-only.',
    });
  }
  const requiredApprovalText = String(approvalPolicy.requiredApprovalText || '');
  const rejectedImplicitCommands = arr<string>(approvalPolicy.rejectedImplicitCommands).filter((entry) => typeof entry === 'string');
  if (!requiredApprovalText.includes('P1B dev target isolation packet') || !rejectedImplicitCommands.includes('дальше')) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_approval_policy_incomplete',
      message: 'P1B preflight approval policy must require exact P1B text and reject implicit continuation commands.',
      filePath: path.relative(repoRoot, nextSlicePath),
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
  const existingFiles = files.filter((file) => file.exists).length;
  const missingFiles = files.length - existingFiles;
  const dirtyOverlapsPlanned = files.filter((file) => file.plannedDirtyOverlap).length;
  const dirtyOverlapsObserved = files.filter((file) => file.observedDirtyWorktree).length;
  const freshReadRequiredFiles = files.filter((file) => file.requiresFreshReadBeforeEdit).length;
  const preflightPassed =
    blockers === 0 &&
    files.length === 4 &&
    existingFiles === 4 &&
    missingFiles === 0 &&
    dirtyOverlapsPlanned === 1 &&
    dirtyOverlapsObserved === 1 &&
    freshReadRequiredFiles === 1 &&
    exactApprovalReceiptsPresent === 0 &&
    productionFilesStillAbsent;

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-preflight-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      postP1ANextSliceAudit: path.relative(repoRoot, nextSlicePath),
      postP1AReadinessProjectionAudit: path.relative(repoRoot, projectionPath),
      p1ExecutionSliceAudit: path.relative(repoRoot, p1SlicePath),
    },
    summary: {
      p1bFiles: files.length,
      existingFiles,
      missingFiles,
      dirtyOverlapsPlanned,
      dirtyOverlapsObserved,
      freshReadRequiredFiles,
      exactApprovalReceiptCandidates: approvalReceiptCandidates.length,
      exactApprovalReceiptsPresent,
      blockers,
      warnings,
      preflightPassed,
      p1bPreflightReadyAfterP1AAndExactApproval: preflightPassed,
      requiresP1ACompletion: true,
      requiresExactP1BApproval: true,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent,
    },
    approvalGate: {
      requiredApprovalText,
      approvalReceiptCandidates,
      rejectedImplicitCommands,
    },
    files,
    findings,
    notes: [
      'This audit is read-only preflight for the future P1B slice.',
      'P1B cannot start until P1A is completed and an exact P1B approval receipt exists.',
      'The observed dirty overlap is app/(tabs)/settings.tsx; it must be freshly re-read before any future approved edit.',
      'French generation remains blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_preflight_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_preflight_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1B preflight audit: ${audit.status}`);
  console.log(`P1B files: ${audit.summary.p1bFiles}`);
  console.log(`Existing files: ${audit.summary.existingFiles}`);
  console.log(`Dirty overlaps planned: ${audit.summary.dirtyOverlapsPlanned}`);
  console.log(`Dirty overlaps observed: ${audit.summary.dirtyOverlapsObserved}`);
  console.log(`Fresh-read required files: ${audit.summary.freshReadRequiredFiles}`);
  console.log(`Exact approval receipts present: ${audit.summary.exactApprovalReceiptsPresent}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
