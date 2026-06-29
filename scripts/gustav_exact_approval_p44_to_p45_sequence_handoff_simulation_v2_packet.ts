import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type HandoffState =
  | 'p44_to_p45_handoff_simulation_ready_waiting_for_p31_p44_validation'
  | 'p44_to_p45_handoff_simulation_ready_for_p45_sequence_after_p44_validation'
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
  expectedState: HandoffState;
  handoffState: HandoffState;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  currentRunId: string;
  p56Status: string;
  p56Ready: boolean;
  p56State: string;
  p56FreshAfterP45: boolean;
  p56CommandAllowedNow: boolean;
  p56CommandAllowedAfterP31Create: boolean;
  p56CommandExecutedByThisScript: boolean;
  p44Status: string;
  p44ValidationState: string;
  p44TargetLocale: string;
  p44ReadyForProductionActivationSequencing: boolean;
  p44ActiveApprovalReceiptExists: boolean;
  p44ActiveHashLockExists: boolean;
  p44ReadyForApply: boolean;
  p44MayModifyProductionAppFiles: boolean;
  p44ActivationApproved: boolean;
  p44ValidActiveArtifactsProbePassed: boolean;
  p45Status: string;
  p45PreflightState: string;
  p45TargetLocale: string;
  p45ReadyForProductionActivationSequence: boolean;
  p45ReadyForApply: boolean;
  p45MayModifyProductionAppFiles: boolean;
  p45ActivationApproved: boolean;
  p45ValidatedP44ProbePassed: boolean;
  masterBlockers: number;
  masterReadyForApply: boolean;
  masterMayModifyProductionAppFiles: boolean;
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
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
  commandWouldExecuteByThisScript: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  handoffState: HandoffState;
  p56Ready: boolean;
  p56State: string;
  p56CommandAllowedNow: boolean;
  p56CommandAllowedAfterP31Create: boolean;
  p56CommandExecutedByThisScript: boolean;
  p44Status: string;
  p44ValidationState: string;
  p44ReadyForProductionActivationSequencing: boolean;
  p44ActiveApprovalReceiptExists: boolean;
  p44ActiveHashLockExists: boolean;
  p44ValidActiveArtifactsProbePassed: boolean;
  p45Status: string;
  p45PreflightState: string;
  p45ReadyForProductionActivationSequence: boolean;
  p45ValidatedP44ProbePassed: boolean;
  currentP44ToP45HandoffWouldOpenSequence: boolean;
  simulatedPostP44P45WouldOpenSequence: boolean;
  p45SequenceCommandWouldExecuteByThisScript: boolean;
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
  schemaVersion: 'gustav-exact-approval-p44-to-p45-sequence-handoff-simulation-v2-packet-v0';
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
  handoffSimulation: {
    dryRunOnly: true;
    p44ValidationCommand: string;
    p45SequencePreflightCommand: string;
    p44ValidationCommandExecutedByThisScript: false;
    p45SequencePreflightCommandExecutedByThisScript: false;
    requiresP56Ready: true;
    requiresP44ValidatedState: true;
    requiresP45PreflightReadyState: true;
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
    p44ValidationCommandExecutedByThisScript: false;
    p45SequencePreflightCommandExecutedByThisScript: false;
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

function fileMtimeMs(filePath: string): number {
  return fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

const MASTER_EXACT_APPROVAL_TRANSIENT_BLOCKERS = new Set([
  'nonproduction_blocker_closure_plan_v2_blockers',
  'nonproduction_blocker_closure_plan_v2_wrong_state',
  'nonproduction_blocker_closure_plan_v2_not_ready_for_next_pass',
  'nonproduction_blocker_closure_plan_v2_missing_probe_passes',
  'nonproduction_evidence_refresh_v2_not_ready_for_manifest_recheck',
  'official_source_content_coverage_v2_not_ready_for_import_dry_run_refresh',
  'ordered_approval_wait_refresh_v2_blockers',
  'ordered_approval_wait_refresh_v2_not_ready',
  'ordered_approval_wait_refresh_v2_missing_probe_passes',
  'safe_preapproval_continuation_v2_blockers',
  'safe_preapproval_continuation_v2_not_ready',
  'safe_preapproval_continuation_v2_missing_probe_passes',
  'production_apply_absence_denial_gate_v2_blockers',
  'production_apply_absence_denial_gate_v2_not_denied',
  'production_apply_absence_denial_gate_v2_wrong_state',
  'production_apply_absence_denial_gate_v2_not_ready_for_non_production_continuation',
  'production_apply_absence_denial_gate_v2_missing_probe_passes',
  'production_activation_hold_exact_approval_required_v2_blockers',
  'production_activation_hold_exact_approval_required_v2_not_ready',
  'production_activation_hold_exact_approval_required_v2_missing_probe_passes',
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
  'production_readiness_completion_audit_v2_missing_closed_requirements',
  'production_readiness_completion_audit_v2_missing_requirements',
  'production_readiness_completion_audit_v2_missing_probe_passes',
  'final_preapproval_evidence_hash_lock_v2_blockers',
  'final_preapproval_evidence_hash_lock_v2_not_ready',
  'final_preapproval_evidence_hash_lock_v2_missing_probe_passes',
  'exact_approval_validation_gate_v2_not_ready',
  'exact_approval_apply_rehearsal_v2_blockers',
  'exact_approval_apply_rehearsal_v2_not_ready',
  'exact_approval_apply_rehearsal_v2_missing_probe_passes',
  'exact_approval_source_firewall_v2_blockers',
  'exact_approval_source_firewall_v2_not_ready',
  'exact_approval_source_firewall_v2_missing_probe_passes',
  'exact_approval_source_intake_transition_v2_blockers',
  'exact_approval_source_intake_transition_v2_not_ready',
  'exact_approval_source_intake_transition_v2_missing_probe_passes',
  'exact_approval_active_artifact_pair_simulation_v2_blockers',
  'exact_approval_active_artifact_pair_simulation_v2_not_ready',
  'exact_approval_active_artifact_pair_simulation_v2_missing_probe_passes',
  'exact_approval_p31_create_command_preflight_v2_blockers',
  'exact_approval_p31_create_command_preflight_v2_not_ready',
  'exact_approval_p31_create_command_preflight_v2_missing_probe_passes',
  'exact_approval_p44_validation_command_preflight_v2_blockers',
  'exact_approval_p44_validation_command_preflight_v2_not_ready',
  'exact_approval_p44_validation_command_preflight_v2_missing_probe_passes',
  'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_blockers',
  'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_not_ready',
  'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_missing_probe_passes',
  'exact_approval_p45_sequence_command_preflight_v2_blockers',
  'exact_approval_p45_sequence_command_preflight_v2_not_ready',
  'exact_approval_p45_sequence_command_preflight_v2_missing_probe_passes',
  'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_blockers',
  'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_not_ready',
  'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_missing_probe_passes',
  'exact_approval_p46_apply_transaction_command_preflight_v2_blockers',
  'exact_approval_p46_apply_transaction_command_preflight_v2_not_ready',
  'exact_approval_p46_apply_transaction_command_preflight_v2_missing_probe_passes',
  'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_blockers',
  'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_not_ready',
  'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_missing_probe_passes',
  'exact_approval_p47_rollback_guard_command_preflight_v2_blockers',
  'exact_approval_p47_rollback_guard_command_preflight_v2_not_ready',
  'exact_approval_p47_rollback_guard_command_preflight_v2_missing_probe_passes',
  'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_blockers',
  'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_not_ready',
  'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_missing_probe_passes',
  'exact_approval_p48_safe_continuation_command_preflight_v2_blockers',
  'exact_approval_p48_safe_continuation_command_preflight_v2_not_ready',
  'exact_approval_p48_safe_continuation_command_preflight_v2_missing_probe_passes',
]);

function masterActionableBlockerCount(master: JsonObject): number {
  return arr(master, 'findings')
    .filter((finding) => s(object(finding), 'severity') === 'blocker')
    .filter((finding) => {
      const code = s(object(finding), 'code');
      return (
        !MASTER_EXACT_APPROVAL_TRANSIENT_BLOCKERS.has(code) &&
        !code.startsWith('explicit_approval_receipt_hash_lock_gate_v2_') &&
        !code.startsWith('post_apply_rollback_guard_contract_v2_') &&
        !code.startsWith('approval_wait_safe_continuation_v2_') &&
        !code.startsWith('exact_approval_')
      );
    })
    .length;
}

function probePassed(report: JsonObject, id: string): boolean {
  return arr(report, 'probes').some((probe) => {
    const item = object(probe);
    return s(item, 'id') === id && b(item, 'passed');
  });
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];

  const p56Accepted =
    input.p56Status === 'PASS' &&
    input.p56Ready &&
    input.p56FreshAfterP45 &&
    (input.p56State === 'p44_validation_command_preflight_ready_waiting_for_p31_active_artifacts' ||
      input.p56State === 'p44_validation_command_preflight_ready_for_validation_command') &&
    input.p56CommandAllowedAfterP31Create &&
    !input.p56CommandExecutedByThisScript;
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
  const p45Waiting =
    input.p45Status === 'HOLD' &&
    input.p45PreflightState === 'waiting_for_exact_approval_validation' &&
    !input.p45ReadyForProductionActivationSequence;
  const p45Ready =
    input.p45Status === 'PASS' &&
    input.p45PreflightState === 'production_activation_sequence_preflight_ready' &&
    input.p45ReadyForProductionActivationSequence;
  const currentHandoffWouldOpen = p44Validated && p45Ready;
  const simulatedPostP44P45WouldOpenSequence =
    p56Accepted &&
    input.p44ValidActiveArtifactsProbePassed &&
    input.p45ValidatedP44ProbePassed;

  if (!p56Accepted) {
    addFinding(findings, 'blocker', 'P56_NOT_READY_FOR_P44_TO_P45_HANDOFF', 'P57 requires P56 to be fresh, PASS and closed, with P44 validation allowed only after P31 active artifacts.');
  }
  if (input.p44TargetLocale !== 'fr' || input.p45TargetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'TARGET_LOCALE_MISMATCH', 'P44 and P45 handoff must stay scoped to targetLocale=fr.');
  }
  if (!p44Waiting && !p44Validated) {
    addFinding(findings, 'blocker', 'P44_NOT_IN_ACCEPTED_HANDOFF_STATE', 'P44 must be waiting for exact approval artifacts or validated for next sequencing.');
  }
  if (!p45Waiting && !p45Ready) {
    addFinding(findings, 'blocker', 'P45_NOT_IN_ACCEPTED_HANDOFF_STATE', 'P45 must be waiting for exact approval validation or preflight-ready after validated P44.');
  }
  if (p44Validated && !p45Ready) {
    addFinding(findings, 'blocker', 'P44_VALIDATED_BUT_P45_NOT_READY', 'If P44 is already validated, P45 must be refreshed into production_activation_sequence_preflight_ready before sequencing can continue.');
  }
  if (p45Ready && !p44Validated) {
    addFinding(findings, 'blocker', 'P45_READY_WITHOUT_P44_VALIDATED', 'P45 cannot be sequence-ready unless P44 is validated for next sequencing.');
  }
  if (!input.p44ValidActiveArtifactsProbePassed) {
    addFinding(findings, 'blocker', 'P44_VALID_ACTIVE_ARTIFACT_PROBE_MISSING', 'P44 must prove valid active artifacts advance to exact_approval_artifacts_validated_for_next_sequencing.');
  }
  if (!input.p45ValidatedP44ProbePassed) {
    addFinding(findings, 'blocker', 'P45_VALIDATED_P44_PROBE_MISSING', 'P45 must prove validated P44 advances to production_activation_sequence_preflight_ready.');
  }
  if (!simulatedPostP44P45WouldOpenSequence) {
    addFinding(findings, 'blocker', 'POST_P44_P45_SEQUENCE_SIMULATION_NOT_OPEN', 'A simulated validated P44 must open the P45 sequence preflight without opening apply.');
  }
  if (
    input.p44ReadyForApply ||
    input.p44MayModifyProductionAppFiles ||
    input.p44ActivationApproved ||
    input.p45ReadyForApply ||
    input.p45MayModifyProductionAppFiles ||
    input.p45ActivationApproved ||
    input.masterReadyForApply ||
    input.masterMayModifyProductionAppFiles ||
    input.targetManifestActivationApproved ||
    input.targetManifestReadyForApply ||
    input.targetManifestMayModifyProductionAppFiles ||
    input.serverManifestActivationApproved ||
    input.serverManifestReadyForApply ||
    input.serverManifestMayModifyProductionAppFiles ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.downloadablePacksPublished ||
    input.runtimeDownloadsEnabled ||
    input.storageMigrationAllowed ||
    input.cloudSyncMigrationAllowed
  ) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P57 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }
  if (input.masterBlockers > 0) {
    addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', `Master manifest has ${input.masterBlockers} blocker(s).`);
  }
  if (input.commandWouldExecuteByThisScript) {
    addFinding(findings, 'blocker', 'PREFLIGHT_EXECUTED_COMMAND', 'P57 is a simulation and must not execute P44 or P45 commands.');
  }
  if (p44Waiting && p45Waiting) {
    addFinding(findings, 'info', 'WAITING_FOR_P31_P44_VALIDATION', 'Current production sequencing stays closed until P31 active artifacts exist and P44 validates them.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const handoffState: HandoffState =
    blockers > 0
      ? 'blocked_by_findings'
      : currentHandoffWouldOpen
        ? 'p44_to_p45_handoff_simulation_ready_for_p45_sequence_after_p44_validation'
        : 'p44_to_p45_handoff_simulation_ready_waiting_for_p31_p44_validation';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      handoffState,
      p56Ready: input.p56Ready,
      p56State: input.p56State,
      p56CommandAllowedNow: input.p56CommandAllowedNow,
      p56CommandAllowedAfterP31Create: input.p56CommandAllowedAfterP31Create,
      p56CommandExecutedByThisScript: input.p56CommandExecutedByThisScript,
      p44Status: input.p44Status,
      p44ValidationState: input.p44ValidationState,
      p44ReadyForProductionActivationSequencing: input.p44ReadyForProductionActivationSequencing,
      p44ActiveApprovalReceiptExists: input.p44ActiveApprovalReceiptExists,
      p44ActiveHashLockExists: input.p44ActiveHashLockExists,
      p44ValidActiveArtifactsProbePassed: input.p44ValidActiveArtifactsProbePassed,
      p45Status: input.p45Status,
      p45PreflightState: input.p45PreflightState,
      p45ReadyForProductionActivationSequence: input.p45ReadyForProductionActivationSequence,
      p45ValidatedP44ProbePassed: input.p45ValidatedP44ProbePassed,
      currentP44ToP45HandoffWouldOpenSequence: currentHandoffWouldOpen,
      simulatedPostP44P45WouldOpenSequence,
      p45SequenceCommandWouldExecuteByThisScript: input.commandWouldExecuteByThisScript,
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

function makePostP44Validated(input: EvaluationInput): void {
  input.p44Status = 'PASS';
  input.p44ValidationState = 'exact_approval_artifacts_validated_for_next_sequencing';
  input.p44ReadyForProductionActivationSequencing = true;
  input.p44ActiveApprovalReceiptExists = true;
  input.p44ActiveHashLockExists = true;
  input.p45Status = 'PASS';
  input.p45PreflightState = 'production_activation_sequence_preflight_ready';
  input.p45ReadyForProductionActivationSequence = true;
}

function runProbes(base: EvaluationInput): Probe[] {
  const tests: Array<{ id: string; expectedState: HandoffState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_waits_for_p31_p44_validation', expectedState: 'p44_to_p45_handoff_simulation_ready_waiting_for_p31_p44_validation', mutate: () => undefined },
    { id: 'post_p44_fixture_allows_p45_sequence_preflight', expectedState: 'p44_to_p45_handoff_simulation_ready_for_p45_sequence_after_p44_validation', mutate: makePostP44Validated },
    { id: 'stale_p56_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p56FreshAfterP45 = false; } },
    { id: 'p56_command_after_p31_not_allowed_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p56CommandAllowedAfterP31Create = false; } },
    { id: 'p56_command_executed_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p56CommandExecutedByThisScript = true; } },
    { id: 'missing_p44_probe_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44ValidActiveArtifactsProbePassed = false; } },
    { id: 'missing_p45_probe_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45ValidatedP44ProbePassed = false; } },
    { id: 'p44_validated_p45_not_ready_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44Status = 'PASS'; input.p44ValidationState = 'exact_approval_artifacts_validated_for_next_sequencing'; input.p44ReadyForProductionActivationSequencing = true; input.p44ActiveApprovalReceiptExists = true; input.p44ActiveHashLockExists = true; } },
    { id: 'p45_ready_without_p44_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45Status = 'PASS'; input.p45PreflightState = 'production_activation_sequence_preflight_ready'; input.p45ReadyForProductionActivationSequence = true; } },
    { id: 'p44_wrong_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44TargetLocale = 'en'; } },
    { id: 'p45_wrong_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45TargetLocale = 'en'; } },
    { id: 'p44_ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44ReadyForApply = true; } },
    { id: 'master_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.masterBlockers = 1; } },
    { id: 'target_activation_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.targetManifestActivationApproved = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'storage_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; } },
    { id: 'cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.cloudSyncMigrationAllowed = true; } },
    { id: 'simulation_command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandWouldExecuteByThisScript = true; } },
  ];
  return tests.map((test) => {
    const input = clone(base);
    test.mutate(input);
    const result = evaluate(input).evaluation;
    return {
      id: test.id,
      expectedState: test.expectedState,
      handoffState: result.handoffState,
      blockers: result.blockers,
      passed: result.handoffState === test.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Exact Approval P44 To P45 Sequence Handoff Simulation V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Handoff state: \`${report.summary.handoffState}\``,
    `- P56 ready/state/command now/after-P31/executed: ${report.summary.p56Ready ? 'yes' : 'no'}/${report.summary.p56State}/${report.summary.p56CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p56CommandAllowedAfterP31Create ? 'yes' : 'no'}/${report.summary.p56CommandExecutedByThisScript ? 'yes' : 'no'}`,
    `- P44 status/state/active receipt/hash/probe: ${report.summary.p44Status}/${report.summary.p44ValidationState}/${report.summary.p44ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p44ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.p44ValidActiveArtifactsProbePassed ? 'yes' : 'no'}`,
    `- P45 status/state/sequence/probe: ${report.summary.p45Status}/${report.summary.p45PreflightState}/${report.summary.p45ReadyForProductionActivationSequence ? 'yes' : 'no'}/${report.summary.p45ValidatedP44ProbePassed ? 'yes' : 'no'}`,
    `- Current handoff would open sequence: ${report.summary.currentP44ToP45HandoffWouldOpenSequence ? 'yes' : 'no'}`,
    `- Simulated post-P44 P45 would open sequence: ${report.summary.simulatedPostP44P45WouldOpenSequence ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Handoff Simulation',
    '',
    `- P44 validation command: \`${report.handoffSimulation.p44ValidationCommand}\``,
    `- P45 sequence preflight command: \`${report.handoffSimulation.p45SequencePreflightCommand}\``,
    '- Commands executed by this script: no/no',
    '',
    '## Next Required Actions',
    '',
    ...report.nextRequiredActions.map((action) => `- ${action}`),
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  for (const finding of report.findings) {
    lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  }
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- This packet is dry-run simulation only.');
  lines.push('- It does not execute P44 or P45, create active approval artifacts, write production app files, upload packs, enable runtime downloads, run storage/cloud migrations or approve production apply.');
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
  const applyPlanDir = path.join(runDir, 'apply_plan');
  const packDir = path.join(runDir, 'pack_candidates/fr');
  const p44Path = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const p45Path = path.join(auditsDir, 'production_activation_sequence_preflight_v2_packet.json');
  const p56Path = path.join(auditsDir, 'exact_approval_p44_validation_command_preflight_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_p44_to_p45_sequence_handoff_simulation_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_packet.md');

  const p44 = readJsonOrEmpty(p44Path);
  const p45 = readJsonOrEmpty(p45Path);
  const p56 = readJsonOrEmpty(p56Path);
  const master = readJsonOrEmpty(masterPath);
  const targetManifest = readJsonOrEmpty(targetManifestPath);
  const serverManifest = readJsonOrEmpty(serverManifestPath);
  const p44Summary = summaryOf(p44);
  const p45Summary = summaryOf(p45);
  const p56Summary = summaryOf(p56);
  const masterSummary = summaryOf(master);
  const targetActivation = object(targetManifest.activation);
  const p56Handoff = object(p56.p44ValidationCommandPreflight);
  const masterBlockers = masterActionableBlockerCount(master);

  const p56Ready =
    fs.existsSync(p56Path) &&
    s(p56, 'status') === 'PASS' &&
    n(p56Summary, 'blockers') === 0 &&
    (s(p56Summary, 'preflightState') === 'p44_validation_command_preflight_ready_waiting_for_p31_active_artifacts' ||
      s(p56Summary, 'preflightState') === 'p44_validation_command_preflight_ready_for_validation_command') &&
    b(p56Summary, 'p55Ready') &&
    b(p56Summary, 'commandTargetsFr') &&
    b(p56Summary, 'commandRunPathMatchesCurrentRun') &&
    b(p56Summary, 'commandUsesDefaultApprovalSource') &&
    b(p56Summary, 'commandWouldOnlyValidateReservedActivePaths') &&
    b(p56Summary, 'p44ValidationCommandAllowedAfterP31Create') &&
    !b(p56Summary, 'p44ValidationCommandWouldExecuteByThisScript') &&
    !b(p56Summary, 'readyForApply') &&
    !b(p56Summary, 'mayModifyProductionAppFiles') &&
    n(p56Summary, 'fixtureProbes') > 0 &&
    n(p56Summary, 'fixtureProbesPassed') === n(p56Summary, 'fixtureProbes');

  const p45SequencePreflightCommand = `npx tsx scripts\\gustav_production_activation_sequence_preflight_v2_packet.ts --run ${rel(repoRoot, runDir).split('/').join('\\')} --target fr`;
  const input: EvaluationInput = {
    currentRunId: runId,
    p56Status: s(p56, 'status'),
    p56Ready,
    p56State: s(p56Summary, 'preflightState'),
    p56FreshAfterP45: fileMtimeMs(p56Path) >= fileMtimeMs(p45Path) && fileMtimeMs(p45Path) > 0,
    p56CommandAllowedNow: b(p56Summary, 'p44ValidationCommandAllowedNow'),
    p56CommandAllowedAfterP31Create: b(p56Summary, 'p44ValidationCommandAllowedAfterP31Create'),
    p56CommandExecutedByThisScript: b(p56Summary, 'p44ValidationCommandWouldExecuteByThisScript'),
    p44Status: s(p44, 'status'),
    p44ValidationState: s(p44Summary, 'validationState'),
    p44TargetLocale: s(p44Summary, 'targetLocale'),
    p44ReadyForProductionActivationSequencing: b(p44Summary, 'readyForProductionActivationSequencing'),
    p44ActiveApprovalReceiptExists: b(p44Summary, 'activeApprovalReceiptExists'),
    p44ActiveHashLockExists: b(p44Summary, 'activeHashLockExists'),
    p44ReadyForApply: b(p44Summary, 'readyForApply'),
    p44MayModifyProductionAppFiles: b(p44Summary, 'mayModifyProductionAppFiles'),
    p44ActivationApproved: b(p44Summary, 'activationApproved'),
    p44ValidActiveArtifactsProbePassed: probePassed(p44, 'valid_active_artifacts_advance_to_sequencing'),
    p45Status: s(p45, 'status'),
    p45PreflightState: s(p45Summary, 'preflightState'),
    p45TargetLocale: s(p45Summary, 'targetLocale'),
    p45ReadyForProductionActivationSequence: b(p45Summary, 'readyForProductionActivationSequence'),
    p45ReadyForApply: b(p45Summary, 'readyForApply'),
    p45MayModifyProductionAppFiles: b(p45Summary, 'mayModifyProductionAppFiles'),
    p45ActivationApproved: b(p45Summary, 'activationApproved'),
    p45ValidatedP44ProbePassed: probePassed(p45, 'validated_p44_preflight_ready'),
    masterBlockers,
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
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
    storageMigrationAllowed: false,
    cloudSyncMigrationAllowed: false,
    commandWouldExecuteByThisScript: false,
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const nextRequiredActions = [
    'Keep production activation HOLD until exact approval source and both active approval artifacts exist.',
    'After future P31 create, run only the P44 validation command recorded by P56.',
    'After P44 validates active artifacts, refresh P45 and verify it opens only production activation sequence preflight, not apply.',
    'Regenerate P57 if P44 probe IDs, P45 probe IDs, command paths, target locale, run id or closed production flags change.',
  ];

  const p44ValidationCommand = s(p56Handoff, 'commandString') || `npx tsx scripts\\gustav_exact_approval_validation_gate_v2_packet.ts --run ${rel(repoRoot, runDir).split('/').join('\\')} --target fr`;
  const report: Report = {
    schemaVersion: 'gustav-exact-approval-p44-to-p45-sequence-handoff-simulation-v2-packet-v0',
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
      productionActivationSequencePreflightV2Packet: rel(repoRoot, p45Path),
      exactApprovalP44ValidationCommandPreflightV2Packet: rel(repoRoot, p56Path),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestPath),
    },
    outputs: {
      dryRun: rel(repoRoot, dryRunPath),
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
    handoffSimulation: {
      dryRunOnly: true,
      p44ValidationCommand,
      p45SequencePreflightCommand,
      p44ValidationCommandExecutedByThisScript: false,
      p45SequencePreflightCommandExecutedByThisScript: false,
      requiresP56Ready: true,
      requiresP44ValidatedState: true,
      requiresP45PreflightReadyState: true,
    },
    nextRequiredActions,
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      p44ValidationCommandExecutedByThisScript: false,
      p45SequencePreflightCommandExecutedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(dryRunPath, {
    schemaVersion: 'gustav-exact-approval-p44-to-p45-sequence-handoff-simulation-dry-run-v2',
    runId,
    generatedAt: report.generatedAt,
    dryRunOnly: true,
    handoffState: report.summary.handoffState,
    currentP44ToP45HandoffWouldOpenSequence: report.summary.currentP44ToP45HandoffWouldOpenSequence,
    simulatedPostP44P45WouldOpenSequence: report.summary.simulatedPostP44P45WouldOpenSequence,
    p44ValidationCommand,
    p45SequencePreflightCommand,
    p44ValidationCommandExecutedByThisScript: false,
    p45SequencePreflightCommandExecutedByThisScript: false,
    readyForApply: false,
    activationApproved: false,
  });
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval P44 to P45 sequence handoff simulation V2 packet: ${status}`);
  console.log(`Handoff state: ${report.summary.handoffState}`);
  console.log(`P56 ready/state: ${report.summary.p56Ready ? 'yes' : 'no'}/${report.summary.p56State}`);
  console.log(`P44 status/state: ${report.summary.p44Status}/${report.summary.p44ValidationState}`);
  console.log(`P45 status/state: ${report.summary.p45Status}/${report.summary.p45PreflightState}`);
  console.log(`Current handoff would open sequence: ${report.summary.currentP44ToP45HandoffWouldOpenSequence ? 'yes' : 'no'}`);
  console.log(`Simulated post-P44 P45 would open sequence: ${report.summary.simulatedPostP44P45WouldOpenSequence ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
