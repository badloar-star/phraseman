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
    rejectedImplicitCommands: string[];
  };
};

type ReceiptProbe = {
  id: string;
  filePath: string;
  source: 'real_candidate' | 'temp_fixture';
  exists: boolean;
  parseableJson: boolean;
  schemaValid: boolean;
  runIdMatches: boolean;
  approvedCandidateMatches: boolean;
  approvalTextMatches: boolean;
  approvedAtIso: boolean;
  acceptedReceiptPath: boolean;
  wouldActivateHashLock: boolean;
  expectedActivation: boolean;
  rejectionReason: string;
};

type Audit = {
  schemaVersion: 'gustav-p1a-amended-approval-firewall-audit-v0';
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
  };
  summary: {
    realReceiptCandidates: number;
    realReceiptsPresent: number;
    exactApprovalMatches: number;
    tempFixtures: number;
    rejectedTempFixtures: number;
    acceptedShapeFixtures: number;
    tempExactShapeBlockedByPath: number;
    implicitCommandFixtures: number;
    implicitCommandsRejected: number;
    blockers: number;
    warnings: number;
    firewallPassed: boolean;
    approvalStillMissing: boolean;
    candidateReadyAfterExactApproval: boolean;
    canActivateHashLockNow: boolean;
    canCreateApprovalReceiptNow: boolean;
    canStartP1BNow: boolean;
    canStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
  };
  approvalContract: {
    requiredApprovalText: string;
    approvedCandidate: string;
    acceptedReceiptPath: string;
    acceptedReceiptShape: {
      schemaVersion: 'gustav-p1a-contract-amendment-approval-receipt-v0';
      runId: string;
      approvedCandidate: string;
      approvalText: string;
      approvedAt: 'ISO-8601 timestamp';
    };
    rejectedImplicitCommands: string[];
  };
  tempFixtureRoot: string;
  receiptProbes: ReceiptProbe[];
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

