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
  intakeTransitionState: string;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  p30Status: string;
  p30State: string;
  p30ReadyForReceiptCreation: boolean;
  requiredApprovalSentence: string;
  p31Status: string;
  p31State: string;
  p31CreateActiveReceiptRequested: boolean;
  p31ActiveApprovalReceiptCreated: boolean;
  p31ActiveHashLockCreated: boolean;
  p31ReadyForApply: boolean;
  p31MayModifyProductionAppFiles: boolean;
  p31ProbesPassed: number;
  p31Probes: number;
  p44Status: string;
  p44State: string;
  p44ReadyForProductionActivationSequencing: boolean;
  p44ReadyForApply: boolean;
  p44MayModifyProductionAppFiles: boolean;
  p44ProbesPassed: number;
  p44Probes: number;
  p50Status: string;
  p50State: string;
  p51Status: string;
  p51State: string;
  p51Ready: boolean;
  p51ReadinessApplyBlockers: number;
  p52Status: string;
  p52State: string;
  p52FreshAfterP51: boolean;
  p52Ready: boolean;
  p52PlainContinueWouldCreateActiveArtifacts: boolean;
  p52WouldCreateActiveArtifactsNow: boolean;
  p52ActiveApprovalReceiptExists: boolean;
  p52ActiveHashLockExists: boolean;
  p52ReadyForApply: boolean;
  p52MayModifyProductionAppFiles: boolean;
  p52ProbesPassed: number;
  p52Probes: number;
  approvalSourcePath: string;
  defaultApprovalSourcePath: string;
  approvalSourceExists: boolean;
  approvalSourceContainsExactSentence: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  dryRunHashLocks: number;
  finalDryRunHashLocks: number;
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
  schemaVersion: 'gustav-exact-approval-source-intake-transition-v2-packet-v0';
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
    intakeTransitionState: string;
    p30Ready: boolean;
    p31SafeHoldReady: boolean;
    p44WaitingForExactApproval: boolean;
    p50FinalHashLockReady: boolean;
    p51Ready: boolean;
    p52Ready: boolean;
    p52State: string;
    p52FreshAfterP51: boolean;
    requiredApprovalSentencePresent: boolean;
    requiredApprovalSentenceSha256: string;
    approvalSourcePath: string;
    defaultApprovalSourcePath: string;
    approvalSourceIsDefaultPath: boolean;
    approvalSourceExists: boolean;
    approvalSourceContainsExactSentence: boolean;
    p31CreateActiveReceiptRequested: boolean;
    approvalSourceRequiredForActiveArtifacts: true;
    explicitP31CreateFlagRequiredForActiveArtifacts: true;
    plainContinueWouldCreateActiveArtifacts: false;
    wouldCreateActiveArtifactsNow: false;
    wouldCreateActiveArtifactsByThisScript: false;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    dryRunHashLocks: number;
    finalDryRunHashLocks: number;
    simulatedValidP31CreateRequiresDefaultApprovalSource: true;
    simulatedValidP31CreateRequiresExactApprovalSentence: true;
    simulatedValidP31CreateRequiresExplicitCreateFlag: true;
    simulatedValidP31CreateWouldCreateApprovalReceipt: boolean;
    simulatedValidP31CreateWouldCreateHashLock: boolean;
    simulatedValidP31CreateWouldCreateBothArtifacts: boolean;
    simulatedValidP31CreateReferencesP50: boolean;
    simulatedValidP31CreateReferencesP51: boolean;
    simulatedValidP31CreateReferencesP52: boolean;
    simulatedValidP31CreateReferencesMainHashLockDryRun: boolean;
    simulatedValidP31CreateReferencesFinalHashLockDryRun: boolean;
    simulatedP44ValidationRequiresBothActiveArtifacts: true;
    simulatedP44WouldOpenSequencingOnlyAfterBothArtifacts: boolean;
    simulatedP44WouldOpenReadyForApply: false;
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
  transitionSimulation: {
    currentPlainContinue: {
      wouldCreateActiveApprovalReceipt: false;
      wouldCreateActiveHashLock: false;
      nextLegalStep: string;
    };
    validP31CreateScenario: {
      dryRunOnly: true;
      requiresRunScopedApprovalSource: true;
      requiresExactApprovalSentence: true;
      requiresExplicitP31CreateFlag: true;
      wouldCreateActiveApprovalReceipt: boolean;
      wouldCreateActiveHashLock: boolean;
      wouldCreateBothArtifacts: boolean;
      approvalReceiptTargetLocale: 'fr';
      hashLockTargetLocale: 'fr';
      approvalSourcePath: string;
      hashLockDryRunPath: string;
      finalPreapprovalEvidenceHashLockDryRunPath: string;
      referencesP50FinalPreapprovalHashLock: boolean;
      referencesP51ApplyRehearsal: boolean;
      referencesP52SourceFirewall: boolean;
      opensReadyForApply: false;
      opensRuntimeDownloads: false;
      opensStorageOrCloudMigration: false;
    };
    p44ValidationScenario: {
      requiresBothActiveArtifacts: true;
      onlyOneActiveArtifactRejected: true;
      exactApprovalSentenceMustMatch: true;
      activeArtifactsMustReferenceCurrentRun: true;
      opensProductionActivationSequencingOnlyAfterBothArtifacts: boolean;
      opensReadyForApply: false;
    };
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

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function sha256Text(value: string): string {
  if (value.trim() === '') return '';
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function approvalSourceIsDefault(input: EvaluationInput): boolean {
  return path.resolve(input.approvalSourcePath) === path.resolve(input.defaultApprovalSourcePath);
}

function p31Closed(input: EvaluationInput): boolean {
  return (
    input.p31Status === 'HOLD' &&
    (input.p31State === 'approval_receipt_creation_waiting_for_exact_sentence' ||
      input.p31State === 'exact_sentence_present_creation_not_requested') &&
    !input.p31CreateActiveReceiptRequested &&
    !input.p31ActiveApprovalReceiptCreated &&
    !input.p31ActiveHashLockCreated &&
    !input.p31ReadyForApply &&
    !input.p31MayModifyProductionAppFiles &&
    input.p31Probes > 0 &&
    input.p31ProbesPassed === input.p31Probes
  );
}

function p44Closed(input: EvaluationInput): boolean {
  return (
    input.p44Status === 'HOLD' &&
    input.p44State === 'waiting_for_exact_approval_artifacts' &&
    !input.p44ReadyForProductionActivationSequencing &&
    !input.p44ReadyForApply &&
    !input.p44MayModifyProductionAppFiles &&
    input.p44Probes > 0 &&
    input.p44ProbesPassed === input.p44Probes
  );
}

function p52Ready(input: EvaluationInput): boolean {
  return (
    input.p52Status === 'PASS' &&
    input.p52FreshAfterP51 &&
    input.p52Ready &&
    (input.p52State === 'exact_approval_source_firewall_ready_waiting_for_approval_source' ||
      input.p52State === 'exact_approval_source_present_p31_create_required') &&
    !input.p52PlainContinueWouldCreateActiveArtifacts &&
    !input.p52WouldCreateActiveArtifactsNow &&
    !input.p52ActiveApprovalReceiptExists &&
    !input.p52ActiveHashLockExists &&
    !input.p52ReadyForApply &&
    !input.p52MayModifyProductionAppFiles &&
    input.p52Probes > 0 &&
    input.p52ProbesPassed === input.p52Probes
  );
}

function evaluate(input: EvaluationInput): { state: string; findings: Finding[] } {
  const findings: Finding[] = [];
  const exactSentenceRequired = input.requiredApprovalSentence.trim() !== '';
  const sourceIsDefault = approvalSourceIsDefault(input);
  const bothActiveArtifactsExist = input.activeApprovalReceiptExists && input.activeHashLockExists;

  if (input.p30Status !== 'PASS' || input.p30State !== 'approval_request_presented' || !input.p30ReadyForReceiptCreation || !exactSentenceRequired) {
    addFinding(findings, 'blocker', 'P30_APPROVAL_REQUEST_NOT_READY', 'P30 must present the exact required approval sentence before intake transition can be ready.');
  }
  if (!p31Closed(input)) {
    addFinding(findings, 'blocker', 'P31_NOT_IN_SAFE_HOLD', 'P31 must be in a closed safe hold with no explicit create flag and no active artifacts created.');
  }
  if (!p44Closed(input)) {
    addFinding(findings, 'blocker', 'P44_NOT_WAITING_FOR_ACTIVE_ARTIFACTS', 'P44 must remain closed until both active approval artifacts exist.');
  }
  if (input.p50Status !== 'PASS' || input.p50State !== 'final_preapproval_evidence_hash_lock_ready') {
    addFinding(findings, 'blocker', 'P50_FINAL_HASH_LOCK_NOT_READY', 'P50 final pre-approval evidence hash-lock must be ready before approval intake can advance.');
  }
  if (input.p51Status !== 'PASS' || input.p51State !== 'exact_approval_apply_rehearsal_ready_waiting_for_exact_approval' || !input.p51Ready || input.p51ReadinessApplyBlockers !== 1) {
    addFinding(findings, 'blocker', 'P51_REHEARSAL_NOT_READY', 'P51 must be the closed exact-approval rehearsal with only RDY-090 remaining.');
  }
  if (!p52Ready(input)) {
    addFinding(findings, 'blocker', 'P52_SOURCE_FIREWALL_NOT_READY', 'P52 source firewall must be fresh, PASS and prove plain continue cannot create active approval artifacts.');
  }
  if (input.approvalSourceExists && !sourceIsDefault) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_OUTSIDE_RUN_APPLY_PLAN', 'The only accepted approval source is the run-scoped default apply_plan input file.', input.approvalSourcePath);
  }
  if (input.approvalSourceExists && !input.approvalSourceContainsExactSentence) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_MISSING_EXACT_SENTENCE', 'Approval source exists but does not contain the exact required approval sentence.', input.approvalSourcePath);
  }
  if (!input.approvalSourceExists && input.approvalSourceContainsExactSentence) {
    addFinding(findings, 'blocker', 'APPROVAL_SENTENCE_WITHOUT_SOURCE', 'Exact approval sentence cannot be present without a real approval source file.', input.approvalSourcePath);
  }
  if (input.p31CreateActiveReceiptRequested && !input.approvalSourceContainsExactSentence) {
    addFinding(findings, 'blocker', 'P31_CREATE_FLAG_WITHOUT_VALID_SOURCE', 'P31 create flag is illegal until the run-scoped approval source contains the exact approval sentence.');
  }
  if (input.p31CreateActiveReceiptRequested) {
    addFinding(findings, 'blocker', 'P31_CREATE_FLAG_NOT_ALLOWED_IN_INTAKE_DRY_RUN', 'P53 is an intake transition dry-run and must not run with the active P31 create flag open.');
  }
  if (input.activeApprovalReceiptExists !== input.activeHashLockExists) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACT_MISMATCH', 'Active approval receipt and active hash-lock must never exist alone.');
  }
  if (bothActiveArtifactsExist) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACTS_ALREADY_EXIST', 'P53 is only valid before P31 creates active approval artifacts.');
  }
  if (input.dryRunHashLocks <= 0 || input.finalDryRunHashLocks <= 0) {
    addFinding(findings, 'blocker', 'HASH_LOCK_DRY_RUNS_MISSING', 'P53 simulation requires both main and final dry-run hash locks.');
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
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P53 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  if (blockers > 0) return { state: 'blocked_by_findings', findings };
  if (input.approvalSourceContainsExactSentence) return { state: 'exact_approval_source_present_p31_create_required', findings };
  return { state: 'exact_approval_intake_transition_ready_waiting_for_approval_source', findings };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{ id: string; expectedState: string; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_intake_waits_for_source', expectedState: 'exact_approval_intake_transition_ready_waiting_for_approval_source', mutate: () => undefined },
    { id: 'stale_p52_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p52FreshAfterP51 = false; } },
    { id: 'invalid_source_without_exact_sentence_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = false; } },
    {
      id: 'source_outside_apply_plan_rejected',
      expectedState: 'blocked_by_findings',
      mutate: (input) => {
        input.approvalSourceExists = true;
        input.approvalSourceContainsExactSentence = true;
        input.approvalSourcePath = path.join(path.dirname(input.defaultApprovalSourcePath), '..', '..', 'approval.txt');
      },
    },
    { id: 'exact_source_no_create_requires_p31', expectedState: 'exact_approval_source_present_p31_create_required', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = true; input.p52State = 'exact_approval_source_present_p31_create_required'; } },
    { id: 'create_flag_without_exact_source_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p31CreateActiveReceiptRequested = true; } },
    { id: 'only_active_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'only_active_hash_lock_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeHashLockExists = true; } },
    { id: 'both_active_artifacts_before_p44_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; } },
    { id: 'p44_sequence_open_before_active_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44ReadyForProductionActivationSequencing = true; } },
    { id: 'ready_for_apply_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.readyForApply = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'storage_cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; input.cloudSyncMigrationAllowed = true; } },
  ];
  return cases.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    const result = evaluate(fixture);
    const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
    return {
      id: test.id,
      expectedState: test.expectedState,
      intakeTransitionState: result.state,
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
    '# GUSTAV Exact Approval Source Intake Transition V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Intake transition state: ${report.summary.intakeTransitionState}`,
    `- P30/P31/P44/P50/P51/P52 ready: ${report.summary.p30Ready ? 'yes' : 'no'}/${report.summary.p31SafeHoldReady ? 'yes' : 'no'}/${report.summary.p44WaitingForExactApproval ? 'yes' : 'no'}/${report.summary.p50FinalHashLockReady ? 'yes' : 'no'}/${report.summary.p51Ready ? 'yes' : 'no'}/${report.summary.p52Ready ? 'yes' : 'no'}`,
    `- Approval source exists/exact/default: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.approvalSourceIsDefaultPath ? 'yes' : 'no'}`,
    `- Plain continue would create active artifacts: ${report.summary.plainContinueWouldCreateActiveArtifacts ? 'yes' : 'no'}`,
    `- This script would create active artifacts: ${report.summary.wouldCreateActiveArtifactsByThisScript ? 'yes' : 'no'}`,
    `- Active approval receipt/hash-lock exists: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Simulated valid P31 creates both artifacts: ${report.summary.simulatedValidP31CreateWouldCreateBothArtifacts ? 'yes' : 'no'}`,
    `- Simulated P44 opens sequencing only after both artifacts: ${report.summary.simulatedP44WouldOpenSequencingOnlyAfterBothArtifacts ? 'yes' : 'no'}`,
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
  lines.push('- It does not create active approval receipt or active hash-lock files.');
  lines.push('- It only documents the legal transition into P31 and the future P44 validation conditions.');
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
  const p51Path = path.join(auditsDir, 'exact_approval_apply_rehearsal_v2_packet.json');
  const p52Path = path.join(auditsDir, 'exact_approval_source_firewall_v2_packet.json');
  const defaultApprovalSourcePath = path.join(applyPlanDir, 'explicit_approval_input_v2.txt');
  const approvalSourcePath = path.resolve(repoRoot, argValue('--approval-source') ?? defaultApprovalSourcePath);
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const dryRunHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_dry_run_v2.json');
  const finalDryRunHashLockPath = path.join(applyPlanDir, 'final_preapproval_evidence_hash_lock_dry_run_v2.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_source_intake_transition_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_source_intake_transition_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_source_intake_transition_v2_packet.md');

  const master = readJsonOrEmpty(masterPath);
  const p30 = readJsonOrEmpty(p30Path);
  const p31 = readJsonOrEmpty(p31Path);
  const p44 = readJsonOrEmpty(p44Path);
  const p50 = readJsonOrEmpty(p50Path);
  const p51 = readJsonOrEmpty(p51Path);
  const p52 = readJsonOrEmpty(p52Path);
  const dryRunHashLock = readJsonOrEmpty(dryRunHashLockPath);
  const finalDryRunHashLock = readJsonOrEmpty(finalDryRunHashLockPath);
  const masterSummary = summaryOf(master);
  const p30Summary = summaryOf(p30);
  const p31Summary = summaryOf(p31);
  const p44Summary = summaryOf(p44);
  const p50Summary = summaryOf(p50);
  const p51Summary = summaryOf(p51);
  const p52Summary = summaryOf(p52);

  const approvalSourceExists = fs.existsSync(approvalSourcePath);
  const approvalSourceText = approvalSourceExists ? fs.readFileSync(approvalSourcePath, 'utf8') : '';
  const requiredApprovalSentence = s(p30, 'requiredApprovalSentence');
  const approvalSourceContainsExactSentence = requiredApprovalSentence.trim() !== '' && approvalSourceText.includes(requiredApprovalSentence);
  const dryRunHashLocks = n(dryRunHashLock, 'criticalHashLocks') || arr(dryRunHashLock.hashLocks).length || arr(dryRunHashLock.criticalArtifacts).length;
  const finalDryRunHashLocks = n(finalDryRunHashLock, 'criticalHashLocks') || n(p50Summary, 'finalHashLocks') || arr(finalDryRunHashLock.hashLocks).length || arr(finalDryRunHashLock.criticalArtifacts).length;

  const p52DerivedReady =
    s(p52, 'status') === 'PASS' &&
    n(p52Summary, 'blockers') === 0 &&
    (s(p52Summary, 'firewallState') === 'exact_approval_source_firewall_ready_waiting_for_approval_source' ||
      s(p52Summary, 'firewallState') === 'exact_approval_source_present_p31_create_required') &&
    b(p52Summary, 'p51Ready') &&
    b(p52Summary, 'requiredApprovalSentencePresent') &&
    b(p52Summary, 'approvalSourceRequiredForActiveArtifacts') &&
    b(p52Summary, 'explicitCreateFlagRequiredForActiveArtifacts') &&
    !b(p52Summary, 'plainContinueWouldCreateActiveArtifacts') &&
    !b(p52Summary, 'wouldCreateActiveArtifactsNow') &&
    !b(p52Summary, 'activeApprovalReceiptExists') &&
    !b(p52Summary, 'activeHashLockExists') &&
    !b(p52Summary, 'activationApproved') &&
    !b(p52Summary, 'readyForApply') &&
    !b(p52Summary, 'mayModifyProductionAppFiles') &&
    n(p52Summary, 'fixtureProbes') > 0 &&
    n(p52Summary, 'fixtureProbesPassed') === n(p52Summary, 'fixtureProbes');

  const input: EvaluationInput = {
    p30Status: s(p30, 'status'),
    p30State: s(p30Summary, 'requestState'),
    p30ReadyForReceiptCreation: b(p30Summary, 'readyForExplicitApprovalReceiptCreationGateV2'),
    requiredApprovalSentence,
    p31Status: s(p31, 'status'),
    p31State: s(p31Summary, 'receiptCreationState'),
    p31CreateActiveReceiptRequested: b(p31Summary, 'createActiveReceiptRequested'),
    p31ActiveApprovalReceiptCreated: b(p31Summary, 'activeApprovalReceiptCreated'),
    p31ActiveHashLockCreated: b(p31Summary, 'activeHashLockCreated'),
    p31ReadyForApply: b(p31Summary, 'readyForApply'),
    p31MayModifyProductionAppFiles: b(p31Summary, 'mayModifyProductionAppFiles'),
    p31ProbesPassed: n(p31Summary, 'fixtureProbesPassed'),
    p31Probes: n(p31Summary, 'fixtureProbes'),
    p44Status: s(p44, 'status'),
    p44State: s(p44Summary, 'validationState'),
    p44ReadyForProductionActivationSequencing: b(p44Summary, 'readyForProductionActivationSequencing'),
    p44ReadyForApply: b(p44Summary, 'readyForApply'),
    p44MayModifyProductionAppFiles: b(p44Summary, 'mayModifyProductionAppFiles'),
    p44ProbesPassed: n(p44Summary, 'fixtureProbesPassed'),
    p44Probes: n(p44Summary, 'fixtureProbes'),
    p50Status: s(p50, 'status'),
    p50State: s(p50Summary, 'lockState'),
    p51Status: s(p51, 'status'),
    p51State: s(p51Summary, 'rehearsalState'),
    p51Ready:
      n(p51Summary, 'blockers') === 0 &&
      s(p51Summary, 'rehearsalState') === 'exact_approval_apply_rehearsal_ready_waiting_for_exact_approval' &&
      n(p51Summary, 'readinessApplyBlockers') === 1 &&
      !b(p51Summary, 'activeApprovalReceiptExists') &&
      !b(p51Summary, 'activeHashLockExists') &&
      !b(p51Summary, 'wouldCreateActiveArtifactsNow') &&
      !b(p51Summary, 'readyForApply'),
    p51ReadinessApplyBlockers: n(p51Summary, 'readinessApplyBlockers'),
    p52Status: s(p52, 'status'),
    p52State: s(p52Summary, 'firewallState'),
    p52FreshAfterP51: fileMtimeMs(p52Path) >= fileMtimeMs(p51Path) && fileMtimeMs(p51Path) > 0,
    p52Ready: p52DerivedReady,
    p52PlainContinueWouldCreateActiveArtifacts: b(p52Summary, 'plainContinueWouldCreateActiveArtifacts'),
    p52WouldCreateActiveArtifactsNow: b(p52Summary, 'wouldCreateActiveArtifactsNow'),
    p52ActiveApprovalReceiptExists: b(p52Summary, 'activeApprovalReceiptExists'),
    p52ActiveHashLockExists: b(p52Summary, 'activeHashLockExists'),
    p52ReadyForApply: b(p52Summary, 'readyForApply'),
    p52MayModifyProductionAppFiles: b(p52Summary, 'mayModifyProductionAppFiles'),
    p52ProbesPassed: n(p52Summary, 'fixtureProbesPassed'),
    p52Probes: n(p52Summary, 'fixtureProbes'),
    approvalSourcePath,
    defaultApprovalSourcePath,
    approvalSourceExists,
    approvalSourceContainsExactSentence,
    activeApprovalReceiptExists: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExists: fs.existsSync(activeHashLockPath),
    dryRunHashLocks,
    finalDryRunHashLocks,
    activationApproved: b(p52Summary, 'activationApproved') || b(masterSummary, 'activationApproved'),
    readyForApply: b(p52Summary, 'readyForApply') || b(masterSummary, 'readyForApply'),
    mayModifyProductionAppFiles: b(p52Summary, 'mayModifyProductionAppFiles') || b(masterSummary, 'mayModifyProductionAppFiles'),
    productionWritesAllowed: b(p52Summary, 'productionWritesAllowed') || b(masterSummary, 'productionWritesAllowed'),
    serverUploadAllowed: b(p52Summary, 'serverUploadAllowed') || b(masterSummary, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(p52Summary, 'firebaseUploadAllowed') || b(masterSummary, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(p52Summary, 'runtimeDownloadsEnabled') || b(masterSummary, 'runtimeDownloadsEnabled'),
    storageMigrationAllowed: b(p52Summary, 'storageMigrationAllowed') || b(masterSummary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(p52Summary, 'cloudSyncMigrationAllowed') || b(masterSummary, 'cloudSyncMigrationAllowed'),
  };

  const result = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(result.findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = result.findings.filter((finding) => finding.severity === 'warning').length;
  const intakeTransitionState = blockers > 0 ? 'blocked_by_findings' : result.state;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const validP31SimulationReady =
    input.p30Status === 'PASS' &&
    p31Closed(input) &&
    p44Closed(input) &&
    input.p50Status === 'PASS' &&
    input.p50State === 'final_preapproval_evidence_hash_lock_ready' &&
    input.p51Ready &&
    p52Ready(input) &&
    input.dryRunHashLocks > 0 &&
    input.finalDryRunHashLocks > 0;
  const nextRequiredActions = [
    'Wait for the run-scoped approval source file to contain the exact approval sentence; plain continue is still non-production only.',
    'When the source contains the exact sentence, only P31 with its explicit create flag may create both active approval artifacts.',
    'P31 must create the approval receipt and active hash-lock together, referencing P50, P51, P52 plus main/final dry-run hash locks.',
    'P44 must reject any one-sided active artifact and may only move to sequencing after both active artifacts validate for this run and targetLocale=fr.',
    'Keep app apply, server/Firebase upload, runtime downloads and storage/cloud migrations closed until the production activation sequence explicitly opens them.',
  ];

  const dryRun = {
    schemaVersion: 'gustav-exact-approval-source-intake-transition-dry-run-v2-v0',
    runId,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    intakeTransitionState,
    requiredApprovalSentenceSha256: sha256Text(requiredApprovalSentence),
    approvalSourcePath: rel(repoRoot, approvalSourcePath),
    defaultApprovalSourcePath: rel(repoRoot, defaultApprovalSourcePath),
    approvalSourceExists: input.approvalSourceExists,
    approvalSourceContainsExactSentence: input.approvalSourceContainsExactSentence,
    plainContinueWouldCreateActiveArtifacts: false,
    wouldCreateActiveArtifactsNow: false,
    wouldCreateActiveArtifactsByThisScript: false,
    activeApprovalReceiptExists: input.activeApprovalReceiptExists,
    activeHashLockExists: input.activeHashLockExists,
    simulatedValidP31CreateWouldCreateBothArtifacts: validP31SimulationReady,
    simulatedP44WouldOpenSequencingOnlyAfterBothArtifacts: validP31SimulationReady,
    productionWritesAllowed: false,
    activationApproved: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    p31PacketPath: rel(repoRoot, p31Path),
    p44PacketPath: rel(repoRoot, p44Path),
    p52PacketPath: rel(repoRoot, p52Path),
    nextRequiredActions,
  };
  writeJson(dryRunPath, dryRun);

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-source-intake-transition-v2-packet-v0',
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
      exactApprovalApplyRehearsalV2Packet: rel(repoRoot, p51Path),
      exactApprovalSourceFirewallV2Packet: rel(repoRoot, p52Path),
      hashLockManifestDryRunV2: rel(repoRoot, dryRunHashLockPath),
      finalPreapprovalEvidenceHashLockDryRunV2: rel(repoRoot, finalDryRunHashLockPath),
      approvalSource: rel(repoRoot, approvalSourcePath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      intakeTransitionDryRun: rel(repoRoot, dryRunPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      intakeTransitionState,
      p30Ready: input.p30Status === 'PASS' && input.p30State === 'approval_request_presented' && input.p30ReadyForReceiptCreation,
      p31SafeHoldReady: p31Closed(input),
      p44WaitingForExactApproval: p44Closed(input),
      p50FinalHashLockReady: input.p50Status === 'PASS' && input.p50State === 'final_preapproval_evidence_hash_lock_ready',
      p51Ready: input.p51Ready,
      p52Ready: p52Ready(input),
      p52State: input.p52State,
      p52FreshAfterP51: input.p52FreshAfterP51,
      requiredApprovalSentencePresent: input.requiredApprovalSentence.trim() !== '',
      requiredApprovalSentenceSha256: sha256Text(input.requiredApprovalSentence),
      approvalSourcePath: rel(repoRoot, input.approvalSourcePath),
      defaultApprovalSourcePath: rel(repoRoot, input.defaultApprovalSourcePath),
      approvalSourceIsDefaultPath: approvalSourceIsDefault(input),
      approvalSourceExists: input.approvalSourceExists,
      approvalSourceContainsExactSentence: input.approvalSourceContainsExactSentence,
      p31CreateActiveReceiptRequested: input.p31CreateActiveReceiptRequested,
      approvalSourceRequiredForActiveArtifacts: true,
      explicitP31CreateFlagRequiredForActiveArtifacts: true,
      plainContinueWouldCreateActiveArtifacts: false,
      wouldCreateActiveArtifactsNow: false,
      wouldCreateActiveArtifactsByThisScript: false,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      dryRunHashLocks: input.dryRunHashLocks,
      finalDryRunHashLocks: input.finalDryRunHashLocks,
      simulatedValidP31CreateRequiresDefaultApprovalSource: true,
      simulatedValidP31CreateRequiresExactApprovalSentence: true,
      simulatedValidP31CreateRequiresExplicitCreateFlag: true,
      simulatedValidP31CreateWouldCreateApprovalReceipt: validP31SimulationReady,
      simulatedValidP31CreateWouldCreateHashLock: validP31SimulationReady,
      simulatedValidP31CreateWouldCreateBothArtifacts: validP31SimulationReady,
      simulatedValidP31CreateReferencesP50: validP31SimulationReady,
      simulatedValidP31CreateReferencesP51: validP31SimulationReady,
      simulatedValidP31CreateReferencesP52: validP31SimulationReady,
      simulatedValidP31CreateReferencesMainHashLockDryRun: input.dryRunHashLocks > 0,
      simulatedValidP31CreateReferencesFinalHashLockDryRun: input.finalDryRunHashLocks > 0,
      simulatedP44ValidationRequiresBothActiveArtifacts: true,
      simulatedP44WouldOpenSequencingOnlyAfterBothArtifacts: validP31SimulationReady,
      simulatedP44WouldOpenReadyForApply: false,
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
    transitionSimulation: {
      currentPlainContinue: {
        wouldCreateActiveApprovalReceipt: false,
        wouldCreateActiveHashLock: false,
        nextLegalStep: input.approvalSourceContainsExactSentence ? 'run_p31_with_explicit_create_flag' : 'wait_for_run_scoped_exact_approval_source',
      },
      validP31CreateScenario: {
        dryRunOnly: true,
        requiresRunScopedApprovalSource: true,
        requiresExactApprovalSentence: true,
        requiresExplicitP31CreateFlag: true,
        wouldCreateActiveApprovalReceipt: validP31SimulationReady,
        wouldCreateActiveHashLock: validP31SimulationReady,
        wouldCreateBothArtifacts: validP31SimulationReady,
        approvalReceiptTargetLocale: 'fr',
        hashLockTargetLocale: 'fr',
        approvalSourcePath: rel(repoRoot, approvalSourcePath),
        hashLockDryRunPath: rel(repoRoot, dryRunHashLockPath),
        finalPreapprovalEvidenceHashLockDryRunPath: rel(repoRoot, finalDryRunHashLockPath),
        referencesP50FinalPreapprovalHashLock: validP31SimulationReady,
        referencesP51ApplyRehearsal: validP31SimulationReady,
        referencesP52SourceFirewall: validP31SimulationReady,
        opensReadyForApply: false,
        opensRuntimeDownloads: false,
        opensStorageOrCloudMigration: false,
      },
      p44ValidationScenario: {
        requiresBothActiveArtifacts: true,
        onlyOneActiveArtifactRejected: true,
        exactApprovalSentenceMustMatch: true,
        activeArtifactsMustReferenceCurrentRun: true,
        opensProductionActivationSequencingOnlyAfterBothArtifacts: validP31SimulationReady,
        opensReadyForApply: false,
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

  console.log(`GUSTAV exact approval source intake transition V2 packet: ${status}`);
  console.log(`Intake transition state: ${report.summary.intakeTransitionState}`);
  console.log(`Approval source exists/exact: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`);
  console.log(`Plain continue would create active artifacts: ${report.summary.plainContinueWouldCreateActiveArtifacts ? 'yes' : 'no'}`);
  console.log(`This script would create active artifacts: ${report.summary.wouldCreateActiveArtifactsByThisScript ? 'yes' : 'no'}`);
  console.log(`Simulated valid P31 creates both artifacts: ${report.summary.simulatedValidP31CreateWouldCreateBothArtifacts ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
