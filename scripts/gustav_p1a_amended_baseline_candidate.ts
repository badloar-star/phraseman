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
  evidence?: string[];
};

type AmendmentPacket = {
  schemaVersion: 'gustav-p1a-contract-amendment-packet-v0';
  runId: string;
  status: Status;
  summary: Record<string, unknown>;
  proposedAmendedDomains: string[];
  requiredApprovalText: string;
};

type CurrentImplAudit = {
  schemaVersion: 'gustav-p1a-current-impl-contract-audit-v0';
  runId: string;
  status: Status;
  summary: Record<string, unknown>;
  fileProofs: Array<{
    path: string;
    exists: boolean;
    sha256: string | null;
    newlineStableSha256: string | null;
  }>;
};

type BaselineFile = {
  targetPath: string;
  role: 'production_file' | 'test_file';
  exists: boolean;
  sha256: string | null;
  newlineStableSha256: string | null;
  bytes: number | null;
  lineCount: number | null;
  hashAlgorithm: 'sha256';
  candidateLockReady: boolean;
};

type Candidate = {
  schemaVersion: 'gustav-p1a-amended-baseline-candidate-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aContractAmendmentPacket: string;
    p1aCurrentImplContractAudit: string;
  };
  summary: {
    amendedDomains: number;
    baselineFiles: number;
    baselineFilesPresent: number;
    uniqueHashes: number;
    domainsNeedingTestAssertions: number;
    blockers: number;
    warnings: number;
    approvalMissing: boolean;
    activeHashLock: boolean;
    candidateReadyAfterExactApproval: boolean;
    canCreateApprovalReceiptNow: boolean;
    canStartP1BNow: boolean;
    canStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  amendedContract: {
    domains: string[];
    domainDecisionSource: string;
    approvalTextRequired: string;
  };
  baselineFiles: BaselineFile[];
  approvalGate: {
    requiredApprovalText: string;
    acceptedReceiptPath: string;
    rejectedImplicitCommands: string[];
  };
  findings: Finding[];
  allowedNextWork: string[];
  forbiddenActions: string[];
  notes: string[];
};

const P1A_FILES = [
  'app/study_target.ts',
  'app/target_storage_keys.ts',
  'tests/gustav_surface_target_switch.test.ts',
  'tests/gustav_target_storage_keys.test.ts',
] as const;

