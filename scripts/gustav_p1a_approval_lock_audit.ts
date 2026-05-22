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

type ApprovalReceiptProbe = {
  filePath: string;
  exists: boolean;
  status: 'absent' | 'present' | 'invalid_json';
  exactTextMatches: boolean;
};

type Audit = {
  schemaVersion: 'gustav-p1a-approval-lock-audit-v0';
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
    p1aRollbackCheckpoint: string;
    p1aImportContractAudit: string;
  };
  summary: {
    approvalReceiptCandidates: number;
    approvalReceiptsPresent: number;
    exactApprovalMatches: number;
    rejectedImplicitCommands: number;
    requiredApprovalTextLength: number;
    blockers: number;
    warnings: number;
    packetReadyForApproval: boolean;
    approvalStatusLocked: boolean;
    exactApprovalRequired: boolean;
    implicitApprovalRejected: boolean;
    accidentalApplyBlocked: boolean;
    unlockPossibleAfterExactReceipt: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  approvalGate: {
    lockState: 'locked_until_exact_receipt';
    requiredApprovalText: string;
    approvalReceiptPaths: string[];
    acceptedReceiptShape: {
      schemaVersion: 'gustav-p1a-approval-receipt-v0';
      runId: string;
      approvedPacket: string;
      approvalText: string;
      approvedAt: 'ISO-8601 timestamp';
    };
    rejectedImplicitCommands: string[];
  };
  receiptProbes: ApprovalReceiptProbe[];
  findings: Finding[];
  notes: string[];
};

