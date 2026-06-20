import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';

type CurrentApplyStateAudit = {
  schemaVersion: 'gustav-p1a-current-apply-state-audit-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  summary: Record<string, unknown>;
  files: Array<{
    targetPath: string;
    expectedSha256: string;
    actualSha256: string | null;
    newlineStableSha256: string | null;
    gitStatus: string;
    exactHashMatch: boolean;
    newlineStableHashMatch: boolean;
    completionEligible: boolean;
  }>;
  unexpectedAppTestStatus: string[];
};

type ReadinessGate = {
  schemaVersion: 'gustav-readiness-gate-v0';
  runId: string;
  generatedAt: string;
  decision: 'GO' | 'HOLD' | 'BLOCK';
  readiness: {
    canStartFrenchGeneration: boolean;
    canStartProductionApply: boolean;
    canContinueArchitectureWork: boolean;
    nextRecommendedMode: string;
    nextRecommendedWork: string[];
  };
  summary: Record<string, unknown>;
  checks: Array<{
    id: string;
    title: string;
    status: 'PASS' | 'FAIL';
    detail: string;
    requiredBeforeWork: string[];
  }>;
};

type ApplyPlan = {
  schemaVersion: 'gustav-apply-file-changes-v0';
  status: Status;
  approvalStatus: string;
  mayModifyProductionAppFiles: boolean;
  summary: Record<string, unknown>;
};

type ReconciledFile = {
  targetPath: string;
  currentGitStatus: string;
  oldBlueprintSha256: string;
  currentSha256: string | null;
  currentNewlineStableSha256: string | null;
  matchesOldBlueprint: boolean;
  completionEligibleUnderOldBlueprint: boolean;
  candidateForReplacementBaseline: boolean;
  requiredAction: string;
};

type Packet = {
  schemaVersion: 'gustav-p1a-reconciliation-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  sourceArtifacts: {
    currentApplyStateAudit: string;
    readinessGate: string;
    applyPlan: string;
  };
  summary: {
    p1aFiles: number;
    p1aFilesPresent: number;
    p1aFilesCleanInGit: number;
    p1aFilesDriftedFromOldBlueprint: number;
    unexpectedAppTestStatusLines: number;
    readinessFailedChecks: number;
    applyPlanDirtyOverlaps: number;
    applyPlanBlockers: number;
    canCreateLegacyP1ACompletionReceipt: boolean;
    canCreateReplacementBaselineWithoutApproval: boolean;
    canStartP1BNow: boolean;
    canStartFrenchGeneration: boolean;
    canModifyProductionAppFiles: boolean;
    canContinueArchitectureWork: boolean;
  };
  p1aFiles: ReconciledFile[];
  failedReadinessChecks: Array<{
    id: string;
    title: string;
    detail: string;
    requiredBeforeWork: string[];
  }>;
  dirtyWorktreeContext: {
    unexpectedAppTestStatusLines: number;
    unexpectedAppTestStatus: string[];
    handlingRule: string;
  };
  reconciliationDecision: {
    decision: 'replace_stale_p1a_blueprint_requires_explicit_approval';
    reason: string;
    approvalTextRequired: string;
    approvalDoesNotUnlock: string[];
  };
  allowedNextWork: string[];
  forbiddenActions: string[];
  nextArtifactsToCreate: string[];
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

function n(summary: Record<string, unknown>, key: string): number {
  return typeof summary[key] === 'number' ? summary[key] as number : 0;
}

function bool(summary: Record<string, unknown>, key: string): boolean {
  return summary[key] === true;
}

