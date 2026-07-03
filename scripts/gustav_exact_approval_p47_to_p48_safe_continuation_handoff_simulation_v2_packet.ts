import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type HandoffState =
  | 'p47_to_p48_safe_continuation_handoff_ready_for_p48_safe_continuation_refresh'
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
  p62Status: string;
  p62Ready: boolean;
  p62State: string;
  p62FreshAfterP47: boolean;
  p62P61Ready: boolean;
  p62CommandAllowedNow: boolean;
  p62CommandAllowedAfterP46Contract: boolean;
  p62CommandExecutedByThisScript: boolean;
  p62ReadyForApply: boolean;
  p62MayModifyProductionAppFiles: boolean;
  p62ActivationApproved: boolean;
  p62ServerUploadAllowed: boolean;
  p62FirebaseUploadAllowed: boolean;
  p62DownloadablePacksPublished: boolean;
  p62RuntimeDownloadsEnabled: boolean;
  p62StorageMigrationAllowed: boolean;
  p62CloudSyncMigrationAllowed: boolean;
  p62FixtureProbesPassed: number;
  p62FixtureProbes: number;
  p47Status: string;
  p47GuardState: string;
  p47ReadyForPostApplyRollbackGuard: boolean;
  p47RuntimeCacheContracts: number;
  p47RuntimeCacheRollbackContracts: number;
  p47ServerManifestEntries: number;
  p47ProductionServerManifestPublishGateReady: boolean;
  p47ProductionServerManifestPublishGateEntries: number;
  p47FrenchServerPackUploadEvidenceReady: boolean;
  p47FrenchServerPackUploadEvidenceObjects: number;
  p47FrenchServerPackUploadExecutionGateReady: boolean;
  p47FrenchServerPackUploadExecutionGateDryRun: boolean;
  p47FrenchServerPackUploadExecutionStarted: boolean;
  p47FrenchServerObjectRemoteVerifyReady: boolean;
  p47FrenchServerObjectRemoteVerifyFound: number;
  p47FrenchServerObjectRemoteVerifyHashChecked: number;
  p47LanguagePromptContracts: number;
  p47LanguagePromptEntrypointsExpected: number;
  p47StorageTargetKeyDomains: number;
  p47StorageFrenchSyncFactoryRefs: number;
  p47ReadinessApplyBlockers: number;
  p47ReadinessGenerationBlockers: number;
  p47PostApplyGuardSteps: number;
  p47RollbackGuardSteps: number;
  p47ProbePassed: boolean;
  p47Blockers: number;
  p47ReadyForApply: boolean;
  p47MayModifyProductionAppFiles: boolean;
  p47ActivationApproved: boolean;
  p47ProductionWritesAllowed: boolean;
  p47ServerUploadAllowed: boolean;
  p47FirebaseUploadAllowed: boolean;
  p47DownloadablePacksPublished: boolean;
  p47RuntimeDownloadsEnabled: boolean;
  p47StorageMigrationAllowed: boolean;
  p47CloudSyncMigrationAllowed: boolean;
  p48Status: string;
  p48ContinuationState: string;
  p48FreshAfterP47: boolean;
  p48ReadyForNextSafePass: boolean;
  p48SafeContinuationWorkItems: number;
  p48RemainingProductionLockedItems: number;
  p48OfficialSourceRows: number;
  p48OfficialSourceAi: number;
  p48OfficialSourceRowsWithRefs: number;
  p48OfficialSourceRowsWithGates: number;
  p48ReadinessApplyBlockers: number;
  p48ReadinessGenerationBlockers: number;
  p48LegacyReviewResidueMatches: number;
  p48ActiveApprovalReceiptExists: boolean;
  p48ActiveHashLockExists: boolean;
  p48ReadyForApply: boolean;
  p48MayModifyProductionAppFiles: boolean;
  p48ActivationApproved: boolean;
  p48ProductionWritesAllowed: boolean;
  p48ServerUploadAllowed: boolean;
  p48FirebaseUploadAllowed: boolean;
  p48DownloadablePacksPublished: boolean;
  p48RuntimeDownloadsEnabled: boolean;
  p48StorageMigrationAllowed: boolean;
  p48CloudSyncMigrationAllowed: boolean;
  p48FixtureProbesPassed: number;
  p48FixtureProbes: number;
  masterBlockers: number;
  masterReadyForApply: boolean;
  masterMayModifyProductionAppFiles: boolean;
  commandTargetsFr: boolean;
  commandRunPathMatchesCurrentRun: boolean;
  commandWouldExecuteByThisScript: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  handoffState: HandoffState;
  p62Ready: boolean;
  p62State: string;
  p62CommandAllowedNow: boolean;
  p62CommandAllowedAfterP46Contract: boolean;
  p62CommandExecutedByThisScript: boolean;
  p47Status: string;
  p47GuardState: string;
  p47ReadyForPostApplyRollbackGuard: boolean;
  p47RuntimeCacheContracts: number;
  p47RuntimeCacheRollbackContracts: number;
  p47ServerManifestEntries: number;
  p47ProductionServerManifestPublishGateReady: boolean;
  p47ProductionServerManifestPublishGateEntries: number;
  p47FrenchServerPackUploadEvidenceReady: boolean;
  p47FrenchServerPackUploadEvidenceObjects: number;
  p47FrenchServerPackUploadExecutionGateReady: boolean;
  p47FrenchServerPackUploadExecutionGateDryRun: boolean;
  p47FrenchServerPackUploadExecutionStarted: boolean;
  p47FrenchServerObjectRemoteVerifyReady: boolean;
  p47FrenchServerObjectRemoteVerifyFound: number;
  p47FrenchServerObjectRemoteVerifyHashChecked: number;
  p47LanguagePromptContracts: number;
  p47LanguagePromptEntrypointsExpected: number;
  p47StorageTargetKeyDomains: number;
  p47StorageFrenchSyncFactoryRefs: number;
  p47ReadinessApplyBlockers: number;
  p47ReadinessGenerationBlockers: number;
  p47PostApplyGuardSteps: number;
  p47RollbackGuardSteps: number;
  p47ProbePassed: boolean;
  p48Status: string;
  p48ContinuationState: string;
  p48ReadyForNextSafePass: boolean;
  p48SafeContinuationWorkItems: number;
  p48RemainingProductionLockedItems: number;
  p48OfficialSourceRows: number;
  p48OfficialSourceAi: number;
  p48OfficialSourceRowsWithRefs: number;
  p48OfficialSourceRowsWithGates: number;
  p48ReadinessApplyBlockers: number;
  p48ReadinessGenerationBlockers: number;
  p48LegacyReviewResidueMatches: number;
  p48ActiveApprovalReceiptExists: boolean;
  p48ActiveHashLockExists: boolean;
  commandTargetsFr: boolean;
  commandRunPathMatchesCurrentRun: boolean;
  currentP47ToP48HandoffWouldOpenSafeContinuation: boolean;
  simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation: boolean;
  p48SafeContinuationCommandWouldExecuteByThisScript: boolean;
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
  schemaVersion: 'gustav-exact-approval-p47-to-p48-safe-continuation-handoff-simulation-v2-packet-v0';
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
    p48SafeContinuationCommand: string;
    p48SafeContinuationCommandExecutedByThisScript: false;
    requiresP62Ready: true;
    requiresP47NoWriteRollbackGuardContract: true;
    requiresP48SafeContinuationReady: true;
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
    p48SafeContinuationCommandExecutedByThisScript: false;
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

