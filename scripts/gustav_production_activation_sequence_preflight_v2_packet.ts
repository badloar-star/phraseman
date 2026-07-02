import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'HOLD' | 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type PreflightState =
  | 'waiting_for_exact_approval_validation'
  | 'production_activation_sequence_preflight_ready'
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
  expectedState: PreflightState;
  preflightState: PreflightState;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  p44Status: string;
  p44ValidationState: string;
  p44ReadyForProductionActivationSequencing: boolean;
  p44ActiveApprovalReceiptExists: boolean;
  p44ActiveHashLockExists: boolean;
  p44ReadyForApply: boolean;
  p44MayModifyProductionAppFiles: boolean;
  p44ActivationApproved: boolean;
  p44TargetLocale: string;
  masterStatus: string;
  masterBlockers: number;
  masterReadyForApply: boolean;
  masterMayModifyProductionAppFiles: boolean;
  productionServerManifestPublishGateStatus: string;
  productionServerManifestPublishGateState: string;
  productionServerManifestPublishGateReadyForRuntimeDownloadActivation: boolean;
  frenchServerPackUploadEvidenceStatus: string;
  frenchServerPackUploadEvidenceReadyForRemoteObjectVerify: boolean;
  frenchServerPackUploadEvidenceObjects: number;
  frenchServerPackUploadExecutionGateStatus: string;
  frenchServerPackUploadExecutionGateDryRun: boolean;
  frenchServerPackUploadExecutionGatePlannedUploadObjects: number;
  frenchServerPackUploadExecutionGateUploadAttempts: number;
  frenchServerPackUploadExecutionGateUploadSucceeded: number;
  frenchServerPackUploadExecutionGateUploadStarted: boolean;
  frenchServerPackUploadExecutionGateReadyForRemoteObjectVerify: boolean;
  frenchServerObjectRemoteVerifyStatus: string;
  frenchServerObjectRemoteVerifyReadyForRuntimeDownloadActivation: boolean;
  frenchServerObjectRemoteVerifyHashChecked: number;
  frenchServerObjectRemoteVerifyMissingObjects: number;
  frenchServerObjectRemoteVerifySizeMismatches: number;
  frenchServerObjectRemoteVerifyHashMismatches: number;
  targetManifestActivationApproved: boolean;
  targetManifestReadyForApply: boolean;
  targetManifestMayModifyProductionAppFiles: boolean;
  serverManifestActivationApproved: boolean;
  serverManifestReadyForApply: boolean;
  serverManifestMayModifyProductionAppFiles: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  downloadablePacksPublished: boolean;
  runtimeDownloadsEnabled: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  preflightState: PreflightState;
  p44Status: string;
  p44ValidationState: string;
  p44ReadyForProductionActivationSequencing: boolean;
  p44ActiveApprovalReceiptExists: boolean;
  p44ActiveHashLockExists: boolean;
  p44TargetLocale: string;
  masterStatus: string;
  masterBlockers: number;
  productionServerManifestPublishGateStatus: string;
  productionServerManifestPublishGateState: string;
  productionServerManifestPublishGateReadyForRuntimeDownloadActivation: boolean;
  frenchServerPackUploadEvidenceStatus: string;
  frenchServerPackUploadEvidenceReadyForRemoteObjectVerify: boolean;
  frenchServerPackUploadEvidenceObjects: number;
  frenchServerPackUploadExecutionGateStatus: string;
  frenchServerPackUploadExecutionGateDryRun: boolean;
  frenchServerPackUploadExecutionGatePlannedUploadObjects: number;
  frenchServerPackUploadExecutionGateUploadAttempts: number;
  frenchServerPackUploadExecutionGateUploadSucceeded: number;
  frenchServerPackUploadExecutionGateUploadStarted: boolean;
  frenchServerObjectRemoteVerifyStatus: string;
  frenchServerObjectRemoteVerifyReadyForRuntimeDownloadActivation: boolean;
  frenchServerObjectRemoteVerifyHashChecked: number;
  readyForProductionActivationSequence: boolean;
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
  schemaVersion: 'gustav-production-activation-sequence-preflight-v2-packet-v0';
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
  activationSequenceContract: string[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const MASTER_SELF_CYCLE_BLOCKERS = new Set([
  'production_apply_absence_denial_gate_v2_blockers',
  'ordered_approval_wait_refresh_v2_blockers',
  'ordered_approval_wait_refresh_v2_not_ready',
  'ordered_approval_wait_refresh_v2_missing_probe_passes',
  'production_apply_absence_denial_gate_v2_not_denied',
  'production_apply_absence_denial_gate_v2_wrong_state',
  'production_apply_absence_denial_gate_v2_not_ready_for_non_production_continuation',
  'production_apply_absence_denial_gate_v2_missing_probe_passes',
  'production_activation_hold_exact_approval_required_v2_blockers',
  'production_activation_hold_exact_approval_required_v2_not_ready',
  'production_activation_hold_exact_approval_required_v2_missing_probe_passes',
  'exact_approval_validation_gate_v2_not_ready',
  'production_activation_sequence_preflight_v2_blockers',
  'production_activation_sequence_preflight_v2_not_ready',
  'production_activation_sequence_preflight_v2_missing_probe_passes',
  'production_apply_transaction_contract_v2_blockers',
  'production_apply_transaction_contract_v2_not_ready',
  'production_apply_transaction_contract_v2_missing_probe_passes',
  'post_apply_rollback_guard_contract_v2_blockers',
  'post_apply_rollback_guard_contract_v2_not_ready',
  'post_apply_rollback_guard_contract_v2_missing_probe_passes',
  'approval_wait_safe_continuation_v2_blockers',
  'approval_wait_safe_continuation_v2_not_ready',
  'approval_wait_safe_continuation_v2_missing_probe_passes',
  'production_readiness_completion_audit_v2_blockers',
  'production_readiness_completion_audit_v2_not_ready',
  'production_readiness_completion_audit_v2_missing_requirements',
  'production_readiness_completion_audit_v2_missing_probe_passes',
  'final_preapproval_evidence_hash_lock_v2_blockers',
  'final_preapproval_evidence_hash_lock_v2_not_ready',
  'final_preapproval_evidence_hash_lock_v2_missing_probe_passes',
]);

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

function arr(value: JsonObject, key: string): unknown[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw : [];
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

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const p44Waiting =
    input.p44Status === 'HOLD' &&
    input.p44ValidationState === 'waiting_for_exact_approval_artifacts' &&
    !input.p44ReadyForProductionActivationSequencing &&
    !input.p44ActiveApprovalReceiptExists &&
    !input.p44ActiveHashLockExists;
  const p44Validated =
    input.p44Status === 'PASS' &&
    input.p44ValidationState === 'exact_approval_artifacts_validated_for_next_sequencing' &&
    input.p44ReadyForProductionActivationSequencing &&
    input.p44ActiveApprovalReceiptExists &&
    input.p44ActiveHashLockExists;

  if (!p44Waiting && !p44Validated) {
    addFinding(findings, 'blocker', 'P44_NOT_IN_ACCEPTED_STATE', 'P45 requires P44 to be either waiting for exact approval artifacts or fully validated for next sequencing.');
  }
  if (input.p44TargetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'P44_TARGET_LOCALE_MISMATCH', 'P44 must be scoped to targetLocale=fr.');
  }
  if (input.p44ReadyForApply || input.p44MayModifyProductionAppFiles || input.p44ActivationApproved) {
    addFinding(findings, 'blocker', 'P44_OPENED_APPLY_OR_ACTIVATION', 'P44 must not open apply, activation or production app writes.');
  }
  if (input.masterBlockers > 0 && !p44Validated) {
    addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', 'Master manifest must have zero blockers before activation sequencing can be trusted.');
  }
  if (input.masterReadyForApply || input.masterMayModifyProductionAppFiles) {
    addFinding(findings, 'blocker', 'MASTER_APPLY_OPEN', 'Master must keep readyForApply and production file writes closed until a later explicit apply gate.');
  }
  if (
    input.productionServerManifestPublishGateStatus !== 'PASS' ||
    input.productionServerManifestPublishGateState !== 'production_server_manifest_ready_for_activation_gate' ||
    !input.productionServerManifestPublishGateReadyForRuntimeDownloadActivation
  ) {
    addFinding(findings, 'blocker', 'PRODUCTION_SERVER_MANIFEST_PUBLISH_GATE_NOT_READY', 'P45 requires the production server manifest publish gate to prove the final server manifest before sequencing.');
  }
  if (
    input.frenchServerPackUploadEvidenceStatus !== 'PASS' ||
    !input.frenchServerPackUploadEvidenceReadyForRemoteObjectVerify ||
    input.frenchServerPackUploadEvidenceObjects !== 36
  ) {
    addFinding(findings, 'blocker', 'FRENCH_SERVER_PACK_UPLOAD_EVIDENCE_NOT_READY', 'P45 requires upload evidence for all 36 French server pack objects before activation sequencing.');
  }
  if (
    input.frenchServerPackUploadExecutionGateStatus !== 'PASS' ||
    !input.frenchServerPackUploadExecutionGateReadyForRemoteObjectVerify ||
    input.frenchServerPackUploadExecutionGatePlannedUploadObjects !== 36 ||
    !((input.frenchServerPackUploadExecutionGateDryRun &&
      input.frenchServerPackUploadExecutionGateUploadAttempts === 0 &&
      input.frenchServerPackUploadExecutionGateUploadSucceeded === 0 &&
      !input.frenchServerPackUploadExecutionGateUploadStarted) ||
      (!input.frenchServerPackUploadExecutionGateDryRun &&
        input.frenchServerPackUploadExecutionGateUploadAttempts === 36 &&
        input.frenchServerPackUploadExecutionGateUploadSucceeded === 36 &&
        input.frenchServerPackUploadExecutionGateUploadStarted))
  ) {
    addFinding(findings, 'blocker', 'FRENCH_SERVER_PACK_UPLOAD_EXECUTION_GATE_NOT_READY', 'P45 requires guarded upload execution gate PASS: dry-run before upload or 36/36 sentinel-protected upload before activation sequencing.');
  }
  if (
    input.frenchServerObjectRemoteVerifyStatus !== 'PASS' ||
    !input.frenchServerObjectRemoteVerifyReadyForRuntimeDownloadActivation ||
    input.frenchServerObjectRemoteVerifyHashChecked !== 36 ||
    input.frenchServerObjectRemoteVerifyMissingObjects > 0 ||
    input.frenchServerObjectRemoteVerifySizeMismatches > 0 ||
    input.frenchServerObjectRemoteVerifyHashMismatches > 0
  ) {
    addFinding(findings, 'blocker', 'FRENCH_SERVER_OBJECT_REMOTE_VERIFY_NOT_READY', 'P45 requires 36/36 uploaded French server objects to exist remotely with matching size and hash before runtime activation sequencing.');
  }
  const targetActivationApprovedAllowed = input.targetManifestActivationApproved && p44Validated;
  if (
    (input.targetManifestActivationApproved && !targetActivationApprovedAllowed) ||
    input.targetManifestReadyForApply ||
    input.targetManifestMayModifyProductionAppFiles ||
    input.serverManifestActivationApproved ||
    input.serverManifestReadyForApply ||
    input.serverManifestMayModifyProductionAppFiles ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.downloadablePacksPublished ||
    input.runtimeDownloadsEnabled
  ) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P45 preflight must not open activation/apply/upload/download/publication/production-write flags.');
  }
  if (p44Waiting) {
    addFinding(findings, 'info', 'WAITING_FOR_P44_EXACT_APPROVAL_VALIDATION', 'Exact approval artifacts are not validated yet; production activation sequence remains closed.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForProductionActivationSequence = blockers === 0 && p44Validated;
  const preflightState: PreflightState =
    blockers > 0
      ? 'blocked_by_findings'
      : readyForProductionActivationSequence
        ? 'production_activation_sequence_preflight_ready'
        : 'waiting_for_exact_approval_validation';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      preflightState,
      p44Status: input.p44Status,
      p44ValidationState: input.p44ValidationState,
      p44ReadyForProductionActivationSequencing: input.p44ReadyForProductionActivationSequencing,
      p44ActiveApprovalReceiptExists: input.p44ActiveApprovalReceiptExists,
      p44ActiveHashLockExists: input.p44ActiveHashLockExists,
      p44TargetLocale: input.p44TargetLocale,
      masterStatus: input.masterStatus,
      masterBlockers: input.masterBlockers,
      productionServerManifestPublishGateStatus: input.productionServerManifestPublishGateStatus,
      productionServerManifestPublishGateState: input.productionServerManifestPublishGateState,
      productionServerManifestPublishGateReadyForRuntimeDownloadActivation: input.productionServerManifestPublishGateReadyForRuntimeDownloadActivation,
      frenchServerPackUploadEvidenceStatus: input.frenchServerPackUploadEvidenceStatus,
      frenchServerPackUploadEvidenceReadyForRemoteObjectVerify: input.frenchServerPackUploadEvidenceReadyForRemoteObjectVerify,
      frenchServerPackUploadEvidenceObjects: input.frenchServerPackUploadEvidenceObjects,
      frenchServerPackUploadExecutionGateStatus: input.frenchServerPackUploadExecutionGateStatus,
      frenchServerPackUploadExecutionGateDryRun: input.frenchServerPackUploadExecutionGateDryRun,
      frenchServerPackUploadExecutionGatePlannedUploadObjects: input.frenchServerPackUploadExecutionGatePlannedUploadObjects,
      frenchServerPackUploadExecutionGateUploadAttempts: input.frenchServerPackUploadExecutionGateUploadAttempts,
      frenchServerPackUploadExecutionGateUploadSucceeded: input.frenchServerPackUploadExecutionGateUploadSucceeded,
      frenchServerPackUploadExecutionGateUploadStarted: input.frenchServerPackUploadExecutionGateUploadStarted,
      frenchServerObjectRemoteVerifyStatus: input.frenchServerObjectRemoteVerifyStatus,
      frenchServerObjectRemoteVerifyReadyForRuntimeDownloadActivation: input.frenchServerObjectRemoteVerifyReadyForRuntimeDownloadActivation,
      frenchServerObjectRemoteVerifyHashChecked: input.frenchServerObjectRemoteVerifyHashChecked,
      readyForProductionActivationSequence,
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
      warnings,
    },
    findings,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeValidatedP44(input: EvaluationInput): void {
  input.p44Status = 'PASS';
  input.p44ValidationState = 'exact_approval_artifacts_validated_for_next_sequencing';
  input.p44ReadyForProductionActivationSequencing = true;
  input.p44ActiveApprovalReceiptExists = true;
  input.p44ActiveHashLockExists = true;
  input.masterBlockers = 0;
  input.masterReadyForApply = false;
  input.masterMayModifyProductionAppFiles = false;
  input.productionServerManifestPublishGateStatus = 'PASS';
  input.productionServerManifestPublishGateState = 'production_server_manifest_ready_for_activation_gate';
  input.productionServerManifestPublishGateReadyForRuntimeDownloadActivation = true;
  input.frenchServerPackUploadEvidenceStatus = 'PASS';
  input.frenchServerPackUploadEvidenceReadyForRemoteObjectVerify = true;
  input.frenchServerPackUploadEvidenceObjects = 36;
  input.frenchServerPackUploadExecutionGateStatus = 'PASS';
  input.frenchServerPackUploadExecutionGateDryRun = true;
  input.frenchServerPackUploadExecutionGatePlannedUploadObjects = 36;
  input.frenchServerPackUploadExecutionGateUploadAttempts = 0;
  input.frenchServerPackUploadExecutionGateUploadSucceeded = 0;
  input.frenchServerPackUploadExecutionGateUploadStarted = false;
  input.frenchServerPackUploadExecutionGateReadyForRemoteObjectVerify = true;
  input.frenchServerObjectRemoteVerifyStatus = 'PASS';
  input.frenchServerObjectRemoteVerifyReadyForRuntimeDownloadActivation = true;
  input.frenchServerObjectRemoteVerifyHashChecked = 36;
  input.frenchServerObjectRemoteVerifyMissingObjects = 0;
  input.frenchServerObjectRemoteVerifySizeMismatches = 0;
  input.frenchServerObjectRemoteVerifyHashMismatches = 0;
}

function runProbes(base: EvaluationInput): Probe[] {
  const tests: { id: string; expectedState: PreflightState; mutate: (input: EvaluationInput) => void }[] = [
    { id: 'current_server_publication_evidence_ready', expectedState: 'production_activation_sequence_preflight_ready', mutate: () => undefined },
    { id: 'validated_p44_preflight_ready', expectedState: 'production_activation_sequence_preflight_ready', mutate: makeValidatedP44 },
    { id: 'p44_block_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44Status = 'BLOCK'; input.p44ValidationState = 'blocked_by_findings'; } },
    { id: 'p44_pass_missing_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { makeValidatedP44(input); input.p44ActiveApprovalReceiptExists = false; } },
    { id: 'p44_wrong_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { makeValidatedP44(input); input.p44TargetLocale = 'en'; } },
    { id: 'master_blocker_before_p44_validation_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44Status = 'HOLD'; input.p44ValidationState = 'waiting_for_exact_approval_artifacts'; input.masterBlockers = 1; } },
    { id: 'master_apply_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.masterReadyForApply = true; } },
    { id: 'production_server_manifest_publish_gate_hold_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { makeValidatedP44(input); input.productionServerManifestPublishGateStatus = 'HOLD'; } },
    { id: 'french_server_pack_upload_evidence_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { makeValidatedP44(input); input.frenchServerPackUploadEvidenceObjects = 35; } },
    { id: 'french_server_pack_upload_execution_started_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { makeValidatedP44(input); input.frenchServerPackUploadExecutionGateDryRun = false; input.frenchServerPackUploadExecutionGateUploadAttempts = 36; input.frenchServerPackUploadExecutionGateUploadSucceeded = 35; input.frenchServerPackUploadExecutionGateUploadStarted = true; } },
    { id: 'french_server_object_remote_verify_missing_hash_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { makeValidatedP44(input); input.frenchServerObjectRemoteVerifyHashChecked = 35; } },
    { id: 'target_activation_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44Status = 'HOLD'; input.p44ValidationState = 'waiting_for_exact_approval_artifacts'; input.p44ReadyForProductionActivationSequencing = false; input.targetManifestActivationApproved = true; } },
    { id: 'server_upload_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.serverUploadAllowed = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
  ];
  return tests.map((test) => {
    const input = clone(base);
    input.targetManifestActivationApproved = false;
    input.targetManifestReadyForApply = false;
    input.targetManifestMayModifyProductionAppFiles = false;
    test.mutate(input);
    const result = evaluate(input).evaluation;
    return {
      id: test.id,
      expectedState: test.expectedState,
      preflightState: result.preflightState,
      blockers: result.blockers,
      passed: result.preflightState === test.expectedState,
    };
  });
}

function activationSequenceContract(): string[] {
  return [
    'P45 is a preflight only; it never writes activationApproved=true.',
    'Production activation sequence can start only after P44 PASS and readyForProductionActivationSequencing=true.',
    'P44 PASS requires active approval receipt and active hash-lock manifest scoped to targetLocale=fr and current run id.',
    'Master manifest must have zero blockers and keep readyForApply=false/mayModifyProductionAppFiles=false.',
    'Production server manifest publish gate must PASS before P45 can mark runtime activation sequencing ready.',
    'French upload evidence and guarded upload execution gate must PASS before P45 can mark runtime activation sequencing ready.',
    'French server object remote verify must PASS with 36/36 remotely uploaded objects and matching hashes before P45 can mark runtime activation sequencing ready.',
    'Target and server manifests must keep activation/apply/upload/runtime-download/publication flags closed.',
    'Storage and cloud sync migrations stay closed in this preflight.',
    'Any production sequencing after P45 must be handled by a later explicit apply gate with rollback evidence.',
  ];
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Production Activation Sequence Preflight V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Preflight state: \`${report.summary.preflightState}\``,
    `- P44 status/state: \`${report.summary.p44Status}\`/\`${report.summary.p44ValidationState}\``,
    `- P44 ready for production sequencing: ${report.summary.p44ReadyForProductionActivationSequencing ? 'yes' : 'no'}`,
    `- P44 active receipt/hash lock: ${report.summary.p44ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p44ActiveHashLockExists ? 'yes' : 'no'}`,
    `- Master status/blockers: \`${report.summary.masterStatus}\`/${report.summary.masterBlockers}`,
    `- Ready for production activation sequence: ${report.summary.readyForProductionActivationSequence ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Upload/download flags: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}/${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Activation Sequence Contract',
    '',
  ];
  for (const item of report.activationSequenceContract) lines.push(`- ${item}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  if (report.findings.length === 0) lines.push('- none');
  for (const finding of report.findings) {
    lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  }
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- This packet is preflight only.');
  lines.push('- It does not create approval receipts, active hash locks, production app writes, server uploads, runtime downloads, storage/cloud migrations or production apply approval.');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);

  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const packDir = path.join(runDir, 'pack_candidates/fr');
  const p44Path = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const productionServerManifestPublishGatePath = path.join(auditsDir, 'production_server_manifest_publish_gate_v2_packet.json');
  const frenchServerPackUploadEvidencePath = path.join(auditsDir, 'french_server_pack_upload_evidence_v2_packet.json');
  const frenchServerPackUploadExecutionGatePath = path.join(auditsDir, 'french_server_pack_upload_execution_gate_v2_packet.json');
  const frenchServerObjectRemoteVerifyPath = path.join(auditsDir, 'french_server_object_remote_verify_v2_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const outputJsonPath = path.join(auditsDir, 'production_activation_sequence_preflight_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'production_activation_sequence_preflight_v2_packet.md');

  const p44 = readJsonOrEmpty(p44Path);
  const master = readJsonOrEmpty(masterPath);
  const productionServerManifestPublishGate = readJsonOrEmpty(productionServerManifestPublishGatePath);
  const frenchServerPackUploadEvidence = readJsonOrEmpty(frenchServerPackUploadEvidencePath);
  const frenchServerPackUploadExecutionGate = readJsonOrEmpty(frenchServerPackUploadExecutionGatePath);
  const frenchServerObjectRemoteVerify = readJsonOrEmpty(frenchServerObjectRemoteVerifyPath);
  const targetManifest = readJsonOrEmpty(targetManifestPath);
  const serverManifest = readJsonOrEmpty(serverManifestPath);
  const p44Summary = summaryOf(p44);
  const masterSummary = summaryOf(master);
  const productionServerManifestPublishGateSummary = summaryOf(productionServerManifestPublishGate);
  const frenchServerPackUploadEvidenceSummary = summaryOf(frenchServerPackUploadEvidence);
  const frenchServerPackUploadExecutionGateSummary = summaryOf(frenchServerPackUploadExecutionGate);
  const frenchServerObjectRemoteVerifySummary = summaryOf(frenchServerObjectRemoteVerify);
  const targetActivation = object(targetManifest.activation);
  const masterActionableBlockers = arr(master, 'findings')
    .filter((finding) => s(object(finding), 'severity') === 'blocker')
    .filter((finding) => {
      const code = s(object(finding), 'code');
      return (
        !MASTER_SELF_CYCLE_BLOCKERS.has(code) &&
        !code.startsWith('nonproduction_blocker_closure_plan_v2_') &&
        !code.startsWith('exact_approval_')
      );
    })
    .length;

  const input: EvaluationInput = {
    p44Status: s(p44, 'status'),
    p44ValidationState: s(p44Summary, 'validationState'),
    p44ReadyForProductionActivationSequencing: b(p44Summary, 'readyForProductionActivationSequencing'),
    p44ActiveApprovalReceiptExists: b(p44Summary, 'activeApprovalReceiptExists'),
    p44ActiveHashLockExists: b(p44Summary, 'activeHashLockExists'),
    p44ReadyForApply: b(p44Summary, 'readyForApply'),
    p44MayModifyProductionAppFiles: b(p44Summary, 'mayModifyProductionAppFiles'),
    p44ActivationApproved: b(p44Summary, 'activationApproved'),
    p44TargetLocale: s(p44Summary, 'targetLocale'),
    masterStatus: s(master, 'status'),
    masterBlockers: masterActionableBlockers,
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    productionServerManifestPublishGateStatus: s(productionServerManifestPublishGate, 'status'),
    productionServerManifestPublishGateState: s(productionServerManifestPublishGateSummary, 'publishGateState'),
    productionServerManifestPublishGateReadyForRuntimeDownloadActivation: b(productionServerManifestPublishGateSummary, 'readyForRuntimeDownloadActivation'),
    frenchServerPackUploadEvidenceStatus: s(frenchServerPackUploadEvidence, 'status'),
    frenchServerPackUploadEvidenceReadyForRemoteObjectVerify: b(frenchServerPackUploadEvidenceSummary, 'readyForRemoteObjectVerify'),
    frenchServerPackUploadEvidenceObjects: n(frenchServerPackUploadEvidenceSummary, 'uploadObjects'),
    frenchServerPackUploadExecutionGateStatus: s(frenchServerPackUploadExecutionGate, 'status'),
    frenchServerPackUploadExecutionGateDryRun: b(frenchServerPackUploadExecutionGateSummary, 'dryRun'),
    frenchServerPackUploadExecutionGatePlannedUploadObjects: n(frenchServerPackUploadExecutionGateSummary, 'plannedUploadObjects'),
    frenchServerPackUploadExecutionGateUploadAttempts: n(frenchServerPackUploadExecutionGateSummary, 'uploadAttempts'),
    frenchServerPackUploadExecutionGateUploadSucceeded: n(frenchServerPackUploadExecutionGateSummary, 'uploadSucceeded'),
    frenchServerPackUploadExecutionGateUploadStarted: b(object(frenchServerPackUploadExecutionGate.safety), 'firebaseOrServerUploadStarted'),
    frenchServerPackUploadExecutionGateReadyForRemoteObjectVerify: b(frenchServerPackUploadExecutionGateSummary, 'readyForRemoteObjectVerify'),
    frenchServerObjectRemoteVerifyStatus: s(frenchServerObjectRemoteVerify, 'status'),
    frenchServerObjectRemoteVerifyReadyForRuntimeDownloadActivation: b(frenchServerObjectRemoteVerifySummary, 'readyForRuntimeDownloadActivation'),
    frenchServerObjectRemoteVerifyHashChecked:
      n(frenchServerObjectRemoteVerifySummary, 'hashCheckedObjects') ||
      n(frenchServerObjectRemoteVerifySummary, 'hashCheckedCount'),
    frenchServerObjectRemoteVerifyMissingObjects: n(frenchServerObjectRemoteVerifySummary, 'missingObjects'),
    frenchServerObjectRemoteVerifySizeMismatches: n(frenchServerObjectRemoteVerifySummary, 'sizeMismatches'),
    frenchServerObjectRemoteVerifyHashMismatches: n(frenchServerObjectRemoteVerifySummary, 'hashMismatches'),
    targetManifestActivationApproved: b(targetActivation, 'activationApproved'),
    targetManifestReadyForApply: b(targetActivation, 'readyForApply'),
    targetManifestMayModifyProductionAppFiles: b(targetActivation, 'mayModifyProductionAppFiles'),
    serverManifestActivationApproved: b(serverManifest, 'activationApproved'),
    serverManifestReadyForApply: b(serverManifest, 'readyForApply'),
    serverManifestMayModifyProductionAppFiles: b(serverManifest, 'mayModifyProductionAppFiles'),
    serverUploadAllowed: b(serverManifest, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(serverManifest, 'firebaseUploadAllowed'),
    downloadablePacksPublished: b(serverManifest, 'downloadablePacksPublished'),
    runtimeDownloadsEnabled: b(serverManifest, 'runtimeDownloadsEnabled'),
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status =
    blockers > 0
      ? 'BLOCK'
      : evaluation.preflightState === 'production_activation_sequence_preflight_ready'
        ? 'PASS'
        : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-production-activation-sequence-preflight-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      exactApprovalValidationGateV2Packet: rel(repoRoot, p44Path),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
      productionServerManifestPublishGateV2Packet: rel(repoRoot, productionServerManifestPublishGatePath),
      frenchServerPackUploadEvidenceV2Packet: rel(repoRoot, frenchServerPackUploadEvidencePath),
      frenchServerPackUploadExecutionGateV2Packet: rel(repoRoot, frenchServerPackUploadExecutionGatePath),
      frenchServerObjectRemoteVerifyV2Packet: rel(repoRoot, frenchServerObjectRemoteVerifyPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      ...evaluation,
      blockers,
      warnings,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    activationSequenceContract: activationSequenceContract(),
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV production activation sequence preflight V2 packet: ${status}`);
  console.log(`Preflight state: ${report.summary.preflightState}`);
  console.log(`P44 status/state: ${report.summary.p44Status}/${report.summary.p44ValidationState}`);
  console.log(`Ready for production activation sequence: ${report.summary.readyForProductionActivationSequence ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (status === 'BLOCK') process.exitCode = 1;
}

main();
