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

type UnlockScenario = {
  id: string;
  description: string;
  p1aCompleted: boolean;
  receiptAtCanonicalPath: boolean;
  receiptShapeValid: boolean;
  approvalTextMatches: boolean;
  approvedFilesMatch: boolean;
  freshReadPerformed: boolean;
  dirtyOverlapPreserved: boolean;
  wouldUnlockP1B: boolean;
  expectedUnlock: boolean;
  rejectionReasons: string[];
};

type Audit = {
  schemaVersion: 'gustav-p1b-unlock-prerequisite-matrix-audit-v0';
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
    p1bDirtyOverlapSnapshotAudit: string;
    p1bApprovalReceiptFirewallAudit: string;
    p1bApprovalReceiptContractAudit: string;
    p1aTransactionSimulationAudit: string;
  };
  currentState: {
    p1aCompletionProofPresent: boolean;
    p1aProductionFilesPresent: number;
    realP1BReceiptPresent: boolean;
    freshReadReceiptPresent: boolean;
    dirtyOverlapStillDirty: boolean;
    dirtyOverlapPath: string;
  };
  summary: {
    scenarios: number;
    blockedScenarios: number;
    futureUnlockScenarios: number;
    missingPrerequisiteUnlocks: number;
    blockers: number;
    warnings: number;
    matrixPassed: boolean;
    andGateEnforced: boolean;
    p1aCompletionRequired: boolean;
    exactReceiptRequired: boolean;
    freshReadRequired: boolean;
    dirtyOverlapPreservationRequired: boolean;
    currentPrerequisitesComplete: boolean;
    canStartP1BNow: boolean;
    canApplyNow: boolean;
    mayStartFrenchGeneration: boolean;
    mayModifyProductionAppFiles: boolean;
    productionFilesStillAbsent: boolean;
  };
  unlockLogic: {
    requiredAllOf: string[];
    canonicalP1BReceiptPath: string;
    freshReadReceiptPath: string;
    p1aCompletionProofPath: string;
    allowedFiles: string[];
  };
  scenarios: UnlockScenario[];
  findings: Finding[];
  notes: string[];
};

const P1A_FILES = [
  'app/study_target.ts',
  'app/target_storage_keys.ts',
  'tests/gustav_surface_target_switch.test.ts',
  'tests/gustav_target_storage_keys.test.ts',
];