function isMasterTransientBlocker(code: string): boolean {
  return (
    code.startsWith('nonproduction_blocker_closure_plan_v2_') ||
    code.startsWith('nonproduction_evidence_refresh_v2_') ||
    code === 'official_source_content_coverage_v2_not_ready_for_import_dry_run_refresh' ||
    code.startsWith('ordered_approval_wait_refresh_v2_') ||
    code.startsWith('safe_preapproval_continuation_v2_') ||
    code.startsWith('explicit_approval_receipt_hash_lock_gate_v2_') ||
    code.startsWith('production_apply_absence_denial_gate_v2_') ||
    code.startsWith('production_activation_hold_exact_approval_required_v2_') ||
    code.startsWith('production_activation_sequence_preflight_v2_') ||
    code.startsWith('production_apply_transaction_contract_v2_') ||
    code.startsWith('post_apply_rollback_guard_contract_v2_') ||
    code.startsWith('approval_wait_safe_continuation_v2_') ||
    code.startsWith('production_readiness_completion_audit_v2_') ||
    code.startsWith('final_preapproval_evidence_hash_lock_v2_') ||
    code.startsWith('exact_approval_')
  );
}

function masterActionableBlockerCount(master: JsonObject): number {
  return arr(master, 'findings')
    .filter((finding) => s(object(finding), 'severity') === 'blocker')
    .filter((finding) => !isMasterTransientBlocker(s(object(finding), 'code')))
    .length;
}

function probePassed(report: JsonObject, id: string): boolean {
  return arr(report, 'probes').some((probe) => {
    const item = object(probe);
    return s(item, 'id') === id && b(item, 'passed');
  });
}

function p62Accepted(input: EvaluationInput): boolean {
  return (
    input.p62Status === 'PASS' &&
    input.p62Ready &&
    input.p62FreshAfterP47 &&
    (input.p62State === 'p47_rollback_guard_command_preflight_ready_waiting_for_p46_apply_transaction_contract' ||
      input.p62State === 'p47_rollback_guard_command_preflight_ready_for_guard_command') &&
    input.p62P61Ready &&
    input.p62CommandAllowedAfterP46Contract &&
    !input.p62CommandExecutedByThisScript &&
    !input.p62ReadyForApply &&
    !input.p62MayModifyProductionAppFiles &&
    !input.p62ActivationApproved &&
    !input.p62ServerUploadAllowed &&
    !input.p62FirebaseUploadAllowed &&
    !input.p62DownloadablePacksPublished &&
    !input.p62RuntimeDownloadsEnabled &&
    !input.p62StorageMigrationAllowed &&
    !input.p62CloudSyncMigrationAllowed &&
    input.p62FixtureProbes > 0 &&
    input.p62FixtureProbesPassed === input.p62FixtureProbes
  );
}

function p47GuardIntegrityReady(input: EvaluationInput): boolean {
  return (
    input.p47Blockers === 0 &&
    input.p47RuntimeCacheContracts === 12 &&
    input.p47RuntimeCacheRollbackContracts === 12 &&
    input.p47ServerManifestEntries === 12 &&
    input.p47ProductionServerManifestPublishGateReady &&
    input.p47ProductionServerManifestPublishGateEntries === 12 &&
    input.p47FrenchServerPackUploadEvidenceReady &&
    input.p47FrenchServerPackUploadEvidenceObjects === 36 &&
    input.p47FrenchServerPackUploadExecutionGateReady &&
    input.p47FrenchServerPackUploadExecutionGateDryRun &&
    !input.p47FrenchServerPackUploadExecutionStarted &&
    input.p47FrenchServerObjectRemoteVerifyReady &&
    input.p47FrenchServerObjectRemoteVerifyFound === 36 &&
    input.p47FrenchServerObjectRemoteVerifyHashChecked === 36 &&
    input.p47LanguagePromptContracts > 0 &&
    input.p47LanguagePromptContracts === input.p47LanguagePromptEntrypointsExpected &&
    input.p47StorageTargetKeyDomains >= 14 &&
    input.p47StorageFrenchSyncFactoryRefs > 0 &&
    input.p47ReadinessGenerationBlockers === 0 &&
    input.p47ReadinessApplyBlockers >= 1 &&
    input.p47PostApplyGuardSteps >= 4 &&
    input.p47RollbackGuardSteps >= 3 &&
    input.p47ProbePassed
  );
}

