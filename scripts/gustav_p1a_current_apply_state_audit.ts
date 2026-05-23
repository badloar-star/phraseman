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

type LockedFile = {
  targetPath: string;
  blueprintPath: string;
  sha256: string;
};

type FileState = {
  targetPath: string;
  blueprintPath: string;
  exists: boolean;
  expectedSha256: string;
  actualSha256: string | null;
  newlineStableSha256: string | null;
  exactHashMatch: boolean;
  newlineStableHashMatch: boolean;
  gitStatus: string;
  completionEligible: boolean;
};

type Audit = {
  schemaVersion: 'gustav-p1a-current-apply-state-audit-v0';
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
    p1aBlueprintHashLockAudit: string;
    p1aPostApplyGuard: string;
    p1bUnlockPrerequisiteMatrix: string;
  };
  summary: {
    p1aFiles: number;
    presentFiles: number;
    exactHashMatches: number;
    newlineStableHashMatches: number;
    driftedFiles: number;
    missingFiles: number;
    p1aGitStatusLines: number;
    unexpectedAppTestStatusLines: number;
    completionReceiptPresent: boolean;
    blockers: number;
    warnings: number;
    canWriteP1ACompletionReceipt: boolean;
    canStartP1BNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  completionReceiptPath: string;
  p1aGitStatus: string[];
  unexpectedAppTestStatus: string[];
  files: FileState[];
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

function sha256(buffer: Buffer | string): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeNewlines(source: Buffer): string {
  return source.toString('utf8').replace(/\r\n/g, '\n');
}

function gitStatus(repoRoot: string, files: string[]): string[] {
  const result = childProcess.spawnSync('git', ['status', '--short', '--', ...files], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return (result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function statusForPath(statusLines: string[], filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  return statusLines.find((line) => line.replace(/\\/g, '/').endsWith(normalized)) || 'clean';
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Current Apply State Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- P1A files: ${audit.summary.p1aFiles}`,
    `- Present files: ${audit.summary.presentFiles}`,
    `- Exact hash matches: ${audit.summary.exactHashMatches}`,
    `- Newline-stable hash matches: ${audit.summary.newlineStableHashMatches}`,
    `- Drifted files: ${audit.summary.driftedFiles}`,
    `- Missing files: ${audit.summary.missingFiles}`,
    `- P1A git status lines: ${audit.summary.p1aGitStatusLines}`,
    `- Unexpected app/test status lines: ${audit.summary.unexpectedAppTestStatusLines}`,
    `- Completion receipt present: ${audit.summary.completionReceiptPresent ? 'yes' : 'no'}`,
    `- Can write P1A completion receipt: ${audit.summary.canWriteP1ACompletionReceipt ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## P1A Files',
    '',
    ...audit.files.map((file) => [
      `### ${file.targetPath}`,
      '',
      `- Exists: ${file.exists ? 'yes' : 'no'}`,
      `- Git status: \`${file.gitStatus}\``,
      `- Expected SHA-256: \`${file.expectedSha256}\``,
      `- Actual SHA-256: \`${file.actualSha256 || 'missing'}\``,
      `- Newline-stable SHA-256: \`${file.newlineStableSha256 || 'missing'}\``,
      `- Exact hash match: ${file.exactHashMatch ? 'yes' : 'no'}`,
      `- Newline-stable hash match: ${file.newlineStableHashMatch ? 'yes' : 'no'}`,
      `- Completion eligible: ${file.completionEligible ? 'yes' : 'no'}`,
      '',
    ].join('\n')),
    '## Unexpected App/Test Status',
    '',
    ...(audit.unexpectedAppTestStatus.length > 0
      ? audit.unexpectedAppTestStatus.map((line) => `- \`${line}\``)
      : ['No unexpected app/test status lines.']),
    '',
    '## Findings',
    '',
    ...(audit.findings.length > 0
      ? audit.findings.map((finding) => `- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.filePath ? ` (${finding.filePath})` : ''}`)
      : ['No findings.']),
    '',
    '## Notes',
    '',
    ...audit.notes.map((note) => `- ${note}`),
    '',
  ];
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_p1a_current_apply_state_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const p1aMinimalApplyPacket = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const p1aBlueprintHashLockAudit = path.join(runDir, 'audits', 'p1a_blueprint_hash_lock_audit.json');
  const p1aPostApplyGuard = path.join(runDir, 'audits', 'p1a_post_apply_guard.json');
  const p1bUnlockPrerequisiteMatrix = path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix_audit.json');
  const completionReceiptPath = path.join('docs/gustav/runs', runId, 'apply_plan/p1a_apply_completion_receipt.json');

  const hashLock = readJson<{ lockedFiles: LockedFile[] }>(p1aBlueprintHashLockAudit);
  const lockedFiles = hashLock.lockedFiles || [];
  const p1aPaths = lockedFiles.map((file) => file.targetPath);
  const p1aGitStatus = gitStatus(repoRoot, p1aPaths);
  const appTestStatus = gitStatus(repoRoot, ['app', 'tests', 'components', 'hooks', 'constants']);
  const allowed = new Set(p1aPaths.map((file) => file.replace(/\\/g, '/')));
  const unexpectedAppTestStatus = appTestStatus.filter((line) => {
    const normalized = line.replace(/\\/g, '/');
    return !Array.from(allowed).some((filePath) => normalized.endsWith(filePath));
  });

  const findings: Finding[] = [];
  const files: FileState[] = lockedFiles.map((file) => {
    const absoluteTarget = path.join(repoRoot, file.targetPath);
    const exists = fs.existsSync(absoluteTarget);
    const buffer = exists ? fs.readFileSync(absoluteTarget) : null;
    const actualSha256 = buffer ? sha256(buffer) : null;
    const newlineStableSha256 = buffer ? sha256(normalizeNewlines(buffer)) : null;
    const exactHashMatch = actualSha256 === file.sha256;
    const newlineStableHashMatch = newlineStableSha256 === file.sha256;
    const completionEligible = exists && (exactHashMatch || newlineStableHashMatch);
    if (!exists) {
      findings.push({
        severity: 'blocker',
        code: 'p1a_target_file_missing',
        message: `P1A target file is missing: ${file.targetPath}`,
        filePath: file.targetPath,
      });
    } else if (!completionEligible) {
      findings.push({
        severity: 'blocker',
        code: 'p1a_target_hash_drift',
        message: `P1A target file does not match the locked blueprint hash: ${file.targetPath}`,
        filePath: file.targetPath,
      });
    }
    return {
      targetPath: file.targetPath,
      blueprintPath: file.blueprintPath,
      exists,
      expectedSha256: file.sha256,
      actualSha256,
      newlineStableSha256,
      exactHashMatch,
      newlineStableHashMatch,
      gitStatus: statusForPath(p1aGitStatus, file.targetPath),
      completionEligible,
    };
  });

  if (unexpectedAppTestStatus.length > 0) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_guard_unexpected_app_test_status',
      message: `P1A post-apply guard cannot close while ${unexpectedAppTestStatus.length} non-P1A app/test/component status line(s) are present.`,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const presentFiles = files.filter((file) => file.exists).length;
  const exactHashMatches = files.filter((file) => file.exactHashMatch).length;
  const newlineStableHashMatches = files.filter((file) => file.newlineStableHashMatch).length;
  const driftedFiles = files.filter((file) => file.exists && !file.completionEligible).length;
  const missingFiles = files.filter((file) => !file.exists).length;
  const completionReceiptPresent = fs.existsSync(path.join(repoRoot, completionReceiptPath));
  const canWriteP1ACompletionReceipt = blockers === 0 && files.length === 4 && files.every((file) => file.completionEligible);

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-current-apply-state-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'HOLD' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aMinimalApplyPacket: path.relative(repoRoot, p1aMinimalApplyPacket),
      p1aBlueprintHashLockAudit: path.relative(repoRoot, p1aBlueprintHashLockAudit),
      p1aPostApplyGuard: path.relative(repoRoot, p1aPostApplyGuard),
      p1bUnlockPrerequisiteMatrix: path.relative(repoRoot, p1bUnlockPrerequisiteMatrix),
    },
    summary: {
      p1aFiles: files.length,
      presentFiles,
      exactHashMatches,
      newlineStableHashMatches,
      driftedFiles,
      missingFiles,
      p1aGitStatusLines: p1aGitStatus.length,
      unexpectedAppTestStatusLines: unexpectedAppTestStatus.length,
      completionReceiptPresent,
      blockers,
      warnings,
      canWriteP1ACompletionReceipt,
      canStartP1BNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    completionReceiptPath,
    p1aGitStatus,
    unexpectedAppTestStatus,
    files,
    findings,
    notes: [
      'This audit is read-only and does not create a P1A completion receipt.',
      'A P1A completion receipt is allowed only when every target file matches the locked P1A blueprint and the post-apply guard has no unexpected app/test/component status lines.',
      'Current drift must be resolved by a new explicit approval path or by a fresh architecture packet; this audit does not revert user-owned work.',
      'French generation and P1B writes remain blocked.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_current_apply_state_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_current_apply_state_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A current apply state audit: ${audit.status}`);
  console.log(`P1A files: ${audit.summary.p1aFiles}`);
  console.log(`Present files: ${audit.summary.presentFiles}`);
  console.log(`Drifted files: ${audit.summary.driftedFiles}`);
  console.log(`Unexpected app/test status lines: ${audit.summary.unexpectedAppTestStatusLines}`);
  console.log(`Can write P1A completion receipt: ${audit.summary.canWriteP1ACompletionReceipt ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
}

void main();