const REJECTED_IMPLICIT_COMMANDS = [
  'дальше',
  'давай',
  'работа',
  'продолжай',
  'ок',
  'yes',
  'go',
  'approve',
  'approved',
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

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Approval Lock Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Approval receipt candidates: ${audit.summary.approvalReceiptCandidates}`,
    `- Approval receipts present: ${audit.summary.approvalReceiptsPresent}`,
    `- Exact approval matches: ${audit.summary.exactApprovalMatches}`,
    `- Rejected implicit commands: ${audit.summary.rejectedImplicitCommands}`,
    `- Required approval text length: ${audit.summary.requiredApprovalTextLength}`,
    `- Packet ready for approval: ${audit.summary.packetReadyForApproval ? 'yes' : 'no'}`,
    `- Approval status locked: ${audit.summary.approvalStatusLocked ? 'yes' : 'no'}`,
    `- Exact approval required: ${audit.summary.exactApprovalRequired ? 'yes' : 'no'}`,
    `- Implicit approval rejected: ${audit.summary.implicitApprovalRejected ? 'yes' : 'no'}`,
    `- Accidental apply blocked: ${audit.summary.accidentalApplyBlocked ? 'yes' : 'no'}`,
    `- Unlock possible after exact receipt: ${audit.summary.unlockPossibleAfterExactReceipt ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Required Approval Text',
    '',
    '```text',
    audit.approvalGate.requiredApprovalText,
    '```',
    '',
    '## Rejected Implicit Commands',
    '',
  ];

  for (const command of audit.approvalGate.rejectedImplicitCommands) lines.push(`- \`${command}\``);

  lines.push('', '## Receipt Probes', '');
  for (const probe of audit.receiptProbes) {
    lines.push(`- \`${probe.filePath}\`: ${probe.status}, exact match ${probe.exactTextMatches ? 'yes' : 'no'}`);
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
    console.error('Usage: npx tsx scripts/gustav_p1a_approval_lock_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const packetPath = path.join(runDir, 'apply_plan', 'p1a_minimal_apply_packet.json');
  const guardPath = path.join(runDir, 'audits', 'p1a_post_apply_guard.json');
  const rollbackPath = path.join(runDir, 'apply_plan', 'p1a_rollback_checkpoint.json');
  const importContractPath = path.join(runDir, 'audits', 'p1a_import_contract_audit.json');
  const packet = readJson<Record<string, unknown>>(packetPath);
  const guard = readJson<Record<string, unknown>>(guardPath);
  const rollback = readJson<Record<string, unknown>>(rollbackPath);
  const importContract = readJson<Record<string, unknown>>(importContractPath);
  const findings: Finding[] = [];

  const packetSummary = object(packet.summary);
  const requiredApprovalText = str(packet.requiredApprovalText);
  const packetReadyForApproval =
    packet.status === 'PASS' &&
    packet.approvalStatus === 'not_requested' &&
    packetSummary.readyForApproval === true &&
    packetSummary.mayModifyProductionAppFiles === false;
  if (!packetReadyForApproval) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_packet_not_locked_for_approval',
      message: 'P1A minimal apply packet must be PASS, not_requested and mayModifyProductionAppFiles=false before approval lock is trusted.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (!requiredApprovalText.includes(runId) || !requiredApprovalText.includes(path.relative(repoRoot, packetPath))) {
    findings.push({
      severity: 'blocker',
      code: 'required_approval_text_not_specific',
      message: 'Required approval text must name the run id and exact P1A packet path.',
      filePath: path.relative(repoRoot, packetPath),
    });
  }
  if (guard.status !== 'PASS' || object(guard.summary).guardReadyAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'post_apply_guard_not_ready',
      message: 'P1A post-apply guard must be PASS before approval lock can allow a future unlock.',
      filePath: path.relative(repoRoot, guardPath),
    });
  }
  if (rollback.status !== 'PASS' || object(rollback.summary).checkpointReadyAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'rollback_checkpoint_not_ready',
      message: 'P1A rollback checkpoint must be PASS before approval lock can allow a future unlock.',
      filePath: path.relative(repoRoot, rollbackPath),
    });
  }
  if (importContract.status !== 'PASS' || object(importContract.summary).importSafeAfterApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'import_contract_not_ready',
      message: 'P1A import contract must be PASS before approval lock can allow a future unlock.',
      filePath: path.relative(repoRoot, importContractPath),
    });
  }

  const approvalReceiptPaths = [
    'apply_plan/p1a_approval_receipt.json',
    'apply_plan/p1a_approval_receipt.md',
    'apply_plan/p1a_apply_approval.json',
  ];
  const receiptProbes: ApprovalReceiptProbe[] = approvalReceiptPaths.map((relativePath) => {
    const filePath = path.join(runDir, relativePath);
    const exists = fs.existsSync(filePath);
    if (!exists) {
      return {
        filePath: path.relative(repoRoot, filePath),
        exists,
        status: 'absent',
        exactTextMatches: false,
      };
    }
    const parsed = safeReadJson<Record<string, unknown>>(filePath);
    const approvalText = parsed ? str(parsed.approvalText) : fs.readFileSync(filePath, 'utf8').trim();
    return {
      filePath: path.relative(repoRoot, filePath),
      exists,
      status: parsed || filePath.endsWith('.md') ? 'present' : 'invalid_json',
      exactTextMatches: approvalText === requiredApprovalText,
    };
  });

  const approvalReceiptsPresent = receiptProbes.filter((probe) => probe.exists).length;
  const exactApprovalMatches = receiptProbes.filter((probe) => probe.exactTextMatches).length;
  if (approvalReceiptsPresent > 0 && exactApprovalMatches === 0) {
    findings.push({
      severity: 'blocker',
      code: 'approval_receipt_present_but_not_exact',
      message: 'A P1A approval receipt exists but does not match the exact required approval text.',
    });
  }
  if (exactApprovalMatches > 0) {
    findings.push({
      severity: 'warning',
      code: 'approval_receipt_detected',
      message: 'An exact P1A approval receipt exists; this audit should be rerun in unlock/apply review mode before touching files.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const approvalStatusLocked = packet.approvalStatus === 'not_requested' && exactApprovalMatches === 0;
  const implicitApprovalRejected = REJECTED_IMPLICIT_COMMANDS.every((command) => command !== requiredApprovalText);
  const accidentalApplyBlocked =
    approvalStatusLocked &&
    exactApprovalMatches === 0 &&
    packetSummary.mayModifyProductionAppFiles === false;
  const unlockPossibleAfterExactReceipt =
    blockers === 0 &&
    requiredApprovalText.length > 80 &&
    packetReadyForApproval &&
    guard.status === 'PASS' &&
    rollback.status === 'PASS' &&
    importContract.status === 'PASS';

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-approval-lock-audit-v0',
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
      p1aPostApplyGuard: path.relative(repoRoot, guardPath),
      p1aRollbackCheckpoint: path.relative(repoRoot, rollbackPath),
      p1aImportContractAudit: path.relative(repoRoot, importContractPath),
    },
    summary: {
      approvalReceiptCandidates: receiptProbes.length,
      approvalReceiptsPresent,
      exactApprovalMatches,
      rejectedImplicitCommands: REJECTED_IMPLICIT_COMMANDS.length,
      requiredApprovalTextLength: requiredApprovalText.length,
      blockers,
      warnings,
      packetReadyForApproval,
      approvalStatusLocked,
      exactApprovalRequired: true,
      implicitApprovalRejected,
      accidentalApplyBlocked,
      unlockPossibleAfterExactReceipt,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    approvalGate: {
      lockState: 'locked_until_exact_receipt',
      requiredApprovalText,
      approvalReceiptPaths: approvalReceiptPaths.map((relativePath) => path.relative(repoRoot, path.join(runDir, relativePath))),
      acceptedReceiptShape: {
        schemaVersion: 'gustav-p1a-approval-receipt-v0',
        runId,
        approvedPacket: path.relative(repoRoot, packetPath),
        approvalText: requiredApprovalText,
        approvedAt: 'ISO-8601 timestamp',
      },
      rejectedImplicitCommands: REJECTED_IMPLICIT_COMMANDS,
    },
    receiptProbes,
    findings,
    notes: [
      'This audit is a lock, not an approval. It records that production app files remain unavailable for modification.',
      'Short commands such as дальше, давай or работа are explicitly not approval receipts.',
      'The exact approval text names the run id and the one P1A packet; it does not approve the broad 83-file apply plan.',
      'French generation remains blocked until target isolation and generated-content gates pass.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_approval_lock_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_approval_lock_audit.md');
  const lockMd = path.join(runDir, 'apply_plan', 'P1A_APPROVAL_LOCK.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, JSON.stringify(audit, null, 2) + '\n');
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(lockMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A approval lock audit: ${audit.status}`);
  console.log(`Approval receipts present: ${audit.summary.approvalReceiptsPresent}`);
  console.log(`Exact approval matches: ${audit.summary.exactApprovalMatches}`);
  console.log(`Implicit approval rejected: ${audit.summary.implicitApprovalRejected ? 'yes' : 'no'}`);
  console.log(`Accidental apply blocked: ${audit.summary.accidentalApplyBlocked ? 'yes' : 'no'}`);
  console.log(`Unlock possible after exact receipt: ${audit.summary.unlockPossibleAfterExactReceipt ? 'yes' : 'no'}`);
  console.log(`May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