function p48SafeContinuationReady(input: EvaluationInput): boolean {
  return (
    input.p48Status === 'PASS' &&
    input.p48ContinuationState === 'approval_wait_safe_continuation_ready' &&
    input.p48FreshAfterP47 &&
    input.p48ReadyForNextSafePass &&
    input.p48SafeContinuationWorkItems >= 6 &&
    input.p48RemainingProductionLockedItems >= 4 &&
    input.p48OfficialSourceRows === 1600 &&
    input.p48OfficialSourceAi === 164 &&
    input.p48OfficialSourceRowsWithRefs === 1600 &&
    input.p48OfficialSourceRowsWithGates === 1600 &&
    input.p48ReadinessGenerationBlockers === 0 &&
    input.p48ReadinessApplyBlockers >= 1 &&
    input.p48LegacyReviewResidueMatches === 0 &&
    !input.p48ActiveApprovalReceiptExists &&
    !input.p48ActiveHashLockExists &&
    input.p48FixtureProbes > 0 &&
    input.p48FixtureProbesPassed === input.p48FixtureProbes
  );
}

function forbiddenProductionFlagsOpen(input: EvaluationInput): boolean {
  return (
    input.p47ReadyForApply ||
    input.p47MayModifyProductionAppFiles ||
    input.p47ActivationApproved ||
    input.p47ProductionWritesAllowed ||
    input.p47ServerUploadAllowed ||
    input.p47FirebaseUploadAllowed ||
    input.p47DownloadablePacksPublished ||
    input.p47RuntimeDownloadsEnabled ||
    input.p47StorageMigrationAllowed ||
    input.p47CloudSyncMigrationAllowed ||
    input.p48ReadyForApply ||
    input.p48MayModifyProductionAppFiles ||
    input.p48ActivationApproved ||
    input.p48ProductionWritesAllowed ||
    input.p48ServerUploadAllowed ||
    input.p48FirebaseUploadAllowed ||
    input.p48DownloadablePacksPublished ||
    input.p48RuntimeDownloadsEnabled ||
    input.p48StorageMigrationAllowed ||
    input.p48CloudSyncMigrationAllowed ||
    input.masterReadyForApply ||
    input.masterMayModifyProductionAppFiles
  );
}

