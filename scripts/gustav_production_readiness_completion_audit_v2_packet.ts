import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type RequirementStatus = 'proved' | 'production_locked' | 'missing' | 'contradicted';
type CompletionState =
  | 'closed_mode_evidence_complete_production_locked'
  | 'production_ready_activated'
  | 'blocked_by_findings';

type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Requirement = {
  id: string;
  area: string;
  status: RequirementStatus;
  evidence: string[];
  missing: string[];
};

type Probe = {
  id: string;
  expectedState: CompletionState;
  completionState: CompletionState;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  masterStatus: string;
  masterBlockers: number;
  masterWarnings: number;
  masterGeneratedRows: number;
  masterReadyForApply: boolean;
  masterMayModifyProductionAppFiles: boolean;
  masterApplyBlockers: number;
  officialSourceAcceptedRows: number;
  officialSourceAcceptedAi: number;
  officialSourceRowsWithRefs: number;
  officialSourceRowsWithGates: number;
  llmReviewedRows: number;
  llmAcceptedRows: number;
  llmReviewedAi: number;
  llmAcceptedAi: number;
  p48LegacyReviewResidueMatches: number;
  languageStatus: string;
  languageState: string;
  languageRows: number;
  languageLeaks: number;
  promptContracts: number;
  promptEntrypointsExpected: number;
  promptRejectBeforeReturn: number;
  promptRejectBeforeCache: number;
  targetStudyTarget: string;
  targetLocale: string;
  targetActivationApproved: boolean;
  targetReadyForApply: boolean;
  targetMayModifyProductionAppFiles: boolean;
  targetProductionReady: boolean;
  targetPayloadEntries: number;
  serverManifestStudyTarget: string;
  serverManifestTargetLocale: string;
  serverManifestEntries: number;
  serverManifestOpenEntryFlags: number;
  serverManifestTopLevelOpenFlags: number;
  p46Status: string;
  p46State: string;
  p46PayloadFilesChecked: number;
  p46IndexFilesChecked: number;
  p46SliceManifestFilesChecked: number;
  p46ShaMismatches: number;
  p46MissingEntryFiles: number;
  p46ReadyForProductionApplyTransaction: boolean;
  runtimeCacheStatus: string;
  runtimeCacheContracts: number;
  runtimeRollbackContracts: number;
  runtimeDownloadsEnabled: boolean;
  runtimeCacheWritesOpened: boolean;
  p47Status: string;
  p47State: string;
  p47ReadyForPostApplyRollbackGuard: boolean;
  p47PostApplyGuardSteps: number;
  p47RollbackGuardSteps: number;
  storageStatus: string;
  storageTargetKeyDomains: number;
  storageFrenchSyncFactoryRefs: number;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
  adminStatus: string;
  adminState: string;
  adminManifestEntries: number;
  adminReady: boolean;
  adminRuntimeReady: boolean;
  adminStorageReady: boolean;
  adminServerUploadAllowed: boolean;
  adminFirebaseUploadAllowed: boolean;
  adminRuntimeDownloadsEnabled: boolean;
  adminActivationApproved: boolean;
  deliveryChainStatus: string;
  deliveryChainState: string;
  deliveryChainReady: boolean;
  deliveryChainUpstreamReportsPass: number;
  deliveryChainUpstreamReportBlockers: number;
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
  deliveryChainAdminReady: boolean;
  deliveryChainRuntimeReady: boolean;
  deliveryChainStorageReady: boolean;
  deliveryChainClosedTransitions: boolean;
  deliveryChainReadyForExactApprovalWaitState: boolean;
  deliveryChainFixtureProbesPassed: number;
  deliveryChainFixtureProbes: number;
  deliveryChainReadyForApply: boolean;
  deliveryChainMayModifyProductionAppFiles: boolean;
  p43Status: string;
  p43State: string;
  p43ClosedEvidenceReady: boolean;
  approvalRequestStatus: string;
  approvalRequestState: string;
  approvalRequestReadyForReceiptCreation: boolean;
  approvalRequestHashLinked: boolean;
  approvalRequestExactSentenceIncluded: boolean;
  approvalRequestIncludesCompletionAudit: boolean;
  approvalRequestActiveReceiptExists: boolean;
  approvalRequestActiveHashLockExists: boolean;
  p44Status: string;
  p44State: string;
  p44ActiveApprovalReceiptExists: boolean;
  p44ActiveHashLockExists: boolean;
  p44ReadyForProductionActivationSequencing: boolean;
  p45Status: string;
  p45State: string;
  p45ReadyForProductionActivationSequence: boolean;
  p48Status: string;
  p48State: string;
  p48ReadyForNextSafePass: boolean;
  finalGapStatus: string;
  finalGapState: string;
  finalGapReady: boolean;
  finalGapRequirementsReady: number;
  finalGapRequirementsBlocked: number;
  finalGapProductionHardBlockers: number;
  finalGapCanStartProductionApply: boolean;
  p68Status: string;
  p68HandoffState: string;
  p68Ready: boolean;
  p68ApprovalSourceExists: boolean;
  p68ApprovalSourceContainsExactSentence: boolean;
  p68NextAllowedStepWhileAbsent: string;
  p68NextAllowedStepWhenPresent: string;
  p68ActiveApprovalReceiptExists: boolean;
  p68ActiveHashLockExists: boolean;
  p68CanStartProductionApply: boolean;
  p69Status: string;
  p69TerminalState: string;
  p69Ready: boolean;
  p69ApprovalSourceLiveChecked: boolean;
  p69ApprovalSourceExists: boolean;
  p69ApprovalSourceContainsExactSentence: boolean;
  p69NextPassGoalId: string;
  p69ConsistencyGoalId: string;
  p69ActiveApprovalReceiptExists: boolean;
  p69ActiveHashLockExists: boolean;
  p69CanStartProductionApply: boolean;
  postApprovalRunbookStatus: string;
  postApprovalRunbookState: string;
  postApprovalRunbookReady: boolean;
  postApprovalRunbookSteps: number;
  postApprovalRunbookP31CreateAllowedNow: boolean;
  postApprovalRunbookP31CreateAllowedWhenExactSourcePresent: boolean;
  postApprovalRunbookProductionWritesAllowedNow: boolean;
  postApprovalRunbookActiveApprovalReceiptExists: boolean;
  postApprovalRunbookActiveHashLockExists: boolean;
  postApprovalRunbookCanStartProductionApplyNow: boolean;
  postApprovalRunbookFixtureProbesPassed: number;
  postApprovalRunbookFixtureProbes: number;
  postApprovalRunbookReadyForApply: boolean;
  postApprovalRunbookMayModifyProductionAppFiles: boolean;
  fixtureProbeFailures: number;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  completionState: CompletionState;
  requirementsTotal: number;
  requirementsProved: number;
  requirementsProductionLocked: number;
  requirementsMissing: number;
  requirementsContradicted: number;
  closedModeEvidenceComplete: boolean;
  productionLockedByExactApproval: boolean;
  productionLockedByActivationSequence: boolean;
  finalGapReady: boolean;
  finalGapState: string;
  finalGapRequirementsReady: number;
  finalGapRequirementsBlocked: number;
  finalGapProductionHardBlockers: number;
  exactApprovalSourceHandoffFirewallReady: boolean;
  exactApprovalSourceWaitTerminalStateReady: boolean;
  exactApprovalSourceTerminalWaitReady: boolean;
  postExactApprovalApplyRunbookReady: boolean;
  exactApprovalSourcePresent: boolean;
  canStartProductionApply: boolean;
  activationApproved: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
  productionWritesAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  downloadablePacksPublished: false;
  runtimeDownloadsEnabled: boolean;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-production-readiness-completion-audit-v2-packet-v0';
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
  requirements: Requirement[];
  probes: Probe[];
  findings: Finding[];
  requiredVerificationCommands: string[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabledByThisScript: false;
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
  'production_readiness_completion_audit_v2_missing_closed_requirements',
  'production_readiness_completion_audit_v2_missing_requirements',
  'production_readiness_completion_audit_v2_missing_probe_passes',
  'final_preapproval_evidence_hash_lock_v2_blockers',
  'final_preapproval_evidence_hash_lock_v2_not_ready',
  'final_preapproval_evidence_hash_lock_v2_missing_probe_passes',
  'safe_preapproval_continuation_v2_blockers',
  'safe_preapproval_continuation_v2_not_ready',
  'safe_preapproval_continuation_v2_missing_probe_passes',
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

function reportArray(value: JsonObject, key: string): unknown[] {
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

function requirement(
  id: string,
  area: string,
  passed: boolean,
  evidence: string[],
  missing: string[],
  locked = false,
): Requirement {
  return {
    id,
    area,
    status: passed ? 'proved' : locked ? 'production_locked' : 'missing',
    evidence,
    missing: passed ? [] : missing,
  };
}

function serverOpenEntryFlags(serverManifest: JsonObject): number {
  return arr<JsonObject>(serverManifest.entries).filter((entry) =>
    b(entry, 'activationApproved') || b(entry, 'runtimeDownloadsEnabled') || b(entry, 'readyForApply')
  ).length;
}

function serverTopLevelOpenFlags(serverManifest: JsonObject): number {
  return [
    'serverUploadAllowed',
    'firebaseUploadAllowed',
    'downloadablePacksPublished',
    'runtimeDownloadsEnabled',
    'activationApproved',
    'readyForRuntimeDownloadActivation',
    'readyForApply',
    'mayModifyProductionAppFiles',
  ].filter((key) => b(serverManifest, key)).length;
}

function languageLeaks(language: JsonObject): number {
  return [
    'cyrillicTargetFields',
    'mojibakeTargetFields',
    'sourceLanguageLeakFields',
    'targetEqualsSourceFields',
    'rowsMissingTargetLocale',
    'promptActivationOpenFlags',
    'promptFalseApprovalFlags',
    'storageActivationApprovedFlags',
    'storageReadyForApplyOpenFlags',
    'adminActivationApprovedFlags',
    'adminReadyForApplyOpenFlags',
    'manifestWrongStudyTargetEntries',
    'manifestWrongSourceLocaleEntries',
    'manifestTopLevelUploadFlagsOpen',
    'manifestActivationApprovedEntries',
    'manifestRuntimeDownloadsEnabledEntries',
    'manifestReadyForApplyEntries',
  ].reduce((sum, key) => sum + n(language, key), 0);
}

function buildRequirements(input: EvaluationInput): Requirement[] {
  const p44Ready =
    input.p44ActiveApprovalReceiptExists &&
    input.p44ActiveHashLockExists &&
    input.p44ReadyForProductionActivationSequencing;
  const p45Ready = input.p45Status === 'PASS' && input.p45ReadyForProductionActivationSequence;
  const p46Ready = input.p46Status === 'PASS' && input.p46ReadyForProductionApplyTransaction;
  const p47Ready = input.p47Status === 'PASS' && input.p47ReadyForPostApplyRollbackGuard;
  const activationReady = input.targetActivationApproved && p44Ready && p45Ready && p46Ready && p47Ready;
  const closedProductionFlags =
    !input.masterReadyForApply &&
    !input.masterMayModifyProductionAppFiles &&
    !input.targetActivationApproved &&
    !input.targetReadyForApply &&
    !input.targetMayModifyProductionAppFiles &&
    !input.targetProductionReady &&
    input.fixtureProbeFailures === 0;
  const exactApprovalOnlyMasterLock =
    closedProductionFlags &&
    input.masterStatus === 'HOLD' &&
    input.masterBlockers === 1 &&
    input.masterApplyBlockers === 1 &&
    !input.p44ActiveApprovalReceiptExists &&
    !input.p44ActiveHashLockExists &&
    !activationReady;

  return [
    requirement(
      'REQ-01-CONTENT-OFFICIAL-SOURCE-COVERAGE',
      'content',
      input.masterGeneratedRows === 1600 &&
        input.officialSourceAcceptedRows === 1600 &&
        input.officialSourceAcceptedAi === 164 &&
        input.officialSourceRowsWithRefs === 1600 &&
        input.officialSourceRowsWithGates === 1600,
      [
        `master.generatedRows=${input.masterGeneratedRows}`,
        `officialSource.rows=${input.officialSourceAcceptedRows}`,
        `officialSource.ai=${input.officialSourceAcceptedAi}`,
      ],
      ['Need 1600 accepted rows, 164 accepted AI decisions, source refs and gates for every row.'],
    ),
    requirement(
      'REQ-02-LLM-OFFICIAL-SOURCE-VALIDATION',
      'reviewer',
      input.llmReviewedRows === 1600 &&
        input.llmAcceptedRows === 1600 &&
        input.llmReviewedAi === 164 &&
        input.llmAcceptedAi === 164 &&
        input.p48LegacyReviewResidueMatches === 0,
      [
        `llmRows=${input.llmReviewedRows}/${input.llmAcceptedRows}`,
        `llmAi=${input.llmReviewedAi}/${input.llmAcceptedAi}`,
        `legacyReviewResidue=${input.p48LegacyReviewResidueMatches}`,
      ],
      ['Need complete LLM official-source decisions and zero legacy external-person review residue.'],
    ),
    requirement(
      'REQ-03-LANGUAGE-PROMPT-ISOLATION',
      'language_isolation',
      input.languageStatus === 'PASS' &&
        input.languageState === 'language_isolation_regression_recheck_ready' &&
        input.languageRows > 0 &&
        input.languageLeaks === 0 &&
        input.promptEntrypointsExpected > 0 &&
        input.promptContracts === input.promptEntrypointsExpected &&
        input.promptRejectBeforeReturn === input.promptEntrypointsExpected &&
        input.promptRejectBeforeCache === input.promptEntrypointsExpected,
      [
        `languageState=${input.languageState}`,
        `promptContracts=${input.promptContracts}/${input.promptEntrypointsExpected}`,
        `languageLeaks=${input.languageLeaks}`,
      ],
      ['Need zero language leaks and every prompt to carry target/source/ui locale and reject before return/cache.'],
    ),
    requirement(
      'REQ-04-PACK-PAYLOAD-SERVER-DRAFT',
      'pack_server',
      input.targetStudyTarget === 'fr' &&
        input.targetLocale === 'fr' &&
        input.targetPayloadEntries >= 1600 &&
        input.serverManifestStudyTarget === 'fr' &&
        input.serverManifestTargetLocale === 'fr' &&
        input.serverManifestEntries === 12 &&
        input.serverManifestOpenEntryFlags === 0 &&
        input.serverManifestTopLevelOpenFlags === 0 &&
        input.p46PayloadFilesChecked === 12 &&
        input.p46IndexFilesChecked === 12 &&
        input.p46SliceManifestFilesChecked === 12 &&
        input.p46ShaMismatches === 0 &&
        input.p46MissingEntryFiles === 0,
      [
        `target=${input.targetStudyTarget}/${input.targetLocale}`,
        `payloadEntries=${input.targetPayloadEntries}`,
        `serverEntries=${input.serverManifestEntries}`,
        `p46Checks=${input.p46PayloadFilesChecked}/${input.p46IndexFilesChecked}/${input.p46SliceManifestFilesChecked}`,
      ],
      ['Need scoped fr manifest, 12 server entries, 12 payload/index/manifest checks, zero hash/missing/open flags.'],
    ),
    requirement(
      'REQ-05-RUNTIME-CACHE-ROLLBACK',
      'runtime_cache',
      input.runtimeCacheStatus === 'PASS' &&
        input.runtimeCacheContracts === 12 &&
        input.runtimeRollbackContracts === 12 &&
        !input.runtimeDownloadsEnabled &&
        !input.runtimeCacheWritesOpened &&
        input.p47PostApplyGuardSteps > 0 &&
        input.p47RollbackGuardSteps > 0,
      [
        `runtimeCache=${input.runtimeCacheContracts}/${input.runtimeRollbackContracts}`,
        `p47GuardSteps=${input.p47PostApplyGuardSteps}/${input.p47RollbackGuardSteps}`,
      ],
      ['Need complete runtime cache/rollback contracts and closed download/cache-write flags.'],
    ),
    requirement(
      'REQ-06-STORAGE-CLOUD-ISOLATION',
      'storage_cloud',
      input.storageStatus === 'PASS' &&
        input.storageTargetKeyDomains >= 14 &&
        input.storageFrenchSyncFactoryRefs > 0 &&
        !input.storageMigrationAllowed &&
        !input.cloudSyncMigrationAllowed,
      [
        `storageDomains=${input.storageTargetKeyDomains}`,
        `frSyncRefs=${input.storageFrenchSyncFactoryRefs}`,
      ],
      ['Need target-scoped storage/cloud contracts with migrations closed until explicit gate.'],
    ),
    requirement(
      'REQ-07-ADMIN-SERVER-RUNTIME-SURFACE',
      'admin_runtime',
      input.adminStatus === 'PASS' &&
        input.adminState === 'admin_server_runtime_preflight_ready' &&
        input.adminManifestEntries === 12 &&
        input.adminReady &&
        input.adminRuntimeReady &&
        input.adminStorageReady &&
        !input.adminServerUploadAllowed &&
        !input.adminFirebaseUploadAllowed &&
        !input.adminRuntimeDownloadsEnabled &&
        !input.adminActivationApproved,
      [
        `adminState=${input.adminState}`,
        `adminManifestEntries=${input.adminManifestEntries}`,
      ],
      ['Need admin/server/runtime/storage preflight ready with uploads/downloads/activation closed.'],
    ),
    requirement(
      'REQ-08-RUNTIME-DELIVERY-EVIDENCE-CHAIN',
      'delivery_chain',
      input.deliveryChainStatus === 'PASS' &&
        input.deliveryChainState === 'runtime_delivery_evidence_chain_ready_no_writes' &&
        input.deliveryChainReady &&
        input.deliveryChainUpstreamReportsPass === 9 &&
        input.deliveryChainUpstreamReportBlockers === 0 &&
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
        input.deliveryChainAdminReady &&
        input.deliveryChainRuntimeReady &&
        input.deliveryChainStorageReady &&
        input.deliveryChainClosedTransitions &&
        input.deliveryChainReadyForExactApprovalWaitState &&
        input.deliveryChainFixtureProbes > 0 &&
        input.deliveryChainFixtureProbesPassed === input.deliveryChainFixtureProbes &&
        !input.deliveryChainReadyForApply &&
        !input.deliveryChainMayModifyProductionAppFiles,
      [
        `deliveryChain=${input.deliveryChainStatus}/${input.deliveryChainState}`,
        `manifestSha=${input.deliveryChainActualShaEntries}/${input.deliveryChainActualByteSizeEntries}`,
        `fileMatches=${input.deliveryChainPayloadShaMatches}/${input.deliveryChainIndexShaMatches}/${input.deliveryChainSliceManifestShaMatches}/${input.deliveryChainChecksumReportsPresent}`,
        `rejects=${input.deliveryChainRollbackContracts}/${input.deliveryChainSourceLocaleRejects}/${input.deliveryChainStudyTargetRejects}`,
      ],
      ['Need runtime delivery evidence chain PASS with 12/12 actual hashes, local file matches, rollback/source/studyTarget rejects, admin/runtime/storage readiness, and closed apply/runtime flags.'],
    ),
    requirement(
      'REQ-09-CLOSED-PRODUCTION-FLAGS',
      'safety',
      activationReady ||
        (input.masterStatus === 'HOLD' &&
          input.masterBlockers === 0 &&
          closedProductionFlags),
      [
        `master=${input.masterStatus}/blockers:${input.masterBlockers}`,
        `applyBlockers=${input.masterApplyBlockers}`,
        `fixtureProbeFailures=${input.fixtureProbeFailures}`,
      ],
      ['Need master zero non-approval blockers, all production mutation flags closed and dependency probes passing.'],
      exactApprovalOnlyMasterLock,
    ),
    requirement(
      'REQ-10-APPROVAL-REQUEST-LATEST-EVIDENCE-LINK',
      'activation_request',
      input.approvalRequestStatus === 'PASS' &&
        input.approvalRequestState === 'approval_request_presented' &&
        input.approvalRequestReadyForReceiptCreation &&
        input.approvalRequestHashLinked &&
        input.approvalRequestExactSentenceIncluded &&
        input.approvalRequestIncludesCompletionAudit &&
        !input.approvalRequestActiveReceiptExists &&
        !input.approvalRequestActiveHashLockExists,
      [
        `p30=${input.approvalRequestStatus}/${input.approvalRequestState}`,
        `linked=${input.approvalRequestHashLinked}`,
        `completionAuditLinked=${input.approvalRequestIncludesCompletionAudit}`,
      ],
      ['Need P30 request-only approval package to include the latest P49 completion audit path and keep active receipt/hash lock absent.'],
    ),
    requirement(
      'REQ-11-POST-EXACT-APPROVAL-RUNBOOK',
      'activation_runbook',
      input.postApprovalRunbookStatus === 'PASS' &&
        input.postApprovalRunbookReady &&
        input.postApprovalRunbookState === 'post_exact_approval_runbook_ready_waiting_for_canonical_source' &&
        input.postApprovalRunbookSteps === 6 &&
        !input.postApprovalRunbookP31CreateAllowedNow &&
        input.postApprovalRunbookP31CreateAllowedWhenExactSourcePresent &&
        !input.postApprovalRunbookProductionWritesAllowedNow &&
        !input.postApprovalRunbookActiveApprovalReceiptExists &&
        !input.postApprovalRunbookActiveHashLockExists &&
        !input.postApprovalRunbookCanStartProductionApplyNow &&
        input.postApprovalRunbookFixtureProbes === 13 &&
        input.postApprovalRunbookFixtureProbesPassed === input.postApprovalRunbookFixtureProbes &&
        !input.postApprovalRunbookReadyForApply &&
        !input.postApprovalRunbookMayModifyProductionAppFiles,
      [
        `runbook=${input.postApprovalRunbookStatus}/${input.postApprovalRunbookState}`,
        `steps=${input.postApprovalRunbookSteps}`,
        `p31NowAfter=${input.postApprovalRunbookP31CreateAllowedNow}/${input.postApprovalRunbookP31CreateAllowedWhenExactSourcePresent}`,
        `probes=${input.postApprovalRunbookFixtureProbesPassed}/${input.postApprovalRunbookFixtureProbes}`,
      ],
      ['Need a PASS post-exact-approval runbook that orders P31-P48, keeps writes closed now, and opens P31 only after the exact canonical source exists.'],
    ),
    requirement(
      'REQ-12-EXACT-APPROVAL-ARTIFACTS',
      'activation',
      p44Ready,
      [
        `p44=${input.p44Status}/${input.p44State}`,
        `activeReceipt=${input.p44ActiveApprovalReceiptExists}`,
        `activeHashLock=${input.p44ActiveHashLockExists}`,
      ],
      ['Need active approval receipt and active hash lock validated for this fr run.'],
      true,
    ),
    requirement(
      'REQ-13-PRODUCTION-ACTIVATION-SEQUENCE',
      'activation',
      p45Ready,
      [`p45=${input.p45Status}/${input.p45State}`, `ready=${input.p45ReadyForProductionActivationSequence}`],
      ['Need P45 PASS after P44 validates exact approval artifacts.'],
      true,
    ),
    requirement(
      'REQ-14-PRODUCTION-APPLY-TRANSACTION',
      'apply',
      p46Ready,
      [`p46=${input.p46Status}/${input.p46State}`, `ready=${input.p46ReadyForProductionApplyTransaction}`],
      ['Need P46 PASS after activation sequence preflight and locked hash checks.'],
      true,
    ),
    requirement(
      'REQ-15-POST-APPLY-ROLLBACK-GUARD',
      'rollback',
      p47Ready,
      [`p47=${input.p47Status}/${input.p47State}`, `ready=${input.p47ReadyForPostApplyRollbackGuard}`],
      ['Need P47 PASS after future approved apply and rollback/post-apply guards.'],
      true,
    ),
    requirement(
      'REQ-16-ACTIVATION-APPROVED',
      'activation',
      activationReady,
      [`activationApproved=${input.targetActivationApproved}`, `applyBlockers=${input.masterApplyBlockers}`],
      ['Need activationApproved=true only after exact approval, sequence, apply transaction and post-apply guards pass.'],
      true,
    ),
  ];
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[]; requirements: Requirement[] } {
  const findings: Finding[] = [];
  const requirements = buildRequirements(input);
  const missing = requirements.filter((item) => item.status === 'missing').length;
  const contradicted = requirements.filter((item) => item.status === 'contradicted').length;
  const productionLocked = requirements.filter((item) => item.status === 'production_locked').length;
  const proved = requirements.filter((item) => item.status === 'proved').length;

  if (missing > 0) {
    addFinding(findings, 'blocker', 'PRODUCTION_READINESS_REQUIREMENTS_MISSING', `${missing} non-locked requirement(s) are missing.`);
  }
  if (contradicted > 0) {
    addFinding(findings, 'blocker', 'PRODUCTION_READINESS_REQUIREMENTS_CONTRADICTED', `${contradicted} requirement(s) are contradicted.`);
  }
  if (
    (input.targetActivationApproved || input.targetReadyForApply || input.targetMayModifyProductionAppFiles || input.targetProductionReady) &&
    (!input.p44ReadyForProductionActivationSequencing ||
      input.p45Status !== 'PASS' ||
      input.p46Status !== 'PASS' ||
      input.p47Status !== 'PASS')
  ) {
    addFinding(findings, 'blocker', 'PREMATURE_PRODUCTION_FLAG_OPEN', 'Production flags cannot open before P44-P47 have passed.');
  }
  if (
    (input.runtimeDownloadsEnabled || input.adminRuntimeDownloadsEnabled || input.serverManifestOpenEntryFlags > 0 || input.serverManifestTopLevelOpenFlags > 0) &&
    !input.targetActivationApproved
  ) {
    addFinding(findings, 'blocker', 'DOWNLOAD_OR_SERVER_FLAG_OPEN_BEFORE_ACTIVATION', 'Runtime/server download or upload flags cannot open before activation approval.');
  }
  if (input.storageMigrationAllowed || input.cloudSyncMigrationAllowed) {
    addFinding(findings, 'blocker', 'STORAGE_OR_CLOUD_MIGRATION_OPEN', 'Storage/cloud migrations remain forbidden before explicit migration gate.');
  }
  if (input.p48Status !== 'PASS' || input.p48State !== 'approval_wait_safe_continuation_ready' || !input.p48ReadyForNextSafePass) {
    addFinding(findings, 'blocker', 'P48_NOT_READY', 'Completion audit requires P48 safe continuation to be ready first.');
  }
  const p69ClosedOrNotYetReady =
    (!input.p69Ready || input.p69Status === 'PASS') &&
    (input.p69TerminalState === '' || input.p69TerminalState === 'exact_approval_source_absent_terminal_wait') &&
    !input.p69ApprovalSourceExists &&
    !input.p69ApprovalSourceContainsExactSentence &&
    !input.p69ActiveApprovalReceiptExists &&
    !input.p69ActiveHashLockExists &&
    !input.p69CanStartProductionApply;
  const exactApprovalSourceTerminalWaitReady =
    input.finalGapReady &&
    input.finalGapStatus === 'PASS' &&
    input.finalGapState === 'preactivation_ready_exact_approval_required' &&
    input.finalGapRequirementsReady === 10 &&
    input.finalGapRequirementsBlocked === 1 &&
    input.finalGapProductionHardBlockers === 1 &&
    !input.finalGapCanStartProductionApply &&
    input.p68Ready &&
    input.p68Status === 'PASS' &&
    input.p68HandoffState === 'waiting_for_exact_approval_source_file' &&
    !input.p68ApprovalSourceExists &&
    !input.p68ApprovalSourceContainsExactSentence &&
    input.p68NextAllowedStepWhileAbsent === 'wait_for_exact_approval_source_file' &&
    input.p68NextAllowedStepWhenPresent === 'P31_EXPLICIT_APPROVAL_RECEIPT_CREATION_GATE_V2' &&
    !input.p68ActiveApprovalReceiptExists &&
    !input.p68ActiveHashLockExists &&
    !input.p68CanStartProductionApply &&
    p69ClosedOrNotYetReady;
  if (!exactApprovalSourceTerminalWaitReady) {
    addFinding(findings, 'blocker', 'EXACT_APPROVAL_SOURCE_TERMINAL_WAIT_NOT_READY', 'P49 requires final_gap=10/1, P68 source-absent routing and closed P69 production flags before it can claim closed-mode completion.');
  }
  const postExactApprovalApplyRunbookReady =
    input.postApprovalRunbookStatus === 'PASS' &&
    input.postApprovalRunbookReady &&
    input.postApprovalRunbookState === 'post_exact_approval_runbook_ready_waiting_for_canonical_source' &&
    input.postApprovalRunbookSteps === 6 &&
    !input.postApprovalRunbookP31CreateAllowedNow &&
    input.postApprovalRunbookP31CreateAllowedWhenExactSourcePresent &&
    !input.postApprovalRunbookProductionWritesAllowedNow &&
    !input.postApprovalRunbookActiveApprovalReceiptExists &&
    !input.postApprovalRunbookActiveHashLockExists &&
    !input.postApprovalRunbookCanStartProductionApplyNow &&
    input.postApprovalRunbookFixtureProbes === 13 &&
    input.postApprovalRunbookFixtureProbesPassed === input.postApprovalRunbookFixtureProbes &&
    !input.postApprovalRunbookReadyForApply &&
    !input.postApprovalRunbookMayModifyProductionAppFiles;
  if (!postExactApprovalApplyRunbookReady) {
    addFinding(findings, 'blocker', 'POST_EXACT_APPROVAL_APPLY_RUNBOOK_NOT_READY', 'P49 requires a PASS post-exact-approval P31-P48 runbook before it can claim closed-mode completion.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const closedModeEvidenceComplete = blockers === 0 && missing === 0 && proved >= 9;
  const activated =
    blockers === 0 &&
    productionLocked === 0 &&
    input.targetActivationApproved &&
    input.p44ReadyForProductionActivationSequencing &&
    input.p45Status === 'PASS' &&
    input.p46Status === 'PASS' &&
    input.p47Status === 'PASS';
  const completionState: CompletionState =
    blockers > 0
      ? 'blocked_by_findings'
      : activated
        ? 'production_ready_activated'
        : 'closed_mode_evidence_complete_production_locked';

  return {
    requirements,
    findings,
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      completionState,
      requirementsTotal: requirements.length,
      requirementsProved: proved,
      requirementsProductionLocked: productionLocked,
      requirementsMissing: missing,
      requirementsContradicted: contradicted,
      closedModeEvidenceComplete,
      productionLockedByExactApproval: !input.p44ReadyForProductionActivationSequencing,
      productionLockedByActivationSequence:
        !input.p45ReadyForProductionActivationSequence ||
        !input.p46ReadyForProductionApplyTransaction ||
        !input.p47ReadyForPostApplyRollbackGuard,
      finalGapReady: input.finalGapReady,
      finalGapState: input.finalGapState,
      finalGapRequirementsReady: input.finalGapRequirementsReady,
      finalGapRequirementsBlocked: input.finalGapRequirementsBlocked,
      finalGapProductionHardBlockers: input.finalGapProductionHardBlockers,
      exactApprovalSourceHandoffFirewallReady: input.p68Ready,
      exactApprovalSourceWaitTerminalStateReady: input.p69Ready,
      exactApprovalSourceTerminalWaitReady,
      postExactApprovalApplyRunbookReady,
      exactApprovalSourcePresent: input.p68ApprovalSourceExists || input.p69ApprovalSourceExists,
      canStartProductionApply: input.finalGapCanStartProductionApply || input.p68CanStartProductionApply || input.p69CanStartProductionApply,
      activationApproved: input.targetActivationApproved,
      readyForApply: input.targetReadyForApply || input.masterReadyForApply,
      mayModifyProductionAppFiles: input.targetMayModifyProductionAppFiles || input.masterMayModifyProductionAppFiles,
      productionWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      downloadablePacksPublished: false,
      runtimeDownloadsEnabled: input.runtimeDownloadsEnabled || input.adminRuntimeDownloadsEnabled,
      storageMigrationAllowed: input.storageMigrationAllowed,
      cloudSyncMigrationAllowed: input.cloudSyncMigrationAllowed,
      blockers,
      warnings,
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeActivated(input: EvaluationInput): void {
  input.p44ActiveApprovalReceiptExists = true;
  input.p44ActiveHashLockExists = true;
  input.p44ReadyForProductionActivationSequencing = true;
  input.p45Status = 'PASS';
  input.p45State = 'production_activation_sequence_preflight_ready';
  input.p45ReadyForProductionActivationSequence = true;
  input.p46Status = 'PASS';
  input.p46State = 'production_apply_transaction_contract_ready';
  input.p46ReadyForProductionApplyTransaction = true;
  input.p47Status = 'PASS';
  input.p47State = 'post_apply_rollback_guard_contract_ready';
  input.p47ReadyForPostApplyRollbackGuard = true;
  input.targetActivationApproved = true;
  input.targetProductionReady = true;
  input.masterBlockers = 0;
  input.masterApplyBlockers = 0;
}

function runProbes(base: EvaluationInput): Probe[] {
  const tests: Array<{ id: string; expectedState: CompletionState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'current_closed_mode_locked', expectedState: 'closed_mode_evidence_complete_production_locked', mutate: () => undefined },
    { id: 'synthetic_all_gates_activated', expectedState: 'production_ready_activated', mutate: makeActivated },
    { id: 'content_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.officialSourceAcceptedRows = 1599; } },
    { id: 'language_leak_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.languageLeaks = 1; } },
    { id: 'prompt_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.promptContracts = 1; } },
    { id: 'server_entry_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.serverManifestEntries = 11; } },
    { id: 'hash_mismatch_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46ShaMismatches = 1; } },
    { id: 'runtime_delivery_chain_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.deliveryChainReady = false; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'storage_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; } },
    { id: 'admin_upload_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.adminServerUploadAllowed = true; } },
    { id: 'approval_request_completion_link_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.approvalRequestIncludesCompletionAudit = false; } },
    { id: 'terminal_exact_approval_wait_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p68Ready = false; input.p68NextAllowedStepWhileAbsent = ''; } },
    { id: 'post_exact_approval_runbook_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.postApprovalRunbookReady = false; } },
    { id: 'premature_activation_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.targetActivationApproved = true; } },
    { id: 'dependency_probe_failure_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.fixtureProbeFailures = 1; } },
  ];
  return tests.map((test) => {
    const input = clone(base);
    test.mutate(input);
    const result = evaluate(input).evaluation;
    return {
      id: test.id,
      expectedState: test.expectedState,
      completionState: result.completionState,
      blockers: result.blockers,
      passed: result.completionState === test.expectedState,
    };
  });
}

function fixtureFailures(...summaries: JsonObject[]): number {
  return summaries.reduce((sum, summary) => {
    const probes = n(summary, 'fixtureProbes');
    const passed = n(summary, 'fixtureProbesPassed');
    return sum + Math.max(0, probes - passed);
  }, 0);
}

function terminalWaitFixtureFailures(summary: JsonObject): number {
  const safeTerminalWait =
    s(summary, 'terminalState') === 'exact_approval_source_absent_terminal_wait' &&
    !b(summary, 'approvalSourceExists') &&
    !b(summary, 'approvalSourceContainsExactSentence') &&
    !b(summary, 'activeApprovalReceiptExists') &&
    !b(summary, 'activeHashLockExists') &&
    !b(summary, 'readyForApply') &&
    !b(summary, 'mayModifyProductionAppFiles') &&
    !b(summary, 'canStartProductionApply');
  return safeTerminalWait ? 0 : fixtureFailures(summary);
}

function requiredVerificationCommands(): string[] {
  return [
    'npx tsx scripts\\gustav_explicit_approval_receipt_hash_lock_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_activation_approval_request_presentation_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_explicit_approval_receipt_creation_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_production_apply_absence_denial_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_production_activation_hold_exact_approval_required_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_exact_approval_validation_gate_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_production_activation_sequence_preflight_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_production_apply_transaction_contract_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_post_apply_rollback_guard_contract_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_approval_wait_safe_continuation_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_final_production_readiness_gap_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_exact_approval_source_handoff_firewall_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_exact_approval_source_wait_terminal_state_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_runtime_delivery_evidence_chain_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_production_readiness_completion_audit_v2_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_next_pass_goal_contract_packet.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1 --target fr',
    'npx tsx scripts\\gustav_french_reviewer_master_manifest.ts --run docs\\gustav\\runs\\2026-05-19_fr_inventory_v0a1',
    'npx jest tests/gustav_admin_target_isolation.test.ts tests/course_pack_runtime_contract.test.ts tests/gustav_target_storage_keys.test.ts tests/cloud_sync_sync_keys_validity.test.ts tests/cloud_sync_daily_tasks_merge.test.ts --runInBand',
  ];
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Production Readiness Completion Audit V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Completion state: \`${report.summary.completionState}\``,
    `- Requirements proved/locked/missing/contradicted: ${report.summary.requirementsProved}/${report.summary.requirementsProductionLocked}/${report.summary.requirementsMissing}/${report.summary.requirementsContradicted}`,
    `- Closed-mode evidence complete: ${report.summary.closedModeEvidenceComplete ? 'yes' : 'no'}`,
    `- Production locked by exact approval: ${report.summary.productionLockedByExactApproval ? 'yes' : 'no'}`,
    `- Production locked by activation sequence: ${report.summary.productionLockedByActivationSequence ? 'yes' : 'no'}`,
    `- Final gap state/ready/blocked/hard blockers: ${report.summary.finalGapState}/${report.summary.finalGapRequirementsReady}/${report.summary.finalGapRequirementsBlocked}/${report.summary.finalGapProductionHardBlockers}`,
    `- Exact approval source terminal wait ready: ${report.summary.exactApprovalSourceTerminalWaitReady ? 'yes' : 'no'}`,
    `- Post exact approval apply runbook ready: ${report.summary.postExactApprovalApplyRunbookReady ? 'yes' : 'no'}`,
    `- P68/P69 ready: ${report.summary.exactApprovalSourceHandoffFirewallReady ? 'yes' : 'no'}/${report.summary.exactApprovalSourceWaitTerminalStateReady ? 'yes' : 'no'}`,
    `- Exact approval source present: ${report.summary.exactApprovalSourcePresent ? 'yes' : 'no'}`,
    `- Can start production apply: ${report.summary.canStartProductionApply ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- runtimeDownloads/storageMigration/cloudMigration: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.storageMigrationAllowed ? 'yes' : 'no'}/${report.summary.cloudSyncMigrationAllowed ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Requirements',
    '',
  ];
  for (const item of report.requirements) {
    lines.push(`- ${item.id}: ${item.status}; ${item.evidence.join('; ')}`);
    if (item.missing.length > 0) lines.push(`  Missing: ${item.missing.join(' ')}`);
  }
  lines.push('', '## Required Verification Commands', '');
  for (const command of report.requiredVerificationCommands) lines.push(`- \`${command}\``);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  for (const finding of report.findings) {
    lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- This packet is a no-write completion audit only.');
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
  const p43Path = path.join(auditsDir, 'production_activation_hold_exact_approval_required_v2_packet.json');
  const p30Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const p44Path = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const p45Path = path.join(auditsDir, 'production_activation_sequence_preflight_v2_packet.json');
  const p46Path = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.json');
  const p47Path = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.json');
  const p48Path = path.join(auditsDir, 'approval_wait_safe_continuation_v2_packet.json');
  const finalGapPath = path.join(auditsDir, 'final_production_readiness_gap_v2_packet.json');
  const p68Path = path.join(auditsDir, 'exact_approval_source_handoff_firewall_v2_packet.json');
  const p69Path = path.join(auditsDir, 'exact_approval_source_wait_terminal_state_v2_packet.json');
  const postApprovalRunbookPath = path.join(auditsDir, 'post_exact_approval_apply_runbook_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const officialSourcePath = path.join(auditsDir, 'french_official_source_content_coverage_v2_packet.json');
  const llmIntakePath = path.join(auditsDir, 'llm_official_source_review_intake_v2_packet.json');
  const languagePath = path.join(auditsDir, 'language_isolation_regression_recheck_v2_packet.json');
  const runtimeCachePath = path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.json');
  const storagePath = path.join(auditsDir, 'storage_cloud_target_map_v2_packet.json');
  const adminPath = path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.json');
  const deliveryChainPath = path.join(auditsDir, 'runtime_delivery_evidence_chain_v2_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const outputJsonPath = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.md');

  const p43 = readJsonOrEmpty(p43Path);
  const p30 = readJsonOrEmpty(p30Path);
  const p44 = readJsonOrEmpty(p44Path);
  const p45 = readJsonOrEmpty(p45Path);
  const p46 = readJsonOrEmpty(p46Path);
  const p47 = readJsonOrEmpty(p47Path);
  const p48 = readJsonOrEmpty(p48Path);
  const finalGap = readJsonOrEmpty(finalGapPath);
  const p68 = readJsonOrEmpty(p68Path);
  const p69 = readJsonOrEmpty(p69Path);
  const postApprovalRunbook = readJsonOrEmpty(postApprovalRunbookPath);
  const master = readJsonOrEmpty(masterPath);
  const officialSource = readJsonOrEmpty(officialSourcePath);
  const llmIntake = readJsonOrEmpty(llmIntakePath);
  const language = readJsonOrEmpty(languagePath);
  const runtimeCache = readJsonOrEmpty(runtimeCachePath);
  const storage = readJsonOrEmpty(storagePath);
  const admin = readJsonOrEmpty(adminPath);
  const deliveryChain = readJsonOrEmpty(deliveryChainPath);
  const targetManifest = readJsonOrEmpty(targetManifestPath);
  const serverManifest = readJsonOrEmpty(serverManifestPath);

  const p43Summary = summaryOf(p43);
  const p30Summary = summaryOf(p30);
  const p44Summary = summaryOf(p44);
  const p45Summary = summaryOf(p45);
  const p46Summary = summaryOf(p46);
  const p47Summary = summaryOf(p47);
  const p48Summary = summaryOf(p48);
  const finalGapSummary = summaryOf(finalGap);
  const p68Summary = summaryOf(p68);
  const p69Summary = summaryOf(p69);
  const postApprovalRunbookSummary = summaryOf(postApprovalRunbook);
  const masterSummary = summaryOf(master);
  const officialSourceSummary = summaryOf(officialSource);
  const llmIntakeSummary = summaryOf(llmIntake);
  const languageSummary = summaryOf(language);
  const runtimeCacheSummary = summaryOf(runtimeCache);
  const storageSummary = summaryOf(storage);
  const adminSummary = summaryOf(admin);
  const deliveryChainSummary = summaryOf(deliveryChain);
  const targetActivation = object(targetManifest.activation);
  const masterActionableBlockers = reportArray(master, 'findings')
    .filter((finding) => s(object(finding), 'severity') === 'blocker')
    .filter((finding) => {
      const code = s(object(finding), 'code');
      return !MASTER_SELF_CYCLE_BLOCKERS.has(code) && !code.startsWith('exact_approval_');
    })
    .length;

  const input: EvaluationInput = {
    masterStatus: s(master, 'status'),
    masterBlockers: masterActionableBlockers,
    masterWarnings: n(masterSummary, 'warnings'),
    masterGeneratedRows: n(masterSummary, 'generatedRows'),
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    masterApplyBlockers: n(masterSummary, 'applyBlockers'),
    officialSourceAcceptedRows: n(officialSourceSummary, 'acceptedRowOfficialSourceDecisionRows'),
    officialSourceAcceptedAi: n(officialSourceSummary, 'acceptedAiOfficialSourceDecisionRows'),
    officialSourceRowsWithRefs: n(officialSourceSummary, 'rowDecisionsWithSourceRefs'),
    officialSourceRowsWithGates: n(officialSourceSummary, 'rowDecisionsWithAllRequiredGatesPassed'),
    llmReviewedRows: n(llmIntakeSummary, 'llmReviewedRowDecisionRows'),
    llmAcceptedRows: n(llmIntakeSummary, 'llmAcceptedRowDecisionRows'),
    llmReviewedAi: n(llmIntakeSummary, 'llmReviewedAiDecisionRows'),
    llmAcceptedAi: n(llmIntakeSummary, 'llmAcceptedAiDecisionRows'),
    p48LegacyReviewResidueMatches: n(p48Summary, 'legacyReviewResidueMatches'),
    languageStatus: s(language, 'status'),
    languageState: s(languageSummary, 'languageIsolationRegressionRecheckState'),
    languageRows: n(languageSummary, 'scannedRows'),
    languageLeaks: languageLeaks(languageSummary),
    promptContracts: n(languageSummary, 'promptContractsWithTargetLocale'),
    promptEntrypointsExpected: n(languageSummary, 'promptEntrypointsExpected'),
    promptRejectBeforeReturn: n(languageSummary, 'promptRejectBeforeReturn'),
    promptRejectBeforeCache: n(languageSummary, 'promptRejectBeforeCache'),
    targetStudyTarget: s(targetManifest, 'studyTarget'),
    targetLocale: s(targetManifest, 'targetLocale'),
    targetActivationApproved: b(targetActivation, 'activationApproved'),
    targetReadyForApply: b(targetActivation, 'readyForApply'),
    targetMayModifyProductionAppFiles: b(targetActivation, 'mayModifyProductionAppFiles'),
    targetProductionReady: b(targetActivation, 'productionReady'),
    targetPayloadEntries:
      n(summaryOf(readJsonOrEmpty(path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.json'))), 'payloadEntriesTotal') ||
      n(summaryOf(readJsonOrEmpty(path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.json'))), 'payloadEntries'),
    serverManifestStudyTarget: s(serverManifest, 'studyTarget'),
    serverManifestTargetLocale: s(serverManifest, 'targetLocale'),
    serverManifestEntries: arr(serverManifest.entries).length,
    serverManifestOpenEntryFlags: serverOpenEntryFlags(serverManifest),
    serverManifestTopLevelOpenFlags: serverTopLevelOpenFlags(serverManifest),
    p46Status: s(p46, 'status'),
    p46State: s(p46Summary, 'transactionState'),
    p46PayloadFilesChecked: n(p46Summary, 'payloadFilesChecked'),
    p46IndexFilesChecked: n(p46Summary, 'indexFilesChecked'),
    p46SliceManifestFilesChecked: n(p46Summary, 'sliceManifestFilesChecked'),
    p46ShaMismatches: n(p46Summary, 'shaMismatches'),
    p46MissingEntryFiles: n(p46Summary, 'missingEntryFiles'),
    p46ReadyForProductionApplyTransaction: b(p46Summary, 'readyForProductionApplyTransaction'),
    runtimeCacheStatus: s(runtimeCache, 'status'),
    runtimeCacheContracts: n(runtimeCacheSummary, 'cacheIntegrityContracts'),
    runtimeRollbackContracts: n(runtimeCacheSummary, 'rollbackSimulationContracts'),
    runtimeDownloadsEnabled: b(runtimeCacheSummary, 'runtimeDownloadsEnabled'),
    runtimeCacheWritesOpened: b(runtimeCacheSummary, 'cacheWritesOpened'),
    p47Status: s(p47, 'status'),
    p47State: s(p47Summary, 'guardState'),
    p47ReadyForPostApplyRollbackGuard: b(p47Summary, 'readyForPostApplyRollbackGuard'),
    p47PostApplyGuardSteps: n(p47Summary, 'postApplyGuardSteps'),
    p47RollbackGuardSteps: n(p47Summary, 'rollbackGuardSteps'),
    storageStatus: s(readJsonOrEmpty(storagePath), 'status'),
    storageTargetKeyDomains: n(storageSummary, 'targetKeyDomains'),
    storageFrenchSyncFactoryRefs: n(storageSummary, 'frenchTargetSyncKeyFactoryRefs'),
    storageMigrationAllowed: b(storageSummary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(storageSummary, 'cloudSyncMigrationAllowed'),
    adminStatus: s(admin, 'status'),
    adminState: s(adminSummary, 'preflightState'),
    adminManifestEntries: n(adminSummary, 'manifestEntries'),
    adminReady: b(adminSummary, 'adminReady'),
    adminRuntimeReady: b(adminSummary, 'runtimeReady'),
    adminStorageReady: b(adminSummary, 'storageReady'),
    adminServerUploadAllowed: b(adminSummary, 'serverUploadAllowed'),
    adminFirebaseUploadAllowed: b(adminSummary, 'firebaseUploadAllowed'),
    adminRuntimeDownloadsEnabled: b(adminSummary, 'runtimeDownloadsEnabled'),
    adminActivationApproved: b(adminSummary, 'activationApproved'),
    deliveryChainStatus: s(deliveryChain, 'status'),
    deliveryChainState: s(deliveryChainSummary, 'chainState'),
    deliveryChainReady: b(deliveryChainSummary, 'runtimeDeliveryEvidenceChainReady'),
    deliveryChainUpstreamReportsPass: n(deliveryChainSummary, 'upstreamReportsPass'),
    deliveryChainUpstreamReportBlockers: n(deliveryChainSummary, 'upstreamReportBlockers'),
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
    deliveryChainAdminReady: b(deliveryChainSummary, 'adminReady'),
    deliveryChainRuntimeReady: b(deliveryChainSummary, 'adminRuntimeReady'),
    deliveryChainStorageReady: b(deliveryChainSummary, 'adminStorageReady'),
    deliveryChainClosedTransitions: b(deliveryChainSummary, 'closedTransitions'),
    deliveryChainReadyForExactApprovalWaitState: b(deliveryChainSummary, 'readyForExactApprovalWaitState'),
    deliveryChainFixtureProbesPassed: n(deliveryChainSummary, 'fixtureProbesPassed'),
    deliveryChainFixtureProbes: n(deliveryChainSummary, 'fixtureProbes'),
    deliveryChainReadyForApply: b(deliveryChainSummary, 'readyForApply'),
    deliveryChainMayModifyProductionAppFiles: b(deliveryChainSummary, 'mayModifyProductionAppFiles'),
    p43Status: s(p43, 'status'),
    p43State: s(p43Summary, 'holdState'),
    p43ClosedEvidenceReady: b(p43Summary, 'closedEvidenceReady'),
    approvalRequestStatus: s(p30, 'status'),
    approvalRequestState: s(p30Summary, 'requestState'),
    approvalRequestReadyForReceiptCreation: b(p30Summary, 'readyForExplicitApprovalReceiptCreationGateV2'),
    approvalRequestHashLinked: b(p30Summary, 'approvalRequestHashLinked'),
    approvalRequestExactSentenceIncluded: b(p30Summary, 'exactApprovalSentenceIncluded'),
    approvalRequestIncludesCompletionAudit: s(p30, 'requiredApprovalSentence').includes(rel(repoRoot, outputJsonPath)),
    approvalRequestActiveReceiptExists: b(p30Summary, 'activeApprovalReceiptExists'),
    approvalRequestActiveHashLockExists: b(p30Summary, 'activeHashLockExists'),
    p44Status: s(p44, 'status'),
    p44State: s(p44Summary, 'validationState'),
    p44ActiveApprovalReceiptExists: b(p44Summary, 'activeApprovalReceiptExists'),
    p44ActiveHashLockExists: b(p44Summary, 'activeHashLockExists'),
    p44ReadyForProductionActivationSequencing: b(p44Summary, 'readyForProductionActivationSequencing'),
    p45Status: s(p45, 'status'),
    p45State: s(p45Summary, 'preflightState'),
    p45ReadyForProductionActivationSequence: b(p45Summary, 'readyForProductionActivationSequence'),
    p48Status: s(p48, 'status'),
    p48State: s(p48Summary, 'continuationState'),
    p48ReadyForNextSafePass: b(p48Summary, 'readyForNextSafePass'),
    finalGapStatus: s(finalGap, 'status'),
    finalGapState: s(finalGapSummary, 'productionReadinessState'),
    finalGapReady:
      s(finalGap, 'status') === 'PASS' &&
      s(finalGapSummary, 'productionReadinessState') === 'preactivation_ready_exact_approval_required' &&
      n(finalGapSummary, 'requirementsReady') === 10 &&
      n(finalGapSummary, 'requirementsBlocked') === 1 &&
      n(finalGapSummary, 'productionHardBlockers') === 1 &&
      !b(finalGapSummary, 'canStartProductionApply') &&
      n(finalGapSummary, 'blockers') === 0,
    finalGapRequirementsReady: n(finalGapSummary, 'requirementsReady'),
    finalGapRequirementsBlocked: n(finalGapSummary, 'requirementsBlocked'),
    finalGapProductionHardBlockers: n(finalGapSummary, 'productionHardBlockers'),
    finalGapCanStartProductionApply: b(finalGapSummary, 'canStartProductionApply'),
    p68Status: s(p68, 'status'),
    p68HandoffState: s(p68Summary, 'handoffState'),
    p68Ready:
      s(p68, 'status') === 'PASS' &&
      s(p68Summary, 'handoffState') === 'waiting_for_exact_approval_source_file' &&
      b(p68Summary, 'finalGapReady') &&
      b(p68Summary, 'exactApprovalWaitStateReady') &&
      b(p68Summary, 'p31CreationGateReady') &&
      n(p68Summary, 'blockers') === 0,
    p68ApprovalSourceExists: b(p68Summary, 'approvalSourceExists'),
    p68ApprovalSourceContainsExactSentence: b(p68Summary, 'approvalSourceContainsExactSentence'),
    p68NextAllowedStepWhileAbsent: s(p68Summary, 'nextAllowedStepWhileAbsent'),
    p68NextAllowedStepWhenPresent: s(p68Summary, 'nextAllowedStepWhenPresent'),
    p68ActiveApprovalReceiptExists: b(p68Summary, 'activeApprovalReceiptExists'),
    p68ActiveHashLockExists: b(p68Summary, 'activeHashLockExists'),
    p68CanStartProductionApply: b(p68Summary, 'canStartProductionApply'),
    p69Status: s(p69, 'status'),
    p69TerminalState: s(p69Summary, 'terminalState'),
    p69Ready:
      s(p69, 'status') === 'PASS' &&
      s(p69Summary, 'terminalState') === 'exact_approval_source_absent_terminal_wait' &&
      b(p69Summary, 'p68Ready') &&
      b(p69Summary, 'approvalSourceLiveChecked') &&
      n(p69Summary, 'blockers') === 0,
    p69ApprovalSourceLiveChecked: b(p69Summary, 'approvalSourceLiveChecked'),
    p69ApprovalSourceExists: b(p69Summary, 'approvalSourceExists'),
    p69ApprovalSourceContainsExactSentence: b(p69Summary, 'approvalSourceContainsExactSentence'),
    p69NextPassGoalId: s(p69Summary, 'nextPassGoalId'),
    p69ConsistencyGoalId: s(p69Summary, 'consistencyGoalId'),
    p69ActiveApprovalReceiptExists: b(p69Summary, 'activeApprovalReceiptExists'),
    p69ActiveHashLockExists: b(p69Summary, 'activeHashLockExists'),
    p69CanStartProductionApply: b(p69Summary, 'canStartProductionApply'),
    postApprovalRunbookStatus: s(postApprovalRunbook, 'status'),
    postApprovalRunbookState: s(postApprovalRunbookSummary, 'runbookState'),
    postApprovalRunbookReady:
      s(postApprovalRunbook, 'status') === 'PASS' &&
      s(postApprovalRunbookSummary, 'runbookState') === 'post_exact_approval_runbook_ready_waiting_for_canonical_source' &&
      n(postApprovalRunbookSummary, 'blockers') === 0,
    postApprovalRunbookSteps: n(postApprovalRunbookSummary, 'runbookSteps'),
    postApprovalRunbookP31CreateAllowedNow: b(postApprovalRunbookSummary, 'p31CreateAllowedNow'),
    postApprovalRunbookP31CreateAllowedWhenExactSourcePresent: b(postApprovalRunbookSummary, 'p31CreateAllowedWhenExactSourcePresent'),
    postApprovalRunbookProductionWritesAllowedNow: b(postApprovalRunbookSummary, 'productionWritesAllowedNow'),
    postApprovalRunbookActiveApprovalReceiptExists: b(postApprovalRunbookSummary, 'activeApprovalReceiptExists'),
    postApprovalRunbookActiveHashLockExists: b(postApprovalRunbookSummary, 'activeHashLockExists'),
    postApprovalRunbookCanStartProductionApplyNow: b(postApprovalRunbookSummary, 'canStartProductionApplyNow'),
    postApprovalRunbookFixtureProbesPassed: n(postApprovalRunbookSummary, 'fixtureProbesPassed'),
    postApprovalRunbookFixtureProbes: n(postApprovalRunbookSummary, 'fixtureProbes'),
    postApprovalRunbookReadyForApply: b(postApprovalRunbookSummary, 'readyForApply'),
    postApprovalRunbookMayModifyProductionAppFiles: b(postApprovalRunbookSummary, 'mayModifyProductionAppFiles'),
    fixtureProbeFailures: fixtureFailures(
      p43Summary,
      p30Summary,
      p44Summary,
      p45Summary,
      p46Summary,
      p47Summary,
      p48Summary,
      finalGapSummary,
      p68Summary,
      officialSourceSummary,
      llmIntakeSummary,
      languageSummary,
      runtimeCacheSummary,
      storageSummary,
      adminSummary,
      deliveryChainSummary,
      postApprovalRunbookSummary,
    ) + terminalWaitFixtureFailures(p69Summary),
  };

  const { evaluation, findings, requirements } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status =
    blockers > 0
      ? 'BLOCK'
      : evaluation.completionState === 'production_ready_activated'
        ? 'PASS'
        : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-production-readiness-completion-audit-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      productionActivationHoldExactApprovalRequiredV2Packet: rel(repoRoot, p43Path),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, p30Path),
      exactApprovalValidationGateV2Packet: rel(repoRoot, p44Path),
      productionActivationSequencePreflightV2Packet: rel(repoRoot, p45Path),
      productionApplyTransactionContractV2Packet: rel(repoRoot, p46Path),
      postApplyRollbackGuardContractV2Packet: rel(repoRoot, p47Path),
      approvalWaitSafeContinuationV2Packet: rel(repoRoot, p48Path),
      finalProductionReadinessGapV2Packet: rel(repoRoot, finalGapPath),
      exactApprovalSourceHandoffFirewallV2Packet: rel(repoRoot, p68Path),
      exactApprovalSourceWaitTerminalStateV2Packet: rel(repoRoot, p69Path),
      postExactApprovalApplyRunbookV2Packet: rel(repoRoot, postApprovalRunbookPath),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
      officialSourceContentCoverageV2Packet: rel(repoRoot, officialSourcePath),
      llmOfficialSourceReviewIntakeV2Packet: rel(repoRoot, llmIntakePath),
      languageIsolationRegressionRecheckV2Packet: rel(repoRoot, languagePath),
      runtimeCacheIntegrityRollbackV2Packet: rel(repoRoot, runtimeCachePath),
      storageCloudTargetMapV2Packet: rel(repoRoot, storagePath),
      adminServerDeliveryRuntimePreflightV2Packet: rel(repoRoot, adminPath),
      runtimeDeliveryEvidenceChainV2Packet: rel(repoRoot, deliveryChainPath),
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
    requirements,
    probes,
    findings,
    requiredVerificationCommands: requiredVerificationCommands(),
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabledByThisScript: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV production readiness completion audit V2 packet: ${status}`);
  console.log(`Completion state: ${report.summary.completionState}`);
  console.log(`Requirements proved/locked/missing/contradicted: ${report.summary.requirementsProved}/${report.summary.requirementsProductionLocked}/${report.summary.requirementsMissing}/${report.summary.requirementsContradicted}`);
  console.log(`Closed-mode evidence complete: ${report.summary.closedModeEvidenceComplete ? 'yes' : 'no'}`);
  console.log(`Production locked by exact approval: ${report.summary.productionLockedByExactApproval ? 'yes' : 'no'}`);
  console.log(`Final gap ready/blocked/hard blockers: ${report.summary.finalGapRequirementsReady}/${report.summary.finalGapRequirementsBlocked}/${report.summary.finalGapProductionHardBlockers}`);
  console.log(`Exact approval terminal wait ready: ${report.summary.exactApprovalSourceTerminalWaitReady ? 'yes' : 'no'}`);
  console.log(`Activation approved: ${report.summary.activationApproved ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (status === 'BLOCK') process.exitCode = 1;
}

main();
