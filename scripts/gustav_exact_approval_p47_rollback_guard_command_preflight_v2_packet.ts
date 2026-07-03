import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type PreflightState =
  | 'p47_rollback_guard_command_preflight_ready_waiting_for_p46_apply_transaction_contract'
  | 'p47_rollback_guard_command_preflight_ready_for_guard_command'
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
  currentRunId: string;
  p61Status: string;
  p61Ready: boolean;
  p61State: string;
  p61FreshAfterP46: boolean;
  p61FreshAfterP47: boolean;
  p61P60Ready: boolean;
  p61CurrentHandoffWouldOpenRollbackGuard: boolean;
  p61SimulatedPostP46P47WouldOpenRollbackGuard: boolean;
  p61CommandExecutedByThisScript: boolean;
  p61ReadyForApply: boolean;
  p61MayModifyProductionAppFiles: boolean;
  p61ActivationApproved: boolean;
  p61ServerUploadAllowed: boolean;
  p61FirebaseUploadAllowed: boolean;
  p61DownloadablePacksPublished: boolean;
  p61RuntimeDownloadsEnabled: boolean;
  p61StorageMigrationAllowed: boolean;
  p61CloudSyncMigrationAllowed: boolean;
  p61FixtureProbesPassed: number;
  p61FixtureProbes: number;
  p46Status: string;
  p46TransactionState: string;
  p46TargetLocale: string;
  p46ReadyForProductionApplyTransaction: boolean;
  p46ReadyForApply: boolean;
  p46MayModifyProductionAppFiles: boolean;
  p46ActivationApproved: boolean;
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
  preflightState: PreflightState;
  p61Ready: boolean;
  p61State: string;
  p61P60Ready: boolean;
  p61CurrentHandoffWouldOpenRollbackGuard: boolean;
  p61SimulatedPostP46P47WouldOpenRollbackGuard: boolean;
  p61CommandExecutedByThisScript: boolean;
  p46Status: string;
  p46TransactionState: string;
  p46TargetLocale: string;
  p46ReadyForProductionApplyTransaction: boolean;
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
  commandTargetsFr: boolean;
  commandRunPathMatchesCurrentRun: boolean;
  p47RollbackGuardCommandAllowedNow: boolean;
  p47RollbackGuardCommandAllowedAfterP46Contract: boolean;
  p47RollbackGuardCommandWouldExecuteByThisScript: boolean;
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
  schemaVersion: 'gustav-exact-approval-p47-rollback-guard-command-preflight-v2-packet-v0';
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
  commandPreflight: {
    dryRunOnly: true;
    p47RollbackGuardCommand: string;
    p47RollbackGuardCommandExecutedByThisScript: false;
    requiresP61Ready: true;
    requiresP46ProductionApplyTransactionContractReady: true;
    requiresP47NoWriteRollbackGuardContract: true;
    requiresP47Probe: 'p46_ready_guard_ready';
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
    p47RollbackGuardCommandExecutedByThisScript: false;
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

function p61Accepted(input: EvaluationInput): boolean {
  return (
    input.p61Status === 'PASS' &&
    input.p61Ready &&
    input.p61FreshAfterP46 &&
    input.p61FreshAfterP47 &&
    (input.p61State === 'p46_to_p47_handoff_simulation_ready_waiting_for_p46_apply_transaction_contract' ||
      input.p61State === 'p46_to_p47_handoff_simulation_ready_for_p47_rollback_guard_contract') &&
    input.p61P60Ready &&
    !input.p61CurrentHandoffWouldOpenRollbackGuard &&
    input.p61SimulatedPostP46P47WouldOpenRollbackGuard &&
    !input.p61CommandExecutedByThisScript &&
    !input.p61ReadyForApply &&
    !input.p61MayModifyProductionAppFiles &&
    !input.p61ActivationApproved &&
    !input.p61ServerUploadAllowed &&
    !input.p61FirebaseUploadAllowed &&
    !input.p61DownloadablePacksPublished &&
    !input.p61RuntimeDownloadsEnabled &&
    !input.p61StorageMigrationAllowed &&
    !input.p61CloudSyncMigrationAllowed &&
    input.p61FixtureProbes > 0 &&
    input.p61FixtureProbesPassed === input.p61FixtureProbes
  );
}

function p46Waiting(input: EvaluationInput): boolean {
  return (
    input.p46Status === 'HOLD' &&
    input.p46TransactionState === 'waiting_for_activation_sequence_preflight' &&
    !input.p46ReadyForProductionApplyTransaction
  );
}

function p46Ready(input: EvaluationInput): boolean {
  return (
    input.p46Status === 'PASS' &&
    input.p46TransactionState === 'production_apply_transaction_contract_ready' &&
    input.p46ReadyForProductionApplyTransaction
  );
}

function p47Waiting(input: EvaluationInput): boolean {
  return (
    input.p47Status === 'HOLD' &&
    input.p47GuardState === 'waiting_for_apply_transaction_contract' &&
    !input.p47ReadyForPostApplyRollbackGuard
  );
}

function p47Ready(input: EvaluationInput): boolean {
  return (
    input.p47Status === 'PASS' &&
    input.p47GuardState === 'post_apply_rollback_guard_contract_ready' &&
    input.p47ReadyForPostApplyRollbackGuard
  );
}

function p47Accepted(input: EvaluationInput): boolean {
  return p47Waiting(input) || p47Ready(input);
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

function forbiddenProductionFlagsOpen(input: EvaluationInput): boolean {
  return (
    input.p46ReadyForApply ||
    input.p46MayModifyProductionAppFiles ||
    input.p46ActivationApproved ||
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
    input.masterReadyForApply ||
    input.masterMayModifyProductionAppFiles
  );
}

function commandCanRun(input: EvaluationInput): boolean {
  return (
    p61Accepted(input) &&
    p46Ready(input) &&
    p47Accepted(input) &&
    p47GuardIntegrityReady(input) &&
    input.commandTargetsFr &&
    input.commandRunPathMatchesCurrentRun &&
    !input.commandWouldExecuteByThisScript &&
    input.masterBlockers === 0 &&
    !forbiddenProductionFlagsOpen(input)
  );
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const commandAllowedNow = commandCanRun(input);
  const postP46 = clone(input);
  makeP46Ready(postP46);
  const commandAllowedAfterP46Contract = commandCanRun(postP46);

  if (!p61Accepted(input)) {
    addFinding(findings, 'blocker', 'P61_NOT_READY', 'P62 requires fresh P61 PASS with simulated post-P46 P47 rollback guard proof and no command execution.');
  }
  if (!input.commandTargetsFr) {
    addFinding(findings, 'blocker', 'COMMAND_TARGET_NOT_FR', 'P47 rollback guard command must target fr.');
  }
  if (!input.commandRunPathMatchesCurrentRun) {
    addFinding(findings, 'blocker', 'COMMAND_RUN_NOT_CURRENT', 'P47 rollback guard command must use the current Gustav run path.');
  }
  if (input.p46TargetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'P46_TARGET_LOCALE_MISMATCH', 'P46 source packet must stay scoped to targetLocale=fr.');
  }
  if (!p46Waiting(input) && !p46Ready(input)) {
    addFinding(findings, 'blocker', 'P46_NOT_IN_ACCEPTED_PREFLIGHT_STATE', 'P46 must be waiting for activation sequence preflight or be apply-transaction-contract ready.');
  }
  if (!p47Accepted(input)) {
    addFinding(findings, 'blocker', 'P47_NOT_IN_ACCEPTED_PREFLIGHT_STATE', 'P47 must be waiting for apply transaction contract or already rollback-guard ready.');
  }
  if (!input.p47ProbePassed) {
    addFinding(findings, 'blocker', 'P47_P46_READY_PROBE_MISSING', 'P47 must prove p46_ready_guard_ready advances to post_apply_rollback_guard_contract_ready.');
  }
  if (!p47GuardIntegrityReady(input)) {
    addFinding(findings, 'blocker', 'P47_ROLLBACK_GUARD_INTEGRITY_NOT_READY', 'P47 must prove runtime cache rollback, server manifest, upload evidence, remote object verification, prompt isolation, storage/admin and readiness guard coverage.');
  }
  if (!input.p61SimulatedPostP46P47WouldOpenRollbackGuard) {
    addFinding(findings, 'blocker', 'P61_POST_P46_SIMULATION_NOT_OPEN', 'P61 must prove that a simulated transaction-ready P46 opens only the P47 no-write guard path.');
  }
  if (!commandAllowedAfterP46Contract) {
    addFinding(findings, 'blocker', 'POST_P46_COMMAND_PREFLIGHT_NOT_ALLOWED', 'A simulated P46 transaction-ready state must allow the exact P47 no-write guard command preflight.');
  }
  if (p46Ready(input) && !commandAllowedNow) {
    addFinding(findings, 'blocker', 'P46_READY_BUT_COMMAND_NOT_ALLOWED', 'If P46 is already transaction-ready, this preflight must allow the exact P47 guard command.');
  }
  if (forbiddenProductionFlagsOpen(input)) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P62 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }
  if (input.masterBlockers > 0) {
    addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', `Master manifest has ${input.masterBlockers} blocker(s).`);
  }
  if (input.commandWouldExecuteByThisScript) {
    addFinding(findings, 'blocker', 'PREFLIGHT_EXECUTED_COMMAND', 'P62 is a command preflight and must not execute P47 rollback guard generation.');
  }
  if (p46Waiting(input)) {
    addFinding(findings, 'info', 'WAITING_FOR_P46_TRANSACTION_CONTRACT', 'Current P47 guard command remains closed until P46 apply transaction contract is ready.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const preflightState: PreflightState =
    blockers > 0
      ? 'blocked_by_findings'
      : commandAllowedNow
        ? 'p47_rollback_guard_command_preflight_ready_for_guard_command'
        : 'p47_rollback_guard_command_preflight_ready_waiting_for_p46_apply_transaction_contract';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      preflightState,
      p61Ready: input.p61Ready,
      p61State: input.p61State,
      p61P60Ready: input.p61P60Ready,
      p61CurrentHandoffWouldOpenRollbackGuard: input.p61CurrentHandoffWouldOpenRollbackGuard,
      p61SimulatedPostP46P47WouldOpenRollbackGuard: input.p61SimulatedPostP46P47WouldOpenRollbackGuard,
      p61CommandExecutedByThisScript: input.p61CommandExecutedByThisScript,
      p46Status: input.p46Status,
      p46TransactionState: input.p46TransactionState,
      p46TargetLocale: input.p46TargetLocale,
      p46ReadyForProductionApplyTransaction: input.p46ReadyForProductionApplyTransaction,
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
      commandTargetsFr: input.commandTargetsFr,
      commandRunPathMatchesCurrentRun: input.commandRunPathMatchesCurrentRun,
      p47RollbackGuardCommandAllowedNow: commandAllowedNow,
      p47RollbackGuardCommandAllowedAfterP46Contract: commandAllowedAfterP46Contract,
      p47RollbackGuardCommandWouldExecuteByThisScript: input.commandWouldExecuteByThisScript,
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
  input.p61Status = 'PASS';
  input.p61Ready = true;
  input.p61State = 'p46_to_p47_handoff_simulation_ready_waiting_for_p46_apply_transaction_contract';
  input.p61FreshAfterP46 = true;
  input.p61FreshAfterP47 = true;
  input.p61P60Ready = true;
  input.p61CurrentHandoffWouldOpenRollbackGuard = false;
  input.p61SimulatedPostP46P47WouldOpenRollbackGuard = true;
  input.p61CommandExecutedByThisScript = false;
  input.p61ReadyForApply = false;
  input.p61MayModifyProductionAppFiles = false;
  input.p61ActivationApproved = false;
  input.p61ServerUploadAllowed = false;
  input.p61FirebaseUploadAllowed = false;
  input.p61DownloadablePacksPublished = false;
  input.p61RuntimeDownloadsEnabled = false;
  input.p61StorageMigrationAllowed = false;
  input.p61CloudSyncMigrationAllowed = false;
  input.p61FixtureProbes = Math.max(input.p61FixtureProbes, 1);
  input.p61FixtureProbesPassed = input.p61FixtureProbes;
  input.p46Status = 'HOLD';
  input.p46TransactionState = 'waiting_for_activation_sequence_preflight';
  input.p46TargetLocale = 'fr';
  input.p46ReadyForProductionApplyTransaction = false;
  input.p46ReadyForApply = false;
  input.p46MayModifyProductionAppFiles = false;
  input.p46ActivationApproved = false;
  input.p47Status = 'HOLD';
  input.p47GuardState = 'waiting_for_apply_transaction_contract';
  input.p47ReadyForPostApplyRollbackGuard = false;
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
  const tests: { id: string; expectedState: PreflightState; mutate: (input: EvaluationInput) => void }[] = [
    { id: 'canonical_waits_for_p46_apply_transaction_contract', expectedState: 'p47_rollback_guard_command_preflight_ready_waiting_for_p46_apply_transaction_contract', mutate: () => undefined },
    { id: 'post_p46_fixture_allows_p47_guard_command', expectedState: 'p47_rollback_guard_command_preflight_ready_for_guard_command', mutate: makeP46Ready },
    { id: 'stale_p61_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p61FreshAfterP47 = false; } },
    { id: 'p61_simulation_not_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p61SimulatedPostP46P47WouldOpenRollbackGuard = false; } },
    { id: 'p61_current_handoff_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p61CurrentHandoffWouldOpenRollbackGuard = true; } },
    { id: 'p61_command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p61CommandExecutedByThisScript = true; } },
    { id: 'wrong_command_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandTargetsFr = false; } },
    { id: 'wrong_command_run_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandRunPathMatchesCurrentRun = false; } },
    { id: 'p46_wrong_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46TargetLocale = 'en'; } },
    { id: 'missing_p47_probe_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47ProbePassed = false; } },
    { id: 'runtime_cache_contract_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RuntimeCacheContracts = 11; } },
    { id: 'runtime_cache_rollback_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RuntimeCacheRollbackContracts = 11; } },
    { id: 'server_manifest_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47ServerManifestEntries = 11; } },
    { id: 'p47_remote_verify_hash_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47FrenchServerObjectRemoteVerifyHashChecked = 35; } },
    { id: 'p47_upload_execution_started_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47FrenchServerPackUploadExecutionStarted = true; } },
    { id: 'language_prompt_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47LanguagePromptContracts = 1; } },
    { id: 'post_apply_step_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47PostApplyGuardSteps = 1; } },
    { id: 'rollback_step_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RollbackGuardSteps = 1; } },
    { id: 'p47_ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47ReadyForApply = true; } },
    { id: 'master_blockers_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.masterBlockers = 1; } },
    { id: 'server_upload_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47ServerUploadAllowed = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RuntimeDownloadsEnabled = true; } },
    { id: 'storage_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47StorageMigrationAllowed = true; } },
    { id: 'cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47CloudSyncMigrationAllowed = true; } },
    { id: 'command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandWouldExecuteByThisScript = true; } },
  ];
  return tests.map((test) => {
    const input = clone(probeBase);
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

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Exact Approval P47 Rollback Guard Command Preflight V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Preflight state: \`${report.summary.preflightState}\``,
    `- P61 ready/state/current/sim/executed: ${report.summary.p61Ready ? 'yes' : 'no'}/${report.summary.p61State}/${report.summary.p61CurrentHandoffWouldOpenRollbackGuard ? 'yes' : 'no'}/${report.summary.p61SimulatedPostP46P47WouldOpenRollbackGuard ? 'yes' : 'no'}/${report.summary.p61CommandExecutedByThisScript ? 'yes' : 'no'}`,
    `- P46 status/state/transaction: ${report.summary.p46Status}/${report.summary.p46TransactionState}/${report.summary.p46ReadyForProductionApplyTransaction ? 'yes' : 'no'}`,
    `- P47 status/state/guard: ${report.summary.p47Status}/${report.summary.p47GuardState}/${report.summary.p47ReadyForPostApplyRollbackGuard ? 'yes' : 'no'}`,
    `- P47 runtime/server/prompts/storage: ${report.summary.p47RuntimeCacheContracts}/${report.summary.p47RuntimeCacheRollbackContracts}/${report.summary.p47ServerManifestEntries}/${report.summary.p47LanguagePromptContracts}/${report.summary.p47StorageTargetKeyDomains}`,
    `- P47 server publish/upload/remote: ${report.summary.p47ProductionServerManifestPublishGateReady ? 'yes' : 'no'}/${report.summary.p47FrenchServerPackUploadEvidenceReady ? 'yes' : 'no'}/${report.summary.p47FrenchServerPackUploadExecutionGateReady ? 'yes' : 'no'}/${report.summary.p47FrenchServerObjectRemoteVerifyReady ? 'yes' : 'no'}`,
    `- P47 remote found/hash checked: ${report.summary.p47FrenchServerObjectRemoteVerifyFound}/${report.summary.p47FrenchServerObjectRemoteVerifyHashChecked}`,
    `- P47 readiness/post/rollback/probe: ${report.summary.p47ReadinessApplyBlockers}/${report.summary.p47PostApplyGuardSteps}/${report.summary.p47RollbackGuardSteps}/${report.summary.p47ProbePassed ? 'yes' : 'no'}`,
    `- Command target/run/allowed now/after-P46/executed: ${report.summary.commandTargetsFr ? 'fr' : 'wrong'}/${report.summary.commandRunPathMatchesCurrentRun ? 'current' : 'wrong'}/${report.summary.p47RollbackGuardCommandAllowedNow ? 'yes' : 'no'}/${report.summary.p47RollbackGuardCommandAllowedAfterP46Contract ? 'yes' : 'no'}/${report.summary.p47RollbackGuardCommandWouldExecuteByThisScript ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Command Preflight',
    '',
    `- P47 rollback guard command: \`${report.commandPreflight.p47RollbackGuardCommand}\``,
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
  lines.push('- This packet is dry-run command preflight only.');
  lines.push('- It does not execute P47, create active approval artifacts, write production app files, upload packs, enable runtime downloads, run storage/cloud migrations or approve production apply.');
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
  const p61Path = path.join(auditsDir, 'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_packet.json');
  const p46Path = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.json');
  const p47Path = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_p47_rollback_guard_command_preflight_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_p47_rollback_guard_command_preflight_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_p47_rollback_guard_command_preflight_v2_packet.md');

  const p61 = readJsonOrEmpty(p61Path);
  const p46 = readJsonOrEmpty(p46Path);
  const p47 = readJsonOrEmpty(p47Path);
  const master = readJsonOrEmpty(masterPath);
  const p61Summary = summaryOf(p61);
  const p46Summary = summaryOf(p46);
  const p47Summary = summaryOf(p47);
  const masterSummary = summaryOf(master);
  const p61Handoff = object(p61.handoffSimulation);
  const runRel = rel(repoRoot, runDir).split('/').join('\\');
  const expectedP47RollbackGuardCommand = `npx tsx scripts\\gustav_post_apply_rollback_guard_contract_v2_packet.ts --run ${runRel} --target fr`;
  const p47RollbackGuardCommand = s(p61Handoff, 'p47RollbackGuardCommand') || expectedP47RollbackGuardCommand;

  const p61Ready =
    fs.existsSync(p61Path) &&
    s(p61, 'status') === 'PASS' &&
    n(p61Summary, 'blockers') === 0 &&
    s(p61Summary, 'targetLocale') === 'fr' &&
    (s(p61Summary, 'handoffState') === 'p46_to_p47_handoff_simulation_ready_waiting_for_p46_apply_transaction_contract' ||
      s(p61Summary, 'handoffState') === 'p46_to_p47_handoff_simulation_ready_for_p47_rollback_guard_contract') &&
    b(p61Summary, 'p60Ready') &&
    !b(p61Summary, 'currentP46ToP47HandoffWouldOpenRollbackGuard') &&
    b(p61Summary, 'simulatedPostP46P47WouldOpenRollbackGuard') &&
    !b(p61Summary, 'p47RollbackGuardCommandWouldExecuteByThisScript') &&
    !b(p61Summary, 'readyForApply') &&
    !b(p61Summary, 'mayModifyProductionAppFiles') &&
    !b(p61Summary, 'activationApproved') &&
    !b(p61Summary, 'serverUploadAllowed') &&
    !b(p61Summary, 'firebaseUploadAllowed') &&
    !b(p61Summary, 'downloadablePacksPublished') &&
    !b(p61Summary, 'runtimeDownloadsEnabled') &&
    !b(p61Summary, 'storageMigrationAllowed') &&
    !b(p61Summary, 'cloudSyncMigrationAllowed') &&
    n(p61Summary, 'fixtureProbes') > 0 &&
    n(p61Summary, 'fixtureProbesPassed') === n(p61Summary, 'fixtureProbes');

  const input: EvaluationInput = {
    currentRunId: runId,
    p61Status: s(p61, 'status'),
    p61Ready,
    p61State: s(p61Summary, 'handoffState'),
    p61FreshAfterP46: fileMtimeMs(p61Path) >= fileMtimeMs(p46Path) && fileMtimeMs(p46Path) > 0,
    p61FreshAfterP47: fileMtimeMs(p61Path) >= fileMtimeMs(p47Path) && fileMtimeMs(p47Path) > 0,
    p61P60Ready: b(p61Summary, 'p60Ready'),
    p61CurrentHandoffWouldOpenRollbackGuard: b(p61Summary, 'currentP46ToP47HandoffWouldOpenRollbackGuard'),
    p61SimulatedPostP46P47WouldOpenRollbackGuard: b(p61Summary, 'simulatedPostP46P47WouldOpenRollbackGuard'),
    p61CommandExecutedByThisScript: b(p61Summary, 'p47RollbackGuardCommandWouldExecuteByThisScript'),
    p61ReadyForApply: b(p61Summary, 'readyForApply'),
    p61MayModifyProductionAppFiles: b(p61Summary, 'mayModifyProductionAppFiles'),
    p61ActivationApproved: b(p61Summary, 'activationApproved'),
    p61ServerUploadAllowed: b(p61Summary, 'serverUploadAllowed'),
    p61FirebaseUploadAllowed: b(p61Summary, 'firebaseUploadAllowed'),
    p61DownloadablePacksPublished: b(p61Summary, 'downloadablePacksPublished'),
    p61RuntimeDownloadsEnabled: b(p61Summary, 'runtimeDownloadsEnabled'),
    p61StorageMigrationAllowed: b(p61Summary, 'storageMigrationAllowed'),
    p61CloudSyncMigrationAllowed: b(p61Summary, 'cloudSyncMigrationAllowed'),
    p61FixtureProbesPassed: n(p61Summary, 'fixtureProbesPassed'),
    p61FixtureProbes: n(p61Summary, 'fixtureProbes'),
    p46Status: s(p46, 'status'),
    p46TransactionState: s(p46Summary, 'transactionState'),
    p46TargetLocale: s(p46Summary, 'targetLocale'),
    p46ReadyForProductionApplyTransaction: b(p46Summary, 'readyForProductionApplyTransaction'),
    p46ReadyForApply: b(p46Summary, 'readyForApply'),
    p46MayModifyProductionAppFiles: b(p46Summary, 'mayModifyProductionAppFiles'),
    p46ActivationApproved: b(p46Summary, 'activationApproved'),
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
    masterBlockers: masterActionableBlockerCount(master),
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    commandTargetsFr: p47RollbackGuardCommand === expectedP47RollbackGuardCommand && p47RollbackGuardCommand.endsWith('--target fr'),
    commandRunPathMatchesCurrentRun: p47RollbackGuardCommand === expectedP47RollbackGuardCommand && p47RollbackGuardCommand.includes(`--run ${runRel}`),
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
    'Keep the exact P47 rollback/post-apply guard command unexecuted while P46 remains waiting for activation sequence preflight.',
    'After future P46 production apply transaction contract PASS, run only the P47 no-write guard command recorded by this packet.',
    'Regenerate P62 if P61, P46, P47, master blocker state, run id, target locale or any closed production flag changes.',
    'Prepare the next safe continuation handoff so ready P47 guard evidence can feed the next non-production/pass sequencing layer without opening apply.',
  ];

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-p47-rollback-guard-command-preflight-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      exactApprovalP46ToP47RollbackGuardHandoffSimulationV2Packet: rel(repoRoot, p61Path),
      productionApplyTransactionContractV2Packet: rel(repoRoot, p46Path),
      postApplyRollbackGuardContractV2Packet: rel(repoRoot, p47Path),
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
    commandPreflight: {
      dryRunOnly: true,
      p47RollbackGuardCommand,
      p47RollbackGuardCommandExecutedByThisScript: false,
      requiresP61Ready: true,
      requiresP46ProductionApplyTransactionContractReady: true,
      requiresP47NoWriteRollbackGuardContract: true,
      requiresP47Probe: 'p46_ready_guard_ready',
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
      p47RollbackGuardCommandExecutedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(dryRunPath, {
    schemaVersion: 'gustav-exact-approval-p47-rollback-guard-command-preflight-dry-run-v2',
    runId,
    generatedAt: report.generatedAt,
    dryRunOnly: true,
    preflightState: report.summary.preflightState,
    p47RollbackGuardCommand,
    p47RollbackGuardCommandAllowedNow: report.summary.p47RollbackGuardCommandAllowedNow,
    p47RollbackGuardCommandAllowedAfterP46Contract: report.summary.p47RollbackGuardCommandAllowedAfterP46Contract,
    p47RollbackGuardCommandExecutedByThisScript: false,
    readyForApply: false,
    activationApproved: false,
  });
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval P47 rollback guard command preflight V2 packet: ${status}`);
  console.log(`Preflight state: ${report.summary.preflightState}`);
  console.log(`P61 ready/state: ${report.summary.p61Ready ? 'yes' : 'no'}/${report.summary.p61State}`);
  console.log(`P46 status/state: ${report.summary.p46Status}/${report.summary.p46TransactionState}`);
  console.log(`P47 status/state: ${report.summary.p47Status}/${report.summary.p47GuardState}`);
  console.log(`P47 rollback guard command allowed now: ${report.summary.p47RollbackGuardCommandAllowedNow ? 'yes' : 'no'}`);
  console.log(`P47 rollback guard command allowed after P46 contract: ${report.summary.p47RollbackGuardCommandAllowedAfterP46Contract ? 'yes' : 'no'}`);
  console.log(`P47 rollback guard command executed by this script: ${report.summary.p47RollbackGuardCommandWouldExecuteByThisScript ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