function handoffCanOpenSafeContinuation(input: EvaluationInput): boolean {
  return (
    p62Accepted(input) &&
    p47GuardIntegrityReady(input) &&
    p48SafeContinuationReady(input) &&
    input.commandTargetsFr &&
    input.commandRunPathMatchesCurrentRun &&
    !input.commandWouldExecuteByThisScript &&
    input.masterBlockers === 0 &&
    !forbiddenProductionFlagsOpen(input)
  );
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const currentP47ToP48HandoffWouldOpenSafeContinuation = handoffCanOpenSafeContinuation(input);
  const commandReady = clone(input);
  makeP62CommandReady(commandReady);
  const simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation = handoffCanOpenSafeContinuation(commandReady);

  if (!p62Accepted(input)) {
    addFinding(findings, 'blocker', 'P62_NOT_READY', 'P63 requires fresh P62 PASS with exact P47 command preflight dry-run proof and no command execution.');
  }
  if (!p47GuardIntegrityReady(input)) {
    addFinding(findings, 'blocker', 'P47_ROLLBACK_GUARD_INTEGRITY_NOT_READY', 'P47 must prove runtime cache rollback, server manifest, upload evidence, remote object verification, prompt isolation, storage/admin and readiness guard coverage.');
  }
  if (!p48SafeContinuationReady(input)) {
    addFinding(findings, 'blocker', 'P48_SAFE_CONTINUATION_NOT_READY', 'P48 must be PASS and ready for safe continuation with complete official-source and closed production flags.');
  }
  if (!input.commandTargetsFr) {
    addFinding(findings, 'blocker', 'COMMAND_TARGET_NOT_FR', 'P48 safe continuation command must target fr.');
  }
  if (!input.commandRunPathMatchesCurrentRun) {
    addFinding(findings, 'blocker', 'COMMAND_RUN_NOT_CURRENT', 'P48 safe continuation command must use the current Gustav run path.');
  }
  if (!simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation) {
    addFinding(findings, 'blocker', 'SIMULATED_COMMAND_READY_HANDOFF_NOT_SAFE', 'A simulated P62 command-ready state must open only P48 safe continuation refresh.');
  }
  if (input.p62CommandAllowedNow && !currentP47ToP48HandoffWouldOpenSafeContinuation) {
    addFinding(findings, 'blocker', 'P62_COMMAND_READY_BUT_HANDOFF_NOT_OPEN', 'If P62 is command-ready now, the P48 safe continuation handoff must be open.');
  }
  if (forbiddenProductionFlagsOpen(input)) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P63 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }
  if (input.masterBlockers > 0) {
    addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', `Master manifest has ${input.masterBlockers} blocker(s).`);
  }
  if (input.commandWouldExecuteByThisScript) {
    addFinding(findings, 'blocker', 'PREFLIGHT_EXECUTED_COMMAND', 'P63 is a simulation and must not execute P48 safe continuation generation.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const handoffState: HandoffState =
    blockers > 0
      ? 'blocked_by_findings'
      : 'p47_to_p48_safe_continuation_handoff_ready_for_p48_safe_continuation_refresh';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      handoffState,
      p62Ready: input.p62Ready,
      p62State: input.p62State,
      p62CommandAllowedNow: input.p62CommandAllowedNow,
      p62CommandAllowedAfterP46Contract: input.p62CommandAllowedAfterP46Contract,
      p62CommandExecutedByThisScript: input.p62CommandExecutedByThisScript,
      p47Status: input.p47Status,
      p47GuardState: input.p47GuardState,
      p47ReadyForPostApplyRollbackGuard: input.p47ReadyForPostApplyRollbackGuard,
      p47RuntimeCacheContracts: input.p47RuntimeCacheContracts,
      p47RuntimeCacheRollbackContracts: input.p47RuntimeCacheRollbackContracts,
      p47ServerManifestEntries: input.p47ServerManifestEntries,
      p47ProductionServerManifestPublishGateReady: input.p47ProductionServerManifestPublishGateReady,
      p47ProductionServerManifestPublishGateEntries: input.p47ProductionServerManifestPublishGateEntries,
      p47FrenchServerPackUploadEvidenceReady: input.p47FrenchServerPackUploadEvidenceReady,
      p47FrenchServerPackUploadEvidenceObjects: input.p47FrenchServerPackUploadEvidenceObjects,
      p47FrenchServerPackUploadExecutionGateReady: input.p47FrenchServerPackUploadExecutionGateReady,
      p47FrenchServerPackUploadExecutionGateDryRun: input.p47FrenchServerPackUploadExecutionGateDryRun,
      p47FrenchServerPackUploadExecutionStarted: input.p47FrenchServerPackUploadExecutionStarted,
      p47FrenchServerObjectRemoteVerifyReady: input.p47FrenchServerObjectRemoteVerifyReady,
      p47FrenchServerObjectRemoteVerifyFound: input.p47FrenchServerObjectRemoteVerifyFound,
      p47FrenchServerObjectRemoteVerifyHashChecked: input.p47FrenchServerObjectRemoteVerifyHashChecked,
      p47LanguagePromptContracts: input.p47LanguagePromptContracts,
      p47LanguagePromptEntrypointsExpected: input.p47LanguagePromptEntrypointsExpected,
      p47StorageTargetKeyDomains: input.p47StorageTargetKeyDomains,
      p47StorageFrenchSyncFactoryRefs: input.p47StorageFrenchSyncFactoryRefs,
      p47ReadinessApplyBlockers: input.p47ReadinessApplyBlockers,
      p47ReadinessGenerationBlockers: input.p47ReadinessGenerationBlockers,
      p47PostApplyGuardSteps: input.p47PostApplyGuardSteps,
      p47RollbackGuardSteps: input.p47RollbackGuardSteps,
      p47ProbePassed: input.p47ProbePassed,
      p48Status: input.p48Status,
      p48ContinuationState: input.p48ContinuationState,
      p48ReadyForNextSafePass: input.p48ReadyForNextSafePass,
      p48SafeContinuationWorkItems: input.p48SafeContinuationWorkItems,
      p48RemainingProductionLockedItems: input.p48RemainingProductionLockedItems,
      p48OfficialSourceRows: input.p48OfficialSourceRows,
      p48OfficialSourceAi: input.p48OfficialSourceAi,
      p48OfficialSourceRowsWithRefs: input.p48OfficialSourceRowsWithRefs,
      p48OfficialSourceRowsWithGates: input.p48OfficialSourceRowsWithGates,
      p48ReadinessApplyBlockers: input.p48ReadinessApplyBlockers,
      p48ReadinessGenerationBlockers: input.p48ReadinessGenerationBlockers,
      p48LegacyReviewResidueMatches: input.p48LegacyReviewResidueMatches,
      p48ActiveApprovalReceiptExists: input.p48ActiveApprovalReceiptExists,
      p48ActiveHashLockExists: input.p48ActiveHashLockExists,
      commandTargetsFr: input.commandTargetsFr,
      commandRunPathMatchesCurrentRun: input.commandRunPathMatchesCurrentRun,
      currentP47ToP48HandoffWouldOpenSafeContinuation,
      simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation,
      p48SafeContinuationCommandWouldExecuteByThisScript: input.commandWouldExecuteByThisScript,
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

function makeP62CommandReady(input: EvaluationInput): void {
  input.p62State = 'p47_rollback_guard_command_preflight_ready_for_guard_command';
  input.p62CommandAllowedNow = true;
  input.p47Status = 'PASS';
  input.p47GuardState = 'post_apply_rollback_guard_contract_ready';
  input.p47ReadyForPostApplyRollbackGuard = true;
  input.p47Blockers = 0;
  input.p47ProductionServerManifestPublishGateReady = true;
  input.p47ProductionServerManifestPublishGateEntries = 12;
  input.p47FrenchServerPackUploadEvidenceReady = true;
  input.p47FrenchServerPackUploadEvidenceObjects = 36;
  input.p47FrenchServerPackUploadExecutionGateReady = true;
  input.p47FrenchServerPackUploadExecutionGateDryRun = true;
  input.p47FrenchServerPackUploadExecutionStarted = false;
  input.p47FrenchServerObjectRemoteVerifyReady = true;
  input.p47FrenchServerObjectRemoteVerifyFound = 36;
  input.p47FrenchServerObjectRemoteVerifyHashChecked = 36;
}

function makeProbeDependenciesReady(input: EvaluationInput): void {
  input.p62Status = 'PASS';
  input.p62Ready = true;
  input.p62State = 'p47_rollback_guard_command_preflight_ready_waiting_for_p46_apply_transaction_contract';
  input.p62FreshAfterP47 = true;
  input.p62P61Ready = true;
  input.p62CommandAllowedNow = false;
  input.p62CommandAllowedAfterP46Contract = true;
  input.p62CommandExecutedByThisScript = false;
  input.p62ReadyForApply = false;
  input.p62MayModifyProductionAppFiles = false;
  input.p62ActivationApproved = false;
  input.p62ServerUploadAllowed = false;
  input.p62FirebaseUploadAllowed = false;
  input.p62DownloadablePacksPublished = false;
  input.p62RuntimeDownloadsEnabled = false;
  input.p62StorageMigrationAllowed = false;
  input.p62CloudSyncMigrationAllowed = false;
  input.p62FixtureProbes = Math.max(input.p62FixtureProbes, 1);
  input.p62FixtureProbesPassed = input.p62FixtureProbes;
  input.p47Status = 'PASS';
  input.p47GuardState = 'post_apply_rollback_guard_contract_ready';
  input.p47ReadyForPostApplyRollbackGuard = true;
  input.p47RuntimeCacheContracts = 12;
  input.p47RuntimeCacheRollbackContracts = 12;
  input.p47ServerManifestEntries = 12;
  input.p47ProductionServerManifestPublishGateReady = true;
  input.p47ProductionServerManifestPublishGateEntries = 12;
  input.p47FrenchServerPackUploadEvidenceReady = true;
  input.p47FrenchServerPackUploadEvidenceObjects = 36;
  input.p47FrenchServerPackUploadExecutionGateReady = true;
  input.p47FrenchServerPackUploadExecutionGateDryRun = true;
  input.p47FrenchServerPackUploadExecutionStarted = false;
  input.p47FrenchServerObjectRemoteVerifyReady = true;
  input.p47FrenchServerObjectRemoteVerifyFound = 36;
  input.p47FrenchServerObjectRemoteVerifyHashChecked = 36;
  input.p47LanguagePromptContracts = Math.max(input.p47LanguagePromptContracts, input.p47LanguagePromptEntrypointsExpected, 1);
  input.p47LanguagePromptEntrypointsExpected = input.p47LanguagePromptContracts;
  input.p47StorageTargetKeyDomains = Math.max(input.p47StorageTargetKeyDomains, 14);
  input.p47StorageFrenchSyncFactoryRefs = Math.max(input.p47StorageFrenchSyncFactoryRefs, 1);
  input.p47ReadinessGenerationBlockers = 0;
  input.p47ReadinessApplyBlockers = Math.max(input.p47ReadinessApplyBlockers, 1);
  input.p47PostApplyGuardSteps = Math.max(input.p47PostApplyGuardSteps, 4);
  input.p47RollbackGuardSteps = Math.max(input.p47RollbackGuardSteps, 3);
  input.p47ProbePassed = true;
  input.p47Blockers = 0;
  input.p47ReadyForApply = false;
  input.p47MayModifyProductionAppFiles = false;
  input.p47ActivationApproved = false;
  input.p47ProductionWritesAllowed = false;
  input.p47ServerUploadAllowed = false;
  input.p47FirebaseUploadAllowed = false;
  input.p47DownloadablePacksPublished = false;
  input.p47RuntimeDownloadsEnabled = false;
  input.p47StorageMigrationAllowed = false;
  input.p47CloudSyncMigrationAllowed = false;
  input.p48Status = 'PASS';
  input.p48ContinuationState = 'approval_wait_safe_continuation_ready';
  input.p48FreshAfterP47 = true;
  input.p48ReadyForNextSafePass = true;
  input.p48SafeContinuationWorkItems = Math.max(input.p48SafeContinuationWorkItems, 6);
  input.p48RemainingProductionLockedItems = Math.max(input.p48RemainingProductionLockedItems, 4);
  input.p48OfficialSourceRows = 1600;
  input.p48OfficialSourceAi = 164;
  input.p48OfficialSourceRowsWithRefs = 1600;
  input.p48OfficialSourceRowsWithGates = 1600;
  input.p48ReadinessGenerationBlockers = 0;
  input.p48ReadinessApplyBlockers = Math.max(input.p48ReadinessApplyBlockers, 1);
  input.p48LegacyReviewResidueMatches = 0;
  input.p48ActiveApprovalReceiptExists = false;
  input.p48ActiveHashLockExists = false;
  input.p48ReadyForApply = false;
  input.p48MayModifyProductionAppFiles = false;
  input.p48ActivationApproved = false;
  input.p48ProductionWritesAllowed = false;
  input.p48ServerUploadAllowed = false;
  input.p48FirebaseUploadAllowed = false;
  input.p48DownloadablePacksPublished = false;
  input.p48RuntimeDownloadsEnabled = false;
  input.p48StorageMigrationAllowed = false;
  input.p48CloudSyncMigrationAllowed = false;
  input.p48FixtureProbes = Math.max(input.p48FixtureProbes, 1);
  input.p48FixtureProbesPassed = input.p48FixtureProbes;
  input.masterBlockers = 0;
  input.masterReadyForApply = false;
  input.masterMayModifyProductionAppFiles = false;
  input.commandTargetsFr = true;
  input.commandRunPathMatchesCurrentRun = true;
  input.commandWouldExecuteByThisScript = false;
}

function runProbes(base: EvaluationInput): Probe[] {
  const probeBase = clone(base);
  makeProbeDependenciesReady(probeBase);
  const tests: { id: string; expectedState: HandoffState; mutate: (input: EvaluationInput) => void }[] = [
    { id: 'canonical_opens_only_p48_safe_continuation', expectedState: 'p47_to_p48_safe_continuation_handoff_ready_for_p48_safe_continuation_refresh', mutate: () => undefined },
    { id: 'simulated_p62_command_ready_still_opens_only_p48_safe_continuation', expectedState: 'p47_to_p48_safe_continuation_handoff_ready_for_p48_safe_continuation_refresh', mutate: makeP62CommandReady },
    { id: 'stale_p62_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p62FreshAfterP47 = false; } },
    { id: 'p62_command_after_p46_not_allowed_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p62CommandAllowedAfterP46Contract = false; } },
    { id: 'p62_command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p62CommandExecutedByThisScript = true; } },
    { id: 'p62_ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p62ReadyForApply = true; } },
    { id: 'p48_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48Status = 'BLOCK'; input.p48ContinuationState = 'blocked_by_findings'; } },
    { id: 'p48_next_safe_pass_closed_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ReadyForNextSafePass = false; } },
    { id: 'p48_active_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ActiveApprovalReceiptExists = true; } },
    { id: 'p48_active_hash_lock_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ActiveHashLockExists = true; } },
    { id: 'p48_official_source_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48OfficialSourceRowsWithRefs = 1599; } },
    { id: 'p48_legacy_residue_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48LegacyReviewResidueMatches = 1; } },
    { id: 'p48_generation_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ReadinessGenerationBlockers = 1; } },
    { id: 'p48_ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ReadyForApply = true; } },
    { id: 'p48_server_upload_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ServerUploadAllowed = true; } },
    { id: 'p48_runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48RuntimeDownloadsEnabled = true; } },
    { id: 'p48_storage_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48StorageMigrationAllowed = true; } },
    { id: 'p48_cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48CloudSyncMigrationAllowed = true; } },
    { id: 'p47_runtime_cache_contract_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RuntimeCacheContracts = 11; } },
    { id: 'p47_rollback_contract_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RuntimeCacheRollbackContracts = 11; } },
    { id: 'p47_remote_verify_hash_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47FrenchServerObjectRemoteVerifyHashChecked = 35; } },
    { id: 'p47_upload_execution_started_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47FrenchServerPackUploadExecutionStarted = true; } },
    { id: 'p47_prompt_contract_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47LanguagePromptContracts = 1; } },
    { id: 'p47_probe_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47ProbePassed = false; } },
    { id: 'master_blockers_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.masterBlockers = 1; } },
    { id: 'safe_continuation_command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandWouldExecuteByThisScript = true; } },
  ];
  return tests.map((test) => {
    const input = clone(probeBase);
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
    '# GUSTAV Exact Approval P47 To P48 Safe Continuation Handoff Simulation V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Handoff state: \`${report.summary.handoffState}\``,
    `- P62 ready/state/command now/after-P46/executed: ${report.summary.p62Ready ? 'yes' : 'no'}/${report.summary.p62State}/${report.summary.p62CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p62CommandAllowedAfterP46Contract ? 'yes' : 'no'}/${report.summary.p62CommandExecutedByThisScript ? 'yes' : 'no'}`,
    `- P47 status/state/guard: ${report.summary.p47Status}/${report.summary.p47GuardState}/${report.summary.p47ReadyForPostApplyRollbackGuard ? 'yes' : 'no'}`,
    `- P47 runtime/server/prompts/storage: ${report.summary.p47RuntimeCacheContracts}/${report.summary.p47RuntimeCacheRollbackContracts}/${report.summary.p47ServerManifestEntries}/${report.summary.p47LanguagePromptContracts}/${report.summary.p47StorageTargetKeyDomains}`,
    `- P47 server publish/upload/remote: ${report.summary.p47ProductionServerManifestPublishGateReady ? 'yes' : 'no'}/${report.summary.p47FrenchServerPackUploadEvidenceReady ? 'yes' : 'no'}/${report.summary.p47FrenchServerPackUploadExecutionGateReady ? 'yes' : 'no'}/${report.summary.p47FrenchServerObjectRemoteVerifyReady ? 'yes' : 'no'}`,
    `- P47 remote found/hash checked: ${report.summary.p47FrenchServerObjectRemoteVerifyFound}/${report.summary.p47FrenchServerObjectRemoteVerifyHashChecked}`,
    `- P48 status/state/next-safe: ${report.summary.p48Status}/${report.summary.p48ContinuationState}/${report.summary.p48ReadyForNextSafePass ? 'yes' : 'no'}`,
    `- P48 official-source rows/AI/refs/gates: ${report.summary.p48OfficialSourceRows}/${report.summary.p48OfficialSourceAi}/${report.summary.p48OfficialSourceRowsWithRefs}/${report.summary.p48OfficialSourceRowsWithGates}`,
    `- P48 active receipt/hash/residue: ${report.summary.p48ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p48ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.p48LegacyReviewResidueMatches}`,
    `- Current/simulated safe continuation handoff: ${report.summary.currentP47ToP48HandoffWouldOpenSafeContinuation ? 'yes' : 'no'}/${report.summary.simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation ? 'yes' : 'no'}`,
    `- P48 command target/run/executed: ${report.summary.commandTargetsFr ? 'fr' : 'wrong'}/${report.summary.commandRunPathMatchesCurrentRun ? 'current' : 'wrong'}/${report.summary.p48SafeContinuationCommandWouldExecuteByThisScript ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Handoff Simulation',
    '',
    `- P48 safe continuation command: \`${report.handoffSimulation.p48SafeContinuationCommand}\``,
    '- Command executed by this script: no',
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
  lines.push('- This packet is dry-run handoff simulation only.');
  lines.push('- It does not execute P48, create active approval artifacts, write production app files, upload packs, enable runtime downloads, run storage/cloud migrations or approve production apply.');
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
  const p62Path = path.join(auditsDir, 'exact_approval_p47_rollback_guard_command_preflight_v2_packet.json');
  const p47Path = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.json');
  const p48Path = path.join(auditsDir, 'approval_wait_safe_continuation_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_packet.md');

  const p62 = readJsonOrEmpty(p62Path);
  const p47 = readJsonOrEmpty(p47Path);
  const p48 = readJsonOrEmpty(p48Path);
  const master = readJsonOrEmpty(masterPath);
  const p62Summary = summaryOf(p62);
  const p47Summary = summaryOf(p47);
  const p48Summary = summaryOf(p48);
  const masterSummary = summaryOf(master);
  const runRel = rel(repoRoot, runDir).split('/').join('\\');
  const p48SafeContinuationCommand = `npx tsx scripts\\gustav_approval_wait_safe_continuation_v2_packet.ts --run ${runRel} --target fr`;

  const p62Ready =
    fs.existsSync(p62Path) &&
    s(p62, 'status') === 'PASS' &&
    n(p62Summary, 'blockers') === 0 &&
    s(p62Summary, 'targetLocale') === 'fr' &&
    (s(p62Summary, 'preflightState') === 'p47_rollback_guard_command_preflight_ready_waiting_for_p46_apply_transaction_contract' ||
      s(p62Summary, 'preflightState') === 'p47_rollback_guard_command_preflight_ready_for_guard_command') &&
    b(p62Summary, 'p61Ready') &&
    b(p62Summary, 'p47RollbackGuardCommandAllowedAfterP46Contract') &&
    !b(p62Summary, 'p47RollbackGuardCommandWouldExecuteByThisScript') &&
    !b(p62Summary, 'readyForApply') &&
    !b(p62Summary, 'mayModifyProductionAppFiles') &&
    !b(p62Summary, 'activationApproved') &&
    !b(p62Summary, 'serverUploadAllowed') &&
    !b(p62Summary, 'firebaseUploadAllowed') &&
    !b(p62Summary, 'downloadablePacksPublished') &&
    !b(p62Summary, 'runtimeDownloadsEnabled') &&
    !b(p62Summary, 'storageMigrationAllowed') &&
    !b(p62Summary, 'cloudSyncMigrationAllowed') &&
    n(p62Summary, 'fixtureProbes') > 0 &&
    n(p62Summary, 'fixtureProbesPassed') === n(p62Summary, 'fixtureProbes');

  const input: EvaluationInput = {
    currentRunId: runId,
    p62Status: s(p62, 'status'),
    p62Ready,
    p62State: s(p62Summary, 'preflightState'),
    p62FreshAfterP47: fileMtimeMs(p62Path) >= fileMtimeMs(p47Path) && fileMtimeMs(p47Path) > 0,
    p62P61Ready: b(p62Summary, 'p61Ready'),
    p62CommandAllowedNow: b(p62Summary, 'p47RollbackGuardCommandAllowedNow'),
    p62CommandAllowedAfterP46Contract: b(p62Summary, 'p47RollbackGuardCommandAllowedAfterP46Contract'),
    p62CommandExecutedByThisScript: b(p62Summary, 'p47RollbackGuardCommandWouldExecuteByThisScript'),
    p62ReadyForApply: b(p62Summary, 'readyForApply'),
    p62MayModifyProductionAppFiles: b(p62Summary, 'mayModifyProductionAppFiles'),
    p62ActivationApproved: b(p62Summary, 'activationApproved'),
    p62ServerUploadAllowed: b(p62Summary, 'serverUploadAllowed'),
    p62FirebaseUploadAllowed: b(p62Summary, 'firebaseUploadAllowed'),
    p62DownloadablePacksPublished: b(p62Summary, 'downloadablePacksPublished'),
    p62RuntimeDownloadsEnabled: b(p62Summary, 'runtimeDownloadsEnabled'),
    p62StorageMigrationAllowed: b(p62Summary, 'storageMigrationAllowed'),
    p62CloudSyncMigrationAllowed: b(p62Summary, 'cloudSyncMigrationAllowed'),
    p62FixtureProbesPassed: n(p62Summary, 'fixtureProbesPassed'),
    p62FixtureProbes: n(p62Summary, 'fixtureProbes'),
    p47Status: s(p47, 'status'),
    p47GuardState: s(p47Summary, 'guardState'),
    p47ReadyForPostApplyRollbackGuard: b(p47Summary, 'readyForPostApplyRollbackGuard'),
    p47RuntimeCacheContracts: n(p47Summary, 'runtimeCacheContracts'),
    p47RuntimeCacheRollbackContracts: n(p47Summary, 'runtimeCacheRollbackContracts'),
    p47ServerManifestEntries: n(p47Summary, 'serverManifestEntries'),
    p47ProductionServerManifestPublishGateReady: b(p47Summary, 'productionServerManifestPublishGateReady'),
    p47ProductionServerManifestPublishGateEntries: n(p47Summary, 'productionServerManifestPublishGateEntries'),
    p47FrenchServerPackUploadEvidenceReady: b(p47Summary, 'frenchServerPackUploadEvidenceReady'),
    p47FrenchServerPackUploadEvidenceObjects: n(p47Summary, 'frenchServerPackUploadEvidenceObjects'),
    p47FrenchServerPackUploadExecutionGateReady: b(p47Summary, 'frenchServerPackUploadExecutionGateReady'),
    p47FrenchServerPackUploadExecutionGateDryRun: b(p47Summary, 'frenchServerPackUploadExecutionGateDryRun'),
    p47FrenchServerPackUploadExecutionStarted: b(p47Summary, 'frenchServerPackUploadExecutionStarted'),
    p47FrenchServerObjectRemoteVerifyReady: b(p47Summary, 'frenchServerObjectRemoteVerifyReady'),
    p47FrenchServerObjectRemoteVerifyFound: n(p47Summary, 'frenchServerObjectRemoteVerifyFound'),
    p47FrenchServerObjectRemoteVerifyHashChecked: n(p47Summary, 'frenchServerObjectRemoteVerifyHashChecked'),
    p47LanguagePromptContracts: n(p47Summary, 'languagePromptContracts'),
    p47LanguagePromptEntrypointsExpected: n(p47Summary, 'languagePromptEntrypointsExpected'),
    p47StorageTargetKeyDomains: n(p47Summary, 'storageTargetKeyDomains'),
    p47StorageFrenchSyncFactoryRefs: n(p47Summary, 'storageFrenchSyncFactoryRefs'),
    p47ReadinessApplyBlockers: n(p47Summary, 'readinessApplyBlockers'),
    p47ReadinessGenerationBlockers: n(p47Summary, 'readinessGenerationBlockers'),
    p47PostApplyGuardSteps: n(p47Summary, 'postApplyGuardSteps'),
    p47RollbackGuardSteps: n(p47Summary, 'rollbackGuardSteps'),
    p47ProbePassed: probePassed(p47, 'p46_ready_guard_ready'),
    p47Blockers: n(p47Summary, 'blockers'),
    p47ReadyForApply: b(p47Summary, 'readyForApply'),
    p47MayModifyProductionAppFiles: b(p47Summary, 'mayModifyProductionAppFiles'),
    p47ActivationApproved: b(p47Summary, 'activationApproved'),
    p47ProductionWritesAllowed: b(p47Summary, 'productionWritesAllowed'),
    p47ServerUploadAllowed: b(p47Summary, 'serverUploadAllowed'),
    p47FirebaseUploadAllowed: b(p47Summary, 'firebaseUploadAllowed'),
    p47DownloadablePacksPublished: b(p47Summary, 'downloadablePacksPublished'),
    p47RuntimeDownloadsEnabled: b(p47Summary, 'runtimeDownloadsEnabled'),
    p47StorageMigrationAllowed: b(p47Summary, 'storageMigrationAllowed'),
    p47CloudSyncMigrationAllowed: b(p47Summary, 'cloudSyncMigrationAllowed'),
    p48Status: s(p48, 'status'),
    p48ContinuationState: s(p48Summary, 'continuationState'),
    p48FreshAfterP47: fileMtimeMs(p48Path) >= fileMtimeMs(p47Path) && fileMtimeMs(p47Path) > 0,
    p48ReadyForNextSafePass: b(p48Summary, 'readyForNextSafePass'),
    p48SafeContinuationWorkItems: n(p48Summary, 'safeContinuationWorkItems'),
    p48RemainingProductionLockedItems: n(p48Summary, 'remainingProductionLockedItems'),
    p48OfficialSourceRows: n(p48Summary, 'officialSourceRows'),
    p48OfficialSourceAi: n(p48Summary, 'officialSourceAi'),
    p48OfficialSourceRowsWithRefs: n(p48Summary, 'officialSourceRowsWithRefs'),
    p48OfficialSourceRowsWithGates: n(p48Summary, 'officialSourceRowsWithGates'),
    p48ReadinessApplyBlockers: n(p48Summary, 'readinessApplyBlockers'),
    p48ReadinessGenerationBlockers: n(p48Summary, 'readinessGenerationBlockers'),
    p48LegacyReviewResidueMatches: n(p48Summary, 'legacyReviewResidueMatches'),
    p48ActiveApprovalReceiptExists: b(p48Summary, 'activeApprovalReceiptExists'),
    p48ActiveHashLockExists: b(p48Summary, 'activeHashLockExists'),
    p48ReadyForApply: b(p48Summary, 'readyForApply'),
    p48MayModifyProductionAppFiles: b(p48Summary, 'mayModifyProductionAppFiles'),
    p48ActivationApproved: b(p48Summary, 'activationApproved'),
    p48ProductionWritesAllowed: b(p48Summary, 'productionWritesAllowed'),
    p48ServerUploadAllowed: b(p48Summary, 'serverUploadAllowed'),
    p48FirebaseUploadAllowed: b(p48Summary, 'firebaseUploadAllowed'),
    p48DownloadablePacksPublished: b(p48Summary, 'downloadablePacksPublished'),
    p48RuntimeDownloadsEnabled: b(p48Summary, 'runtimeDownloadsEnabled'),
    p48StorageMigrationAllowed: b(p48Summary, 'storageMigrationAllowed'),
    p48CloudSyncMigrationAllowed: b(p48Summary, 'cloudSyncMigrationAllowed'),
    p48FixtureProbesPassed: n(p48Summary, 'fixtureProbesPassed'),
    p48FixtureProbes: n(p48Summary, 'fixtureProbes'),
    masterBlockers: masterActionableBlockerCount(master),
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    commandTargetsFr: p48SafeContinuationCommand.endsWith('--target fr'),
    commandRunPathMatchesCurrentRun: p48SafeContinuationCommand.includes(`--run ${runRel}`),
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
    'Keep the exact P48 safe continuation command unexecuted until a separate command preflight proves it can refresh safe planning only.',
    'After P63, create the P64 command preflight for the P48 no-write safe continuation refresh command.',
    'Regenerate P63 if P62, P47, P48, master blocker state, run id, target locale or any closed production flag changes.',
    'Keep active approval receipt/hash-lock creation, production apply, uploads, runtime downloads and storage/cloud migrations closed.',
  ];

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-p47-to-p48-safe-continuation-handoff-simulation-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      exactApprovalP47RollbackGuardCommandPreflightV2Packet: rel(repoRoot, p62Path),
      postApplyRollbackGuardContractV2Packet: rel(repoRoot, p47Path),
      approvalWaitSafeContinuationV2Packet: rel(repoRoot, p48Path),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
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
      p48SafeContinuationCommand,
      p48SafeContinuationCommandExecutedByThisScript: false,
      requiresP62Ready: true,
      requiresP47NoWriteRollbackGuardContract: true,
      requiresP48SafeContinuationReady: true,
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
      p48SafeContinuationCommandExecutedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(dryRunPath, {
    schemaVersion: 'gustav-exact-approval-p47-to-p48-safe-continuation-handoff-simulation-dry-run-v2',
    runId,
    generatedAt: report.generatedAt,
    dryRunOnly: true,
    handoffState: report.summary.handoffState,
    currentP47ToP48HandoffWouldOpenSafeContinuation: report.summary.currentP47ToP48HandoffWouldOpenSafeContinuation,
    simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation: report.summary.simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation,
    p48SafeContinuationCommand,
    p48SafeContinuationCommandExecutedByThisScript: false,
    readyForApply: false,
    activationApproved: false,
  });
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval P47 to P48 safe continuation handoff simulation V2 packet: ${status}`);
  console.log(`Handoff state: ${report.summary.handoffState}`);
  console.log(`P62 ready/state: ${report.summary.p62Ready ? 'yes' : 'no'}/${report.summary.p62State}`);
  console.log(`P47 status/state: ${report.summary.p47Status}/${report.summary.p47GuardState}`);
  console.log(`P48 status/state: ${report.summary.p48Status}/${report.summary.p48ContinuationState}`);
  console.log(`Current P47 to P48 handoff would open safe continuation: ${report.summary.currentP47ToP48HandoffWouldOpenSafeContinuation ? 'yes' : 'no'}`);
  console.log(`Simulated P62 command-ready handoff would open only P48 safe continuation: ${report.summary.simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation ? 'yes' : 'no'}`);
  console.log(`P48 safe continuation command executed by this script: ${report.summary.p48SafeContinuationCommandWouldExecuteByThisScript ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
