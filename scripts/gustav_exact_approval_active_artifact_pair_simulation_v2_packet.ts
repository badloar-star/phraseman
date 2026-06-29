import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedState: string;
  pairSimulationState: string;
  blockers: number;
  passed: boolean;
};

type SimulatedReceipt = {
  runId: string;
  targetLocale: string;
  requiredApprovalSentence: string;
  requiredApprovalSentenceSha256: string;
  approvalSourcePath: string;
  hashLockDryRunPath: string;
  finalPreapprovalEvidenceHashLockDryRunPath: string;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
  activationApproved: boolean;
};

type SimulatedHashLock = {
  runId: string;
  targetLocale: string;
  approvalReceiptPath: string;
  approvalSourcePath: string;
  hashLockDryRunPath: string;
  finalPreapprovalEvidenceHashLockDryRunPath: string;
  referencesDryRunHashLock: boolean;
  referencesFinalPreapprovalEvidenceHashLock: boolean;
  criticalHashLocks: number;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
  activationApproved: boolean;
};

type EvaluationInput = {
  currentRunId: string;
  p31SafeHoldReady: boolean;
  p44WaitingForExactApproval: boolean;
  p50Ready: boolean;
  p53Status: string;
  p53State: string;
  p53Ready: boolean;
  p53FreshAfterP52: boolean;
  requiredApprovalSentence: string;
  approvalSourcePath: string;
  defaultApprovalSourcePath: string;
  approvalSourceExists: boolean;
  approvalSourceContainsExactSentence: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  dryRunHashLocks: number;
  finalDryRunHashLocks: number;
  simulatedReceiptPresent: boolean;
  simulatedHashLockPresent: boolean;
  simulatedReceipt: SimulatedReceipt;
  simulatedHashLock: SimulatedHashLock;
  activationApproved: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
  productionWritesAllowed: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  runtimeDownloadsEnabled: boolean;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
};

