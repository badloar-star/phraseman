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

type Snapshot = {
  filePath: string;
  expectedAction: 'add';
  existsNow: boolean;
  parentDirExists: boolean;
  sizeBytes: number | null;
  sha256: string | null;
  rollbackAction: 'delete_if_created_by_p1a' | 'manual_review_required';
  rollbackNote: string;
};

type Audit = {
  schemaVersion: 'gustav-p1a-rollback-checkpoint-v0';
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
    p1aPostApplyGuard: string;
  };
  summary: {
    files: number;
    absentFiles: number;
    existingFiles: number;
    parentDirsReady: number;
    snapshots: number;
    contentHashes: number;
    rollbackActions: number;
    blockers: number;
    warnings: number;
    checkpointReadyAfterApproval: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  snapshots: Snapshot[];
  rollbackPolicy: {
    mode: 'additive_files_only';
    safeRollback: string[];
    manualReviewRequiredWhen: string[];
  };
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

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Rollback Checkpoint',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Files: ${audit.summary.files}`,
    `- Absent files: ${audit.summary.absentFiles}`,
    `- Existing files: ${audit.summary.existingFiles}`,
    `- Parent dirs ready: ${audit.summary.parentDirsReady}`,
    `- Snapshots: ${audit.summary.snapshots}`,
    `- Content hashes: ${audit.summary.contentHashes}`,
    `- Rollback actions: ${audit.summary.rollbackActions}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- Checkpoint ready after approval: ${audit.summary.checkpointReadyAfterApproval ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Snapshots',
    '',
  ];

  for (const snapshot of audit.snapshots) {
    lines.push(`### ${snapshot.filePath}`);
    lines.push('');
    lines.push(`- Expected action: \`${snapshot.expectedAction}\``);
    lines.push(`- Exists now: ${snapshot.existsNow ? 'yes' : 'no'}`);
    lines.push(`- Parent dir exists: ${snapshot.parentDirExists ? 'yes' : 'no'}`);
    lines.push(`- Size bytes: ${snapshot.sizeBytes === null ? '`null`' : snapshot.sizeBytes}`);
    lines.push(`- SHA-256: ${snapshot.sha256 === null ? '`null`' : `\`${snapshot.sha256}\``}`);
    lines.push(`- Rollback action: \`${snapshot.rollbackAction}\``);
    lines.push(`- Rollback note: ${snapshot.rollbackNote}`);
    lines.push('');
  }

  lines.push('## Rollback Policy', '');
  lines.push(`Mode: \`${audit.rollbackPolicy.mode}\``);
  lines.push('', 'Safe rollback:');
  for (const item of audit.rollbackPolicy.safeRollback) lines.push(`- ${item}`);
  lines.push('', 'Manual review required when:');
  for (const item of audit.rollbackPolicy.manualReviewRequiredWhen) lines.push(`- ${item}`);

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
    console.error('Usage: npx tsx scripts/gustav_p1a_rollback_checkpoint.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const postApplyGuardPath = path.join(runDir, 'audits', 'p1a_post_apply_guard.json');
  const packet = readJson<Record<string, unknown>>(packetPath);
  const guard = readJson<Record<string, unknown>>(postApplyGuardPath);
  const findings: Finding[] = [];

  const packetSummary = object(packet.summary);
  const guardSummary = object(guard.summary);
  const allowedFiles = arr<Record<string, unknown>>(packet.files).map((file) => str(file.path)).filter(Boolean).sort();

  if (packet.status !== 'PASS' || packetSummary.readyForApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_packet_not_ready',
      message: 'P1A minimal apply packet must be PASS and ready for approval before rollback checkpoint.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (guard.status !== 'PASS' || guardSummary.guardReadyAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_post_apply_guard_not_ready',
      message: 'P1A post-apply guard must be PASS before rollback checkpoint.',
      filePath: path.relative(repoRoot, postApplyGuardPath),
    });
  }
  if (allowedFiles.length !== 4) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_allowed_files_invalid',
      message: `Expected exactly 4 P1A files, found ${allowedFiles.length}.`,
      filePath: path.relative(repoRoot, packetPath),
    });
  }

  const snapshots: Snapshot[] = allowedFiles.map((filePath) => {
    const absolute = path.join(repoRoot, filePath);
    const existsNow = fs.existsSync(absolute);
    const parentDirExists = fs.existsSync(path.dirname(absolute));
    const sizeBytes = existsNow ? fs.statSync(absolute).size : null;
    const hash = existsNow ? sha256(absolute) : null;
    if (!parentDirExists) {
      findings.push({
        severity: 'blocker',
        code: 'p1a_parent_dir_missing',
        message: 'Parent directory is missing before P1A.',
        filePath,
      });
    }
    if (existsNow) {
      findings.push({
        severity: 'blocker',
        code: 'p1a_file_already_exists_before_apply',
        message: 'P1A is an additive packet, so this file must not exist before approved apply.',
        filePath,
      });
    }
    return {
      filePath,
      expectedAction: 'add',
      existsNow,
      parentDirExists,
      sizeBytes,
      sha256: hash,
      rollbackAction: existsNow ? 'manual_review_required' : 'delete_if_created_by_p1a',
      rollbackNote: existsNow
        ? 'File existed before P1A; do not delete automatically.'
        : 'If approved P1A creates this file and rollback is needed, remove this newly created file only.',
    };
  });

  const absentFiles = snapshots.filter((snapshot) => !snapshot.existsNow).length;
  const existingFiles = snapshots.filter((snapshot) => snapshot.existsNow).length;
  const parentDirsReady = snapshots.filter((snapshot) => snapshot.parentDirExists).length;
  const contentHashes = snapshots.filter((snapshot) => snapshot.sha256 !== null).length;
  const rollbackActions = snapshots.filter((snapshot) => snapshot.rollbackAction === 'delete_if_created_by_p1a').length;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const checkpointReadyAfterApproval =
    blockers === 0 &&
    snapshots.length === 4 &&
    absentFiles === 4 &&
    existingFiles === 0 &&
    parentDirsReady === 4 &&
    rollbackActions === 4 &&
    contentHashes === 0;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-rollback-checkpoint-v0',
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
      p1aPostApplyGuard: path.relative(repoRoot, postApplyGuardPath),
    },
    summary: {
      files: snapshots.length,
      absentFiles,
      existingFiles,
      parentDirsReady,
      snapshots: snapshots.length,
      contentHashes,
      rollbackActions,
      blockers,
      warnings,
      checkpointReadyAfterApproval,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    snapshots,
    rollbackPolicy: {
      mode: 'additive_files_only',
      safeRollback: [
        'Rollback may remove only files that were absent in this checkpoint and created by the approved P1A slice.',
        'Rollback must not delete or modify any pre-existing user/app file.',
        'Rollback must keep French generation artifacts absent.',
      ],
      manualReviewRequiredWhen: [
        'Any P1A packet file existed before apply.',
        'Any file outside the four-file packet changed during P1A.',
        'Any content, cloud, lesson, quiz, source graph or generated artifact was created.',
      ],
    },
    findings,
    notes: [
      'This checkpoint records pre-apply file state only; it does not modify files.',
      'All P1A files are currently absent, so rollback after approved P1A is delete-new-files-only.',
      'If this checkpoint changes before approval, regenerate it before touching app files.',
      'French generation and broad production apply remain blocked.',
    ],
  };

  const outJson = path.join(runDir, 'apply_plan', 'p1a_rollback_checkpoint.json');
  const outMd = path.join(runDir, 'apply_plan', 'P1A_ROLLBACK_CHECKPOINT.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A rollback checkpoint: ${audit.status}`);
  console.log(`Files: ${audit.summary.files}`);
  console.log(`Absent files: ${audit.summary.absentFiles}`);
  console.log(`Existing files: ${audit.summary.existingFiles}`);
  console.log(`Rollback actions: ${audit.summary.rollbackActions}`);
  console.log(`Checkpoint ready after approval: ${audit.summary.checkpointReadyAfterApproval ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
