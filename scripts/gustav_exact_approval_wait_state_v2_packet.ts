import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type WaitState =
  | 'exact_approval_wait_state_ready'
  | 'exact_approval_source_present_ready_for_p31_create'
  | 'blocked_by_findings';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedState: WaitState;
  waitState: WaitState;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  targetLocale: string;
  requiredApprovalSentence: string;
  masterStatus: string;
  masterBlockers: number;
  masterReadyForApply: boolean;
  masterMayModifyProductionAppFiles: boolean;
  p49Ready: boolean;
  p50Ready: boolean;
  p51Ready: boolean;
  p52Ready: boolean;
  p53Ready: boolean;
  p54Ready: boolean;
  p55Ready: boolean;
  p56Ready: boolean;
  p57Ready: boolean;
  p58Ready: boolean;
  p59Ready: boolean;
  p60Ready: boolean;
  p61Ready: boolean;
  p62Ready: boolean;
  p63Ready: boolean;
  p64Ready: boolean;
  p49RequirementsProved: number;
  p49RequirementsProductionLocked: number;
  p49RequirementsMissing: number;
  p49RequirementsContradicted: number;
  p64CommandAllowedNow: boolean;
  p64CommandExecutedByThisScript: boolean;
  approvalSourcePath: string;
  defaultApprovalSourcePath: string;
  approvalSourceIsCanonical: boolean;
  approvalSourceExists: boolean;
  approvalSourceContainsExactSentence: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  activationApproved: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
  productionWritesAllowed: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  downloadablePacksPublished: boolean;
  runtimeDownloadsEnabled: boolean;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  waitState: WaitState;
  closedEvidenceReady: boolean;
  exactApprovalStillRequired: boolean;
  exactApprovalSourcePresent: boolean;
  exactApprovalSourceContainsExactSentence: boolean;
  requiredApprovalSentencePresent: boolean;
  requiredApprovalSentenceSha256: string;
  approvalSourcePath: string;
  defaultApprovalSourcePath: string;
  approvalSourceIsCanonical: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  nextProductionStep: string;
  p49RequirementsProved: number;
  p49RequirementsProductionLocked: number;
  p49RequirementsMissing: number;
  p49RequirementsContradicted: number;
  p64CommandAllowedNow: boolean;
  p64CommandExecutedByThisScript: boolean;
  activationApproved: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  productionWritesAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  downloadablePacksPublished: false;
  runtimeDownloadsEnabled: false;
  storageMigrationAllowed: false;
  cloudSyncMigrationAllowed: false;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-exact-approval-wait-state-v2-packet-v0';
  runId: string;
  generatedAt: string;
  status: Status;
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  summary: Evaluation & {
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  waitStateContract: {
    dryRunOnly: true;
    createsActiveApprovalArtifacts: false;
    executesApplyCommand: false;
    requiresExactApprovalSourceForP31: true;
    exactApprovalSourcePath: string;
    defaultApprovalSourcePath: string;
    approvalSourceIsCanonical: boolean;
    requiredApprovalSentenceSha256: string;
  };
  nextRequiredActions: string[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    applyCommandExecutedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(report: JsonObject): JsonObject {
  return object(report.summary);
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function masterActionableBlockerCount(master: JsonObject): number {
  const findings = Array.isArray(master.findings) ? master.findings : [];
  return findings
    .map(object)
    .filter((finding) => s(finding, 'severity').toLowerCase() === 'blocker')
    .filter((finding) => {
      const code = s(finding, 'code');
      return !(
        code.startsWith('exact_approval_') ||
        code.startsWith('ordered_approval_wait_refresh_v2_') ||
        code.startsWith('safe_preapproval_continuation_v2_') ||
        code.startsWith('runtime_server_manifest_consistency_recheck_v2_') ||
        code.startsWith('language_isolation_regression_recheck_v2_') ||
        code.startsWith('runtime_delivery_evidence_chain_v2_') ||
        code.startsWith('explicit_approval_receipt_hash_lock_gate_v2_') ||
        code.startsWith('nonproduction_blocker_closure_plan_v2_') ||
        code.startsWith('nonproduction_evidence_refresh_v2_')
      );
    })
    .length;
}

function allClosedEvidenceReady(input: EvaluationInput): boolean {
  return (
    input.p49Ready &&
    input.p50Ready &&
    input.p51Ready &&
    input.p52Ready &&
    input.p53Ready &&
    input.p54Ready &&
    input.p55Ready &&
    input.p56Ready &&
    input.p57Ready &&
    input.p58Ready &&
    input.p59Ready &&
    input.p60Ready &&
    input.p61Ready &&
    input.p62Ready &&
    input.p63Ready &&
    input.p64Ready &&
    input.p49RequirementsProved >= 8 &&
    input.p49RequirementsProductionLocked > 0 &&
    input.p49RequirementsMissing === 0 &&
    input.p49RequirementsContradicted === 0
  );
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const closedEvidenceReady = allClosedEvidenceReady(input);

  if (input.targetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'TARGET_LOCALE_NOT_FR', 'P65 is only valid for studyTarget=fr.');
  }
  if (input.requiredApprovalSentence.trim() === '') {
    addFinding(findings, 'blocker', 'REQUIRED_APPROVAL_SENTENCE_MISSING', 'P30 must expose the exact required approval sentence.');
  }
  if (input.masterStatus !== 'HOLD' || input.masterBlockers !== 0 || input.masterReadyForApply || input.masterMayModifyProductionAppFiles) {
    addFinding(findings, 'blocker', 'MASTER_NOT_IN_CLOSED_HOLD_STATE', 'Master must be HOLD with zero blockers while apply and production mutation flags stay closed.');
  }
  if (!closedEvidenceReady) {
    addFinding(findings, 'blocker', 'CLOSED_EVIDENCE_CHAIN_NOT_READY', 'P49-P64 must all be ready before the exact-approval wait state can be considered stable.');
  }
  if (!input.approvalSourceIsCanonical) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_NOT_CANONICAL', 'P65 can only wait on the run-scoped apply_plan/explicit_approval_input_v2.txt source.');
  }
  if (input.approvalSourceExists && !input.approvalSourceContainsExactSentence) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_EXISTS_WITHOUT_EXACT_SENTENCE', 'The approval source file exists but does not contain the exact required approval sentence.');
  }
  if (input.activeApprovalReceiptExists || input.activeHashLockExists) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACTS_ALREADY_EXIST', 'P65 is a pre-activation wait-state gate and must not run after active approval artifacts exist.');
  }
  if (input.p64CommandExecutedByThisScript) {
    addFinding(findings, 'blocker', 'P64_COMMAND_EXECUTED_UNEXPECTEDLY', 'P64 may record the safe continuation command but must not execute it.');
  }
  if (
    input.activationApproved ||
    input.readyForApply ||
    input.mayModifyProductionAppFiles ||
    input.productionWritesAllowed ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.downloadablePacksPublished ||
    input.runtimeDownloadsEnabled ||
    input.storageMigrationAllowed ||
    input.cloudSyncMigrationAllowed
  ) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'Exact approval wait state must keep all production/apply/upload/runtime/storage/cloud flags closed.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const waitState: WaitState = blockers > 0
    ? 'blocked_by_findings'
    : input.approvalSourceContainsExactSentence
      ? 'exact_approval_source_present_ready_for_p31_create'
      : 'exact_approval_wait_state_ready';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      waitState,
      closedEvidenceReady,
      exactApprovalStillRequired: !input.approvalSourceContainsExactSentence,
      exactApprovalSourcePresent: input.approvalSourceExists,
      exactApprovalSourceContainsExactSentence: input.approvalSourceContainsExactSentence,
      requiredApprovalSentencePresent: input.requiredApprovalSentence.trim() !== '',
      requiredApprovalSentenceSha256: sha256(input.requiredApprovalSentence),
      approvalSourcePath: input.approvalSourcePath,
      defaultApprovalSourcePath: input.defaultApprovalSourcePath,
      approvalSourceIsCanonical: input.approvalSourceIsCanonical,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      nextProductionStep: input.approvalSourceContainsExactSentence
        ? 'run_p31_create_active_receipt_gate'
        : 'wait_for_exact_approval_source_file',
      p49RequirementsProved: input.p49RequirementsProved,
      p49RequirementsProductionLocked: input.p49RequirementsProductionLocked,
      p49RequirementsMissing: input.p49RequirementsMissing,
      p49RequirementsContradicted: input.p49RequirementsContradicted,
      p64CommandAllowedNow: input.p64CommandAllowedNow,
      p64CommandExecutedByThisScript: input.p64CommandExecutedByThisScript,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      productionWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      blockers,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
    },
    findings,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{ id: string; expectedState: WaitState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_wait_state_ready', expectedState: 'exact_approval_wait_state_ready', mutate: () => undefined },
    { id: 'exact_source_present_routes_to_p31', expectedState: 'exact_approval_source_present_ready_for_p31_create', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = true; } },
    { id: 'missing_p49_chain_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p49Ready = false; } },
    { id: 'master_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.masterBlockers = 1; } },
    { id: 'invalid_approval_source_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = false; } },
    { id: 'noncanonical_approval_source_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.approvalSourcePath = path.join(path.dirname(input.defaultApprovalSourcePath), '..', 'approval.txt'); input.approvalSourceIsCanonical = false; } },
    { id: 'active_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'activation_flag_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activationApproved = true; } },
    { id: 'runtime_download_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
  ];

  return cases.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    const result = evaluate(fixture);
    const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
    return {
      id: test.id,
      expectedState: test.expectedState,
      waitState: result.evaluation.waitState,
      blockers,
      passed: result.evaluation.waitState === test.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Exact Approval Wait State V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    `Status: ${report.status}`,
    '',
    '## Summary',
    '',
    `- Wait state: ${report.summary.waitState}`,
    `- Closed evidence ready: ${report.summary.closedEvidenceReady ? 'yes' : 'no'}`,
    `- Exact approval still required: ${report.summary.exactApprovalStillRequired ? 'yes' : 'no'}`,
    `- Approval source path: ${report.summary.approvalSourcePath}`,
    `- Approval source canonical: ${report.summary.approvalSourceIsCanonical ? 'yes' : 'no'}`,
    `- Approval source exact sentence present: ${report.summary.exactApprovalSourceContainsExactSentence ? 'yes' : 'no'}`,
    `- Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- P49 proved/locked/missing/contradicted: ${report.summary.p49RequirementsProved}/${report.summary.p49RequirementsProductionLocked}/${report.summary.p49RequirementsMissing}/${report.summary.p49RequirementsContradicted}`,
    `- P64 command allowed/executed: ${report.summary.p64CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p64CommandExecutedByThisScript ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    '',
    '## Next Required Actions',
    '',
    ...report.nextRequiredActions.map((item) => `- ${item}`),
    '',
    '## Findings',
    '',
    ...(report.findings.length === 0
      ? ['- none']
      : report.findings.map((finding) => `- ${finding.severity}: ${finding.code} - ${finding.message}`)),
    '',
  ];
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const applyPlanDir = path.join(runDir, 'apply_plan');
  const reviewerDir = path.join(runDir, 'generated/fr/reviewer');
  const defaultApprovalSourcePath = path.join(applyPlanDir, 'explicit_approval_input_v2.txt');

  const masterPath = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const p30Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const p52Path = path.join(auditsDir, 'exact_approval_source_firewall_v2_packet.json');
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_wait_state_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_wait_state_v2_packet.md');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_wait_state_dry_run_v2.json');

  const master = readJsonOrEmpty(masterPath);
  const p30 = readJsonOrEmpty(p30Path);
  const p52 = readJsonOrEmpty(p52Path);
  const masterSummary = summaryOf(master);
  const p52Summary = summaryOf(p52);
  const requiredApprovalSentence = s(p30, 'requiredApprovalSentence');
  const approvalSourcePath = s(p52Summary, 'approvalSourcePath') ||
    rel(repoRoot, defaultApprovalSourcePath);
  const approvalSourceIsCanonical = path.resolve(repoRoot, approvalSourcePath) === path.resolve(defaultApprovalSourcePath);

  const input: EvaluationInput = {
    targetLocale: target,
    requiredApprovalSentence,
    masterStatus: s(master, 'status'),
    masterBlockers: masterActionableBlockerCount(master),
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    p49Ready: b(masterSummary, 'productionReadinessCompletionAuditV2Ready'),
    p50Ready: b(masterSummary, 'finalPreapprovalEvidenceHashLockV2Ready'),
    p51Ready: b(masterSummary, 'exactApprovalApplyRehearsalV2Ready'),
    p52Ready: b(masterSummary, 'exactApprovalSourceFirewallV2Ready'),
    p53Ready: b(masterSummary, 'exactApprovalSourceIntakeTransitionV2Ready'),
    p54Ready: b(masterSummary, 'exactApprovalActiveArtifactPairSimulationV2Ready'),
    p55Ready: b(masterSummary, 'exactApprovalP31CreateCommandPreflightV2Ready'),
    p56Ready: b(masterSummary, 'exactApprovalP44ValidationCommandPreflightV2Ready'),
    p57Ready: b(masterSummary, 'exactApprovalP44ToP45SequenceHandoffSimulationV2Ready'),
    p58Ready: b(masterSummary, 'exactApprovalP45SequenceCommandPreflightV2Ready'),
    p59Ready: b(masterSummary, 'exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Ready'),
    p60Ready: b(masterSummary, 'exactApprovalP46ApplyTransactionCommandPreflightV2Ready'),
    p61Ready: b(masterSummary, 'exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Ready'),
    p62Ready: b(masterSummary, 'exactApprovalP47RollbackGuardCommandPreflightV2Ready'),
    p63Ready: b(masterSummary, 'exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Ready'),
    p64Ready: b(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2Ready'),
    p49RequirementsProved: n(masterSummary, 'productionReadinessCompletionAuditV2RequirementsProved'),
    p49RequirementsProductionLocked: n(masterSummary, 'productionReadinessCompletionAuditV2RequirementsProductionLocked'),
    p49RequirementsMissing: n(masterSummary, 'productionReadinessCompletionAuditV2RequirementsMissing'),
    p49RequirementsContradicted: n(masterSummary, 'productionReadinessCompletionAuditV2RequirementsContradicted'),
    p64CommandAllowedNow: b(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2CommandAllowedNow'),
    p64CommandExecutedByThisScript: b(masterSummary, 'exactApprovalP48SafeContinuationCommandPreflightV2CommandExecutedByThisScript'),
    approvalSourcePath,
    defaultApprovalSourcePath: rel(repoRoot, defaultApprovalSourcePath),
    approvalSourceIsCanonical,
    approvalSourceExists: b(p52Summary, 'approvalSourceExists'),
    approvalSourceContainsExactSentence: b(p52Summary, 'approvalSourceContainsExactSentence'),
    activeApprovalReceiptExists: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExists: fs.existsSync(activeHashLockPath),
    activationApproved: b(masterSummary, 'activationApproved'),
    readyForApply: b(masterSummary, 'readyForApply'),
    mayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    productionWritesAllowed: b(masterSummary, 'productionWritesAllowed'),
    serverUploadAllowed: b(masterSummary, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(masterSummary, 'firebaseUploadAllowed'),
    downloadablePacksPublished: b(masterSummary, 'downloadablePacksPublished'),
    runtimeDownloadsEnabled: b(masterSummary, 'runtimeDownloadsEnabled'),
    storageMigrationAllowed: b(masterSummary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(masterSummary, 'cloudSyncMigrationAllowed'),
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const failedProbes = probes.filter((probe) => !probe.passed);
  if (failedProbes.length > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${failedProbes.length} fixture probe(s) failed.`);
  }
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const finalEvaluation: Evaluation = {
    ...evaluation,
    waitState: blockers > 0 ? 'blocked_by_findings' : evaluation.waitState,
    blockers,
    warnings,
  };

  const dryRun = {
    schemaVersion: 'gustav-exact-approval-wait-state-dry-run-v2-v0',
    generatedAt: new Date().toISOString(),
    runId,
    targetLocale: 'fr',
    dryRunOnly: true,
    waitState: finalEvaluation.waitState,
    exactApprovalStillRequired: finalEvaluation.exactApprovalStillRequired,
    approvalSourcePath,
    defaultApprovalSourcePath: rel(repoRoot, defaultApprovalSourcePath),
    approvalSourceIsCanonical,
    requiredApprovalSentenceSha256: finalEvaluation.requiredApprovalSentenceSha256,
    createsActiveApprovalArtifacts: false,
    executesApplyCommand: false,
    enablesRuntimeDownloads: false,
    startsStorageOrCloudMigration: false,
  };
  writeJson(dryRunPath, dryRun);

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-wait-state-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers === 0 ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      masterManifest: rel(repoRoot, masterPath),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, p30Path),
      exactApprovalSourceFirewallV2Packet: rel(repoRoot, p52Path),
      activeApprovalReceipt: rel(repoRoot, activeApprovalReceiptPath),
      activeHashLock: rel(repoRoot, activeHashLockPath),
    },
    outputs: {
      waitStatePacketJson: rel(repoRoot, outputJsonPath),
      waitStatePacketMarkdown: rel(repoRoot, outputMdPath),
      waitStateDryRun: rel(repoRoot, dryRunPath),
    },
    summary: {
      ...finalEvaluation,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    waitStateContract: {
      dryRunOnly: true,
      createsActiveApprovalArtifacts: false,
      executesApplyCommand: false,
      requiresExactApprovalSourceForP31: true,
      exactApprovalSourcePath: approvalSourcePath,
      defaultApprovalSourcePath: rel(repoRoot, defaultApprovalSourcePath),
      approvalSourceIsCanonical,
      requiredApprovalSentenceSha256: finalEvaluation.requiredApprovalSentenceSha256,
    },
    nextRequiredActions: finalEvaluation.waitState === 'exact_approval_source_present_ready_for_p31_create'
      ? [
          'Run P31 active receipt creation gate only from the exact approval source file.',
          'Then run P44-P47/P45/P46 sequencing gates before any production apply, upload, runtime download, migration or activation flag.',
        ]
      : [
          'Wait for the exact approval source file containing the exact P30 sentence.',
          'Continue safe non-production audits only; do not create active approval artifacts from plain continue prompts.',
          'Keep activationApproved=false, readyForApply=false and all upload/download/migration flags closed.',
        ],
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      applyCommandExecutedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval wait state V2 packet: ${report.status}`);
  console.log(`Wait state: ${report.summary.waitState}`);
  console.log(`Closed evidence ready: ${report.summary.closedEvidenceReady ? 'yes' : 'no'}`);
  console.log(`Exact approval still required: ${report.summary.exactApprovalStillRequired ? 'yes' : 'no'}`);
  console.log(`Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (report.status === 'BLOCK') process.exitCode = 1;
}

main();
