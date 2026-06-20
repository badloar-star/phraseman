import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';

type Candidate = {
  schemaVersion: 'gustav-p1a-amended-baseline-candidate-v0';
  runId: string;
  status: Status;
  summary: Record<string, unknown>;
  amendedContract: {
    domains: string[];
    approvalTextRequired: string;
  };
  baselineFiles: Array<{
    targetPath: string;
    sha256: string | null;
    candidateLockReady: boolean;
  }>;
  approvalGate: {
    acceptedReceiptPath: string;
    rejectedImplicitCommands: string[];
  };
};

type FirewallAudit = {
  status: Status;
  summary: Record<string, unknown>;
};

type ReadinessGate = {
  decision: 'GO' | 'HOLD' | 'BLOCK';
  summary: Record<string, unknown>;
};

type ValidatorReport = {
  status: 'PASS' | 'BLOCK';
  summary: Record<string, unknown>;
};

type Packet = {
  schemaVersion: 'gustav-p1a-approval-request-packet-v0';
  runId: string;
  generatedAt: string;
  status: 'HOLD';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aAmendedBaselineCandidate: string;
    p1aAmendedApprovalFirewallAudit: string;
    p1aAmendedHashLockPromotionFirewallAudit: string;
    runValidatorReport: string;
    readinessGate: string;
  };
  summary: {
    readyToAskUserForExactApproval: boolean;
    candidateReadyAfterExactApproval: boolean;
    approvalFirewallPassed: boolean;
    promotionFirewallPassed: boolean;
    validatorStatus: string;
    readinessDecision: string;
    readinessFailedChecks: number;
    approvalReceiptExists: boolean;
    activeHashLockExists: boolean;
    canCreateApprovalReceiptNow: boolean;
    canActivateHashLockNow: boolean;
    canStartP1BNow: boolean;
    canStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  exactApprovalTextRequired: string;
  acceptedReceiptPath: string;
  activeHashLockPath: string;
  rejectedNonApprovalCommands: string[];
  approvalDoesNotPermit: string[];
  baselineFiles: Array<{
    targetPath: string;
    sha256: string | null;
  }>;
  amendedDomains: string[];
  nextStepsAfterExactApproval: string[];
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

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function bool(summary: Record<string, unknown>, key: string): boolean {
  return summary[key] === true;
}

function n(summary: Record<string, unknown>, key: string): number {
  return typeof summary[key] === 'number' ? summary[key] as number : 0;
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV P1A Approval Request Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Ready to ask user for exact approval: ${packet.summary.readyToAskUserForExactApproval ? 'yes' : 'no'}`,
    `- Candidate ready after exact approval: ${packet.summary.candidateReadyAfterExactApproval ? 'yes' : 'no'}`,
    `- Approval firewall passed: ${packet.summary.approvalFirewallPassed ? 'yes' : 'no'}`,
    `- Promotion firewall passed: ${packet.summary.promotionFirewallPassed ? 'yes' : 'no'}`,
    `- Validator status: \`${packet.summary.validatorStatus}\``,
    `- Readiness decision: \`${packet.summary.readinessDecision}\``,
    `- Readiness failed checks: ${packet.summary.readinessFailedChecks}`,
    `- Approval receipt exists: ${packet.summary.approvalReceiptExists ? 'yes' : 'no'}`,
    `- Active hash-lock exists: ${packet.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Can create approval receipt now: ${packet.summary.canCreateApprovalReceiptNow ? 'yes' : 'no'}`,
    `- Can activate hash-lock now: ${packet.summary.canActivateHashLockNow ? 'yes' : 'no'}`,
    `- Can start P1B now: ${packet.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can start French generation: ${packet.summary.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${packet.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    '',
    '## Exact Approval Text Required',
    '',
    '```text',
    packet.exactApprovalTextRequired,
    '```',
    '',
    '## Accepted Receipt Path',
    '',
    `\`${packet.acceptedReceiptPath}\``,
    '',
    '## Active Hash-Lock Path After Approval',
    '',
    `\`${packet.activeHashLockPath}\``,
    '',
    '## Rejected Non-Approval Commands',
    '',
    ...packet.rejectedNonApprovalCommands.map((command) => `- \`${command}\``),
    '',
    '## Approval Does Not Permit',
    '',
    ...packet.approvalDoesNotPermit.map((item) => `- ${item}`),
    '',
    '## Amended Domains',
    '',
    ...packet.amendedDomains.map((domain) => `- \`${domain}\``),
    '',
    '## Baseline Files',
    '',
    ...packet.baselineFiles.map((file) => `- \`${file.targetPath}\`: \`${file.sha256 || 'missing'}\``),
    '',
    '## Next Steps After Exact Approval',
    '',
    ...packet.nextStepsAfterExactApproval.map((item) => `- ${item}`),
    '',
    '## Notes',
    '',
    ...packet.notes.map((item) => `- ${item}`),
    '',
  ];
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_p1a_approval_request_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const candidatePath = path.join(runDir, 'audits', 'p1a_amended_baseline_candidate.json');
  const approvalFirewallPath = path.join(runDir, 'audits', 'p1a_amended_approval_firewall_audit.json');
  const promotionFirewallPath = path.join(runDir, 'audits', 'p1a_amended_hash_lock_promotion_firewall_audit.json');
  const validatorPath = path.join(runDir, 'audits', 'run_validator_report.json');
  const readinessPath = path.join(runDir, 'audits', 'gustav_readiness_gate.json');

  const candidate = readJson<Candidate>(candidatePath);
  const approvalFirewall = readJson<FirewallAudit>(approvalFirewallPath);
  const promotionFirewall = readJson<FirewallAudit>(promotionFirewallPath);
  const validator = readJson<ValidatorReport>(validatorPath);
  const readiness = readJson<ReadinessGate>(readinessPath);
  const acceptedReceiptPath = candidate.approvalGate.acceptedReceiptPath.replace(/\\/g, '/');
  const activeHashLockPath = `docs/gustav/runs/${runId}/audits/p1a_active_amended_baseline_hash_lock.json`;
  const approvalReceiptExists = fs.existsSync(path.join(repoRoot, acceptedReceiptPath));
  const activeHashLockExists = fs.existsSync(path.join(repoRoot, activeHashLockPath));
  const readyToAskUserForExactApproval =
    bool(candidate.summary, 'candidateReadyAfterExactApproval') &&
    bool(approvalFirewall.summary, 'firewallPassed') &&
    bool(promotionFirewall.summary, 'promotionFirewallPassed') &&
    validator.status === 'PASS' &&
    readiness.decision === 'HOLD' &&
    !approvalReceiptExists &&
    !activeHashLockExists;

  const packet: Packet = {
    schemaVersion: 'gustav-p1a-approval-request-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aAmendedBaselineCandidate: artifactPath(repoRoot, candidatePath),
      p1aAmendedApprovalFirewallAudit: artifactPath(repoRoot, approvalFirewallPath),
      p1aAmendedHashLockPromotionFirewallAudit: artifactPath(repoRoot, promotionFirewallPath),
      runValidatorReport: artifactPath(repoRoot, validatorPath),
      readinessGate: artifactPath(repoRoot, readinessPath),
    },
    summary: {
      readyToAskUserForExactApproval,
      candidateReadyAfterExactApproval: bool(candidate.summary, 'candidateReadyAfterExactApproval'),
      approvalFirewallPassed: bool(approvalFirewall.summary, 'firewallPassed'),
      promotionFirewallPassed: bool(promotionFirewall.summary, 'promotionFirewallPassed'),
      validatorStatus: validator.status,
      readinessDecision: readiness.decision,
      readinessFailedChecks: n(readiness.summary, 'failed'),
      approvalReceiptExists,
      activeHashLockExists,
      canCreateApprovalReceiptNow: false,
      canActivateHashLockNow: false,
      canStartP1BNow: false,
      canStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    exactApprovalTextRequired: candidate.amendedContract.approvalTextRequired,
    acceptedReceiptPath,
    activeHashLockPath,
    rejectedNonApprovalCommands: candidate.approvalGate.rejectedImplicitCommands,
    approvalDoesNotPermit: [
      'P1B writes',
      'production apply',
      'French generation',
      'broad apply_plan/file_changes.json execution',
      'modifying production app files',
    ],
    baselineFiles: candidate.baselineFiles.map((file) => ({
      targetPath: file.targetPath,
      sha256: file.sha256,
    })),
    amendedDomains: candidate.amendedContract.domains,
    nextStepsAfterExactApproval: [
      'Create only the canonical p1a_contract_amendment_approval_receipt.json.',
      'Rerun p1a_amended_approval_firewall_audit.',
      'Rerun p1a_amended_hash_lock_promotion_firewall_audit.',
      'Create p1a_active_amended_baseline_hash_lock.json only after both firewalls validate the real receipt.',
      'Rerun p1a_current_impl_contract_audit, p1a_current_apply_state_audit, gustav_validate_run and gustav_readiness_gate.',
    ],
    notes: [
      'This packet is a request packet only; it is not an approval receipt.',
      'DALSHE remains a rejected non-approval command.',
      'The exact approval text is deliberately long to avoid accidental unlocks.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_approval_request_packet.json');
  const outMd = path.join(runDir, 'audits', 'p1a_approval_request_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV P1A approval request packet: ${packet.status}`);
  console.log(`Ready to ask user for exact approval: ${packet.summary.readyToAskUserForExactApproval ? 'yes' : 'no'}`);
  console.log(`Approval receipt exists: ${packet.summary.approvalReceiptExists ? 'yes' : 'no'}`);
  console.log(`Active hash-lock exists: ${packet.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${packet.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
