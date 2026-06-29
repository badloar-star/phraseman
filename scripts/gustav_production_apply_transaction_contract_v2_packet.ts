import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'HOLD' | 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type TransactionState =
  | 'waiting_for_activation_sequence_preflight'
  | 'production_apply_transaction_contract_ready'
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
  expectedState: TransactionState;
  transactionState: TransactionState;
  blockers: number;
  passed: boolean;
};

type ServerEntry = {
  runtimeSliceId: string;
  packId: string;
  studyTarget: string;
  sourceLocale: string;
  surface: string;
  serverPath: string;
  payloadShard: string;
  payloadSha256: string;
  payloadBytes: number;
  entryIndex: string;
  entryIndexSha256: string;
  sliceManifest: string;
  sliceManifestSha256: string;
  cacheKey: string;
  rollbackFromVersion: string;
  minAppVersion: string;
  publishedAt: string;
  activationApproved: boolean;
  runtimeDownloadsEnabled: boolean;
  readyForApply: boolean;
};

type EvaluationInput = {
  p45Status: string;
  p45PreflightState: string;
  p45ReadyForProductionActivationSequence: boolean;
  p45ReadyForApply: boolean;
  p45MayModifyProductionAppFiles: boolean;
  p45ActivationApproved: boolean;
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
  targetManifestRunId: string;
  targetManifestStudyTarget: string;
  targetManifestTargetLocale: string;
  targetActivationApproved: boolean;
  targetProductionReady: boolean;
  targetReadyForRuntimeDelivery: boolean;
  targetReadyForServerUpload: boolean;
  targetReadyForStorageCloudMigration: boolean;
  targetReadyForApply: boolean;
  targetMayModifyProductionAppFiles: boolean;
  serverManifestRunId: string;
  serverManifestStudyTarget: string;
  serverManifestTargetLocale: string;
  serverEntries: ServerEntry[];
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  downloadablePacksPublished: boolean;
  runtimeDownloadsEnabled: boolean;
  serverActivationApproved: boolean;
  serverReadyForRuntimeDownloadActivation: boolean;
  serverReadyForApply: boolean;
  serverMayModifyProductionAppFiles: boolean;
  dryRunHashLocks: number;
  dryRunActivationApproved: boolean;
  dryRunReadyForApply: boolean;
  dryRunMayModifyProductionAppFiles: boolean;
  shaMismatches: number;
  missingEntryFiles: number;
  invalidServerPaths: number;
  invalidCacheKeys: number;
  invalidRollbackMarkers: number;
  openEntryFlags: number;
  payloadBytesMismatches: number;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  transactionState: TransactionState;
  p45Status: string;
  p45PreflightState: string;
  p45ReadyForProductionActivationSequence: boolean;
  masterBlockers: number;
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
  serverManifestEntries: number;
  payloadFilesChecked: number;
  indexFilesChecked: number;
  sliceManifestFilesChecked: number;
  shaMismatches: number;
  missingEntryFiles: number;
  invalidServerPaths: number;
  invalidCacheKeys: number;
  invalidRollbackMarkers: number;
  openEntryFlags: number;
  payloadBytesMismatches: number;
  dryRunHashLocks: number;
  allowedFutureMutationSteps: number;
  rollbackSteps: number;
  readyForProductionApplyTransaction: boolean;
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

type TransactionStep = {
  id: string;
  phase: 'precondition' | 'hash_verify' | 'future_apply' | 'post_apply_guard' | 'rollback';
  action: string;
  writesProductionStateNow: false;
  futureMayWriteProductionState: boolean;
};

type Report = {
  schemaVersion: 'gustav-production-apply-transaction-contract-v2-packet-v0';
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
  transactionMode: 'no_write_contract_only';
  transactionSteps: TransactionStep[];
  allowedFutureMutations: string[];
  forbiddenCurrentMutations: string[];
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

function arr<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
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

function sha256File(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function fileSize(filePath: string): number {
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function normalizeServerEntry(value: unknown): ServerEntry {
  const item = object(value);
  return {
    runtimeSliceId: s(item, 'runtimeSliceId'),
    packId: s(item, 'packId'),
    studyTarget: s(item, 'studyTarget'),
    sourceLocale: s(item, 'sourceLocale'),
    surface: s(item, 'surface'),
    serverPath: s(item, 'serverPath'),
    payloadShard: s(item, 'payloadShard'),
    payloadSha256: s(item, 'payloadSha256'),
    payloadBytes: n(item, 'payloadBytes'),
    entryIndex: s(item, 'entryIndex'),
    entryIndexSha256: s(item, 'entryIndexSha256'),
    sliceManifest: s(item, 'sliceManifest'),
    sliceManifestSha256: s(item, 'sliceManifestSha256'),
    cacheKey: s(item, 'cacheKey'),
    rollbackFromVersion: s(item, 'rollbackFromVersion'),
    minAppVersion: s(item, 'minAppVersion'),
    publishedAt: s(item, 'publishedAt'),
    activationApproved: b(item, 'activationApproved'),
    runtimeDownloadsEnabled: b(item, 'runtimeDownloadsEnabled'),
    readyForApply: b(item, 'readyForApply'),
  };
}

function pathInsideRun(entryPath: string, runId: string): boolean {
  return entryPath.startsWith(`docs/gustav/runs/${runId}/pack_candidates/fr/`);
}

function inspectServerEntries(repoRoot: string, runId: string, entries: ServerEntry[]) {
  let shaMismatches = 0;
  let missingEntryFiles = 0;
  let invalidServerPaths = 0;
  let invalidCacheKeys = 0;
  let invalidRollbackMarkers = 0;
  let openEntryFlags = 0;
  let payloadBytesMismatches = 0;
  let payloadFilesChecked = 0;
  let indexFilesChecked = 0;
  let sliceManifestFilesChecked = 0;

  for (const entry of entries) {
    if (
      !entry.serverPath.startsWith(`course-packs/fr/${entry.sourceLocale}/${entry.surface}/`) ||
      entry.serverPath.includes('..') ||
      path.isAbsolute(entry.serverPath)
    ) {
      invalidServerPaths += 1;
    }
    if (
      !entry.cacheKey.startsWith(`fr/${entry.sourceLocale}/${entry.surface}/`) ||
      entry.cacheKey.includes('..') ||
      path.isAbsolute(entry.cacheKey)
    ) {
      invalidCacheKeys += 1;
    }
    if (entry.rollbackFromVersion === '' || !entry.rollbackFromVersion.startsWith('none:first_fr_pack_not_published')) {
      invalidRollbackMarkers += 1;
    }
    if (entry.activationApproved || entry.runtimeDownloadsEnabled || entry.readyForApply) {
      openEntryFlags += 1;
    }

    const checks: Array<{ kind: 'payload' | 'index' | 'manifest'; pathValue: string; expectedSha: string; expectedBytes?: number }> = [
      { kind: 'payload', pathValue: entry.payloadShard, expectedSha: entry.payloadSha256, expectedBytes: entry.payloadBytes },
      { kind: 'index', pathValue: entry.entryIndex, expectedSha: entry.entryIndexSha256 },
      { kind: 'manifest', pathValue: entry.sliceManifest, expectedSha: entry.sliceManifestSha256 },
    ];
    for (const check of checks) {
      if (!pathInsideRun(check.pathValue, runId)) {
        invalidServerPaths += 1;
        continue;
      }
      const absolutePath = path.resolve(repoRoot, check.pathValue);
      if (!fs.existsSync(absolutePath)) {
        missingEntryFiles += 1;
        continue;
      }
      const actualSha = sha256File(absolutePath);
      if (actualSha !== check.expectedSha) shaMismatches += 1;
      if (check.kind === 'payload') {
        payloadFilesChecked += 1;
        if (typeof check.expectedBytes === 'number' && fileSize(absolutePath) !== check.expectedBytes) payloadBytesMismatches += 1;
      } else if (check.kind === 'index') {
        indexFilesChecked += 1;
      } else {
        sliceManifestFilesChecked += 1;
      }
    }
  }

  return {
    shaMismatches,
    missingEntryFiles,
    invalidServerPaths,
    invalidCacheKeys,
    invalidRollbackMarkers,
    openEntryFlags,
    payloadBytesMismatches,
    payloadFilesChecked,
    indexFilesChecked,
    sliceManifestFilesChecked,
  };
}

function transactionSteps(): TransactionStep[] {
  return [
    { id: 'P46-TXN-PRE-001', phase: 'precondition', action: 'Require P45 PASS before any production apply transaction may run.', writesProductionStateNow: false, futureMayWriteProductionState: false },
    { id: 'P46-TXN-PRE-002', phase: 'precondition', action: 'Require active exact approval receipt and active hash lock already validated by P44/P45.', writesProductionStateNow: false, futureMayWriteProductionState: false },
    { id: 'P46-TXN-PRE-003', phase: 'precondition', action: 'Require P49 production-readiness completion, P50 final pre-approval hash-lock and runtime delivery evidence chain before any future apply.', writesProductionStateNow: false, futureMayWriteProductionState: false },
    { id: 'P46-TXN-HASH-001', phase: 'hash_verify', action: 'Verify all 12 payload shards against server_delivery_manifest_v2_draft hashes and byte sizes.', writesProductionStateNow: false, futureMayWriteProductionState: false },
    { id: 'P46-TXN-HASH-002', phase: 'hash_verify', action: 'Verify all 12 entry indexes and all 12 slice manifests against locked hashes.', writesProductionStateNow: false, futureMayWriteProductionState: false },
    { id: 'P46-TXN-HASH-003', phase: 'hash_verify', action: 'Verify the P50 final hash-lock covers the production-readiness, runtime-delivery, apply and rollback contract artifacts.', writesProductionStateNow: false, futureMayWriteProductionState: false },
    { id: 'P46-TXN-APPLY-001', phase: 'future_apply', action: 'Future approved transaction may publish immutable pack payloads to their serverPath locations.', writesProductionStateNow: false, futureMayWriteProductionState: true },
    { id: 'P46-TXN-APPLY-002', phase: 'future_apply', action: 'Future approved transaction may flip downloadablePacksPublished/runtimeDownloadsEnabled only after server upload verification.', writesProductionStateNow: false, futureMayWriteProductionState: true },
    { id: 'P46-TXN-APPLY-003', phase: 'future_apply', action: 'Future approved transaction may set activationApproved only after post-upload and runtime isolation guards pass.', writesProductionStateNow: false, futureMayWriteProductionState: true },
    { id: 'P46-TXN-GUARD-001', phase: 'post_apply_guard', action: 'Run language isolation, runtime cache, storage/cloud and admin target guards after any future apply.', writesProductionStateNow: false, futureMayWriteProductionState: false },
    { id: 'P46-TXN-ROLLBACK-001', phase: 'rollback', action: 'Rollback must disable runtimeDownloadsEnabled and downloadable publication before removing any pack refs.', writesProductionStateNow: false, futureMayWriteProductionState: true },
    { id: 'P46-TXN-ROLLBACK-002', phase: 'rollback', action: 'Rollback must restore activationApproved=false and leave sourceLocale/uiLocale/cloud/cache separation intact.', writesProductionStateNow: false, futureMayWriteProductionState: true },
  ];
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const p45Waiting =
    input.p45Status === 'HOLD' &&
    input.p45PreflightState === 'waiting_for_exact_approval_validation' &&
    !input.p45ReadyForProductionActivationSequence;
  const p45Ready =
    input.p45Status === 'PASS' &&
    input.p45PreflightState === 'production_activation_sequence_preflight_ready' &&
    input.p45ReadyForProductionActivationSequence;

  if (!p45Waiting && !p45Ready) {
    addFinding(findings, 'blocker', 'P45_NOT_IN_ACCEPTED_STATE', 'P46 requires P45 to be either waiting for exact approval validation or ready after P45 PASS.');
  }
  if (input.p45ReadyForApply || input.p45MayModifyProductionAppFiles || input.p45ActivationApproved) {
    addFinding(findings, 'blocker', 'P45_OPENED_APPLY_OR_ACTIVATION', 'P45 must not open apply, activation or production app writes.');
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
    addFinding(findings, 'blocker', 'P49_PRODUCTION_READINESS_COMPLETION_NOT_LOCKED', 'P49 must prove all closed-mode requirements and keep production activation locked before P46 can define a future apply transaction.');
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
    addFinding(findings, 'blocker', 'P50_FINAL_HASH_LOCK_NOT_READY', 'P50 must provide the final pre-approval hash-lock with P49 and runtime-delivery evidence before P46 can define a future apply transaction.');
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
    addFinding(findings, 'blocker', 'RUNTIME_DELIVERY_EVIDENCE_CHAIN_NOT_READY', 'Runtime delivery evidence chain must prove server manifest hashes, cache rollback and source/studyTarget rejection contracts before P46.');
  }
  if (input.targetManifestRunId === '' || input.targetManifestRunId !== input.serverManifestRunId) {
    addFinding(findings, 'blocker', 'MANIFEST_RUN_ID_MISMATCH', 'Target and server manifests must reference the same run id.');
  }
  if (input.targetManifestStudyTarget !== 'fr' || input.targetManifestTargetLocale !== 'fr' || input.serverManifestStudyTarget !== 'fr' || input.serverManifestTargetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'MANIFEST_TARGET_MISMATCH', 'Target and server manifests must be scoped to studyTarget=fr/targetLocale=fr.');
  }
  if (
    input.targetActivationApproved ||
    input.targetProductionReady ||
    input.targetReadyForRuntimeDelivery ||
    input.targetReadyForServerUpload ||
    input.targetReadyForStorageCloudMigration ||
    input.targetReadyForApply ||
    input.targetMayModifyProductionAppFiles ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.downloadablePacksPublished ||
    input.runtimeDownloadsEnabled ||
    input.serverActivationApproved ||
    input.serverReadyForRuntimeDownloadActivation ||
    input.serverReadyForApply ||
    input.serverMayModifyProductionAppFiles ||
    input.dryRunActivationApproved ||
    input.dryRunReadyForApply ||
    input.dryRunMayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P46 contract generation must keep all production activation/apply/upload/download flags closed.');
  }
  if (input.serverEntries.length !== 12) {
    addFinding(findings, 'blocker', 'SERVER_MANIFEST_ENTRY_COUNT_MISMATCH', 'Server delivery manifest must contain exactly 12 fr runtime slice entries.');
  }
  const sourceLocales = new Set(input.serverEntries.map((entry) => entry.sourceLocale));
  const surfaces = new Set(input.serverEntries.map((entry) => entry.surface));
  if (sourceLocales.size !== 2 || !sourceLocales.has('ru') || !sourceLocales.has('uk')) {
    addFinding(findings, 'blocker', 'SERVER_MANIFEST_SOURCE_LOCALES_MISMATCH', 'Server entries must cover ru and uk source locales only.');
  }
  if (surfaces.size !== 6) {
    addFinding(findings, 'blocker', 'SERVER_MANIFEST_SURFACE_COUNT_MISMATCH', 'Server entries must cover six runtime surfaces for each source locale.');
  }
  if (input.dryRunHashLocks < 60) {
    addFinding(findings, 'blocker', 'DRY_RUN_HASH_LOCK_COVERAGE_LOW', 'Dry-run hash lock must include the critical activation artifact coverage.');
  }
  if (input.shaMismatches > 0 || input.missingEntryFiles > 0 || input.payloadBytesMismatches > 0) {
    addFinding(findings, 'blocker', 'RUNTIME_SLICE_HASH_OR_SIZE_MISMATCH', 'Runtime slice payload/index/manifest files must match server manifest hashes and sizes.');
  }
  if (input.invalidServerPaths > 0 || input.invalidCacheKeys > 0) {
    addFinding(findings, 'blocker', 'RUNTIME_PATH_OR_CACHE_KEY_INVALID', 'Runtime server paths and cache keys must stay scoped to fr/source/surface namespaces.');
  }
  if (input.invalidRollbackMarkers > 0) {
    addFinding(findings, 'blocker', 'ROLLBACK_MARKERS_INVALID', 'Every first French pack entry must carry an explicit rollback marker.');
  }
  if (input.openEntryFlags > 0) {
    addFinding(findings, 'blocker', 'SERVER_ENTRY_PRODUCTION_FLAG_OPEN', 'Server manifest entries must keep activation/runtime/download/apply flags closed.');
  }
  if (p45Waiting) {
    addFinding(findings, 'info', 'WAITING_FOR_P45_PREFLIGHT', 'P45 is waiting for exact approval validation; production apply transaction remains a no-write contract.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const steps = transactionSteps();
  const readyForProductionApplyTransaction = blockers === 0 && p45Ready;
  const transactionState: TransactionState =
    blockers > 0
      ? 'blocked_by_findings'
      : readyForProductionApplyTransaction
        ? 'production_apply_transaction_contract_ready'
        : 'waiting_for_activation_sequence_preflight';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      transactionState,
      p45Status: input.p45Status,
      p45PreflightState: input.p45PreflightState,
      p45ReadyForProductionActivationSequence: input.p45ReadyForProductionActivationSequence,
      masterBlockers: input.masterBlockers,
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
      serverManifestEntries: input.serverEntries.length,
      payloadFilesChecked: input.serverEntries.length === 12 ? input.serverEntries.length : 0,
      indexFilesChecked: input.serverEntries.length === 12 ? input.serverEntries.length : 0,
      sliceManifestFilesChecked: input.serverEntries.length === 12 ? input.serverEntries.length : 0,
      shaMismatches: input.shaMismatches,
      missingEntryFiles: input.missingEntryFiles,
      invalidServerPaths: input.invalidServerPaths,
      invalidCacheKeys: input.invalidCacheKeys,
      invalidRollbackMarkers: input.invalidRollbackMarkers,
      openEntryFlags: input.openEntryFlags,
      payloadBytesMismatches: input.payloadBytesMismatches,
      dryRunHashLocks: input.dryRunHashLocks,
      allowedFutureMutationSteps: steps.filter((step) => step.futureMayWriteProductionState).length,
      rollbackSteps: steps.filter((step) => step.phase === 'rollback').length,
      readyForProductionApplyTransaction,
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

function makeP45Ready(input: EvaluationInput): void {
  input.p45Status = 'PASS';
  input.p45PreflightState = 'production_activation_sequence_preflight_ready';
  input.p45ReadyForProductionActivationSequence = true;
}

function runProbes(base: EvaluationInput): Probe[] {
  const tests: Array<{ id: string; expectedState: TransactionState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'current_waiting_hold', expectedState: 'waiting_for_activation_sequence_preflight', mutate: () => undefined },
    { id: 'p45_ready_contract_ready', expectedState: 'production_apply_transaction_contract_ready', mutate: makeP45Ready },
    { id: 'p45_block_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45Status = 'BLOCK'; input.p45PreflightState = 'blocked_by_findings'; } },
    { id: 'missing_server_entry_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.serverEntries.pop(); } },
    { id: 'sha_mismatch_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.shaMismatches = 1; } },
    { id: 'missing_entry_file_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.missingEntryFiles = 1; } },
    { id: 'invalid_cache_key_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.invalidCacheKeys = 1; } },
    { id: 'open_entry_flag_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.openEntryFlags = 1; } },
    { id: 'target_activation_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.targetActivationApproved = true; } },
    { id: 'runtime_downloads_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'master_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.masterBlockers = 1; } },
    { id: 'low_hash_lock_coverage_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.dryRunHashLocks = 1; } },
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
      transactionState: result.transactionState,
      blockers: result.blockers,
      passed: result.transactionState === test.expectedState,
    };
  });
}

function allowedFutureMutations(): string[] {
  return [
    'Upload immutable fr runtime pack payloads to the exact serverPath entries after P45 PASS.',
    'Publish server delivery manifest entries only after all upload hashes match.',
    'Flip downloadablePacksPublished/runtimeDownloadsEnabled only after upload verification and rollback checkpoint.',
    'Set activationApproved=true only in a later explicit apply gate after post-apply guards pass.',
  ];
}

function forbiddenCurrentMutations(): string[] {
  return [
    'No app bundle writes.',
    'No target manifest activation flag writes.',
    'No server/Firebase uploads.',
    'No runtime download enablement.',
    'No storage/cloud migration.',
    'No reviewer decision imports.',
    'No active approval receipt or hash lock creation.',
  ];
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Production Apply Transaction Contract V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Transaction state: \`${report.summary.transactionState}\``,
    `- P45 status/state: \`${report.summary.p45Status}\`/\`${report.summary.p45PreflightState}\``,
    `- P45 ready for production activation sequence: ${report.summary.p45ReadyForProductionActivationSequence ? 'yes' : 'no'}`,
    `- P49 proved/locked/missing/contradicted: ${report.summary.p49RequirementsProved}/${report.summary.p49RequirementsProductionLocked}/${report.summary.p49RequirementsMissing}/${report.summary.p49RequirementsContradicted}`,
    `- P50 final hash locks/missing/runtime chain: ${report.summary.finalHashLocks}/${report.summary.p50MissingCriticalArtifacts}/${report.summary.p50RuntimeDeliveryEvidenceChainReady ? 'yes' : 'no'}`,
    `- Runtime delivery chain entries/sha/rollback/source/study rejects: ${report.summary.runtimeDeliveryEvidenceChainPublishManifestEntries}/${report.summary.runtimeDeliveryEvidenceChainActualShaEntries}/${report.summary.runtimeDeliveryEvidenceChainRollbackContracts}/${report.summary.runtimeDeliveryEvidenceChainSourceLocaleRejects}/${report.summary.runtimeDeliveryEvidenceChainStudyTargetRejects}`,
    `- Server manifest entries: ${report.summary.serverManifestEntries}`,
    `- Payload/index/manifest files checked: ${report.summary.payloadFilesChecked}/${report.summary.indexFilesChecked}/${report.summary.sliceManifestFilesChecked}`,
    `- SHA/size mismatches: ${report.summary.shaMismatches}/${report.summary.payloadBytesMismatches}`,
    `- Missing entry files: ${report.summary.missingEntryFiles}`,
    `- Invalid server paths/cache keys: ${report.summary.invalidServerPaths}/${report.summary.invalidCacheKeys}`,
    `- Invalid rollback markers/open entry flags: ${report.summary.invalidRollbackMarkers}/${report.summary.openEntryFlags}`,
    `- Dry-run hash locks: ${report.summary.dryRunHashLocks}`,
    `- Future mutation steps/rollback steps: ${report.summary.allowedFutureMutationSteps}/${report.summary.rollbackSteps}`,
    `- Ready for production apply transaction: ${report.summary.readyForProductionApplyTransaction ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Transaction Steps',
    '',
  ];
  for (const step of report.transactionSteps) {
    lines.push(`- ${step.id}: ${step.phase}; future write=${step.futureMayWriteProductionState ? 'yes' : 'no'}; ${step.action}`);
  }
  lines.push('', '## Allowed Future Mutations', '');
  for (const item of report.allowedFutureMutations) lines.push(`- ${item}`);
  lines.push('', '## Forbidden Current Mutations', '');
  for (const item of report.forbiddenCurrentMutations) lines.push(`- ${item}`);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  for (const finding of report.findings) {
    lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- This packet is a no-write transaction contract only.');
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
  const p45Path = path.join(auditsDir, 'production_activation_sequence_preflight_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const p49Path = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const p50Path = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const deliveryChainPath = path.join(auditsDir, 'runtime_delivery_evidence_chain_v2_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const dryRunHashLockPath = path.join(runDir, 'apply_plan/hash_lock_manifest_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.md');

  const p45 = readJsonOrEmpty(p45Path);
  const master = readJsonOrEmpty(masterPath);
  const p49 = readJsonOrEmpty(p49Path);
  const p50 = readJsonOrEmpty(p50Path);
  const deliveryChain = readJsonOrEmpty(deliveryChainPath);
  const targetManifest = readJsonOrEmpty(targetManifestPath);
  const serverManifest = readJsonOrEmpty(serverManifestPath);
  const dryRunHashLock = readJsonOrEmpty(dryRunHashLockPath);

  const p45Summary = summaryOf(p45);
  const masterSummary = summaryOf(master);
  const p49Summary = summaryOf(p49);
  const p50Summary = summaryOf(p50);
  const deliveryChainSummary = summaryOf(deliveryChain);
  const targetActivation = object(targetManifest.activation);
  const masterActionableBlockers = arr(master.findings)
    .filter((finding) => s(object(finding), 'severity') === 'blocker')
    .filter((finding) => {
      const code = s(object(finding), 'code');
      return !MASTER_SELF_CYCLE_BLOCKERS.has(code) &&
        !code.startsWith('nonproduction_blocker_closure_plan_v2_') &&
        !code.startsWith('exact_approval_') &&
        !code.startsWith('explicit_approval_receipt_hash_lock_gate_v2_');
    })
    .length;
  const serverEntries = arr(serverManifest.entries).map(normalizeServerEntry);
  const entryInspection = inspectServerEntries(repoRoot, runId, serverEntries);

  const input: EvaluationInput = {
    p45Status: s(p45, 'status'),
    p45PreflightState: s(p45Summary, 'preflightState'),
    p45ReadyForProductionActivationSequence: b(p45Summary, 'readyForProductionActivationSequence'),
    p45ReadyForApply: b(p45Summary, 'readyForApply'),
    p45MayModifyProductionAppFiles: b(p45Summary, 'mayModifyProductionAppFiles'),
    p45ActivationApproved: b(p45Summary, 'activationApproved'),
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
    targetManifestRunId: s(targetManifest, 'runId'),
    targetManifestStudyTarget: s(targetManifest, 'studyTarget'),
    targetManifestTargetLocale: s(targetManifest, 'targetLocale'),
    targetActivationApproved: b(targetActivation, 'activationApproved'),
    targetProductionReady: b(targetActivation, 'productionReady'),
    targetReadyForRuntimeDelivery: b(targetActivation, 'readyForRuntimeDelivery'),
    targetReadyForServerUpload: b(targetActivation, 'readyForServerUpload'),
    targetReadyForStorageCloudMigration: b(targetActivation, 'readyForStorageCloudMigration'),
    targetReadyForApply: b(targetActivation, 'readyForApply'),
    targetMayModifyProductionAppFiles: b(targetActivation, 'mayModifyProductionAppFiles'),
    serverManifestRunId: s(serverManifest, 'runId'),
    serverManifestStudyTarget: s(serverManifest, 'studyTarget'),
    serverManifestTargetLocale: s(serverManifest, 'targetLocale'),
    serverEntries,
    serverUploadAllowed: b(serverManifest, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(serverManifest, 'firebaseUploadAllowed'),
    downloadablePacksPublished: b(serverManifest, 'downloadablePacksPublished'),
    runtimeDownloadsEnabled: b(serverManifest, 'runtimeDownloadsEnabled'),
    serverActivationApproved: b(serverManifest, 'activationApproved'),
    serverReadyForRuntimeDownloadActivation: b(serverManifest, 'readyForRuntimeDownloadActivation'),
    serverReadyForApply: b(serverManifest, 'readyForApply'),
    serverMayModifyProductionAppFiles: b(serverManifest, 'mayModifyProductionAppFiles'),
    dryRunHashLocks: n(dryRunHashLock, 'criticalHashLocks') || arr(dryRunHashLock.criticalArtifacts).length,
    dryRunActivationApproved: b(dryRunHashLock, 'activationApproved'),
    dryRunReadyForApply: b(dryRunHashLock, 'readyForApply'),
    dryRunMayModifyProductionAppFiles: b(dryRunHashLock, 'mayModifyProductionAppFiles'),
    ...entryInspection,
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
      : evaluation.transactionState === 'production_apply_transaction_contract_ready'
        ? 'PASS'
        : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-production-apply-transaction-contract-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      productionActivationSequencePreflightV2Packet: rel(repoRoot, p45Path),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
      productionReadinessCompletionAuditV2Packet: rel(repoRoot, p49Path),
      finalPreapprovalEvidenceHashLockV2Packet: rel(repoRoot, p50Path),
      runtimeDeliveryEvidenceChainV2Packet: rel(repoRoot, deliveryChainPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestPath),
      hashLockManifestDryRunV2: rel(repoRoot, dryRunHashLockPath),
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
    transactionMode: 'no_write_contract_only',
    transactionSteps: transactionSteps(),
    allowedFutureMutations: allowedFutureMutations(),
    forbiddenCurrentMutations: forbiddenCurrentMutations(),
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

  console.log(`GUSTAV production apply transaction contract V2 packet: ${status}`);
  console.log(`Transaction state: ${report.summary.transactionState}`);
  console.log(`P45 status/state: ${report.summary.p45Status}/${report.summary.p45PreflightState}`);
  console.log(`Server entries: ${report.summary.serverManifestEntries}`);
  console.log(`Payload/index/manifest checks: ${report.summary.payloadFilesChecked}/${report.summary.indexFilesChecked}/${report.summary.sliceManifestFilesChecked}`);
  console.log(`Ready for production apply transaction: ${report.summary.readyForProductionApplyTransaction ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (status === 'BLOCK') process.exitCode = 1;
}

main();