function artifactPath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function renderMarkdown(packet: Packet): string {
  const lines = [
    '# GUSTAV P1A Reconciliation Packet',
    '',
    `Run: \`${packet.runId}\``,
    '',
    `Status: \`${packet.status}\``,
    '',
    `Generated at: ${packet.generatedAt}`,
    '',
    '## Summary',
    '',
    `- P1A files: ${packet.summary.p1aFiles}`,
    `- P1A files present: ${packet.summary.p1aFilesPresent}`,
    `- P1A files clean in git: ${packet.summary.p1aFilesCleanInGit}`,
    `- P1A files drifted from old blueprint: ${packet.summary.p1aFilesDriftedFromOldBlueprint}`,
    `- Unexpected app/test status lines: ${packet.summary.unexpectedAppTestStatusLines}`,
    `- Readiness failed checks: ${packet.summary.readinessFailedChecks}`,
    `- Apply plan dirty overlaps: ${packet.summary.applyPlanDirtyOverlaps}`,
    `- Apply plan blockers: ${packet.summary.applyPlanBlockers}`,
    `- Can create legacy P1A completion receipt: ${packet.summary.canCreateLegacyP1ACompletionReceipt ? 'yes' : 'no'}`,
    `- Can create replacement baseline without approval: ${packet.summary.canCreateReplacementBaselineWithoutApproval ? 'yes' : 'no'}`,
    `- Can start P1B now: ${packet.summary.canStartP1BNow ? 'yes' : 'no'}`,
    `- Can start French generation: ${packet.summary.canStartFrenchGeneration ? 'yes' : 'no'}`,
    `- Can modify production app files: ${packet.summary.canModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Can continue architecture work: ${packet.summary.canContinueArchitectureWork ? 'yes' : 'no'}`,
    '',
    '## Decision',
    '',
    `Decision: \`${packet.reconciliationDecision.decision}\``,
    '',
    packet.reconciliationDecision.reason,
    '',
    'Approval text required:',
    '',
    `\`${packet.reconciliationDecision.approvalTextRequired}\``,
    '',
    'This approval would not unlock:',
    '',
    ...packet.reconciliationDecision.approvalDoesNotUnlock.map((item) => `- ${item}`),
    '',
    '## P1A Files',
    '',
    ...packet.p1aFiles.flatMap((file) => [
      `### ${file.targetPath}`,
      '',
      `- Git status: \`${file.currentGitStatus}\``,
      `- Old blueprint SHA-256: \`${file.oldBlueprintSha256}\``,
      `- Current SHA-256: \`${file.currentSha256 || 'missing'}\``,
      `- Current newline-stable SHA-256: \`${file.currentNewlineStableSha256 || 'missing'}\``,
      `- Matches old blueprint: ${file.matchesOldBlueprint ? 'yes' : 'no'}`,
      `- Completion eligible under old blueprint: ${file.completionEligibleUnderOldBlueprint ? 'yes' : 'no'}`,
      `- Candidate for replacement baseline: ${file.candidateForReplacementBaseline ? 'yes' : 'no'}`,
      `- Required action: ${file.requiredAction}`,
      '',
    ]),
    '## Failed Readiness Checks',
    '',
    ...packet.failedReadinessChecks.flatMap((check) => [
      `### ${check.id}: ${check.title}`,
      '',
      check.detail,
      '',
      'Required before work:',
      ...check.requiredBeforeWork.map((item) => `- ${item}`),
      '',
    ]),
    '## Dirty Worktree Context',
    '',
    packet.dirtyWorktreeContext.handlingRule,
    '',
    ...packet.dirtyWorktreeContext.unexpectedAppTestStatus.map((line) => `- \`${line}\``),
    '',
    '## Allowed Next Work',
    '',
    ...packet.allowedNextWork.map((item) => `- ${item}`),
    '',
    '## Forbidden Actions',
    '',
    ...packet.forbiddenActions.map((item) => `- ${item}`),
    '',
    '## Next Artifacts',
    '',
    ...packet.nextArtifactsToCreate.map((item) => `- ${item}`),
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
    console.error('Usage: npx tsx scripts/gustav_p1a_reconciliation_packet.ts --run docs/gustav/runs/<runId>');
    process.exit(1);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);

  const currentAuditPath = path.join(runDir, 'audits', 'p1a_current_apply_state_audit.json');
  const readinessGatePath = path.join(runDir, 'audits', 'gustav_readiness_gate.json');
  const applyPlanPath = path.join(runDir, 'apply_plan', 'file_changes.json');

  const currentAudit = readJson<CurrentApplyStateAudit>(currentAuditPath);
  const readinessGate = readJson<ReadinessGate>(readinessGatePath);
  const applyPlan = readJson<ApplyPlan>(applyPlanPath);

  const p1aFiles = currentAudit.files.map((file): ReconciledFile => ({
    targetPath: file.targetPath,
    currentGitStatus: file.gitStatus,
    oldBlueprintSha256: file.expectedSha256,
    currentSha256: file.actualSha256,
    currentNewlineStableSha256: file.newlineStableSha256,
    matchesOldBlueprint: file.exactHashMatch || file.newlineStableHashMatch,
    completionEligibleUnderOldBlueprint: file.completionEligible,
    candidateForReplacementBaseline: file.actualSha256 !== null && file.gitStatus === 'clean',
    requiredAction: file.completionEligible
      ? 'Keep under old P1A blueprint.'
      : 'Review current implementation against the P1A contract, then either approve a replacement baseline or create a rework packet.',
  }));

  const failedReadinessChecks = readinessGate.checks
    .filter((check) => check.status === 'FAIL')
    .map((check) => ({
      id: check.id,
      title: check.title,
      detail: check.detail,
      requiredBeforeWork: check.requiredBeforeWork,
    }));

  const p1aFilesPresent = n(currentAudit.summary, 'presentFiles');
  const p1aFilesCleanInGit = p1aFiles.filter((file) => file.currentGitStatus === 'clean').length;
  const p1aFilesDriftedFromOldBlueprint = p1aFiles.filter((file) => !file.matchesOldBlueprint).length;
  const canCreateLegacyP1ACompletionReceipt =
    bool(currentAudit.summary, 'canWriteP1ACompletionReceipt') &&
    p1aFilesDriftedFromOldBlueprint === 0 &&
    n(currentAudit.summary, 'unexpectedAppTestStatusLines') === 0;

  const approvalTextRequired = [
    `User approved replacing the stale P1A blueprint for ${runId}`,
    `with the current P1A implementation hashes recorded in docs/gustav/runs/${runId}/audits/p1a_reconciliation_packet.json.`,
    'This approval is for P1A baseline reconciliation only and does not approve P1B, production apply, or French generation.',
  ].join(' ');

  const packet: Packet = {
    schemaVersion: 'gustav-p1a-reconciliation-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: 'HOLD',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    sourceArtifacts: {
      currentApplyStateAudit: artifactPath(repoRoot, currentAuditPath),
      readinessGate: artifactPath(repoRoot, readinessGatePath),
      applyPlan: artifactPath(repoRoot, applyPlanPath),
    },
    summary: {
      p1aFiles: p1aFiles.length,
      p1aFilesPresent,
      p1aFilesCleanInGit,
      p1aFilesDriftedFromOldBlueprint,
      unexpectedAppTestStatusLines: n(currentAudit.summary, 'unexpectedAppTestStatusLines'),
      readinessFailedChecks: failedReadinessChecks.length,
      applyPlanDirtyOverlaps: n(applyPlan.summary, 'dirtyWorktreeOverlaps'),
      applyPlanBlockers: n(applyPlan.summary, 'blockers'),
      canCreateLegacyP1ACompletionReceipt,
      canCreateReplacementBaselineWithoutApproval: false,
      canStartP1BNow: false,
      canStartFrenchGeneration: false,
      canModifyProductionAppFiles: false,
      canContinueArchitectureWork: true,
    },
    p1aFiles,
    failedReadinessChecks,
    dirtyWorktreeContext: {
      unexpectedAppTestStatusLines: currentAudit.unexpectedAppTestStatus.length,
      unexpectedAppTestStatus: currentAudit.unexpectedAppTestStatus,
      handlingRule: 'Treat every non-P1A app/test/component status line as user-owned or unrelated until explicitly assigned to Gustav. Do not revert or overwrite it.',
    },
    reconciliationDecision: {
      decision: 'replace_stale_p1a_blueprint_requires_explicit_approval',
      reason: 'The four P1A files are present and clean in git, but none matches the old locked blueprint hash. Gustav cannot honestly close the old P1A transaction. The only safe continuation is to review the current implementation as a replacement baseline or prepare a rework packet.',
      approvalTextRequired,
      approvalDoesNotUnlock: [
        'P1B writes',
        'production app writes outside an explicitly approved narrow slice',
        'French generation',
        'apply_plan/file_changes.json production execution',
      ],
    },
    allowedNextWork: [
      'Audit the current P1A implementation against p1a_core_contract_spec before accepting it as the new baseline.',
      'If the current implementation passes review, create a replacement P1A hash-lock artifact in the run folder and request the exact approval text recorded in this packet.',
      'If the current implementation fails review, create a rework packet that touches only the P1A files and preserves all unrelated dirty work.',
      'After an approved replacement baseline exists, rerun p1a_current_apply_state_audit, gustav_validate_run and gustav_readiness_gate.',
    ],
    forbiddenActions: [
      'Do not create p1a_apply_completion_receipt.json from the stale old blueprint.',
      'Do not create a P1B approval receipt, fresh-read receipt or post-write proof from this packet.',
      'Do not modify production app files as part of reconciliation packet generation.',
      'Do not start French generation while readiness remains HOLD.',
      'Do not treat unrelated dirty worktree entries as Gustav-owned changes.',
    ],
    nextArtifactsToCreate: [
      `docs/gustav/runs/${runId}/audits/p1a_current_impl_contract_audit.json`,
      `docs/gustav/runs/${runId}/audits/p1a_current_impl_contract_audit.md`,
      `docs/gustav/runs/${runId}/audits/p1a_replacement_baseline_hash_lock_audit.json only after current implementation review passes`,
      `docs/gustav/runs/${runId}/apply_plan/p1a_replacement_baseline_approval_receipt.json only after exact user approval`,
    ],
    notes: [
      'This packet is architecture-mode work. It records the next safe path and does not grant apply permission.',
      'The run validator can pass while readiness remains HOLD; readiness remains authoritative for generation and apply.',
      'Current P1A files being clean in git does not prove they are approved under Gustav. It only makes them eligible for review as a replacement baseline.',
    ],
  };

  const outJson = path.join(runDir, 'audits', 'p1a_reconciliation_packet.json');
  const outMd = path.join(runDir, 'audits', 'p1a_reconciliation_packet.md');
  ensureDir(path.dirname(outJson));
  fs.writeFileSync(outJson, `${JSON.stringify(packet, null, 2)}\n`);
  fs.writeFileSync(outMd, renderMarkdown(packet));

  console.log(`GUSTAV P1A reconciliation packet: ${packet.status}`);
  console.log(`P1A files drifted from old blueprint: ${packet.summary.p1aFilesDriftedFromOldBlueprint}`);
  console.log(`Readiness failed checks: ${packet.summary.readinessFailedChecks}`);
  console.log(`Can start P1B now: ${packet.summary.canStartP1BNow ? 'yes' : 'no'}`);
  console.log(`Report: ${artifactPath(repoRoot, outJson)}`);
}

void main();