const REJECTED_IMPLICIT_COMMANDS = [
  'dalshe',
  'prodolzhai',
  'davai',
  'ok',
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

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function n(summary: Record<string, unknown>, key: string): number {
  return typeof summary[key] === 'number' ? summary[key] as number : 0;
}

function bool(summary: Record<string, unknown>, key: string): boolean {
  return summary[key] === true;
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function sha256(buffer: Buffer | string): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeNewlines(source: Buffer): string {
  return source.toString('utf8').replace(/\r\n/g, '\n');
}

function baselineFile(repoRoot: string, targetPath: string): BaselineFile {
  const absolutePath = path.join(repoRoot, targetPath);
  const exists = fs.existsSync(absolutePath);
  if (!exists) {
    return {
      targetPath,
      role: targetPath.startsWith('tests/') ? 'test_file' : 'production_file',
      exists: false,
      sha256: null,
      newlineStableSha256: null,
      bytes: null,
      lineCount: null,
      hashAlgorithm: 'sha256',
      candidateLockReady: false,
    };
  }
  const buffer = fs.readFileSync(absolutePath);
  return {
    targetPath,
    role: targetPath.startsWith('tests/') ? 'test_file' : 'production_file',
    exists: true,
    sha256: sha256(buffer),
    newlineStableSha256: sha256(normalizeNewlines(buffer)),
    bytes: buffer.length,
    lineCount: buffer.toString('utf8').split(/\r?\n/).length,
    hashAlgorithm: 'sha256',
    candidateLockReady: true,
  };
}

function renderMarkdown(candidate: Candidate): string {
  const lines = [
    '# GUSTAV P1A Amended Baseline Candidate',
    '',
    `Run: \`${candidate.runId}\``,
    '',
    `Status: \`${candidate.status}\``,
    '',
    `Generated at: ${candidate.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Amended domains: ${candidate.summary.amendedDomains}`,
    `- Baseline files: ${candidate.summary.baselineFiles}`,
    `- Baseline files present: ${candidate.summary.baselineFilesPresent}`,
    `- Unique hashes: ${candidate.summary.uniqueHashes}`,
    `- Domains needing test assertions: ${candidate.summary.domainsNeedingTestAssertions}`,
    `- Approval missing: ${candidate.summary.approvalMissing ? 'yes' : 'no'}`,
    `- Active hash-lock: ${candidate.summary.activeHashLock ? 'yes' : 'no'}`,
    `- Candidate ready after exact approval: ${candidate.summary.candidateReadyAfterExactApproval ? 'yes' : 'no'}`,
    `- Can create approval receipt now: ${candidate.summary.canCreateApprovalReceiptNow ? 'yes' : 'no'}`,
    `- Can start P1B now: ${candidate.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can start French generation: ${candidate.summary.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${candidate.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${candidate.summary.blockers}`,
    `- Warnings: ${candidate.summary.warnings}`,
    '',
    '## Amended Contract',
    '',
    `Domains: ${candidate.amendedContract.domains.map((domain) => `\`${domain}\``).join(', ')}`,
    '',
    'Approval text required:',
    '',
    '```text',
    candidate.amendedContract.approvalTextRequired,
    '```',
    '',
    '## Baseline Files',
    '',
  ];

  for (const file of candidate.baselineFiles) {
    lines.push(`### ${file.targetPath}`);
    lines.push('');
    lines.push(`- Role: \`${file.role}\``);
    lines.push(`- Exists: ${file.exists ? 'yes' : 'no'}`);
    lines.push(`- SHA-256: \`${file.sha256 || 'missing'}\``);
    lines.push(`- Newline-stable SHA-256: \`${file.newlineStableSha256 || 'missing'}\``);
    lines.push(`- Bytes: ${file.bytes ?? 'missing'}`);
    lines.push(`- Lines: ${file.lineCount ?? 'missing'}`);
    lines.push(`- Candidate lock ready: ${file.candidateLockReady ? 'yes' : 'no'}`);
    lines.push('');
  }

  lines.push('## Approval Gate', '');
  lines.push(`Accepted receipt path: \`${candidate.approvalGate.acceptedReceiptPath}\``);
  lines.push('');
  lines.push('Rejected implicit commands:');
  for (const command of candidate.approvalGate.rejectedImplicitCommands) lines.push(`- \`${command}\``);

  lines.push('', '## Findings', '');
  if (candidate.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of candidate.findings) {
      const evidence = finding.evidence?.length ? ` Evidence: ${finding.evidence.map((item) => `\`${item}\``).join(', ')}.` : '';
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.filePath ? ` (${finding.filePath})` : ''}.${evidence}`);
    }
  }

  lines.push('', '## Allowed Next Work', '');
  for (const item of candidate.allowedNextWork) lines.push(`- ${item}`);
  lines.push('', '## Forbidden Actions', '');
  for (const item of candidate.forbiddenActions) lines.push(`- ${item}`);
  lines.push('', '## Notes', '');
  for (const item of candidate.notes) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_p1a_amended_baseline_candidate.ts --run docs/gustav/runs/<runId>');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const amendmentPath = path.join(runDir, 'audits', 'p1a_contract_amendment_packet.json');
  const currentImplPath = path.join(runDir, 'audits', 'p1a_current_impl_contract_audit.json');
  const amendment = readJson<AmendmentPacket>(amendmentPath);
  const currentImpl = readJson<CurrentImplAudit>(currentImplPath);
  const findings: Finding[] = [];

  if (amendment.status !== 'HOLD' || !bool(amendment.summary, 'canCreateReplacementBaselineHashLockAfterApproval')) {
    findings.push({
      severity: 'blocker',
      code: 'amendment_not_ready_for_candidate',
      message: 'Contract amendment packet must be HOLD and ready for replacement hash-lock after approval.',
      filePath: artifactPath(repoRoot, amendmentPath),
    });
  }
  if (n(amendment.summary, 'domainsNeedingTestAssertions') !== 0) {
    findings.push({
      severity: 'blocker',
      code: 'amendment_test_assertions_missing',
      message: 'Amended contract still has domains needing test assertions.',
      filePath: artifactPath(repoRoot, amendmentPath),
    });
  }
  if (currentImpl.summary.coreSemanticsPass !== true) {
    findings.push({
      severity: 'blocker',
      code: 'current_impl_core_semantics_not_passing',
      message: 'Current P1A implementation core semantics must pass before baseline candidate.',
      filePath: artifactPath(repoRoot, currentImplPath),
    });
  }

  const baselineFiles = P1A_FILES.map((file) => baselineFile(repoRoot, file));
  for (const file of baselineFiles) {
    if (!file.exists) {
      findings.push({
        severity: 'blocker',
        code: 'baseline_file_missing',
        message: `Missing P1A baseline file ${file.targetPath}.`,
        filePath: file.targetPath,
      });
    }
  }

  const uniqueHashes = new Set(baselineFiles.map((file) => file.sha256).filter(Boolean)).size;
  if (uniqueHashes !== baselineFiles.length) {
    findings.push({
      severity: 'blocker',
      code: 'baseline_hashes_not_unique',
      message: 'Every P1A baseline file must have a distinct SHA-256 hash.',
      evidence: baselineFiles.map((file) => `${file.targetPath}=${file.sha256 || 'missing'}`),
    });
  }

  const acceptedReceiptPath = `docs/gustav/runs/${runId}/apply_plan/p1a_contract_amendment_approval_receipt.json`;
  const receiptExists = fs.existsSync(path.join(repoRoot, acceptedReceiptPath));
  if (receiptExists) {
    findings.push({
      severity: 'warning',
      code: 'approval_receipt_present',
      message: 'An amendment approval receipt already exists; validate it before activating hash-lock.',
      filePath: acceptedReceiptPath,
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const candidateReadyAfterExactApproval =
    blockers === 0 &&
    !receiptExists &&
    baselineFiles.every((file) => file.candidateLockReady) &&
    n(amendment.summary, 'domainsNeedingTestAssertions') === 0 &&
    bool(amendment.summary, 'canCreateReplacementBaselineHashLockAfterApproval');

  const candidate: Candidate = {
    schemaVersion: 'gustav-p1a-amended-baseline-candidate-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aContractAmendmentPacket: artifactPath(repoRoot, amendmentPath),
      p1aCurrentImplContractAudit: artifactPath(repoRoot, currentImplPath),
    },
    summary: {
      amendedDomains: amendment.proposedAmendedDomains.length,
      baselineFiles: baselineFiles.length,
      baselineFilesPresent: baselineFiles.filter((file) => file.exists).length,
      uniqueHashes,
      domainsNeedingTestAssertions: n(amendment.summary, 'domainsNeedingTestAssertions'),
      blockers,
      warnings,
      approvalMissing: !receiptExists,
      activeHashLock: false,
      candidateReadyAfterExactApproval,
      canCreateApprovalReceiptNow: false,
      canStartP1BNow: false,
      canStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    amendedContract: {
      domains: amendment.proposedAmendedDomains,
      domainDecisionSource: artifactPath(repoRoot, amendmentPath),
      approvalTextRequired: amendment.requiredApprovalText,
    },
    baselineFiles,
    approvalGate: {
      requiredApprovalText: amendment.requiredApprovalText,
      acceptedReceiptPath,
      rejectedImplicitCommands: REJECTED_IMPLICIT_COMMANDS,
    },
    findings,
    allowedNextWork: [
      'Wait for exact user approval text before creating p1a_contract_amendment_approval_receipt.json.',
      'After exact approval, validate the receipt and promote this candidate into an active amended baseline hash-lock artifact.',
      'After active hash-lock, rerun P1A current implementation contract audit, P1A current apply state audit, run validator and readiness gate.',
    ],
    forbiddenActions: [
      'Do not treat this candidate as an active hash-lock.',
      'Do not create an approval receipt from a short continuation command.',
      'Do not start P1B.',
      'Do not start French generation.',
      'Do not modify production app files from this candidate.',
    ],
    notes: [
      'This candidate records current P1A file hashes after the amended contract packet reached zero missing test assertions.',
      'Status remains HOLD because exact approval is still missing.',
      'This artifact is pre-approval evidence only.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_amended_baseline_candidate.json');
  const outMd = path.join(runDir, 'audits', 'p1a_amended_baseline_candidate.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(candidate, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(candidate));

  console.log(`GUSTAV P1A amended baseline candidate: ${candidate.status}`);
  console.log(`Candidate ready after exact approval: ${candidate.summary.candidateReadyAfterExactApproval ? 'yes' : 'no'}`);
  console.log(`Active hash-lock: ${candidate.summary.activeHashLock ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${candidate.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
  if (candidate.status === 'BLOCK') process.exit(1);
}

void main();
