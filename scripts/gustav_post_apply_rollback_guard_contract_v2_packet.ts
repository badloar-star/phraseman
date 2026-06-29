import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'HOLD' | 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type GuardState =
  | 'waiting_for_apply_transaction_contract'
  | 'post_apply_rollback_guard_contract_ready'
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
  expectedState: GuardState;
  guardState: GuardState;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  p46Status: string;
  p46TransactionState: string;
  p46ReadyForProductionApplyTransaction: boolean;
  p46ReadyForApply: boolean;
  p46MayModifyProductionAppFiles: boolean;
  p46ActivationApproved: boolean;
  masterBlockers: number;
  masterReadyForApply: boolean;
  masterMayModifyProductionAppFiles: boolean;
  p49Status: string;
  p49CompletionState: string;
  p49RequirementsProved: number;
  p49RequirementsProductionLocked: number;
  p49RequirementsMissing: number;
  p49RequirementsContradicted: number;
  p49ClosedModeEvidenceComplete: boolean;
  p49ReadyForApply: boolean;
  p49MayModifyProductionAppFiles: boolean;
  p50Status: string;
  p50LockState: string;
  p50FinalHashLocks: number;
  p50MissingCriticalArtifacts: number;
  p50P49CompletionReady: boolean;
  p50RuntimeDeliveryEvidenceChainReady: boolean;
  p50ActiveApprovalReceiptExists: boolean;
  p50ActiveHashLockExists: boolean;
  p50ReadyForApply: boolean;
  p50MayModifyProductionAppFiles: boolean;
  deliveryChainStatus: string;
  deliveryChainState: string;
  deliveryChainReady: boolean;
  deliveryChainPublishManifestEntries: number;
  deliveryChainActualShaEntries: number;
  deliveryChainActualByteSizeEntries: number;
  deliveryChainPayloadShaMatches: number;
  deliveryChainIndexShaMatches: number;
  deliveryChainSliceManifestShaMatches: number;
  deliveryChainChecksumReportsPresent: number;
  deliveryChainRollbackContracts: number;
  deliveryChainSourceLocaleRejects: number;
  deliveryChainStudyTargetRejects: number;
  deliveryChainClosedTransitions: boolean;
  deliveryChainReadyForApply: boolean;
  deliveryChainMayModifyProductionAppFiles: boolean;
  runtimeCacheStatus: string;
  runtimeCacheBlockers: number;
  runtimeCacheContracts: number;
  runtimeCacheRollbackContracts: number;
  runtimeDownloadsEnabled: boolean;
  runtimeCacheWritesOpened: boolean;
  runtimeReadyCacheStateOpened: boolean;
  runtimeReadyForDownloadActivation: boolean;
  runtimeCacheReadyForApply: boolean;
  runtimeCacheMayModifyProductionAppFiles: boolean;
  serverRecheckStatus: string;
  serverManifestEntries: number;
  serverTopLevelUploadFlagsOpen: number;
  serverActivationApprovedEntries: number;
  serverRuntimeDownloadsEnabledEntries: number;
  serverReadyForApplyEntries: number;
  serverReadyForApply: boolean;
  serverMayModifyProductionAppFiles: boolean;
  languageRecheckStatus: string;
  languageScannedRows: number;
  languageScannedTargetFields: number;
  languagePromptContractsWithTargetLocale: number;
  languagePromptEntrypointsExpected: number;
  languageManifestEntries: number;
  languageLeaks: number;
  languageOpenFlags: number;
  languageReadyForApply: boolean;
  languageMayModifyProductionAppFiles: boolean;
  storageStatus: string;
  storageTargetKeyDomains: number;
  storageFrenchSyncFactoryRefs: number;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
  firebaseWritesOpened: boolean;
  asyncStorageWritesOpened: boolean;
  storageReadyForApplyOpenFlags: number;
  storageReadyForApply: boolean;
  storageMayModifyProductionAppFiles: boolean;
  adminStatus: string;
  adminPreflightState: string;
  adminManifestEntries: number;
  adminReady: boolean;
  adminRuntimeReady: boolean;
  adminStorageReady: boolean;
  adminServerUploadAllowed: boolean;
  adminFirebaseUploadAllowed: boolean;
  adminRuntimeDownloadsEnabled: boolean;
  adminActivationApproved: boolean;
  adminReadyForApply: boolean;
  adminMayModifyProductionAppFiles: boolean;
  readinessStatus: string;
  readinessGenerationBlockers: number;
  readinessApplyBlockers: number;
  readinessReadyForApply: boolean;
  readinessMayModifyProductionAppFiles: boolean;
  fixtureProbeFailures: number;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  guardState: GuardState;
  p46Status: string;
  p46TransactionState: string;
  p46ReadyForProductionApplyTransaction: boolean;
  p49Status: string;
  p49CompletionState: string;
  p49RequirementsProved: number;
  p49RequirementsProductionLocked: number;
  p49RequirementsMissing: number;
  p49RequirementsContradicted: number;
  p49ClosedModeEvidenceComplete: boolean;
  p50Status: string;
  p50LockState: string;
  finalHashLocks: number;
  p50MissingCriticalArtifacts: number;
  p50P49CompletionReady: boolean;
  p50RuntimeDeliveryEvidenceChainReady: boolean;
  runtimeDeliveryEvidenceChainStatus: string;
  runtimeDeliveryEvidenceChainState: string;
  runtimeDeliveryEvidenceChainReady: boolean;
  runtimeDeliveryEvidenceChainPublishManifestEntries: number;
  runtimeDeliveryEvidenceChainActualShaEntries: number;
  runtimeDeliveryEvidenceChainActualByteSizeEntries: number;
  runtimeDeliveryEvidenceChainPayloadShaMatches: number;
  runtimeDeliveryEvidenceChainIndexShaMatches: number;
  runtimeDeliveryEvidenceChainSliceManifestShaMatches: number;
  runtimeDeliveryEvidenceChainChecksumReportsPresent: number;
  runtimeDeliveryEvidenceChainRollbackContracts: number;
  runtimeDeliveryEvidenceChainSourceLocaleRejects: number;
  runtimeDeliveryEvidenceChainStudyTargetRejects: number;
  runtimeDeliveryEvidenceChainClosedTransitions: boolean;
  runtimeCacheContracts: number;
  runtimeCacheRollbackContracts: number;
  serverManifestEntries: number;
  languageScannedRows: number;
  languagePromptContracts: number;
  languagePromptEntrypointsExpected: number;
  storageTargetKeyDomains: number;
  storageFrenchSyncFactoryRefs: number;
  readinessApplyBlockers: number;
  readinessGenerationBlockers: number;
  postApplyGuardSteps: number;
  rollbackGuardSteps: number;
  readyForPostApplyRollbackGuard: boolean;
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

