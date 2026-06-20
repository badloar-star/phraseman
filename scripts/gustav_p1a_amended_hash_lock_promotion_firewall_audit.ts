import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  filePath?: string;
};

type Candidate = {
  schemaVersion: 'gustav-p1a-amended-baseline-candidate-v0';
  runId: string;
  status: Status;
  summary: Record<string, unknown>;
  approvalGate: {
    requiredApprovalText: string;
    acceptedReceiptPath: string;
  };
  amendedContract: {
    domains: string[];
  };
  baselineFiles: Array<{
    targetPath: string;
    sha256: string | null;
    newlineStableSha256: string | null;
    candidateLockReady: boolean;
  }>;
};

type ApprovalFirewall = {
  schemaVersion: 'gustav-p1a-amended-approval-firewall-audit-v0';
  runId: string;
  status: Status;
  summary: Record<string, unknown>;
  approvalContract: {
    requiredApprovalText: string;
    approvedCandidate: string;
    acceptedReceiptPath: string;
  };
};

type PromotionProbe = {
  id: string;
  receiptPath: string;
  source: 'real_candidate' | 'temp_fixture';
  receiptExists: boolean;
  receiptValid: boolean;
  candidateMatches: boolean;
  hashCountMatches: boolean;
  wouldPromoteActiveHashLock: boolean;
  expectedPromotion: boolean;
  rejectionReason: string;
};

