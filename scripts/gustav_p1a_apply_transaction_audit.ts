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

type TransactionStep = {
  id: string;
  phase: 'precondition' | 'copy' | 'hash_verify' | 'test' | 'post_apply_guard' | 'rollback';
  action: string;
  sourcePath?: string;
  targetPath?: string;
  expectedSha256?: string;
  command?: string;
  writesProductionFile: boolean;
  requiredBeforeNext: boolean;
};

type Audit = {
  schemaVersion: 'gustav-p1a-apply-transaction-audit-v0';
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
    p1aBlueprintHashLockAudit: string;
    p1aPostApplyGuard: string;
    p1aRollbackCheckpoint: string;
  };
  summary: {
    transactionSteps: number;
    preconditionSteps: number;
    copySteps: number;
    hashVerifySteps: number;
    testSteps: number;
    postApplyGuardSteps: number;
    rollbackSteps: number;
    allowedWriteFiles: number;
    futureProductionWriteSteps: number;
    forbiddenWriteZones: number;
    exactHashChecks: number;
    targetFilesAbsent: number;
    targetFilesPresent: number;
    blockers: number;
    warnings: number;
    transactionReadyAfterExactApproval: boolean;
    exactApprovalReceiptRequired: boolean;
    approvalStillMissing: boolean;
    dryRunOnly: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  transactionMode: 'dry_run_plan_only';
  allowedWriteFiles: string[];
  forbiddenWriteZones: string[];
  transactionSteps: TransactionStep[];
  applyInvariants: string[];
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

function arr<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Apply Transaction Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Transaction steps: ${audit.summary.transactionSteps}`,
    `- Precondition steps: ${audit.summary.preconditionSteps}`,
    `- Copy steps: ${audit.summary.copySteps}`,
    `- Hash verify steps: ${audit.summary.hashVerifySteps}`,
    `- Test steps: ${audit.summary.testSteps}`,
    `- Post-apply guard steps: ${audit.summary.postApplyGuardSteps}`,
    `- Rollback steps: ${audit.summary.rollbackSteps}`,
    `- Allowed write files: ${audit.summary.allowedWriteFiles}`,
    `- Future production write steps: ${audit.summary.futureProductionWriteSteps}`,
    `- Forbidden write zones: ${audit.summary.forbiddenWriteZones}`,
    `- Exact hash checks: ${audit.summary.exactHashChecks}`,
    `- Target files absent: ${audit.summary.targetFilesAbsent}`,
    `- Target files present: ${audit.summary.targetFilesPresent}`,
    `- Transaction ready after exact approval: ${audit.summary.transactionReadyAfterExactApproval ? 'yes' : 'no'}`,
    `- Exact approval receipt required: ${audit.summary.exactApprovalReceiptRequired ? 'yes' : 'no'}`,
    `- Approval still missing: ${audit.summary.approvalStillMissing ? 'yes' : 'no'}`,
    `- Dry-run only: ${audit.summary.dryRunOnly ? 'yes' : 'no'}`,
    `- Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Allowed Write Files',
    '',
  ];

  for (const file of audit.allowedWriteFiles) lines.push(`- \`${file}\``);

  lines.push('', '## Transaction Steps', '');
  for (const step of audit.transactionSteps) {
    lines.push(`### ${step.id}`);
    lines.push('');
    lines.push(`- Phase: \`${step.phase}\``);
    lines.push(`- Action: ${step.action}`);
    if (step.sourcePath) lines.push(`- Source: \`${step.sourcePath}\``);
    if (step.targetPath) lines.push(`- Target: \`${step.targetPath}\``);
    if (step.expectedSha256) lines.push(`- Expected SHA-256: \`${step.expectedSha256}\``);
    if (step.command) lines.push(`- Command: \`${step.command}\``);
    lines.push(`- Writes production file: ${step.writesProductionFile ? 'yes' : 'no'}`);
    lines.push(`- Required before next: ${step.requiredBeforeNext ? 'yes' : 'no'}`);
    lines.push('');
  }

  lines.push('## Apply Invariants', '');
  for (const invariant of audit.applyInvariants) lines.push(`- ${invariant}`);

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
    console.error('Usage: npx tsx scripts/gustav_p1a_apply_transaction_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const approvalLockPath = path.join(runDir, 'audits', 'p1a_approval_lock_audit.json');
  const hashLockPath = path.join(runDir, 'audits', 'p1a_blueprint_hash_lock_audit.json');
  const postApplyGuardPath = path.join(runDir, 'audits', 'p1a_post_apply_guard.json');
  const rollbackPath = path.join(runDir, 'apply_plan', 'p1a_rollback_checkpoint.json');
  const packet = readJson<Record<string, unknown>>(packetPath);
  const approvalLock = readJson<Record<string, unknown>>(approvalLockPath);
  const hashLock = readJson<Record<string, unknown>>(hashLockPath);
  const postApplyGuard = readJson<Record<string, unknown>>(postApplyGuardPath);
  const rollback = readJson<Record<string, unknown>>(rollbackPath);
  const findings: Finding[] = [];

  const packetSummary = object(packet.summary);
  const approvalSummary = object(approvalLock.summary);
  const hashSummary = object(hashLock.summary);
  const guardSummary = object(postApplyGuard.summary);
  const rollbackSummary = object(rollback.summary);
  if (packet.status !== 'PASS' || packetSummary.readyForApproval !== true || packetSummary.mayModifyProductionAppFiles !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_packet_not_ready',
      message: 'P1A minimal apply packet must be PASS and still locked before transaction planning.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (approvalLock.status !== 'PASS' || approvalSummary.exactApprovalRequired !== true || approvalSummary.approvalStatusLocked !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_approval_lock_not_ready',
      message: 'P1A approval lock must be PASS and locked before transaction planning.',
      filePath: path.relative(repoRoot, approvalLockPath),
    });
  }
  if (hashLock.status !== 'PASS' || hashSummary.hashLockReadyAfterExactApproval !== true || hashSummary.driftDetected !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_hash_lock_not_ready',
      message: 'P1A blueprint hash lock must be PASS with no drift before transaction planning.',
      filePath: path.relative(repoRoot, hashLockPath),
    });
  }
  if (postApplyGuard.status !== 'PASS' || guardSummary.guardReadyAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_post_apply_guard_not_ready',
      message: 'P1A post-apply guard must be PASS before transaction planning.',
      filePath: path.relative(repoRoot, postApplyGuardPath),
    });
  }
  if (rollback.status !== 'PASS' || rollbackSummary.checkpointReadyAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_rollback_not_ready',
      message: 'P1A rollback checkpoint must be PASS before transaction planning.',
      filePath: path.relative(repoRoot, rollbackPath),
    });
  }

  const lockedFiles = arr<Record<string, unknown>>(hashLock.lockedFiles);
  const allowedWriteFiles = arr<string>(postApplyGuard.allowedFiles).map(String);
  const forbiddenWriteZones = arr<string>(postApplyGuard.forbiddenWriteZones).map(String);
  const guardCommands = arr<Record<string, unknown>>(postApplyGuard.commands);
  const packetCommands = arr<Record<string, unknown>>(packet.commands);
  const rollbackSnapshots = arr<Record<string, unknown>>(rollback.snapshots);
  const targetFilesPresent = lockedFiles.filter((file) => fs.existsSync(path.join(repoRoot, str(file.targetPath)))).length;
  const targetFilesAbsent = lockedFiles.length - targetFilesPresent;
  if (targetFilesPresent > 0) {
    findings.push({
      severity: 'blocker',
      code: 'target_files_present_before_approval',
      message: `${targetFilesPresent} P1A target file(s) exist before approval; transaction must not overwrite them.`,
    });
  }
  for (const file of lockedFiles) {
    if (!allowedWriteFiles.includes(str(file.targetPath))) {
      findings.push({
        severity: 'blocker',
        code: 'locked_file_not_allowed',
        message: `Locked file is not allowed by the post-apply guard: ${str(file.targetPath)}`,
        filePath: path.relative(repoRoot, postApplyGuardPath),
      });
    }
  }

  const transactionSteps: TransactionStep[] = [
    {
      id: 'P1A-TXN-PRE-001',
      phase: 'precondition',
      action: 'Require exact P1A approval receipt before any file write.',
      command: 'Validate p1a_approval_receipt.json against requiredApprovalText.',
      writesProductionFile: false,
      requiredBeforeNext: true,
    },
    {
      id: 'P1A-TXN-PRE-002',
      phase: 'precondition',
      action: 'Recheck target files are absent and hash lock has no drift.',
      command: 'Run p1a_blueprint_hash_lock_audit before apply.',
      writesProductionFile: false,
      requiredBeforeNext: true,
    },
    {
      id: 'P1A-TXN-PRE-003',
      phase: 'precondition',
      action: 'Confirm the broad 83-file apply plan is still closed.',
      command: 'Read p1a_minimal_apply_packet.json and reject broad apply escalation.',
      writesProductionFile: false,
      requiredBeforeNext: true,
    },
  ];

  for (const file of lockedFiles) {
    transactionSteps.push({
      id: `P1A-TXN-COPY-${String(transactionSteps.filter((step) => step.phase === 'copy').length + 1).padStart(3, '0')}`,
      phase: 'copy',
      action: 'Future approved apply copies this blueprint file byte-for-byte to its target path.',
      sourcePath: str(file.blueprintPath),
      targetPath: str(file.targetPath),
      expectedSha256: str(file.sha256),
      writesProductionFile: true,
      requiredBeforeNext: true,
    });
  }
  for (const file of lockedFiles) {
    transactionSteps.push({
      id: `P1A-TXN-HASH-${String(transactionSteps.filter((step) => step.phase === 'hash_verify').length + 1).padStart(3, '0')}`,
      phase: 'hash_verify',
      action: 'Verify target file SHA-256 equals the locked blueprint hash after copy.',
      targetPath: str(file.targetPath),
      expectedSha256: str(file.sha256),
      writesProductionFile: false,
      requiredBeforeNext: true,
    });
  }
  for (const command of packetCommands) {
    transactionSteps.push({
      id: `P1A-TXN-TEST-${String(transactionSteps.filter((step) => step.phase === 'test').length + 1).padStart(3, '0')}`,
      phase: 'test',
      action: `Run ${str(command.id)} after exact-copy and hash verification.`,
      command: str(command.command),
      writesProductionFile: false,
      requiredBeforeNext: true,
    });
  }
  for (const command of guardCommands) {
    transactionSteps.push({
      id: `P1A-TXN-GUARD-${String(transactionSteps.filter((step) => step.phase === 'post_apply_guard').length + 1).padStart(3, '0')}`,
      phase: 'post_apply_guard',
      action: `Run post-apply guard command ${str(command.id)}.`,
      command: str(command.command),
      writesProductionFile: false,
      requiredBeforeNext: true,
    });
  }
  for (const snapshot of rollbackSnapshots) {
    transactionSteps.push({
      id: `P1A-TXN-ROLLBACK-${String(transactionSteps.filter((step) => step.phase === 'rollback').length + 1).padStart(3, '0')}`,
      phase: 'rollback',
      action: 'If transaction fails after copy, delete only this newly created file.',
      targetPath: str(snapshot.filePath),
      command: `delete_if_created_by_p1a ${str(snapshot.filePath)}`,
      writesProductionFile: false,
      requiredBeforeNext: false,
    });
  }

  const exactApprovalMatches = typeof approvalSummary.exactApprovalMatches === 'number'
    ? approvalSummary.exactApprovalMatches
    : 0;
  const approvalStillMissing = exactApprovalMatches === 0;
  const dryRunOnly = true;
  const canApplyNow = false;
  const futureProductionWriteSteps = transactionSteps.filter((step) => step.writesProductionFile).length;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const transactionReadyAfterExactApproval =
    blockers === 0 &&
    approvalStillMissing &&
    lockedFiles.length === 4 &&
    targetFilesAbsent === 4 &&
    futureProductionWriteSteps === 4 &&
    allowedWriteFiles.length === 4 &&
    transactionSteps.filter((step) => step.phase === 'hash_verify').length === 4 &&
    transactionSteps.filter((step) => step.phase === 'rollback').length === 4;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-apply-transaction-audit-v0',
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
      p1aBlueprintHashLockAudit: path.relative(repoRoot, hashLockPath),
      p1aPostApplyGuard: path.relative(repoRoot, postApplyGuardPath),
      p1aRollbackCheckpoint: path.relative(repoRoot, rollbackPath),
    },
    summary: {
      transactionSteps: transactionSteps.length,
      preconditionSteps: transactionSteps.filter((step) => step.phase === 'precondition').length,
      copySteps: transactionSteps.filter((step) => step.phase === 'copy').length,
      hashVerifySteps: transactionSteps.filter((step) => step.phase === 'hash_verify').length,
      testSteps: transactionSteps.filter((step) => step.phase === 'test').length,
      postApplyGuardSteps: transactionSteps.filter((step) => step.phase === 'post_apply_guard').length,
      rollbackSteps: transactionSteps.filter((step) => step.phase === 'rollback').length,
      allowedWriteFiles: allowedWriteFiles.length,
      futureProductionWriteSteps,
      forbiddenWriteZones: forbiddenWriteZones.length,
      exactHashChecks: transactionSteps.filter((step) => step.phase === 'hash_verify' && step.expectedSha256).length,
      targetFilesAbsent,
      targetFilesPresent,
      blockers,
      warnings,
      transactionReadyAfterExactApproval,
      exactApprovalReceiptRequired: true,
      approvalStillMissing,
      dryRunOnly,
      canApplyNow,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    transactionMode: 'dry_run_plan_only',
    allowedWriteFiles,
    forbiddenWriteZones,
    transactionSteps,
    applyInvariants: [
      'No transaction step may run until the exact P1A approval receipt exists.',
      'The only future write targets are the four files in allowedWriteFiles.',
      'Each copied target must match the locked SHA-256 hash before tests run.',
      'If a copy or hash verification fails, rollback deletes only newly created P1A files.',
      'French generation remains blocked after P1A; this transaction only installs target-isolation primitives.',
    ],
    findings,
    notes: [
      'This audit is a transaction plan only; it does not copy files into app or tests.',
      'canApplyNow remains false because the exact P1A approval receipt is absent.',
      'The transaction is ready to be reconsidered only after exact approval and a fresh hash-lock recheck.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_apply_transaction_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_apply_transaction_audit.md');
  const applyMd = path.join(runDir, 'apply_plan', 'P1A_APPLY_TRANSACTION.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(applyMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A apply transaction audit: ${audit.status}`);
  console.log(`Transaction steps: ${audit.summary.transactionSteps}`);
  console.log(`Copy steps: ${audit.summary.copySteps}`);
  console.log(`Hash verify steps: ${audit.summary.hashVerifySteps}`);
  console.log(`Rollback steps: ${audit.summary.rollbackSteps}`);
  console.log(`Transaction ready after exact approval: ${audit.summary.transactionReadyAfterExactApproval ? 'yes' : 'no'}`);
  console.log(`Can apply now: ${audit.summary.canApplyNow ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