const EXPECTED_FINAL_HASH_LOCKS = 38;

type GuardStep = {
  id: string;
  phase: 'post_apply_guard' | 'rollback_guard';
  action: string;
  requiredAfterFutureApply: boolean;
  writesProductionStateNow: false;
};

type Report = {
  schemaVersion: 'gustav-post-apply-rollback-guard-contract-v2-packet-v0';
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
  guardMode: 'no_write_contract_only';
  guardSteps: GuardStep[];
  postApplyRequiredChecks: string[];
  rollbackRequiredChecks: string[];
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

function guardSteps(): GuardStep[] {
  return [
    { id: 'P47-GUARD-POST-001', phase: 'post_apply_guard', action: 'Re-run runtime server manifest consistency after any future production apply.', requiredAfterFutureApply: true, writesProductionStateNow: false },
    { id: 'P47-GUARD-POST-002', phase: 'post_apply_guard', action: 'Re-run language isolation regression across content, prompts, manifests, admin and storage surfaces.', requiredAfterFutureApply: true, writesProductionStateNow: false },
    { id: 'P47-GUARD-POST-003', phase: 'post_apply_guard', action: 'Re-run storage/cloud target namespace guards before any migration or sync enablement.', requiredAfterFutureApply: true, writesProductionStateNow: false },
    { id: 'P47-GUARD-POST-004', phase: 'post_apply_guard', action: 'Verify admin/server/runtime preflight still has studyTarget/sourceLocale gates after publication.', requiredAfterFutureApply: true, writesProductionStateNow: false },
    { id: 'P47-GUARD-POST-005', phase: 'post_apply_guard', action: 'Verify P49/P50/runtime-delivery evidence hashes still match the future applied French pack before activation can remain open.', requiredAfterFutureApply: true, writesProductionStateNow: false },
    { id: 'P47-GUARD-ROLLBACK-001', phase: 'rollback_guard', action: 'Rollback must disable runtime downloads before any manifest or cache removal.', requiredAfterFutureApply: true, writesProductionStateNow: false },
    { id: 'P47-GUARD-ROLLBACK-002', phase: 'rollback_guard', action: 'Rollback must restore activationApproved=false and readyForApply=false before clearing active approval artifacts.', requiredAfterFutureApply: true, writesProductionStateNow: false },
    { id: 'P47-GUARD-ROLLBACK-003', phase: 'rollback_guard', action: 'Rollback must preserve English/sourceLocale/UI/cache/cloud namespaces while removing only fr publication refs.', requiredAfterFutureApply: true, writesProductionStateNow: false },
    { id: 'P47-GUARD-ROLLBACK-004', phase: 'rollback_guard', action: 'Rollback must keep the P50 final hash-lock and runtime-delivery evidence available until all French refs are disabled.', requiredAfterFutureApply: true, writesProductionStateNow: false },
  ];
}

function postApplyRequiredChecks(): string[] {
  return [
    'runtime_server_manifest_consistency_recheck_v2',
    'language_isolation_regression_recheck_v2',
    'storage_cloud_target_map_v2',
    'admin_server_delivery_runtime_preflight_v2',
    'runtime_cache_integrity_rollback_v2',
    'readiness_apply_blocker_map_refresh_v2',
    'production_readiness_completion_audit_v2',
    'final_preapproval_evidence_hash_lock_v2',
    'runtime_delivery_evidence_chain_v2',
  ];
}

function rollbackRequiredChecks(): string[] {
  return [
    'runtimeDownloadsEnabled=false before rollback starts',
    'downloadablePacksPublished=false before manifest refs are removed',
    'activationApproved=false before active approval artifacts are cleared',
    'cache writes remain blocked for corrupt/stale/mismatched fr packs',
    'storage/cloud migrations remain disabled unless a later explicit migration gate opens',
  ];
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const p46Waiting =
    input.p46Status === 'HOLD' &&
    input.p46TransactionState === 'waiting_for_activation_sequence_preflight' &&
    !input.p46ReadyForProductionApplyTransaction;
  const p46Ready =
    input.p46Status === 'PASS' &&
    input.p46TransactionState === 'production_apply_transaction_contract_ready' &&
    input.p46ReadyForProductionApplyTransaction;

  if (!p46Waiting && !p46Ready) {
    addFinding(findings, 'blocker', 'P46_NOT_IN_ACCEPTED_STATE', 'P47 requires P46 to be either waiting for activation sequence preflight or ready after P46 PASS.');
  }
  if (input.p46ReadyForApply || input.p46MayModifyProductionAppFiles || input.p46ActivationApproved) {
    addFinding(findings, 'blocker', 'P46_OPENED_APPLY_OR_ACTIVATION', 'P46 must not open apply, activation or production app writes.');
  }
  if (input.masterBlockers > 0 || input.masterReadyForApply || input.masterMayModifyProductionAppFiles) {
    addFinding(findings, 'blocker', 'MASTER_NOT_CLOSED', 'Master must have zero blockers and keep apply/write flags closed.');
  }
  const p49Closed =
    input.p49Status === 'HOLD' &&
    input.p49CompletionState === 'closed_mode_evidence_complete_production_locked' &&
    input.p49ClosedModeEvidenceComplete &&
    input.p49RequirementsProved + input.p49RequirementsProductionLocked >= 16 &&
    input.p49RequirementsProductionLocked > 0 &&
    input.p49RequirementsMissing === 0 &&
    input.p49RequirementsContradicted === 0 &&
    !input.p49ReadyForApply &&
    !input.p49MayModifyProductionAppFiles;
  if (!p49Closed) {
    addFinding(findings, 'blocker', 'P49_PRODUCTION_READINESS_COMPLETION_NOT_LOCKED', 'P47 rollback guard requires P49 closed-mode production readiness evidence to remain locked and complete.');
  }
  const p50Locked =
    input.p50Status === 'PASS' &&
    input.p50LockState === 'final_preapproval_evidence_hash_lock_ready' &&
    input.p50FinalHashLocks >= EXPECTED_FINAL_HASH_LOCKS &&
    input.p50MissingCriticalArtifacts === 0 &&
    input.p50P49CompletionReady &&
    input.p50RuntimeDeliveryEvidenceChainReady &&
    !input.p50ActiveApprovalReceiptExists &&
    !input.p50ActiveHashLockExists &&
    !input.p50ReadyForApply &&
    !input.p50MayModifyProductionAppFiles;
  if (!p50Locked) {
    addFinding(findings, 'blocker', 'P50_FINAL_HASH_LOCK_NOT_READY', 'P47 rollback guard requires the P50 final hash-lock to cover P49, runtime delivery, apply and rollback contracts.');
  }
  const deliveryChainReady =
    input.deliveryChainStatus === 'PASS' &&
    input.deliveryChainState === 'runtime_delivery_evidence_chain_ready_no_writes' &&
    input.deliveryChainReady &&
    input.deliveryChainPublishManifestEntries === 12 &&
    input.deliveryChainActualShaEntries === 12 &&
    input.deliveryChainActualByteSizeEntries === 12 &&
    input.deliveryChainPayloadShaMatches === 12 &&
    input.deliveryChainIndexShaMatches === 12 &&
    input.deliveryChainSliceManifestShaMatches === 12 &&
    input.deliveryChainChecksumReportsPresent === 12 &&
    input.deliveryChainRollbackContracts === 12 &&
    input.deliveryChainSourceLocaleRejects === 12 &&
    input.deliveryChainStudyTargetRejects === 12 &&
    input.deliveryChainClosedTransitions &&
    !input.deliveryChainReadyForApply &&
    !input.deliveryChainMayModifyProductionAppFiles;
  if (!deliveryChainReady) {
    addFinding(findings, 'blocker', 'RUNTIME_DELIVERY_EVIDENCE_CHAIN_NOT_READY', 'P47 rollback guard requires runtime delivery evidence for hashes, rollback contracts and source/studyTarget rejection.');
  }
  if (
    input.runtimeCacheStatus !== 'PASS' ||
    input.runtimeCacheBlockers > 0 ||
    input.runtimeCacheContracts !== 12 ||
    input.runtimeCacheRollbackContracts !== 12 ||
    input.runtimeDownloadsEnabled ||
    input.runtimeCacheWritesOpened ||
    input.runtimeReadyCacheStateOpened ||
    input.runtimeReadyForDownloadActivation ||
    input.runtimeCacheReadyForApply ||
    input.runtimeCacheMayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'RUNTIME_CACHE_ROLLBACK_NOT_READY', 'Runtime cache integrity/rollback contract must be PASS, complete and closed.');
  }
  if (
    input.serverRecheckStatus !== 'PASS' ||
    input.serverManifestEntries !== 12 ||
    input.serverTopLevelUploadFlagsOpen > 0 ||
    input.serverActivationApprovedEntries > 0 ||
    input.serverRuntimeDownloadsEnabledEntries > 0 ||
    input.serverReadyForApplyEntries > 0 ||
    input.serverReadyForApply ||
    input.serverMayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'SERVER_MANIFEST_RECHECK_NOT_READY', 'Runtime/server manifest consistency must be PASS with all activation/upload/download/apply flags closed.');
  }
  if (
    input.languageRecheckStatus !== 'PASS' ||
    input.languageScannedRows <= 0 ||
    input.languageScannedTargetFields <= 0 ||
    input.languagePromptEntrypointsExpected <= 0 ||
    input.languagePromptContractsWithTargetLocale !== input.languagePromptEntrypointsExpected ||
    input.languageManifestEntries !== 12 ||
    input.languageLeaks > 0 ||
    input.languageOpenFlags > 0 ||
    input.languageReadyForApply ||
    input.languageMayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'LANGUAGE_ISOLATION_RECHECK_NOT_READY', 'Language isolation regression must be PASS and cover rows, prompts, manifests and closed flags.');
  }
  if (
    input.storageStatus !== 'PASS' ||
    input.storageTargetKeyDomains < 14 ||
    input.storageFrenchSyncFactoryRefs <= 0 ||
    input.storageMigrationAllowed ||
    input.cloudSyncMigrationAllowed ||
    input.firebaseWritesOpened ||
    input.asyncStorageWritesOpened ||
    input.storageReadyForApplyOpenFlags > 0 ||
    input.storageReadyForApply ||
    input.storageMayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'STORAGE_CLOUD_GUARD_NOT_READY', 'Storage/cloud target namespace guard must be PASS and keep all migration/write/apply flags closed.');
  }
  if (
    input.adminStatus !== 'PASS' ||
    input.adminPreflightState !== 'admin_server_runtime_preflight_ready' ||
    input.adminManifestEntries !== 12 ||
    !input.adminReady ||
    !input.adminRuntimeReady ||
    !input.adminStorageReady ||
    input.adminServerUploadAllowed ||
    input.adminFirebaseUploadAllowed ||
    input.adminRuntimeDownloadsEnabled ||
    input.adminActivationApproved ||
    input.adminReadyForApply ||
    input.adminMayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'ADMIN_RUNTIME_PREFLIGHT_NOT_READY', 'Admin/server/runtime/storage preflight must be PASS, complete and closed.');
  }
  if (
    input.readinessStatus !== 'PASS' ||
    input.readinessGenerationBlockers !== 0 ||
    input.readinessApplyBlockers < 1 ||
    input.readinessReadyForApply ||
    input.readinessMayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'READINESS_BLOCKER_MAP_NOT_READY', 'Readiness/apply blocker map must preserve generation readiness and production apply blockers until approval.');
  }
  if (input.fixtureProbeFailures > 0) {
    addFinding(findings, 'blocker', 'DEPENDENCY_FIXTURE_PROBES_FAILED', 'One or more dependency fixture probe suites did not fully pass.');
  }
  if (p46Waiting) {
    addFinding(findings, 'info', 'WAITING_FOR_P46_TRANSACTION_CONTRACT', 'P46 is waiting for activation sequence preflight; post-apply rollback guard remains a no-write contract.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const steps = guardSteps();
  const readyForPostApplyRollbackGuard = blockers === 0 && p46Ready;
  const guardState: GuardState =
    blockers > 0
      ? 'blocked_by_findings'
      : readyForPostApplyRollbackGuard
        ? 'post_apply_rollback_guard_contract_ready'
        : 'waiting_for_apply_transaction_contract';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      guardState,
      p46Status: input.p46Status,
      p46TransactionState: input.p46TransactionState,
      p46ReadyForProductionApplyTransaction: input.p46ReadyForProductionApplyTransaction,
      p49Status: input.p49Status,
      p49CompletionState: input.p49CompletionState,
      p49RequirementsProved: input.p49RequirementsProved,
      p49RequirementsProductionLocked: input.p49RequirementsProductionLocked,
      p49RequirementsMissing: input.p49RequirementsMissing,
      p49RequirementsContradicted: input.p49RequirementsContradicted,
      p49ClosedModeEvidenceComplete: input.p49ClosedModeEvidenceComplete,
      p50Status: input.p50Status,
      p50LockState: input.p50LockState,
      finalHashLocks: input.p50FinalHashLocks,
      p50MissingCriticalArtifacts: input.p50MissingCriticalArtifacts,
      p50P49CompletionReady: input.p50P49CompletionReady,
      p50RuntimeDeliveryEvidenceChainReady: input.p50RuntimeDeliveryEvidenceChainReady,
      runtimeDeliveryEvidenceChainStatus: input.deliveryChainStatus,
      runtimeDeliveryEvidenceChainState: input.deliveryChainState,
      runtimeDeliveryEvidenceChainReady: input.deliveryChainReady,
      runtimeDeliveryEvidenceChainPublishManifestEntries: input.deliveryChainPublishManifestEntries,
      runtimeDeliveryEvidenceChainActualShaEntries: input.deliveryChainActualShaEntries,
      runtimeDeliveryEvidenceChainActualByteSizeEntries: input.deliveryChainActualByteSizeEntries,
      runtimeDeliveryEvidenceChainPayloadShaMatches: input.deliveryChainPayloadShaMatches,
      runtimeDeliveryEvidenceChainIndexShaMatches: input.deliveryChainIndexShaMatches,
      runtimeDeliveryEvidenceChainSliceManifestShaMatches: input.deliveryChainSliceManifestShaMatches,
      runtimeDeliveryEvidenceChainChecksumReportsPresent: input.deliveryChainChecksumReportsPresent,
      runtimeDeliveryEvidenceChainRollbackContracts: input.deliveryChainRollbackContracts,
      runtimeDeliveryEvidenceChainSourceLocaleRejects: input.deliveryChainSourceLocaleRejects,
      runtimeDeliveryEvidenceChainStudyTargetRejects: input.deliveryChainStudyTargetRejects,
      runtimeDeliveryEvidenceChainClosedTransitions: input.deliveryChainClosedTransitions,
      runtimeCacheContracts: input.runtimeCacheContracts,
      runtimeCacheRollbackContracts: input.runtimeCacheRollbackContracts,
      serverManifestEntries: input.serverManifestEntries,
      languageScannedRows: input.languageScannedRows,
      languagePromptContracts: input.languagePromptContractsWithTargetLocale,
      languagePromptEntrypointsExpected: input.languagePromptEntrypointsExpected,
      storageTargetKeyDomains: input.storageTargetKeyDomains,
      storageFrenchSyncFactoryRefs: input.storageFrenchSyncFactoryRefs,
      readinessApplyBlockers: input.readinessApplyBlockers,
      readinessGenerationBlockers: input.readinessGenerationBlockers,
      postApplyGuardSteps: steps.filter((step) => step.phase === 'post_apply_guard').length,
      rollbackGuardSteps: steps.filter((step) => step.phase === 'rollback_guard').length,
      readyForPostApplyRollbackGuard,
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

function makeP46Ready(input: EvaluationInput): void {
  input.p46Status = 'PASS';
  input.p46TransactionState = 'production_apply_transaction_contract_ready';
  input.p46ReadyForProductionApplyTransaction = true;
}

function runProbes(base: EvaluationInput): Probe[] {
  const tests: Array<{ id: string; expectedState: GuardState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'current_waiting_hold', expectedState: 'waiting_for_apply_transaction_contract', mutate: () => undefined },
    { id: 'p46_ready_guard_ready', expectedState: 'post_apply_rollback_guard_contract_ready', mutate: makeP46Ready },
    { id: 'p46_block_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46Status = 'BLOCK'; input.p46TransactionState = 'blocked_by_findings'; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'cache_write_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeCacheWritesOpened = true; } },
    { id: 'server_activation_entry_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.serverActivationApprovedEntries = 1; } },
    { id: 'language_leak_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.languageLeaks = 1; } },
    { id: 'prompt_contract_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.languagePromptContractsWithTargetLocale = 1; } },
    { id: 'storage_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; } },
    { id: 'cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.cloudSyncMigrationAllowed = true; } },
    { id: 'admin_upload_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.adminServerUploadAllowed = true; } },
    { id: 'generation_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.readinessGenerationBlockers = 1; } },
    { id: 'dependency_probe_failure_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.fixtureProbeFailures = 1; } },
    { id: 'p49_requirement_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p49RequirementsProved = 8; input.p49RequirementsProductionLocked = 6; } },
    { id: 'p50_final_hash_lock_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p50FinalHashLocks = EXPECTED_FINAL_HASH_LOCKS - 1; } },
    { id: 'runtime_delivery_chain_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.deliveryChainReady = false; } },
  ];
  return tests.map((test) => {
    const input = clone(base);
    test.mutate(input);
    const result = evaluate(input).evaluation;
    return {
      id: test.id,
      expectedState: test.expectedState,
      guardState: result.guardState,
      blockers: result.blockers,
      passed: result.guardState === test.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Post-Apply Rollback Guard Contract V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Guard state: \`${report.summary.guardState}\``,
    `- P46 status/state: \`${report.summary.p46Status}\`/\`${report.summary.p46TransactionState}\``,
    `- P46 ready for production apply transaction: ${report.summary.p46ReadyForProductionApplyTransaction ? 'yes' : 'no'}`,
    `- P49 proved/locked/missing/contradicted: ${report.summary.p49RequirementsProved}/${report.summary.p49RequirementsProductionLocked}/${report.summary.p49RequirementsMissing}/${report.summary.p49RequirementsContradicted}`,
    `- P50 final hash locks/missing/runtime chain: ${report.summary.finalHashLocks}/${report.summary.p50MissingCriticalArtifacts}/${report.summary.p50RuntimeDeliveryEvidenceChainReady ? 'yes' : 'no'}`,
    `- Runtime delivery chain entries/sha/rollback/source/study rejects: ${report.summary.runtimeDeliveryEvidenceChainPublishManifestEntries}/${report.summary.runtimeDeliveryEvidenceChainActualShaEntries}/${report.summary.runtimeDeliveryEvidenceChainRollbackContracts}/${report.summary.runtimeDeliveryEvidenceChainSourceLocaleRejects}/${report.summary.runtimeDeliveryEvidenceChainStudyTargetRejects}`,
    `- Runtime cache/rollback contracts: ${report.summary.runtimeCacheContracts}/${report.summary.runtimeCacheRollbackContracts}`,
    `- Server manifest entries: ${report.summary.serverManifestEntries}`,
    `- Language rows/prompts: ${report.summary.languageScannedRows}/${report.summary.languagePromptContracts}/${report.summary.languagePromptEntrypointsExpected}`,
    `- Storage domains/french sync refs: ${report.summary.storageTargetKeyDomains}/${report.summary.storageFrenchSyncFactoryRefs}`,
    `- Readiness generation/apply blockers: ${report.summary.readinessGenerationBlockers}/${report.summary.readinessApplyBlockers}`,
    `- Post-apply/rollback guard steps: ${report.summary.postApplyGuardSteps}/${report.summary.rollbackGuardSteps}`,
    `- Ready for post-apply rollback guard: ${report.summary.readyForPostApplyRollbackGuard ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Post-Apply Required Checks',
    '',
  ];
  for (const item of report.postApplyRequiredChecks) lines.push(`- ${item}`);
  lines.push('', '## Rollback Required Checks', '');
  for (const item of report.rollbackRequiredChecks) lines.push(`- ${item}`);
  lines.push('', '## Guard Steps', '');
  for (const step of report.guardSteps) {
    lines.push(`- ${step.id}: ${step.phase}; ${step.action}`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  for (const finding of report.findings) {
    lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- This packet is a no-write guard contract only.');
  lines.push('- It does not create approval receipts, active hash locks, production app writes, server uploads, runtime downloads, storage/cloud migrations or production apply approval.');
  return `${lines.join('\n')}\n`;
}

function fixtureFailures(...summaries: JsonObject[]): number {
  return summaries.reduce((sum, summary) => {
    const probes = n(summary, 'fixtureProbes');
    const passed = n(summary, 'fixtureProbesPassed');
    return sum + Math.max(0, probes - passed);
  }, 0);
}

function main(): void {
  const repoRoot = process.cwd();
  const runArg = argValue('--run') ?? 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
  const target = argValue('--target') ?? 'fr';
  if (target !== 'fr') throw new Error(`This packet is scoped to target=fr only, got ${target}`);

  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const p46Path = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const p49Path = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const p50Path = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const deliveryChainPath = path.join(auditsDir, 'runtime_delivery_evidence_chain_v2_packet.json');
  const runtimeCachePath = path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.json');
  const serverRecheckPath = path.join(auditsDir, 'runtime_server_manifest_consistency_recheck_v2_packet.json');
  const languageRecheckPath = path.join(auditsDir, 'language_isolation_regression_recheck_v2_packet.json');
  const storageCloudPath = path.join(auditsDir, 'storage_cloud_target_map_v2_packet.json');
  const adminRuntimePath = path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.json');
  const readinessPath = path.join(auditsDir, 'readiness_apply_blocker_map_refresh_v2_packet.json');
  const outputJsonPath = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.md');

  const p46 = readJsonOrEmpty(p46Path);
  const master = readJsonOrEmpty(masterPath);
  const p49 = readJsonOrEmpty(p49Path);
  const p50 = readJsonOrEmpty(p50Path);
  const deliveryChain = readJsonOrEmpty(deliveryChainPath);
  const runtimeCache = readJsonOrEmpty(runtimeCachePath);
  const serverRecheck = readJsonOrEmpty(serverRecheckPath);
  const languageRecheck = readJsonOrEmpty(languageRecheckPath);
  const storageCloud = readJsonOrEmpty(storageCloudPath);
  const adminRuntime = readJsonOrEmpty(adminRuntimePath);
  const readiness = readJsonOrEmpty(readinessPath);

  const p46Summary = summaryOf(p46);
  const masterSummary = summaryOf(master);
  const p49Summary = summaryOf(p49);
  const p50Summary = summaryOf(p50);
  const deliveryChainSummary = summaryOf(deliveryChain);
  const runtimeCacheSummary = summaryOf(runtimeCache);
  const serverRecheckSummary = summaryOf(serverRecheck);
  const languageRecheckSummary = summaryOf(languageRecheck);
  const storageCloudSummary = summaryOf(storageCloud);
  const adminRuntimeSummary = summaryOf(adminRuntime);
  const readinessSummary = summaryOf(readiness);
  const masterActionableBlockers = arr(master, 'findings')
    .filter((finding) => s(object(finding), 'severity') === 'blocker')
    .filter((finding) => {
      const code = s(object(finding), 'code');
      return !MASTER_SELF_CYCLE_BLOCKERS.has(code) &&
        !code.startsWith('nonproduction_blocker_closure_plan_v2_') &&
        !code.startsWith('exact_approval_') &&
        !code.startsWith('explicit_approval_receipt_hash_lock_gate_v2_');
    })
    .length;

  const input: EvaluationInput = {
    p46Status: s(p46, 'status'),
    p46TransactionState: s(p46Summary, 'transactionState'),
    p46ReadyForProductionApplyTransaction: b(p46Summary, 'readyForProductionApplyTransaction'),
    p46ReadyForApply: b(p46Summary, 'readyForApply'),
    p46MayModifyProductionAppFiles: b(p46Summary, 'mayModifyProductionAppFiles'),
    p46ActivationApproved: b(p46Summary, 'activationApproved'),
    masterBlockers: masterActionableBlockers,
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    p49Status: s(p49, 'status'),
    p49CompletionState: s(p49Summary, 'completionState'),
    p49RequirementsProved: n(p49Summary, 'requirementsProved'),
    p49RequirementsProductionLocked: n(p49Summary, 'requirementsProductionLocked'),
    p49RequirementsMissing: n(p49Summary, 'requirementsMissing'),
    p49RequirementsContradicted: n(p49Summary, 'requirementsContradicted'),
    p49ClosedModeEvidenceComplete: b(p49Summary, 'closedModeEvidenceComplete'),
    p49ReadyForApply: b(p49Summary, 'readyForApply'),
    p49MayModifyProductionAppFiles: b(p49Summary, 'mayModifyProductionAppFiles'),
    p50Status: s(p50, 'status'),
    p50LockState: s(p50Summary, 'lockState'),
    p50FinalHashLocks: n(p50Summary, 'finalHashLocks'),
    p50MissingCriticalArtifacts: n(p50Summary, 'missingCriticalArtifacts'),
    p50P49CompletionReady: b(p50Summary, 'p49CompletionReady'),
    p50RuntimeDeliveryEvidenceChainReady: b(p50Summary, 'runtimeDeliveryEvidenceChainReady'),
    p50ActiveApprovalReceiptExists: b(p50Summary, 'activeApprovalReceiptExists'),
    p50ActiveHashLockExists: b(p50Summary, 'activeHashLockExists'),
    p50ReadyForApply: b(p50Summary, 'readyForApply'),
    p50MayModifyProductionAppFiles: b(p50Summary, 'mayModifyProductionAppFiles'),
    deliveryChainStatus: s(deliveryChain, 'status'),
    deliveryChainState: s(deliveryChainSummary, 'chainState'),
    deliveryChainReady: b(deliveryChainSummary, 'runtimeDeliveryEvidenceChainReady'),
    deliveryChainPublishManifestEntries: n(deliveryChainSummary, 'publishManifestEntries'),
    deliveryChainActualShaEntries: n(deliveryChainSummary, 'publishActualShaEntries'),
    deliveryChainActualByteSizeEntries: n(deliveryChainSummary, 'publishActualByteSizeEntries'),
    deliveryChainPayloadShaMatches: n(deliveryChainSummary, 'manifestPayloadShaMatches'),
    deliveryChainIndexShaMatches: n(deliveryChainSummary, 'manifestIndexShaMatches'),
    deliveryChainSliceManifestShaMatches: n(deliveryChainSummary, 'manifestSliceManifestShaMatches'),
    deliveryChainChecksumReportsPresent: n(deliveryChainSummary, 'manifestChecksumReportsPresent'),
    deliveryChainRollbackContracts: n(deliveryChainSummary, 'runtimeRollbackSimulationContracts'),
    deliveryChainSourceLocaleRejects: n(deliveryChainSummary, 'runtimeSourceLocaleMismatchRejectContracts'),
    deliveryChainStudyTargetRejects: n(deliveryChainSummary, 'runtimeStudyTargetMismatchRejectContracts'),
    deliveryChainClosedTransitions: b(deliveryChainSummary, 'closedTransitions'),
    deliveryChainReadyForApply: b(deliveryChainSummary, 'readyForApply'),
    deliveryChainMayModifyProductionAppFiles: b(deliveryChainSummary, 'mayModifyProductionAppFiles'),
    runtimeCacheStatus: s(runtimeCache, 'status'),
    runtimeCacheBlockers: n(runtimeCacheSummary, 'blockers'),
    runtimeCacheContracts: n(runtimeCacheSummary, 'cacheIntegrityContracts'),
    runtimeCacheRollbackContracts: n(runtimeCacheSummary, 'rollbackSimulationContracts'),
    runtimeDownloadsEnabled: b(runtimeCacheSummary, 'runtimeDownloadsEnabled'),
    runtimeCacheWritesOpened: b(runtimeCacheSummary, 'cacheWritesOpened'),
    runtimeReadyCacheStateOpened: b(runtimeCacheSummary, 'readyCacheStateOpened'),
    runtimeReadyForDownloadActivation: b(runtimeCacheSummary, 'readyForRuntimeDownloadActivation'),
    runtimeCacheReadyForApply: b(runtimeCacheSummary, 'readyForApply'),
    runtimeCacheMayModifyProductionAppFiles: b(runtimeCacheSummary, 'mayModifyProductionAppFiles'),
    serverRecheckStatus: s(serverRecheck, 'status'),
    serverManifestEntries: n(serverRecheckSummary, 'manifestEntries'),
    serverTopLevelUploadFlagsOpen: n(serverRecheckSummary, 'topLevelUploadFlagsOpen'),
    serverActivationApprovedEntries: n(serverRecheckSummary, 'activationApprovedEntries'),
    serverRuntimeDownloadsEnabledEntries: n(serverRecheckSummary, 'runtimeDownloadsEnabledEntries'),
    serverReadyForApplyEntries: n(serverRecheckSummary, 'readyForApplyEntries'),
    serverReadyForApply: b(serverRecheckSummary, 'readyForApply'),
    serverMayModifyProductionAppFiles: b(serverRecheckSummary, 'mayModifyProductionAppFiles'),
    languageRecheckStatus: s(languageRecheck, 'status'),
    languageScannedRows: n(languageRecheckSummary, 'scannedRows'),
    languageScannedTargetFields: n(languageRecheckSummary, 'scannedTargetFields'),
    languagePromptContractsWithTargetLocale: n(languageRecheckSummary, 'promptContractsWithTargetLocale'),
    languagePromptEntrypointsExpected: n(languageRecheckSummary, 'promptEntrypointsExpected'),
    languageManifestEntries: n(languageRecheckSummary, 'manifestEntries'),
    languageLeaks:
      n(languageRecheckSummary, 'cyrillicTargetFields') +
      n(languageRecheckSummary, 'mojibakeTargetFields') +
      n(languageRecheckSummary, 'sourceLanguageLeakFields') +
      n(languageRecheckSummary, 'targetEqualsSourceFields') +
      n(languageRecheckSummary, 'rowsMissingTargetLocale') +
      n(languageRecheckSummary, 'manifestWrongStudyTargetEntries') +
      n(languageRecheckSummary, 'manifestWrongSourceLocaleEntries'),
    languageOpenFlags:
      n(languageRecheckSummary, 'promptActivationOpenFlags') +
      n(languageRecheckSummary, 'storageActivationApprovedFlags') +
      n(languageRecheckSummary, 'storageReadyForApplyOpenFlags') +
      n(languageRecheckSummary, 'adminActivationApprovedFlags') +
      n(languageRecheckSummary, 'adminReadyForApplyOpenFlags') +
      n(languageRecheckSummary, 'manifestTopLevelUploadFlagsOpen') +
      n(languageRecheckSummary, 'manifestActivationApprovedEntries') +
      n(languageRecheckSummary, 'manifestRuntimeDownloadsEnabledEntries') +
      n(languageRecheckSummary, 'manifestReadyForApplyEntries'),
    languageReadyForApply: b(languageRecheckSummary, 'readyForApply'),
    languageMayModifyProductionAppFiles: b(languageRecheckSummary, 'mayModifyProductionAppFiles'),
    storageStatus: s(storageCloud, 'status'),
    storageTargetKeyDomains: n(storageCloudSummary, 'targetKeyDomains'),
    storageFrenchSyncFactoryRefs: n(storageCloudSummary, 'frenchTargetSyncKeyFactoryRefs'),
    storageMigrationAllowed: b(storageCloudSummary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(storageCloudSummary, 'cloudSyncMigrationAllowed'),
    firebaseWritesOpened: b(storageCloudSummary, 'firebaseWritesOpenedByThisPacket'),
    asyncStorageWritesOpened: b(storageCloudSummary, 'asyncStorageWritesOpenedByThisPacket'),
    storageReadyForApplyOpenFlags: n(storageCloudSummary, 'readyForApplyOpenFlags'),
    storageReadyForApply: b(storageCloudSummary, 'readyForApply'),
    storageMayModifyProductionAppFiles: b(storageCloudSummary, 'mayModifyProductionAppFiles'),
    adminStatus: s(adminRuntime, 'status'),
    adminPreflightState: s(adminRuntimeSummary, 'preflightState'),
    adminManifestEntries: n(adminRuntimeSummary, 'manifestEntries'),
    adminReady: b(adminRuntimeSummary, 'adminReady'),
    adminRuntimeReady: b(adminRuntimeSummary, 'runtimeReady'),
    adminStorageReady: b(adminRuntimeSummary, 'storageReady'),
    adminServerUploadAllowed: b(adminRuntimeSummary, 'serverUploadAllowed'),
    adminFirebaseUploadAllowed: b(adminRuntimeSummary, 'firebaseUploadAllowed'),
    adminRuntimeDownloadsEnabled: b(adminRuntimeSummary, 'runtimeDownloadsEnabled'),
    adminActivationApproved: b(adminRuntimeSummary, 'activationApproved'),
    adminReadyForApply: b(adminRuntimeSummary, 'readyForApply'),
    adminMayModifyProductionAppFiles: b(adminRuntimeSummary, 'mayModifyProductionAppFiles'),
    readinessStatus: s(readiness, 'status'),
    readinessGenerationBlockers: n(readinessSummary, 'readinessGenerationBlockers'),
    readinessApplyBlockers: n(readinessSummary, 'readinessApplyBlockers'),
    readinessReadyForApply: b(readinessSummary, 'readyForApply'),
    readinessMayModifyProductionAppFiles: b(readinessSummary, 'mayModifyProductionAppFiles'),
    fixtureProbeFailures: fixtureFailures(p49Summary, p50Summary, deliveryChainSummary, runtimeCacheSummary, serverRecheckSummary, languageRecheckSummary, storageCloudSummary, adminRuntimeSummary, readinessSummary),
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
      : evaluation.guardState === 'post_apply_rollback_guard_contract_ready'
        ? 'PASS'
        : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-post-apply-rollback-guard-contract-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      productionApplyTransactionContractV2Packet: rel(repoRoot, p46Path),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
      productionReadinessCompletionAuditV2Packet: rel(repoRoot, p49Path),
      finalPreapprovalEvidenceHashLockV2Packet: rel(repoRoot, p50Path),
      runtimeDeliveryEvidenceChainV2Packet: rel(repoRoot, deliveryChainPath),
      runtimeCacheIntegrityRollbackV2Packet: rel(repoRoot, runtimeCachePath),
      runtimeServerManifestConsistencyRecheckV2Packet: rel(repoRoot, serverRecheckPath),
      languageIsolationRegressionRecheckV2Packet: rel(repoRoot, languageRecheckPath),
      storageCloudTargetMapV2Packet: rel(repoRoot, storageCloudPath),
      adminServerDeliveryRuntimePreflightV2Packet: rel(repoRoot, adminRuntimePath),
      readinessApplyBlockerMapRefreshV2Packet: rel(repoRoot, readinessPath),
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
    guardMode: 'no_write_contract_only',
    guardSteps: guardSteps(),
    postApplyRequiredChecks: postApplyRequiredChecks(),
    rollbackRequiredChecks: rollbackRequiredChecks(),
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

  console.log(`GUSTAV post-apply rollback guard contract V2 packet: ${status}`);
  console.log(`Guard state: ${report.summary.guardState}`);
  console.log(`P46 status/state: ${report.summary.p46Status}/${report.summary.p46TransactionState}`);
  console.log(`Runtime cache/rollback contracts: ${report.summary.runtimeCacheContracts}/${report.summary.runtimeCacheRollbackContracts}`);
  console.log(`Language rows/prompts: ${report.summary.languageScannedRows}/${report.summary.languagePromptContracts}/${report.summary.languagePromptEntrypointsExpected}`);
  console.log(`Ready for post-apply rollback guard: ${report.summary.readyForPostApplyRollbackGuard ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (status === 'BLOCK') process.exitCode = 1;
}

main();