const P1B_FILES = [
  'app/(tabs)/settings.tsx',
  'app/spanish_content_gate.ts',
  'app/study_target_lang_dev.ts',
  'components/StudyTargetContext.tsx',
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

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function sameStringArray(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && expected.every((entry, index) => actual[index] === entry);
}

function evaluateScenario(input: Omit<UnlockScenario, 'wouldUnlockP1B' | 'rejectionReasons'>): UnlockScenario {
  const rejectionReasons: string[] = [];
  if (!input.p1aCompleted) rejectionReasons.push('p1a_not_completed');
  if (!input.receiptAtCanonicalPath) rejectionReasons.push('receipt_not_at_canonical_path');
  if (!input.receiptShapeValid) rejectionReasons.push('receipt_shape_invalid');
  if (!input.approvalTextMatches) rejectionReasons.push('approval_text_mismatch');
  if (!input.approvedFilesMatch) rejectionReasons.push('approved_files_mismatch');
  if (!input.freshReadPerformed) rejectionReasons.push('fresh_read_missing');
  if (!input.dirtyOverlapPreserved) rejectionReasons.push('dirty_overlap_not_preserved');
  const wouldUnlockP1B = rejectionReasons.length === 0;
  return {
    ...input,
    wouldUnlockP1B,
    rejectionReasons,
  };
}

function renderMarkdown(audit: Audit): string {
  const lines = [
    '# GUSTAV P1B Unlock Prerequisite Matrix Audit',
    '',
    `Run: \`${audit.runId}\``,
    '',
    `Status: \`${audit.status}\``,
    '',
    `Generated at: ${audit.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Scenarios: ${audit.summary.scenarios}`,
    `- Blocked scenarios: ${audit.summary.blockedScenarios}`,
    `- Future unlock scenarios: ${audit.summary.futureUnlockScenarios}`,
    `- Missing-prerequisite unlocks: ${audit.summary.missingPrerequisiteUnlocks}`,
    `- Matrix passed: ${audit.summary.matrixPassed ? 'yes' : 'no'}`,
    `- AND gate enforced: ${audit.summary.andGateEnforced ? 'yes' : 'no'}`,
    `- Current prerequisites complete: ${audit.summary.currentPrerequisitesComplete ? 'yes' : 'no'}`,
    `- Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Blockers: ${audit.summary.blockers}`,
    `- Warnings: ${audit.summary.warnings}`,
    '',
    '## Current State',
    '',
    `- P1A completion proof present: ${audit.currentState.p1aCompletionProofPresent ? 'yes' : 'no'}`,
    `- P1A production files present: ${audit.currentState.p1aProductionFilesPresent}`,
    `- Real P1B receipt present: ${audit.currentState.realP1BReceiptPresent ? 'yes' : 'no'}`,
    `- Fresh-read receipt present: ${audit.currentState.freshReadReceiptPresent ? 'yes' : 'no'}`,
    `- Dirty overlap still dirty: ${audit.currentState.dirtyOverlapStillDirty ? 'yes' : 'no'}`,
    '',
    '## Required AND Gate',
    '',
  ];

  for (const requirement of audit.unlockLogic.requiredAllOf) lines.push(`- ${requirement}`);

  lines.push('', '## Scenarios', '');
  for (const scenario of audit.scenarios) {
    lines.push(`- \`${scenario.id}\`: unlock=${scenario.wouldUnlockP1B ? 'yes' : 'no'}, expected=${scenario.expectedUnlock ? 'yes' : 'no'}, reasons=${scenario.rejectionReasons.length ? scenario.rejectionReasons.map((reason) => `\`${reason}\``).join(', ') : '`none`'}`);
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
    console.error('Usage: npx tsx scripts/gustav_p1b_unlock_prerequisite_matrix_audit.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const preflightPath = path.join(runDir, 'audits', 'p1b_preflight_audit.json');
  const dirtySnapshotPath = path.join(runDir, 'audits', 'p1b_dirty_overlap_snapshot_audit.json');
  const firewallPath = path.join(runDir, 'audits', 'p1b_approval_receipt_firewall_audit.json');
  const contractPath = path.join(runDir, 'audits', 'p1b_approval_receipt_contract_audit.json');
  const p1aSimulationPath = path.join(runDir, 'audits', 'p1a_transaction_simulation_audit.json');
  const preflight = readJson<Record<string, unknown>>(preflightPath);
  const dirtySnapshot = readJson<Record<string, unknown>>(dirtySnapshotPath);
  const firewall = readJson<Record<string, unknown>>(firewallPath);
  const contractAudit = readJson<Record<string, unknown>>(contractPath);
  const p1aSimulation = readJson<Record<string, unknown>>(p1aSimulationPath);
  const findings: Finding[] = [];

  const preflightSummary = object(preflight.summary);
  const dirtySummary = object(dirtySnapshot.summary);
  const firewallSummary = object(firewall.summary);
  const contractSummary = object(contractAudit.summary);
  const contract = object(contractAudit.approvalReceiptContract);
  const unlockScope = object(contract.unlockScope);
  const canonicalP1BReceiptPath = typeof contract.canonicalReceiptPath === 'string' ? contract.canonicalReceiptPath : '';
  const allowedFiles = arrayOfStrings(unlockScope.allowedFiles);
  const freshReadReceiptPath = path.join('docs/gustav/runs', runId, 'apply_plan/p1b_dirty_overlap_fresh_read_receipt.json');
  const p1aCompletionProofPath = path.join('docs/gustav/runs', runId, 'apply_plan/p1a_apply_completion_receipt.json');
  const p1aProductionFilesPresent = P1A_FILES.filter((filePath) => fs.existsSync(path.join(repoRoot, filePath))).length;
  const p1aCompletionProofPresent = fs.existsSync(path.join(repoRoot, p1aCompletionProofPath));
  const realP1BReceiptPresent = canonicalP1BReceiptPath ? fs.existsSync(path.join(repoRoot, canonicalP1BReceiptPath)) : false;
  const freshReadReceiptPresent = fs.existsSync(path.join(repoRoot, freshReadReceiptPath));
  const dirtyOverlapStillDirty =
    Number(dirtySummary.userOwnedDirtyFiles) === 1 &&
    Number(dirtySummary.filesWithHashChange) === 1 &&
    dirtySummary.dirtyOverlapPreserved === true;

  if (preflight.status !== 'PASS' || preflightSummary.requiresP1ACompletion !== true || preflightSummary.requiresExactP1BApproval !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_preflight_prerequisites_missing',
      message: 'P1B preflight must require P1A completion and exact P1B approval.',
      filePath: path.relative(repoRoot, preflightPath),
    });
  }
  if (dirtySnapshot.status !== 'PASS' || dirtySummary.requiresFreshReadBeforeEdit !== true || dirtyOverlapStillDirty !== true) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_dirty_overlap_not_preserved',
      message: 'P1B dirty overlap must remain preserved and require fresh read.',
      filePath: path.relative(repoRoot, dirtySnapshotPath),
    });
  }
  if (firewall.status !== 'PASS' || firewallSummary.approvalStillMissing !== true || firewallSummary.canStartP1BNow !== false) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_firewall_not_locked',
      message: 'P1B firewall must still be locked with approval missing.',
      filePath: path.relative(repoRoot, firewallPath),
    });
  }
  if (contractAudit.status !== 'PASS' || contractSummary.contractReady !== true || !sameStringArray(allowedFiles, P1B_FILES)) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_receipt_contract_not_ready',
      message: 'P1B receipt contract must be ready and scoped to the exact four P1B files.',
      filePath: path.relative(repoRoot, contractPath),
    });
  }
  if (p1aSimulation.status !== 'PASS' || object(p1aSimulation.summary).rolledBackFiles !== 4) {
    findings.push({
      severity: 'blocker',
      code: 'p1a_simulation_not_rolled_back',
      message: 'P1A transaction simulation must remain rolled back before P1B can be considered.',
      filePath: path.relative(repoRoot, p1aSimulationPath),
    });
  }

  const scenarios = [
    evaluateScenario({
      id: 'CURRENT-STATE',
      description: 'Current repo state before P1A completion, P1B receipt and fresh read.',
      p1aCompleted: p1aCompletionProofPresent,
      receiptAtCanonicalPath: realP1BReceiptPresent,
      receiptShapeValid: realP1BReceiptPresent,
      approvalTextMatches: realP1BReceiptPresent,
      approvedFilesMatch: sameStringArray(allowedFiles, P1B_FILES),
      freshReadPerformed: freshReadReceiptPresent,
      dirtyOverlapPreserved: dirtyOverlapStillDirty,
      expectedUnlock: false,
    }),
    evaluateScenario({
      id: 'EXACT-RECEIPT-WRONG-PATH',
      description: 'A receipt with the right shape but outside the canonical path.',
      p1aCompleted: false,
      receiptAtCanonicalPath: false,
      receiptShapeValid: true,
      approvalTextMatches: true,
      approvedFilesMatch: true,
      freshReadPerformed: false,
      dirtyOverlapPreserved: true,
      expectedUnlock: false,
    }),
    evaluateScenario({
      id: 'RECEIPT-WITHOUT-P1A',
      description: 'Canonical exact receipt shape exists, but P1A completion is missing.',
      p1aCompleted: false,
      receiptAtCanonicalPath: true,
      receiptShapeValid: true,
      approvalTextMatches: true,
      approvedFilesMatch: true,
      freshReadPerformed: true,
      dirtyOverlapPreserved: true,
      expectedUnlock: false,
    }),
    evaluateScenario({
      id: 'P1A-AND-RECEIPT-NO-FRESH-READ',
      description: 'P1A and exact receipt are present, but dirty overlap was not freshly re-read.',
      p1aCompleted: true,
      receiptAtCanonicalPath: true,
      receiptShapeValid: true,
      approvalTextMatches: true,
      approvedFilesMatch: true,
      freshReadPerformed: false,
      dirtyOverlapPreserved: true,
      expectedUnlock: false,
    }),
    evaluateScenario({
      id: 'P1A-RECEIPT-FRESH-READ-WRONG-FILES',
      description: 'P1A, receipt and fresh read are present, but receipt file scope is wrong.',
      p1aCompleted: true,
      receiptAtCanonicalPath: true,
      receiptShapeValid: true,
      approvalTextMatches: true,
      approvedFilesMatch: false,
      freshReadPerformed: true,
      dirtyOverlapPreserved: true,
      expectedUnlock: false,
    }),
    evaluateScenario({
      id: 'FUTURE-ALL-P1B-PREREQUISITES',
      description: 'The only future scenario that may unlock the narrow P1B slice.',
      p1aCompleted: true,
      receiptAtCanonicalPath: true,
      receiptShapeValid: true,
      approvalTextMatches: true,
      approvedFilesMatch: true,
      freshReadPerformed: true,
      dirtyOverlapPreserved: true,
      expectedUnlock: true,
    }),
  ];

  for (const scenario of scenarios.filter((entry) => entry.wouldUnlockP1B !== entry.expectedUnlock)) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_unlock_matrix_expectation_mismatch',
      message: `${scenario.id} unlock result ${String(scenario.wouldUnlockP1B)} did not match expected ${String(scenario.expectedUnlock)}.`,
    });
  }

  const missingPrerequisiteUnlocks = scenarios.filter((scenario) => {
    const hasMissingPrerequisite =
      !scenario.p1aCompleted ||
      !scenario.receiptAtCanonicalPath ||
      !scenario.receiptShapeValid ||
      !scenario.approvalTextMatches ||
      !scenario.approvedFilesMatch ||
      !scenario.freshReadPerformed ||
      !scenario.dirtyOverlapPreserved;
    return hasMissingPrerequisite && scenario.wouldUnlockP1B;
  }).length;
  if (missingPrerequisiteUnlocks > 0) {
    findings.push({
      severity: 'blocker',
      code: 'p1b_missing_prerequisite_unlocked',
      message: 'A P1B scenario unlocked despite missing at least one required prerequisite.',
    });
  }

  const currentPrerequisitesComplete =
    p1aCompletionProofPresent &&
    p1aProductionFilesPresent === P1A_FILES.length &&
    realP1BReceiptPresent &&
    freshReadReceiptPresent &&
    dirtyOverlapStillDirty;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const blockedScenarios = scenarios.filter((scenario) => !scenario.wouldUnlockP1B).length;
  const futureUnlockScenarios = scenarios.filter((scenario) => scenario.wouldUnlockP1B).length;
  const matrixPassed = blockers === 0 && missingPrerequisiteUnlocks === 0 && blockedScenarios === 5 && futureUnlockScenarios === 1;

  const audit: Audit = {
    schemaVersion: 'gustav-p1b-unlock-prerequisite-matrix-audit-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      p1bPreflightAudit: path.relative(repoRoot, preflightPath),
      p1bDirtyOverlapSnapshotAudit: path.relative(repoRoot, dirtySnapshotPath),
      p1bApprovalReceiptFirewallAudit: path.relative(repoRoot, firewallPath),
      p1bApprovalReceiptContractAudit: path.relative(repoRoot, contractPath),
      p1aTransactionSimulationAudit: path.relative(repoRoot, p1aSimulationPath),
    },
    currentState: {
      p1aCompletionProofPresent,
      p1aProductionFilesPresent,
      realP1BReceiptPresent,
      freshReadReceiptPresent,
      dirtyOverlapStillDirty,
      dirtyOverlapPath: 'app/(tabs)/settings.tsx',
    },
    summary: {
      scenarios: scenarios.length,
      blockedScenarios,
      futureUnlockScenarios,
      missingPrerequisiteUnlocks,
      blockers,
      warnings,
      matrixPassed,
      andGateEnforced: missingPrerequisiteUnlocks === 0,
      p1aCompletionRequired: true,
      exactReceiptRequired: true,
      freshReadRequired: true,
      dirtyOverlapPreservationRequired: true,
      currentPrerequisitesComplete,
      canStartP1BNow: false,
      canApplyNow: false,
      mayStartFrenchGeneration: false,
      mayModifyProductionAppFiles: false,
      productionFilesStillAbsent: P1A_FILES.every((filePath) => !fs.existsSync(path.join(repoRoot, filePath))),
    },
    unlockLogic: {
      requiredAllOf: [
        'P1A completion proof exists.',
        'Exact P1B receipt exists at the canonical run path.',
        'Receipt schema, run id, approval text and ordered file list match the P1B contract.',
        'Fresh-read receipt exists for app/(tabs)/settings.tsx after approval.',
        'The dirty overlap remains preserved until the approved edit starts.',
      ],
      canonicalP1BReceiptPath,
      freshReadReceiptPath,
      p1aCompletionProofPath,
      allowedFiles: P1B_FILES,
    },
    scenarios,
    findings,
    notes: [
      'This audit is a prerequisite matrix only; it does not create P1A completion proof, P1B approval receipt or fresh-read receipt.',
      'The future all-prerequisite scenario can unlock only the narrow four-file P1B slice, not French generation.',
      'The current repository state remains locked because P1A completion proof, real P1B receipt and fresh-read receipt are absent.',
      'Production app and test files remain untouched by this audit.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix_audit.json');
  const outMd = path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix_audit.md');
  const outReadme = path.join(runDir, 'audits', 'p1b_unlock_prerequisite_matrix', 'README.md');
  ensureDir(path.dirname(outJson));
  ensureDir(path.dirname(outReadme));
  fs.writeFileSync(outJson, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(audit));
  fs.writeFileSync(outReadme, renderMarkdown(audit));

  console.log(`GUSTAV P1B unlock prerequisite matrix audit: ${audit.status}`);
  console.log(`Scenarios: ${audit.summary.scenarios}`);
  console.log(`Blocked scenarios: ${audit.summary.blockedScenarios}`);
  console.log(`Future unlock scenarios: ${audit.summary.futureUnlockScenarios}`);
  console.log(`Missing-prerequisite unlocks: ${audit.summary.missingPrerequisiteUnlocks}`);
  console.log(`AND gate enforced: ${audit.summary.andGateEnforced ? 'yes' : 'no'}`);
  console.log(`Current prerequisites complete: ${audit.summary.currentPrerequisitesComplete ? 'yes' : 'no'}`);
  console.log(`Can start P1B now: ${audit.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`May start French generation: ${audit.summary.mayStartFrenchGeneration ? 'yes' : 'no'}`);
  console.log(`Report: ${path.relative(repoRoot, outJson)}`);

  if (blockers > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