type Report = {
  schemaVersion: 'gustav-exact-approval-active-artifact-pair-simulation-v2-packet-v0';
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
  summary: {
    targetLocale: 'fr';
    sourceLocales: ['ru', 'uk'];
    pairSimulationState: string;
    p31SafeHoldReady: boolean;
    p44WaitingForExactApproval: boolean;
    p50Ready: boolean;
    p53Ready: boolean;
    p53State: string;
    p53FreshAfterP52: boolean;
    requiredApprovalSentencePresent: boolean;
    requiredApprovalSentenceSha256: string;
    approvalSourcePath: string;
    defaultApprovalSourcePath: string;
    approvalSourceIsDefaultPath: boolean;
    approvalSourceExists: boolean;
    approvalSourceContainsExactSentence: boolean;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    dryRunHashLocks: number;
    finalDryRunHashLocks: number;
    simulatedReceiptPresent: boolean;
    simulatedHashLockPresent: boolean;
    simulatedPairTargetLocale: 'fr';
    simulatedPairRunId: string;
    simulatedPairReferencesDefaultApprovalSource: boolean;
    simulatedPairReferencesMainHashLockDryRun: boolean;
    simulatedPairReferencesFinalHashLockDryRun: boolean;
    simulatedPairCriticalHashLocks: number;
    simulatedPairWouldPassP44AfterP31Create: boolean;
    currentP44WouldOpenSequencing: false;
    readyForP31CreateWhenExactSourcePresent: boolean;
    activeApprovalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    productionWritesAllowed: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    downloadablePacksPublished: false;
    storageMigrationAllowed: false;
    cloudSyncMigrationAllowed: false;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  simulatedArtifacts: {
    dryRunOnly: true;
    activeApprovalReceiptPathReserved: string;
    activeHashLockPathReserved: string;
    simulatedApprovalReceipt: SimulatedReceipt;
    simulatedHashLock: SimulatedHashLock;
  };
  nextRequiredActions: string[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    dryRunOnly: true;
    activeApprovalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    productionAppFilesModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return readJson<JsonObject>(filePath);
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(value: JsonObject): JsonObject {
  return object(value.summary);
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function b(value: JsonObject, key: string): boolean {
  return value[key] === true;
}

function fileMtimeMs(filePath: string): number {
  return fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
}

function sha256Text(value: string): string {
  if (value.trim() === '') return '';
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function sourceIsDefault(input: EvaluationInput): boolean {
  return path.resolve(input.approvalSourcePath) === path.resolve(input.defaultApprovalSourcePath);
}

function simulatedPairWouldPassP44(input: EvaluationInput): boolean {
  const requiredSentenceHash = sha256Text(input.requiredApprovalSentence);
  const expectedCriticalHashes = input.dryRunHashLocks + input.finalDryRunHashLocks;
  return (
    input.simulatedReceiptPresent &&
    input.simulatedHashLockPresent &&
    input.simulatedReceipt.runId === input.currentRunId &&
    input.simulatedHashLock.runId === input.currentRunId &&
    input.simulatedReceipt.targetLocale === 'fr' &&
    input.simulatedHashLock.targetLocale === 'fr' &&
    input.simulatedReceipt.requiredApprovalSentence === input.requiredApprovalSentence &&
    input.simulatedReceipt.requiredApprovalSentenceSha256 === requiredSentenceHash &&
    input.simulatedReceipt.approvalSourcePath === input.simulatedHashLock.approvalSourcePath &&
    path.resolve(input.simulatedReceipt.approvalSourcePath) === path.resolve(input.defaultApprovalSourcePath) &&
    input.simulatedHashLock.hashLockDryRunPath !== '' &&
    input.simulatedHashLock.finalPreapprovalEvidenceHashLockDryRunPath !== '' &&
    input.simulatedHashLock.referencesDryRunHashLock &&
    input.simulatedHashLock.referencesFinalPreapprovalEvidenceHashLock &&
    input.simulatedHashLock.criticalHashLocks >= expectedCriticalHashes &&
    !input.simulatedReceipt.readyForApply &&
    !input.simulatedHashLock.readyForApply &&
    !input.simulatedReceipt.mayModifyProductionAppFiles &&
    !input.simulatedHashLock.mayModifyProductionAppFiles &&
    !input.simulatedReceipt.activationApproved &&
    !input.simulatedHashLock.activationApproved
  );
}

function evaluate(input: EvaluationInput): { state: string; findings: Finding[]; simulatedPairValid: boolean } {
  const findings: Finding[] = [];
  const requiredSentencePresent = input.requiredApprovalSentence.trim() !== '';
  const pairValid = simulatedPairWouldPassP44(input);

  if (!input.p31SafeHoldReady) {
    addFinding(findings, 'blocker', 'P31_NOT_SAFE_HOLD', 'P31 must still be safe hold before the active artifact pair can be simulated.');
  }
  if (!input.p44WaitingForExactApproval) {
    addFinding(findings, 'blocker', 'P44_NOT_WAITING_FOR_EXACT_APPROVAL', 'P44 must still wait for exact approval artifacts.');
  }
  if (!input.p50Ready) {
    addFinding(findings, 'blocker', 'P50_NOT_READY', 'P50 final pre-approval hash-lock must be ready.');
  }
  if (
    input.p53Status !== 'PASS' ||
    !input.p53Ready ||
    !input.p53FreshAfterP52 ||
    (input.p53State !== 'exact_approval_intake_transition_ready_waiting_for_approval_source' &&
      input.p53State !== 'exact_approval_source_present_p31_create_required')
  ) {
    addFinding(findings, 'blocker', 'P53_NOT_READY', 'P53 intake transition must be fresh and ready before P54 can simulate future active artifacts.');
  }
  if (!requiredSentencePresent) {
    addFinding(findings, 'blocker', 'REQUIRED_APPROVAL_SENTENCE_MISSING', 'The exact approval sentence must exist in P30.');
  }
  if (input.approvalSourceExists && !sourceIsDefault(input)) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_OUTSIDE_RUN_APPLY_PLAN', 'Approval source must be the run-scoped default apply_plan file.', input.approvalSourcePath);
  }
  if (input.approvalSourceExists && !input.approvalSourceContainsExactSentence) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_MISSING_EXACT_SENTENCE', 'Existing approval source does not contain the exact required approval sentence.', input.approvalSourcePath);
  }
  if (input.activeApprovalReceiptExists || input.activeHashLockExists) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACTS_ALREADY_EXIST', 'P54 is only valid before real active receipt/hash-lock files exist.');
  }
  if (input.activeApprovalReceiptExists !== input.activeHashLockExists) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACT_MISMATCH', 'Real active approval artifacts must never exist one-sided.');
  }
  if (input.dryRunHashLocks <= 0 || input.finalDryRunHashLocks <= 0) {
    addFinding(findings, 'blocker', 'HASH_LOCK_DRY_RUNS_MISSING', 'Both main and final dry-run hash locks are required.');
  }
  if (!pairValid) {
    addFinding(findings, 'blocker', 'SIMULATED_PAIR_WOULD_NOT_PASS_P44', 'The simulated active receipt/hash-lock pair does not meet P44 validation rules.');
  }
  if (
    input.activationApproved ||
    input.readyForApply ||
    input.mayModifyProductionAppFiles ||
    input.productionWritesAllowed ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.runtimeDownloadsEnabled ||
    input.storageMigrationAllowed ||
    input.cloudSyncMigrationAllowed
  ) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P54 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  if (blockers > 0) return { state: 'blocked_by_findings', findings, simulatedPairValid: pairValid };
  if (input.approvalSourceContainsExactSentence) return { state: 'active_artifact_pair_simulation_ready_for_p31_create', findings, simulatedPairValid: pairValid };
  return { state: 'active_artifact_pair_simulation_ready_waiting_for_exact_source', findings, simulatedPairValid: pairValid };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{ id: string; expectedState: string; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_pair_simulation_ready_waiting', expectedState: 'active_artifact_pair_simulation_ready_waiting_for_exact_source', mutate: () => undefined },
    { id: 'stale_p53_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p53FreshAfterP52 = false; } },
    { id: 'wrong_receipt_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.simulatedReceipt.targetLocale = 'en'; } },
    { id: 'wrong_hash_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.simulatedHashLock.targetLocale = 'en'; } },
    { id: 'receipt_run_mismatch_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.simulatedReceipt.runId = 'wrong_run'; } },
    { id: 'hash_run_mismatch_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.simulatedHashLock.runId = 'wrong_run'; } },
    { id: 'sentence_hash_mismatch_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.simulatedReceipt.requiredApprovalSentenceSha256 = 'bad'; } },
    { id: 'source_outside_apply_plan_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.simulatedReceipt.approvalSourcePath = path.join(path.dirname(input.defaultApprovalSourcePath), '..', 'approval.txt'); input.simulatedHashLock.approvalSourcePath = input.simulatedReceipt.approvalSourcePath; } },
    { id: 'missing_main_hash_link_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.simulatedHashLock.referencesDryRunHashLock = false; } },
    { id: 'missing_final_hash_link_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.simulatedHashLock.referencesFinalPreapprovalEvidenceHashLock = false; } },
    { id: 'insufficient_hash_coverage_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.simulatedHashLock.criticalHashLocks = Math.max(0, input.dryRunHashLocks + input.finalDryRunHashLocks - 1); } },
    { id: 'only_simulated_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.simulatedHashLockPresent = false; } },
    { id: 'real_active_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'real_active_hash_lock_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeHashLockExists = true; } },
    { id: 'ready_for_apply_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.readyForApply = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'storage_cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; input.cloudSyncMigrationAllowed = true; } },
    { id: 'exact_source_advances_to_p31_create_ready', expectedState: 'active_artifact_pair_simulation_ready_for_p31_create', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = true; } },
  ];
  return cases.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    const result = evaluate(fixture);
    const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
    return {
      id: test.id,
      expectedState: test.expectedState,
      pairSimulationState: result.state,
      blockers,
      passed: result.state === test.expectedState,
    };
  });
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Exact Approval Active Artifact Pair Simulation V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Pair simulation state: ${report.summary.pairSimulationState}`,
    `- P31/P44/P50/P53 ready: ${report.summary.p31SafeHoldReady ? 'yes' : 'no'}/${report.summary.p44WaitingForExactApproval ? 'yes' : 'no'}/${report.summary.p50Ready ? 'yes' : 'no'}/${report.summary.p53Ready ? 'yes' : 'no'}`,
    `- Approval source exists/exact/default: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.approvalSourceIsDefaultPath ? 'yes' : 'no'}`,
    `- Real active approval receipt/hash-lock exists: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Simulated pair target/run: ${report.summary.simulatedPairTargetLocale}/${report.summary.simulatedPairRunId}`,
    `- Simulated pair main/final/critical hashes: ${report.summary.simulatedPairReferencesMainHashLockDryRun ? 'yes' : 'no'}/${report.summary.simulatedPairReferencesFinalHashLockDryRun ? 'yes' : 'no'}/${report.summary.simulatedPairCriticalHashLocks}`,
    `- Simulated pair would pass P44 after P31 create: ${report.summary.simulatedPairWouldPassP44AfterP31Create ? 'yes' : 'no'}`,
    `- Current P44 would open sequencing: ${report.summary.currentP44WouldOpenSequencing ? 'yes' : 'no'}`,
    `- Ready for P31 create when exact source present: ${report.summary.readyForP31CreateWhenExactSourcePresent ? 'yes' : 'no'}`,
    `- Activation/apply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Upload/download/storage/cloud flags: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}/${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.storageMigrationAllowed ? 'yes' : 'no'}/${report.summary.cloudSyncMigrationAllowed ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Next Required Actions',
    '',
    ...report.nextRequiredActions.map((item) => `- ${item}`),
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  lines.push('', '## Safety', '');
  lines.push('- This packet is dry-run only.');
  lines.push('- It writes a simulated future pair, not the reserved active approval receipt/hash-lock paths.');
  lines.push('- It does not modify production app files, import decisions, publish server manifests, upload to Firebase/server, enable runtime downloads, migrate storage/cloud or approve activation.');
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);

  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const applyPlanDir = path.join(runDir, 'apply_plan');
  const reviewerDir = path.join(runDir, 'generated/fr/reviewer');

  const masterPath = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const p30Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const p31Path = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const p44Path = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const p50Path = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const p52Path = path.join(auditsDir, 'exact_approval_source_firewall_v2_packet.json');
  const p53Path = path.join(auditsDir, 'exact_approval_source_intake_transition_v2_packet.json');
  const defaultApprovalSourcePath = path.join(applyPlanDir, 'explicit_approval_input_v2.txt');
  const approvalSourcePath = path.resolve(repoRoot, argValue('--approval-source') ?? defaultApprovalSourcePath);
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const dryRunHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_dry_run_v2.json');
  const finalDryRunHashLockPath = path.join(applyPlanDir, 'final_preapproval_evidence_hash_lock_dry_run_v2.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_active_artifact_pair_simulation_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_active_artifact_pair_simulation_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_active_artifact_pair_simulation_v2_packet.md');

  const master = readJsonOrEmpty(masterPath);
  const p30 = readJsonOrEmpty(p30Path);
  const p31 = readJsonOrEmpty(p31Path);
  const p44 = readJsonOrEmpty(p44Path);
  const p50 = readJsonOrEmpty(p50Path);
  const p53 = readJsonOrEmpty(p53Path);
  const dryRunHashLock = readJsonOrEmpty(dryRunHashLockPath);
  const finalDryRunHashLock = readJsonOrEmpty(finalDryRunHashLockPath);
  const masterSummary = summaryOf(master);
  const p30Summary = summaryOf(p30);
  const p31Summary = summaryOf(p31);
  const p44Summary = summaryOf(p44);
  const p50Summary = summaryOf(p50);
  const p53Summary = summaryOf(p53);

  const approvalSourceExists = fs.existsSync(approvalSourcePath);
  const approvalSourceText = approvalSourceExists ? fs.readFileSync(approvalSourcePath, 'utf8') : '';
  const requiredApprovalSentence = s(p30, 'requiredApprovalSentence');
  const requiredApprovalSentenceSha256 = sha256Text(requiredApprovalSentence);
  const approvalSourceContainsExactSentence = requiredApprovalSentence.trim() !== '' && approvalSourceText.includes(requiredApprovalSentence);
  const mainCriticalArtifacts = arr(dryRunHashLock.criticalArtifacts);
  const finalCriticalArtifacts = arr(finalDryRunHashLock.criticalArtifacts);
  const dryRunHashLocks = n(dryRunHashLock, 'criticalHashLocks') || arr(dryRunHashLock.hashLocks).length || mainCriticalArtifacts.length;
  const finalDryRunHashLocks = n(finalDryRunHashLock, 'criticalHashLocks') || n(p50Summary, 'finalHashLocks') || arr(finalDryRunHashLock.hashLocks).length || finalCriticalArtifacts.length;
  const simulatedCriticalHashes = dryRunHashLocks + finalDryRunHashLocks;

  const simulatedReceipt: SimulatedReceipt = {
    runId,
    targetLocale: 'fr',
    requiredApprovalSentence,
    requiredApprovalSentenceSha256,
    approvalSourcePath,
    hashLockDryRunPath: dryRunHashLockPath,
    finalPreapprovalEvidenceHashLockDryRunPath: finalDryRunHashLockPath,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    activationApproved: false,
  };
  const simulatedHashLock: SimulatedHashLock = {
    runId,
    targetLocale: 'fr',
    approvalReceiptPath: activeApprovalReceiptPath,
    approvalSourcePath,
    hashLockDryRunPath: dryRunHashLockPath,
    finalPreapprovalEvidenceHashLockDryRunPath: finalDryRunHashLockPath,
    referencesDryRunHashLock: true,
    referencesFinalPreapprovalEvidenceHashLock: true,
    criticalHashLocks: simulatedCriticalHashes,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    activationApproved: false,
  };

  const input: EvaluationInput = {
    currentRunId: runId,
    p31SafeHoldReady:
      s(p31, 'status') === 'HOLD' &&
      n(p31Summary, 'blockers') === 0 &&
      (s(p31Summary, 'receiptCreationState') === 'approval_receipt_creation_waiting_for_exact_sentence' ||
        s(p31Summary, 'receiptCreationState') === 'exact_sentence_present_creation_not_requested') &&
      !b(p31Summary, 'activeApprovalReceiptCreated') &&
      !b(p31Summary, 'activeHashLockCreated') &&
      !b(p31Summary, 'readyForApply'),
    p44WaitingForExactApproval:
      s(p44, 'status') === 'HOLD' &&
      n(p44Summary, 'blockers') === 0 &&
      s(p44Summary, 'validationState') === 'waiting_for_exact_approval_artifacts' &&
      !b(p44Summary, 'readyForProductionActivationSequencing') &&
      !b(p44Summary, 'readyForApply'),
    p50Ready:
      s(p50, 'status') === 'PASS' &&
      n(p50Summary, 'blockers') === 0 &&
      s(p50Summary, 'lockState') === 'final_preapproval_evidence_hash_lock_ready',
    p53Status: s(p53, 'status'),
    p53State: s(p53Summary, 'intakeTransitionState'),
    p53Ready:
      s(p53, 'status') === 'PASS' &&
      n(p53Summary, 'blockers') === 0 &&
      b(p53Summary, 'p52Ready') &&
      b(p53Summary, 'simulatedValidP31CreateWouldCreateBothArtifacts') &&
      !b(p53Summary, 'readyForApply') &&
      !b(p53Summary, 'mayModifyProductionAppFiles') &&
      n(p53Summary, 'fixtureProbes') > 0 &&
      n(p53Summary, 'fixtureProbesPassed') === n(p53Summary, 'fixtureProbes'),
    p53FreshAfterP52: fileMtimeMs(p53Path) >= fileMtimeMs(p52Path) && fileMtimeMs(p52Path) > 0,
    requiredApprovalSentence,
    approvalSourcePath,
    defaultApprovalSourcePath,
    approvalSourceExists,
    approvalSourceContainsExactSentence,
    activeApprovalReceiptExists: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExists: fs.existsSync(activeHashLockPath),
    dryRunHashLocks,
    finalDryRunHashLocks,
    simulatedReceiptPresent: true,
    simulatedHashLockPresent: true,
    simulatedReceipt,
    simulatedHashLock,
    activationApproved: b(masterSummary, 'activationApproved') || b(p53Summary, 'activationApproved'),
    readyForApply: b(masterSummary, 'readyForApply') || b(p53Summary, 'readyForApply'),
    mayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles') || b(p53Summary, 'mayModifyProductionAppFiles'),
    productionWritesAllowed: b(masterSummary, 'productionWritesAllowed') || b(p53Summary, 'productionWritesAllowed'),
    serverUploadAllowed: b(masterSummary, 'serverUploadAllowed') || b(p53Summary, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(masterSummary, 'firebaseUploadAllowed') || b(p53Summary, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(masterSummary, 'runtimeDownloadsEnabled') || b(p53Summary, 'runtimeDownloadsEnabled'),
    storageMigrationAllowed: b(masterSummary, 'storageMigrationAllowed') || b(p53Summary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(masterSummary, 'cloudSyncMigrationAllowed') || b(p53Summary, 'cloudSyncMigrationAllowed'),
  };

  const result = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(result.findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = result.findings.filter((finding) => finding.severity === 'warning').length;
  const pairSimulationState = blockers > 0 ? 'blocked_by_findings' : result.state;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const readyForP31CreateWhenExactSourcePresent = input.approvalSourceExists && input.approvalSourceContainsExactSentence;
  const nextRequiredActions = [
    'Keep the real active approval receipt/hash-lock paths absent until the exact approval source exists and P31 is explicitly run with its create flag.',
    'When P31 is eventually allowed, it must write the receipt and hash-lock together with targetLocale=fr, this run id, exact sentence hash and main/final dry-run hash-lock links.',
    'P44 must reject one-sided active artifacts, wrong targetLocale, wrong run id, wrong approval source, missing final hash-lock lineage or readyForApply/open runtime flags.',
    'Keep activationApproved, readyForApply, server/Firebase upload, runtime downloads and storage/cloud migrations closed until P44-P47 prove the production sequence.',
  ];

  const dryRun = {
    schemaVersion: 'gustav-exact-approval-active-artifact-pair-simulation-dry-run-v2-v0',
    runId,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    pairSimulationState,
    activeApprovalReceiptPathReserved: rel(repoRoot, activeApprovalReceiptPath),
    activeHashLockPathReserved: rel(repoRoot, activeHashLockPath),
    activeApprovalReceiptCreatedByThisScript: false,
    activeHashLockCreatedByThisScript: false,
    currentP44WouldOpenSequencing: false,
    simulatedPairWouldPassP44AfterP31Create: result.simulatedPairValid,
    readyForP31CreateWhenExactSourcePresent,
    simulatedApprovalReceipt: {
      ...simulatedReceipt,
      approvalSourcePath: rel(repoRoot, simulatedReceipt.approvalSourcePath),
      hashLockDryRunPath: rel(repoRoot, simulatedReceipt.hashLockDryRunPath),
      finalPreapprovalEvidenceHashLockDryRunPath: rel(repoRoot, simulatedReceipt.finalPreapprovalEvidenceHashLockDryRunPath),
    },
    simulatedHashLock: {
      ...simulatedHashLock,
      approvalReceiptPath: rel(repoRoot, simulatedHashLock.approvalReceiptPath),
      approvalSourcePath: rel(repoRoot, simulatedHashLock.approvalSourcePath),
      hashLockDryRunPath: rel(repoRoot, simulatedHashLock.hashLockDryRunPath),
      finalPreapprovalEvidenceHashLockDryRunPath: rel(repoRoot, simulatedHashLock.finalPreapprovalEvidenceHashLockDryRunPath),
      mainCriticalHashLocks: dryRunHashLocks,
      finalCriticalHashLocks: finalDryRunHashLocks,
    },
    activationApproved: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
  writeJson(dryRunPath, dryRun);

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-active-artifact-pair-simulation-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      masterManifest: rel(repoRoot, masterPath),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, p30Path),
      explicitApprovalReceiptCreationGateV2Packet: rel(repoRoot, p31Path),
      exactApprovalValidationGateV2Packet: rel(repoRoot, p44Path),
      finalPreapprovalEvidenceHashLockV2Packet: rel(repoRoot, p50Path),
      exactApprovalSourceIntakeTransitionV2Packet: rel(repoRoot, p53Path),
      hashLockManifestDryRunV2: rel(repoRoot, dryRunHashLockPath),
      finalPreapprovalEvidenceHashLockDryRunV2: rel(repoRoot, finalDryRunHashLockPath),
      approvalSource: rel(repoRoot, approvalSourcePath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      activeArtifactPairSimulationDryRun: rel(repoRoot, dryRunPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      pairSimulationState,
      p31SafeHoldReady: input.p31SafeHoldReady,
      p44WaitingForExactApproval: input.p44WaitingForExactApproval,
      p50Ready: input.p50Ready,
      p53Ready: input.p53Ready,
      p53State: input.p53State,
      p53FreshAfterP52: input.p53FreshAfterP52,
      requiredApprovalSentencePresent: input.requiredApprovalSentence.trim() !== '',
      requiredApprovalSentenceSha256,
      approvalSourcePath: rel(repoRoot, input.approvalSourcePath),
      defaultApprovalSourcePath: rel(repoRoot, input.defaultApprovalSourcePath),
      approvalSourceIsDefaultPath: sourceIsDefault(input),
      approvalSourceExists: input.approvalSourceExists,
      approvalSourceContainsExactSentence: input.approvalSourceContainsExactSentence,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      dryRunHashLocks: input.dryRunHashLocks,
      finalDryRunHashLocks: input.finalDryRunHashLocks,
      simulatedReceiptPresent: input.simulatedReceiptPresent,
      simulatedHashLockPresent: input.simulatedHashLockPresent,
      simulatedPairTargetLocale: 'fr',
      simulatedPairRunId: runId,
      simulatedPairReferencesDefaultApprovalSource: sourceIsDefault(input),
      simulatedPairReferencesMainHashLockDryRun: input.simulatedHashLock.referencesDryRunHashLock,
      simulatedPairReferencesFinalHashLockDryRun: input.simulatedHashLock.referencesFinalPreapprovalEvidenceHashLock,
      simulatedPairCriticalHashLocks: input.simulatedHashLock.criticalHashLocks,
      simulatedPairWouldPassP44AfterP31Create: result.simulatedPairValid,
      currentP44WouldOpenSequencing: false,
      readyForP31CreateWhenExactSourcePresent,
      activeApprovalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      productionWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      downloadablePacksPublished: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    simulatedArtifacts: {
      dryRunOnly: true,
      activeApprovalReceiptPathReserved: rel(repoRoot, activeApprovalReceiptPath),
      activeHashLockPathReserved: rel(repoRoot, activeHashLockPath),
      simulatedApprovalReceipt: {
        ...simulatedReceipt,
        approvalSourcePath: rel(repoRoot, simulatedReceipt.approvalSourcePath),
        hashLockDryRunPath: rel(repoRoot, simulatedReceipt.hashLockDryRunPath),
        finalPreapprovalEvidenceHashLockDryRunPath: rel(repoRoot, simulatedReceipt.finalPreapprovalEvidenceHashLockDryRunPath),
      },
      simulatedHashLock: {
        ...simulatedHashLock,
        approvalReceiptPath: rel(repoRoot, simulatedHashLock.approvalReceiptPath),
        approvalSourcePath: rel(repoRoot, simulatedHashLock.approvalSourcePath),
        hashLockDryRunPath: rel(repoRoot, simulatedHashLock.hashLockDryRunPath),
        finalPreapprovalEvidenceHashLockDryRunPath: rel(repoRoot, simulatedHashLock.finalPreapprovalEvidenceHashLockDryRunPath),
      },
    },
    nextRequiredActions,
    probes,
    findings: result.findings,
    safety: {
      dryRunOnly: true,
      activeApprovalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      productionAppFilesModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval active artifact pair simulation V2 packet: ${status}`);
  console.log(`Pair simulation state: ${report.summary.pairSimulationState}`);
  console.log(`Approval source exists/exact: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`);
  console.log(`Real active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Simulated pair would pass P44 after P31 create: ${report.summary.simulatedPairWouldPassP44AfterP31Create ? 'yes' : 'no'}`);
  console.log(`Current P44 would open sequencing: ${report.summary.currentP44WouldOpenSequencing ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