type Audit = {
  schemaVersion: 'gustav-p1a-amended-hash-lock-promotion-firewall-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    p1aAmendedBaselineCandidate: string;
    p1aAmendedApprovalFirewallAudit: string;
  };
  summary: {
    candidateReadyAfterExactApproval: boolean;
    approvalFirewallPassed: boolean;
    realReceiptPresent: boolean;
    activeHashLockPresent: boolean;
    tempPromotionFixtures: number;
    rejectedTempPromotionFixtures: number;
    blockers: number;
    warnings: number;
    promotionFirewallPassed: boolean;
    canPromoteActiveHashLockNow: boolean;
    canCreateApprovalReceiptNow: boolean;
    canStartP1BNow: boolean;
    canStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  promotionContract: {
    requiredReceiptPath: string;
    requiredApprovalText: string;
    activeHashLockPath: string;
    requiredCandidatePath: string;
    requiredFileHashes: Array<{
      targetPath: string;
      sha256: string;
      newlineStableSha256: string;
    }>;
    requiredDomains: string[];
  };
  tempFixtureRoot: string;
  promotionProbes: PromotionProbe[];
  findings: Finding[];
  allowedNextWork: string[];
  forbiddenActions: string[];
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

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function bool(summary: Record<string, unknown>, key: string): boolean {
  return summary[key] === true;
}

function isIsoTimestamp(value: unknown): boolean {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && value.includes('T');
}

function validateReceiptShape(
  filePath: string,
  runId: string,
  candidatePath: string,
  requiredApprovalText: string,
): { valid: boolean; candidateMatches: boolean; reason: string } {
  if (!fs.existsSync(filePath)) return { valid: false, candidateMatches: false, reason: 'receipt_absent' };
  let parsed: Record<string, unknown>;
  try {
    parsed = readJson<Record<string, unknown>>(filePath);
  } catch {
    return { valid: false, candidateMatches: false, reason: 'not_parseable_json' };
  }
  if (parsed.schemaVersion !== 'gustav-p1a-contract-amendment-approval-receipt-v0') {
    return { valid: false, candidateMatches: false, reason: 'schema_mismatch' };
  }
  if (parsed.runId !== runId) return { valid: false, candidateMatches: false, reason: 'run_id_mismatch' };
  if (parsed.approvedCandidate !== candidatePath) return { valid: false, candidateMatches: false, reason: 'approved_candidate_mismatch' };
  if (parsed.approvalText !== requiredApprovalText) return { valid: false, candidateMatches: true, reason: 'approval_text_mismatch' };
  if (!isIsoTimestamp(parsed.approvedAt)) return { valid: false, candidateMatches: true, reason: 'approved_at_not_iso' };
  return { valid: true, candidateMatches: true, reason: 'accepted' };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Amended Hash-Lock Promotion Firewall Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Candidate ready after exact approval: ${audit.summary.candidateReadyAfterExactApproval ? 'yes' : 'no'}`,
    `- Approval firewall passed: ${audit.summary.approvalFirewallPassed ? 'yes' : 'no'}`,
    `- Real receipt present: ${audit.summary.realReceiptPresent ? 'yes' : 'no'}`,
    `- Active hash-lock present: ${audit.summary.activeHashLockPresent ? 'yes' : 'no'}`,
    `- Temp promotion fixtures: ${audit.summary.tempPromotionFixtures}`,
    `- Rejected temp promotion fixtures: ${audit.summary.rejectedTempPromotionFixtures}`,
    `- Promotion firewall passed: ${audit.summary.promotionFirewallPassed ? 'yes' : 'no'}`,
    `- Can promote active hash-lock now: ${audit.summary.canPromoteActiveHashLockNow ? 'yes' : 'no'}`,
    `- Can create approval receipt now: ${audit.summary.canCreateApprovalReceiptNow ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can start French generation: ${audit.summary.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Promotion Contract',
    '',
    `Required receipt path: \`${audit.promotionContract.requiredReceiptPath}\``,
    '',
    `Active hash-lock path: \`${audit.promotionContract.activeHashLockPath}\``,
    '',
    `Required candidate path: \`${audit.promotionContract.requiredCandidatePath}\``,
    '',
    'Required approval text:',
    '',
    '```text',
    audit.promotionContract.requiredApprovalText,
    '```',
    '',
    'Required domains:',
    ...audit.promotionContract.requiredDomains.map((domain) => `- \`${domain}\``),
    '',
    'Required file hashes:',
    ...audit.promotionContract.requiredFileHashes.map((file) => `- \`${file.targetPath}\`: \`${file.sha256}\``),
    '',
    '## Promotion Probes',
    '',
  ];

  for (const probe of audit.promotionProbes) {
    lines.push(`- \`${probe.id}\`: promote=${probe.wouldPromoteActiveHashLock ? 'yes' : 'no'}, expected=${probe.expectedPromotion ? 'yes' : 'no'}, reason=\`${probe.rejectionReason}\`, receipt=\`${probe.receiptPath}\``);
  }

  lines.push('', '## Findings', '');
  if (audit.findings.length === 0) {
    lines.push('No findings.');
  } else {
    for (const finding of audit.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.filePath ? ` (${finding.filePath})` : ''}`);
    }
  }

  lines.push('', '## Allowed Next Work', '');
  for (const item of audit.allowedNextWork) lines.push(`- ${item}`);
  lines.push('', '## Forbidden Actions', '');
  for (const item of audit.forbiddenActions) lines.push(`- ${item}`);
  lines.push('', '## Notes', '');
  for (const item of audit.notes) lines.push(`- ${item}`);
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_p1a_amended_hash_lock_promotion_firewall_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const candidatePath = path.join(runDir, 'audits', 'p1a_amended_baseline_candidate.json');
  const approvalFirewallPath = path.join(runDir, 'audits', 'p1a_amended_approval_firewall_audit.json');
  const candidate = readJson<Candidate>(candidatePath);
  const approvalFirewall = readJson<ApprovalFirewall>(approvalFirewallPath);
  const candidateArtifact = artifactPath(repoRoot, candidatePath);
  const activeHashLockPath = `docs/gustav/runs/${runId}/audits/p1a_active_amended_baseline_hash_lock.json`;
  const activeHashLockAbsolute = path.join(repoRoot, activeHashLockPath);
  const receiptPath = candidate.approvalGate.acceptedReceiptPath.replace(/\\/g, '/');
  const receiptAbsolute = path.join(repoRoot, receiptPath);
  const requiredHashes = candidate.baselineFiles
    .filter((file) => file.sha256 && file.newlineStableSha256)
    .map((file) => ({
      targetPath: file.targetPath,
      sha256: file.sha256 as string,
      newlineStableSha256: file.newlineStableSha256 as string,
    }));
  const findings: Finding[] = [];

  if (candidate.status !== 'HOLD' || !bool(candidate.summary, 'candidateReadyAfterExactApproval')) {
    findings.push({
      severity: 'blocker',
      code: 'candidate_not_ready',
      message: 'Amended baseline candidate must be HOLD and ready after exact approval.',
      filePath: candidateArtifact,
    });
  }
  if (approvalFirewall.status !== 'PASS' || !bool(approvalFirewall.summary, 'firewallPassed')) {
    findings.push({
      severity: 'blocker',
      code: 'approval_firewall_not_passed',
      message: 'Amended approval firewall must pass before promotion firewall can be trusted.',
      filePath: artifactPath(repoRoot, approvalFirewallPath),
    });
  }
  if (approvalFirewall.approvalContract.requiredApprovalText !== candidate.approvalGate.requiredApprovalText) {
    findings.push({
      severity: 'blocker',
      code: 'approval_text_mismatch_between_artifacts',
      message: 'Candidate and approval firewall disagree about required approval text.',
      filePath: artifactPath(repoRoot, approvalFirewallPath),
    });
  }
  if (requiredHashes.length !== candidate.baselineFiles.length) {
    findings.push({
      severity: 'blocker',
      code: 'candidate_hashes_incomplete',
      message: 'Candidate baseline hashes are incomplete.',
      filePath: candidateArtifact,
    });
  }

  const tempFixtureRoot = path.join(os.tmpdir(), `gustav-p1a-amended-promotion-firewall-${runId}`);
  fs.rmSync(tempFixtureRoot, { recursive: true, force: true });
  fs.mkdirSync(tempFixtureRoot, { recursive: true });

  const exactTempReceiptPath = path.join(tempFixtureRoot, 'exact_receipt_wrong_path.json');
  writeJson(exactTempReceiptPath, {
    schemaVersion: 'gustav-p1a-contract-amendment-approval-receipt-v0',
    runId,
    approvedCandidate: candidateArtifact,
    approvalText: candidate.approvalGate.requiredApprovalText,
    approvedAt: new Date().toISOString(),
  });
  const wrongHashTempReceiptPath = path.join(tempFixtureRoot, 'wrong_hash_receipt.json');
  writeJson(wrongHashTempReceiptPath, {
    schemaVersion: 'gustav-p1a-contract-amendment-approval-receipt-v0',
    runId,
    approvedCandidate: candidateArtifact,
    approvalText: candidate.approvalGate.requiredApprovalText,
    approvedAt: new Date().toISOString(),
    hashes: [{ targetPath: 'app/study_target.ts', sha256: 'wrong' }],
  });

  const probeInputs: Array<{
    id: string;
    filePath: string;
    source: 'real_candidate' | 'temp_fixture';
    expectedPromotion: boolean;
  }> = [
    {
      id: 'REAL-RECEIPT',
      filePath: receiptAbsolute,
      source: 'real_candidate',
      expectedPromotion: false,
    },
    {
      id: 'TMP-EXACT-RECEIPT-WRONG-PATH',
      filePath: exactTempReceiptPath,
      source: 'temp_fixture',
      expectedPromotion: false,
    },
    {
      id: 'TMP-WRONG-HASHES',
      filePath: wrongHashTempReceiptPath,
      source: 'temp_fixture',
      expectedPromotion: false,
    },
  ];

  const promotionProbes: PromotionProbe[] = probeInputs.map((input) => {
    const validation = validateReceiptShape(
      input.filePath,
      runId,
      candidateArtifact,
      candidate.approvalGate.requiredApprovalText,
    );
    const acceptedPath = artifactPath(repoRoot, input.filePath) === receiptPath;
    const hashCountMatches = requiredHashes.length === 4;
    const wouldPromoteActiveHashLock =
      validation.valid &&
      validation.candidateMatches &&
      acceptedPath &&
      hashCountMatches &&
      !fs.existsSync(activeHashLockAbsolute);
    const rejectionReason = wouldPromoteActiveHashLock
      ? 'accepted'
      : !validation.valid
        ? validation.reason
        : !acceptedPath
          ? 'receipt_path_not_accepted'
          : !hashCountMatches
            ? 'candidate_hash_count_invalid'
            : fs.existsSync(activeHashLockAbsolute)
              ? 'active_hash_lock_already_exists'
              : 'unknown';

    return {
      id: input.id,
      receiptPath: artifactPath(repoRoot, input.filePath),
      source: input.source,
      receiptExists: fs.existsSync(input.filePath),
      receiptValid: validation.valid,
      candidateMatches: validation.candidateMatches,
      hashCountMatches,
      wouldPromoteActiveHashLock,
      expectedPromotion: input.expectedPromotion,
      rejectionReason,
    };
  });

  for (const probe of promotionProbes) {
    if (probe.wouldPromoteActiveHashLock !== probe.expectedPromotion) {
      findings.push({
        severity: 'blocker',
        code: 'promotion_probe_expectation_mismatch',
        message: `${probe.id} promotion result did not match expectation.`,
        filePath: probe.receiptPath,
      });
    }
  }

  const realReceiptPresent = fs.existsSync(receiptAbsolute);
  const activeHashLockPresent = fs.existsSync(activeHashLockAbsolute);
  if (realReceiptPresent) {
    findings.push({
      severity: 'blocker',
      code: 'real_receipt_present',
      message: 'Real receipt exists; promotion must be handled by the post-approval path, not by a DALSHE continuation.',
      filePath: receiptPath,
    });
  }
  if (activeHashLockPresent) {
    findings.push({
      severity: 'blocker',
      code: 'active_hash_lock_present',
      message: 'Active hash-lock already exists; this firewall should not run as a pre-approval continuation.',
      filePath: activeHashLockPath,
    });
  }

  const tempProbes = promotionProbes.filter((probe) => probe.source === 'temp_fixture');
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const promotionFirewallPassed =
    blockers === 0 &&
    !realReceiptPresent &&
    !activeHashLockPresent &&
    tempProbes.length === 2 &&
    tempProbes.every((probe) => !probe.wouldPromoteActiveHashLock) &&
    promotionProbes.find((probe) => probe.id === 'TMP-EXACT-RECEIPT-WRONG-PATH')?.rejectionReason === 'receipt_path_not_accepted';

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-amended-hash-lock-promotion-firewall-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aAmendedBaselineCandidate: candidateArtifact,
      p1aAmendedApprovalFirewallAudit: artifactPath(repoRoot, approvalFirewallPath),
    },
    summary: {
      candidateReadyAfterExactApproval: bool(candidate.summary, 'candidateReadyAfterExactApproval'),
      approvalFirewallPassed: bool(approvalFirewall.summary, 'firewallPassed'),
      realReceiptPresent,
      activeHashLockPresent,
      tempPromotionFixtures: tempProbes.length,
      rejectedTempPromotionFixtures: tempProbes.filter((probe) => !probe.wouldPromoteActiveHashLock).length,
      blockers,
      warnings,
      promotionFirewallPassed,
      canPromoteActiveHashLockNow: false,
      canCreateApprovalReceiptNow: false,
      canStartP1BNow: false,
      canStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    promotionContract: {
      requiredReceiptPath: receiptPath,
      requiredApprovalText: candidate.approvalGate.requiredApprovalText,
      activeHashLockPath,
      requiredCandidatePath: candidateArtifact,
      requiredFileHashes: requiredHashes,
      requiredDomains: candidate.amendedContract.domains,
    },
    tempFixtureRoot,
    promotionProbes,
    findings,
    allowedNextWork: [
      'Wait for exact amendment approval text before writing the canonical receipt.',
      'After real receipt validation, generate active hash-lock only at the configured activeHashLockPath.',
      'After active hash-lock, rerun validator and readiness gate.',
    ],
    forbiddenActions: [
      'Do not promote active hash-lock from a temp receipt.',
      'Do not promote active hash-lock while the real receipt is absent.',
      'Do not create approval receipt from DALSHE, PRODOLZHAI, DAVAI, OK, approve, or approved.',
      'Do not start P1B.',
      'Do not start French generation.',
      'Do not modify production app files from this firewall audit.',
    ],
    notes: [
      'This firewall is a pre-approval promotion contract only.',
      'No active hash-lock artifact is created by this audit.',
      'The exact-shape temp receipt proves that receipt content alone is insufficient; path and real approval state are required.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_amended_hash_lock_promotion_firewall_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_amended_hash_lock_promotion_firewall_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A amended hash-lock promotion firewall audit: ${audit.status}`);
  console.log(`Promotion firewall passed: ${audit.summary.promotionFirewallPassed ? 'yes' : 'no'}`);
  console.log(`Real receipt present: ${audit.summary.realReceiptPresent ? 'yes' : 'no'}`);
  console.log(`Active hash-lock present: ${audit.summary.activeHashLockPresent ? 'yes' : 'no'}`);
  console.log(`Can promote active hash-lock now: ${audit.summary.canPromoteActiveHashLockNow ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main();