function validateReceipt(
  id: string,
  filePath: string,
  source: 'real_candidate' | 'temp_fixture',
  acceptedReceiptPath: string,
  expectedRunId: string,
  expectedCandidate: string,
  expectedApprovalText: string,
  expectedActivation: boolean,
): ReceiptProbe {
  const exists = fs.existsSync(filePath);
  let parsed: Record<string, unknown> | null = null;
  let parseableJson = false;

  if (exists) {
    try {
      parsed = readJson<Record<string, unknown>>(filePath);
      parseableJson = true;
    } catch {
      parsed = null;
    }
  }

  const schemaValid = parsed?.schemaVersion === 'gustav-p1a-contract-amendment-approval-receipt-v0';
  const runIdMatches = parsed?.runId === expectedRunId;
  const approvedCandidateMatches = parsed?.approvedCandidate === expectedCandidate;
  const approvalTextMatches = parsed?.approvalText === expectedApprovalText;
  const approvedAtIso = isIsoTimestamp(parsed?.approvedAt);
  const acceptedPath = artifactPath(process.cwd(), filePath) === acceptedReceiptPath.replace(/\\/g, '/');
  const wouldActivateHashLock =
    exists &&
    parseableJson &&
    schemaValid &&
    runIdMatches &&
    approvedCandidateMatches &&
    approvalTextMatches &&
    approvedAtIso &&
    acceptedPath;
  const rejectionReason = wouldActivateHashLock
    ? 'accepted'
    : !exists
      ? 'receipt_absent'
      : !parseableJson
        ? 'not_parseable_json'
        : !schemaValid
          ? 'schema_mismatch'
          : !runIdMatches
            ? 'run_id_mismatch'
            : !approvedCandidateMatches
              ? 'approved_candidate_mismatch'
              : !approvalTextMatches
                ? 'approval_text_mismatch'
                : !approvedAtIso
                  ? 'approved_at_not_iso'
                  : !acceptedPath
                    ? 'receipt_path_not_accepted'
                    : 'unknown';

  return {
    id,
    filePath: artifactPath(process.cwd(), filePath),
    source,
    exists,
    parseableJson,
    schemaValid,
    runIdMatches,
    approvedCandidateMatches,
    approvalTextMatches,
    approvedAtIso,
    acceptedReceiptPath: acceptedPath,
    wouldActivateHashLock,
    expectedActivation,
    rejectionReason,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1A Amended Approval Firewall Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Real receipt candidates: ${audit.summary.realReceiptCandidates}`,
    `- Real receipts present: ${audit.summary.realReceiptsPresent}`,
    `- Exact approval matches: ${audit.summary.exactApprovalMatches}`,
    `- Temp fixtures: ${audit.summary.tempFixtures}`,
    `- Rejected temp fixtures: ${audit.summary.rejectedTempFixtures}`,
    `- Accepted shape fixtures: ${audit.summary.acceptedShapeFixtures}`,
    `- Temp exact shape blocked by path: ${audit.summary.tempExactShapeBlockedByPath}`,
    `- Implicit command fixtures: ${audit.summary.implicitCommandFixtures}`,
    `- Implicit commands rejected: ${audit.summary.implicitCommandsRejected}`,
    `- Firewall passed: ${audit.summary.firewallPassed ? 'yes' : 'no'}`,
    `- Approval still missing: ${audit.summary.approvalStillMissing ? 'yes' : 'no'}`,
    `- Candidate ready after exact approval: ${audit.summary.candidateReadyAfterExactApproval ? 'yes' : 'no'}`,
    `- Can activate hash-lock now: ${audit.summary.canActivateHashLockNow ? 'yes' : 'no'}`,
    `- Can create approval receipt now: ${audit.summary.canCreateApprovalReceiptNow ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can start French generation: ${audit.summary.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- May modify production app files: ${audit.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Required Approval Text',
    '',
    '```text',
    audit.approvalContract.requiredApprovalText,
    '```',
    '',
    '## Receipt Probes',
    '',
  ];

  for (const probe of audit.receiptProbes) {
    lines.push(`- \`${probe.id}\`: activate=${probe.wouldActivateHashLock ? 'yes' : 'no'}, expected=${probe.expectedActivation ? 'yes' : 'no'}, reason=\`${probe.rejectionReason}\`, path=\`${probe.filePath}\``);
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
    console.error('Usage: npx tsx scripts/gustav_p1a_amended_approval_firewall_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const candidatePath = path.join(runDir, 'audits', 'p1a_amended_baseline_candidate.json');
  const candidate = readJson<Candidate>(candidatePath);
  const approvedCandidate = artifactPath(repoRoot, candidatePath);
  const acceptedReceiptPath = candidate.approvalGate.acceptedReceiptPath.replace(/\\/g, '/');
  const acceptedReceiptAbsolute = path.join(repoRoot, acceptedReceiptPath);
  const requiredApprovalText = candidate.approvalGate.requiredApprovalText;
  const findings: Finding[] = [];

  if (candidate.status !== 'HOLD' || !bool(candidate.summary, 'candidateReadyAfterExactApproval')) {
    findings.push({
      severity: 'blocker',
      code: 'candidate_not_ready_for_firewall',
      message: 'Amended baseline candidate must be HOLD and candidateReadyAfterExactApproval before firewall audit.',
      filePath: approvedCandidate,
    });
  }
  if (bool(candidate.summary, 'activeHashLock')) {
    findings.push({
      severity: 'blocker',
      code: 'candidate_already_active',
      message: 'Candidate is unexpectedly marked as active hash-lock before approval.',
      filePath: approvedCandidate,
    });
  }
  if (!requiredApprovalText.includes(runId) || !requiredApprovalText.includes('does not approve P1B')) {
    findings.push({
      severity: 'blocker',
      code: 'approval_text_not_specific',
      message: 'Required approval text must name the run and explicitly avoid P1B approval.',
      filePath: approvedCandidate,
    });
  }

  const tempFixtureRoot = path.join(os.tmpdir(), `gustav-p1a-amended-approval-firewall-${runId}`);
  fs.rmSync(tempFixtureRoot, { recursive: true, force: true });
  ensureDir(tempFixtureRoot);

  const fixtures: Array<{ id: string; fileName: string; body: unknown; expectedActivation: boolean }> = [
    {
      id: 'TMP-DALSHE',
      fileName: 'dalshe.json',
      body: { approvalText: 'DALSHE' },
      expectedActivation: false,
    },
    {
      id: 'TMP-PRODOLZHAI',
      fileName: 'prodolzhai.json',
      body: { approvalText: 'PRODOLZHAI' },
      expectedActivation: false,
    },
    {
      id: 'TMP-APPROVE',
      fileName: 'approve.json',
      body: { approvalText: 'approve' },
      expectedActivation: false,
    },
    {
      id: 'TMP-WRONG-TEXT',
      fileName: 'wrong_text.json',
      body: {
        schemaVersion: 'gustav-p1a-contract-amendment-approval-receipt-v0',
        runId,
        approvedCandidate,
        approvalText: `${requiredApprovalText} extra`,
        approvedAt: new Date().toISOString(),
      },
      expectedActivation: false,
    },
    {
      id: 'TMP-WRONG-RUN',
      fileName: 'wrong_run.json',
      body: {
        schemaVersion: 'gustav-p1a-contract-amendment-approval-receipt-v0',
        runId: `${runId}_wrong`,
        approvedCandidate,
        approvalText: requiredApprovalText,
        approvedAt: new Date().toISOString(),
      },
      expectedActivation: false,
    },
    {
      id: 'TMP-WRONG-CANDIDATE',
      fileName: 'wrong_candidate.json',
      body: {
        schemaVersion: 'gustav-p1a-contract-amendment-approval-receipt-v0',
        runId,
        approvedCandidate: 'docs/gustav/runs/wrong/audits/p1a_amended_baseline_candidate.json',
        approvalText: requiredApprovalText,
        approvedAt: new Date().toISOString(),
      },
      expectedActivation: false,
    },
    {
      id: 'TMP-NO-ISO',
      fileName: 'no_iso.json',
      body: {
        schemaVersion: 'gustav-p1a-contract-amendment-approval-receipt-v0',
        runId,
        approvedCandidate,
        approvalText: requiredApprovalText,
        approvedAt: 'today',
      },
      expectedActivation: false,
    },
    {
      id: 'TMP-EXACT-SHAPE-WRONG-PATH',
      fileName: 'exact_shape_wrong_path.json',
      body: {
        schemaVersion: 'gustav-p1a-contract-amendment-approval-receipt-v0',
        runId,
        approvedCandidate,
        approvalText: requiredApprovalText,
        approvedAt: new Date().toISOString(),
      },
      expectedActivation: false,
    },
  ];

  const probes: ReceiptProbe[] = [
    validateReceipt(
      'REAL-AMENDMENT-APPROVAL-RECEIPT',
      acceptedReceiptAbsolute,
      'real_candidate',
      acceptedReceiptPath,
      runId,
      approvedCandidate,
      requiredApprovalText,
      false,
    ),
  ];

  for (const fixture of fixtures) {
    const fixturePath = path.join(tempFixtureRoot, fixture.fileName);
    writeJson(fixturePath, fixture.body);
    probes.push(validateReceipt(
      fixture.id,
      fixturePath,
      'temp_fixture',
      acceptedReceiptPath,
      runId,
      approvedCandidate,
      requiredApprovalText,
      fixture.expectedActivation,
    ));
  }

  for (const probe of probes) {
    if (probe.wouldActivateHashLock !== probe.expectedActivation) {
      findings.push({
        severity: 'blocker',
        code: 'receipt_probe_expectation_mismatch',
        message: `${probe.id} activation result did not match expectation.`,
        filePath: probe.filePath,
      });
    }
  }

  const realProbes = probes.filter((probe) => probe.source === 'real_candidate');
  const tempProbes = probes.filter((probe) => probe.source === 'temp_fixture');
  const realReceiptsPresent = realProbes.filter((probe) => probe.exists).length;
  const exactApprovalMatches = realProbes.filter((probe) => probe.wouldActivateHashLock).length;
  const acceptedShapeFixtures = tempProbes.filter((probe) =>
    probe.schemaValid &&
    probe.runIdMatches &&
    probe.approvedCandidateMatches &&
    probe.approvalTextMatches &&
    probe.approvedAtIso
  ).length;
  const tempExactShapeBlockedByPath = tempProbes.filter((probe) =>
    probe.id === 'TMP-EXACT-SHAPE-WRONG-PATH' &&
    probe.rejectionReason === 'receipt_path_not_accepted'
  ).length;
  const implicitCommandFixtures = tempProbes.filter((probe) => ['TMP-DALSHE', 'TMP-PRODOLZHAI', 'TMP-APPROVE'].includes(probe.id)).length;
  const implicitCommandsRejected = tempProbes.filter((probe) =>
    ['TMP-DALSHE', 'TMP-PRODOLZHAI', 'TMP-APPROVE'].includes(probe.id) &&
    !probe.wouldActivateHashLock
  ).length;

  if (realReceiptsPresent > 0 || exactApprovalMatches > 0) {
    findings.push({
      severity: 'blocker',
      code: 'real_receipt_present_before_user_approval',
      message: 'A real amendment approval receipt is present; this continuation turn must not activate hash-lock implicitly.',
      filePath: acceptedReceiptPath,
    });
  }
  if (acceptedShapeFixtures !== 1 || tempExactShapeBlockedByPath !== 1) {
    findings.push({
      severity: 'blocker',
      code: 'exact_shape_fixture_not_path_blocked',
      message: 'The exact-shape temp receipt must be valid by shape but blocked because it is outside the accepted receipt path.',
    });
  }
  if (implicitCommandFixtures !== 3 || implicitCommandsRejected !== 3) {
    findings.push({
      severity: 'blocker',
      code: 'implicit_commands_not_rejected',
      message: 'Short continuation/approval command fixtures must all be rejected.',
    });
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const firewallPassed =
    blockers === 0 &&
    realProbes.length === 1 &&
    realReceiptsPresent === 0 &&
    exactApprovalMatches === 0 &&
    tempProbes.length === 8 &&
    tempProbes.every((probe) => !probe.wouldActivateHashLock) &&
    acceptedShapeFixtures === 1 &&
    tempExactShapeBlockedByPath === 1 &&
    implicitCommandFixtures === 3 &&
    implicitCommandsRejected === 3;

  const audit: Audit = {
    schemaVersion: 'gustav-p1a-amended-approval-firewall-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1aAmendedBaselineCandidate: approvedCandidate,
    },
    summary: {
      realReceiptCandidates: realProbes.length,
      realReceiptsPresent,
      exactApprovalMatches,
      tempFixtures: tempProbes.length,
      rejectedTempFixtures: tempProbes.filter((probe) => !probe.wouldActivateHashLock).length,
      acceptedShapeFixtures,
      tempExactShapeBlockedByPath,
      implicitCommandFixtures,
      implicitCommandsRejected,
      blockers,
      warnings,
      firewallPassed,
      approvalStillMissing: true,
      candidateReadyAfterExactApproval: bool(candidate.summary, 'candidateReadyAfterExactApproval'),
      canActivateHashLockNow: false,
      canCreateApprovalReceiptNow: false,
      canStartP1BNow: false,
      canStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
    },
    approvalContract: {
      requiredApprovalText,
      approvedCandidate,
      acceptedReceiptPath,
      acceptedReceiptShape: {
        schemaVersion: 'gustav-p1a-contract-amendment-approval-receipt-v0',
        runId,
        approvedCandidate,
        approvalText: requiredApprovalText,
        approvedAt: 'ISO-8601 timestamp',
      },
      rejectedImplicitCommands: candidate.approvalGate.rejectedImplicitCommands,
    },
    tempFixtureRoot,
    receiptProbes: probes,
    findings,
    allowedNextWork: [
      'Wait for exact user approval text before creating the real amendment approval receipt.',
      'After exact approval, write only the canonical receipt path and rerun this firewall audit.',
      'Only after a passing real receipt validation may Gustav promote the baseline candidate into active hash-lock.',
    ],
    forbiddenActions: [
      'Do not create p1a_contract_amendment_approval_receipt.json from DALSHE or other short continuation commands.',
      'Do not activate hash-lock from temp fixtures.',
      'Do not start P1B.',
      'Do not start French generation.',
      'Do not modify production app files from this firewall audit.',
    ],
    notes: [
      'This audit writes temp fixtures only under the OS temp directory and run reports under docs/gustav.',
      'A syntactically exact receipt outside the canonical run path is rejected.',
      'The real approval receipt is still absent, so active hash-lock remains unavailable.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_amended_approval_firewall_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1a_amended_approval_firewall_audit.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));

  console.log(`GUSTAV P1A amended approval firewall audit: ${audit.status}`);
  console.log(`Firewall passed: ${audit.summary.firewallPassed ? 'yes' : 'no'}`);
  console.log(`Real receipts present: ${audit.summary.realReceiptsPresent}`);
  console.log(`Implicit commands rejected: ${audit.summary.implicitCommandsRejected}`);
  console.log(`Can activate hash-lock now: ${audit.summary.canActivateHashLockNow ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
  if (audit.status === 'BLOCK') process.exit(1);
}

void main();
