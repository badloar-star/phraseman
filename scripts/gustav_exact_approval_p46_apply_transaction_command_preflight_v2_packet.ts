import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type PreflightState =
  | 'p46_apply_transaction_command_preflight_ready_waiting_for_p45_sequence'
  | 'p46_apply_transaction_command_preflight_ready_for_contract_command'
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
  p59Status: string;
  p59Ready: boolean;
  p59State: string;
  p59FreshAfterP46: boolean;
  p59CurrentHandoffWouldOpenTransaction: boolean;
  p59SimulatedPostP45P46WouldOpenTransaction: boolean;
  p59CommandExecutedByThisScript: boolean;
  p45Status: string;
  p45PreflightState: string;
  p45ReadyForProductionActivationSequence: boolean;
  p45ReadyForApply: boolean;
  p45MayModifyProductionAppFiles: boolean;
  p45ActivationApproved: boolean;
  p46Status: string;
  p46TransactionState: string;
  p46TargetLocale: string;
  p46ReadyForProductionApplyTransaction: boolean;
  p46ReadyForApply: boolean;
  p46MayModifyProductionAppFiles: boolean;
  p46ActivationApproved: boolean;
  p46ServerManifestEntries: number;
  p46PayloadFilesChecked: number;
  p46IndexFilesChecked: number;
  p46SliceManifestFilesChecked: number;
  p46DryRunHashLocks: number;
  p46AllowedFutureMutationSteps: number;
  p46RollbackSteps: number;
  p46P45ReadyProbePassed: boolean;
  p46ProductionServerManifestPublishGateReady: boolean;
  p46ProductionServerManifestPublishGateEntries: number;
  p46FrenchServerPackUploadEvidenceReady: boolean;
  p46FrenchServerPackUploadEvidenceObjects: number;
  p46FrenchServerPackUploadExecutionGateReady: boolean;
  p46FrenchServerPackUploadExecutionGateDryRun: boolean;
  p46FrenchServerPackUploadExecutionStarted: boolean;
  p46FrenchServerObjectRemoteVerifyReady: boolean;
  p46FrenchServerObjectRemoteVerifyFound: number;
  p46FrenchServerObjectRemoteVerifyHashChecked: number;
  p46ShaMismatches: number;
  p46MissingEntryFiles: number;
  p46InvalidServerPaths: number;
  p46InvalidCacheKeys: number;
  p46OpenEntryFlags: number;
  masterBlockers: number;
  masterReadyForApply: boolean;
  masterMayModifyProductionAppFiles: boolean;
  commandTargetsFr: boolean;
  commandRunPathMatchesCurrentRun: boolean;
  commandWouldExecuteByThisScript: boolean;
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
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  preflightState: PreflightState;
  p59Ready: boolean;
  p59State: string;
  p59CurrentHandoffWouldOpenTransaction: boolean;
  p59SimulatedPostP45P46WouldOpenTransaction: boolean;
  p59CommandExecutedByThisScript: boolean;
  p45Status: string;
  p45PreflightState: string;
  p45ReadyForProductionActivationSequence: boolean;
  p46Status: string;
  p46TransactionState: string;
  p46TargetLocale: string;
  p46ReadyForProductionApplyTransaction: boolean;
  p46ServerManifestEntries: number;
  p46PayloadFilesChecked: number;
  p46IndexFilesChecked: number;
  p46SliceManifestFilesChecked: number;
  p46DryRunHashLocks: number;
  p46AllowedFutureMutationSteps: number;
  p46RollbackSteps: number;
  p46P45ReadyProbePassed: boolean;
  p46ProductionServerManifestPublishGateReady: boolean;
  p46ProductionServerManifestPublishGateEntries: number;
  p46FrenchServerPackUploadEvidenceReady: boolean;
  p46FrenchServerPackUploadEvidenceObjects: number;
  p46FrenchServerPackUploadExecutionGateReady: boolean;
  p46FrenchServerPackUploadExecutionGateDryRun: boolean;
  p46FrenchServerPackUploadExecutionStarted: boolean;
  p46FrenchServerObjectRemoteVerifyReady: boolean;
  p46FrenchServerObjectRemoteVerifyFound: number;
  p46FrenchServerObjectRemoteVerifyHashChecked: number;
  commandTargetsFr: boolean;
  commandRunPathMatchesCurrentRun: boolean;
  p46ApplyTransactionCommandAllowedNow: boolean;
  p46ApplyTransactionCommandAllowedAfterP45Sequence: boolean;
  p46ApplyTransactionCommandWouldExecuteByThisScript: boolean;
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
  schemaVersion: 'gustav-exact-approval-p46-apply-transaction-command-preflight-v2-packet-v0';
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
  p46ApplyTransactionCommandPreflight: {
    dryRunOnly: true;
    commandString: string;
    commandAllowedNow: boolean;
    commandAllowedAfterP45Sequence: boolean;
    executedByThisScript: false;
    requiresCurrentRun: true;
    requiresTargetFr: true;
    requiresP59Ready: true;
    requiresP45SequenceReady: true;
    requiresP46NoWriteContract: true;
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
    p46ApplyTransactionCommandExecutedByThisScript: false;
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

function runtimeSliceIntegrityReady(input: EvaluationInput): boolean {
  return (
    input.p46ServerManifestEntries === 12 &&
    input.p46PayloadFilesChecked === 12 &&
    input.p46IndexFilesChecked === 12 &&
    input.p46SliceManifestFilesChecked === 12 &&
    input.p46DryRunHashLocks >= 60 &&
    input.p46AllowedFutureMutationSteps >= 3 &&
    input.p46RollbackSteps >= 2 &&
    input.p46ProductionServerManifestPublishGateReady &&
    input.p46ProductionServerManifestPublishGateEntries === 12 &&
    input.p46FrenchServerPackUploadEvidenceReady &&
    input.p46FrenchServerPackUploadEvidenceObjects === 36 &&
    input.p46FrenchServerPackUploadExecutionGateReady &&
    input.p46FrenchServerPackUploadExecutionGateDryRun &&
    !input.p46FrenchServerPackUploadExecutionStarted &&
    input.p46FrenchServerObjectRemoteVerifyReady &&
    input.p46FrenchServerObjectRemoteVerifyFound === 36 &&
    input.p46FrenchServerObjectRemoteVerifyHashChecked === 36 &&
    input.p46ShaMismatches === 0 &&
    input.p46MissingEntryFiles === 0 &&
    input.p46InvalidServerPaths === 0 &&
    input.p46InvalidCacheKeys === 0 &&
    input.p46OpenEntryFlags === 0
  );
}

function p59Accepted(input: EvaluationInput): boolean {
  return (
    input.p59Status === 'PASS' &&
    input.p59Ready &&
    input.p59FreshAfterP46 &&
    (input.p59State === 'p45_to_p46_handoff_simulation_ready_waiting_for_p45_sequence' ||
      input.p59State === 'p45_to_p46_handoff_simulation_ready_for_p46_apply_transaction_contract') &&
    !input.p59CurrentHandoffWouldOpenTransaction &&
    input.p59SimulatedPostP45P46WouldOpenTransaction &&
    !input.p59CommandExecutedByThisScript
  );
}

function p45SequenceReady(input: EvaluationInput): boolean {
  return (
    input.p45Status === 'PASS' &&
    input.p45PreflightState === 'production_activation_sequence_preflight_ready' &&
    input.p45ReadyForProductionActivationSequence
  );
}

function p45Waiting(input: EvaluationInput): boolean {
  return (
    input.p45Status === 'HOLD' &&
    input.p45PreflightState === 'waiting_for_exact_approval_validation' &&
    !input.p45ReadyForProductionActivationSequence
  );
}

function p46AcceptedState(input: EvaluationInput): boolean {
  return (
    (input.p46Status === 'HOLD' && input.p46TransactionState === 'waiting_for_activation_sequence_preflight') ||
    (input.p46Status === 'PASS' && input.p46TransactionState === 'production_apply_transaction_contract_ready')
  );
}

function commandCanRun(input: EvaluationInput): boolean {
  return (
    p59Accepted(input) &&
    p45SequenceReady(input) &&
    p46AcceptedState(input) &&
    input.p46TargetLocale === 'fr' &&
    input.p46P45ReadyProbePassed &&
    runtimeSliceIntegrityReady(input) &&
    input.commandTargetsFr &&
    input.commandRunPathMatchesCurrentRun &&
    !input.commandWouldExecuteByThisScript &&
    !input.p45ReadyForApply &&
    !input.p45MayModifyProductionAppFiles &&
    !input.p45ActivationApproved &&
    !input.p46ReadyForApply &&
    !input.p46MayModifyProductionAppFiles &&
    !input.p46ActivationApproved &&
    !input.masterReadyForApply &&
    !input.masterMayModifyProductionAppFiles &&
    !input.targetManifestActivationApproved &&
    !input.targetManifestReadyForApply &&
    !input.targetManifestMayModifyProductionAppFiles &&
    !input.serverManifestActivationApproved &&
    !input.serverManifestReadyForApply &&
    !input.serverManifestMayModifyProductionAppFiles &&
    !input.serverUploadAllowed &&
    !input.firebaseUploadAllowed &&
    !input.downloadablePacksPublished &&
    !input.runtimeDownloadsEnabled &&
    !input.storageMigrationAllowed &&
    !input.cloudSyncMigrationAllowed
  );
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const commandAllowedNow = commandCanRun(input);
  const postP45Fixture = {
    ...input,
    p45Status: 'PASS',
    p45PreflightState: 'production_activation_sequence_preflight_ready',
    p45ReadyForProductionActivationSequence: true,
  };
  const commandAllowedAfterP45Sequence = commandCanRun(postP45Fixture);

  if (!p59Accepted(input)) {
    addFinding(findings, 'blocker', 'P59_NOT_READY', 'P60 requires P59 to be fresh, PASS and closed, with simulated post-P45 P46 contract handoff open.');
  }
  if (!input.commandTargetsFr) {
    addFinding(findings, 'blocker', 'COMMAND_TARGET_NOT_FR', 'P46 apply transaction command must target fr.');
  }
  if (!input.commandRunPathMatchesCurrentRun) {
    addFinding(findings, 'blocker', 'COMMAND_RUN_NOT_CURRENT', 'P46 apply transaction command must use the current Gustav run path.');
  }
  if (input.p46TargetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'P46_TARGET_LOCALE_MISMATCH', 'P46 source packet must stay scoped to targetLocale=fr.');
  }
  if (!p45Waiting(input) && !p45SequenceReady(input)) {
    addFinding(findings, 'blocker', 'P45_NOT_IN_ACCEPTED_STATE', 'P45 must be waiting for exact approval validation or already sequence-preflight ready.');
  }
  if (!p46AcceptedState(input)) {
    addFinding(findings, 'blocker', 'P46_NOT_IN_ACCEPTED_STATE', 'P46 must be waiting for activation sequence preflight or already no-write contract ready.');
  }
  if (!input.p46P45ReadyProbePassed) {
    addFinding(findings, 'blocker', 'P46_P45_READY_PROBE_MISSING', 'P46 must prove p45_ready_contract_ready advances to production_apply_transaction_contract_ready.');
  }
  if (!runtimeSliceIntegrityReady(input)) {
    addFinding(findings, 'blocker', 'P46_RUNTIME_SLICE_INTEGRITY_NOT_READY', 'P46 must prove 12 server entries, payload/index/manifest hashes, upload evidence, remote object verification, rollback markers and dry-run hash-lock coverage.');
  }
  if (!commandAllowedAfterP45Sequence) {
    addFinding(findings, 'blocker', 'POST_P45_P46_COMMAND_NOT_ALLOWED', 'With sequence-ready P45, the P46 no-write apply transaction contract command must become allowed by preflight.');
  }
  if (
    input.p45ReadyForApply ||
    input.p45MayModifyProductionAppFiles ||
    input.p45ActivationApproved ||
    input.p46ReadyForApply ||
    input.p46MayModifyProductionAppFiles ||
    input.p46ActivationApproved ||
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
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P60 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }
  if (input.masterBlockers > 0) {
    addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', `Master manifest has ${input.masterBlockers} blocker(s).`);
  }
  if (input.commandWouldExecuteByThisScript) {
    addFinding(findings, 'blocker', 'PREFLIGHT_EXECUTED_COMMAND', 'P60 is a command preflight and must not execute the P46 apply transaction contract command.');
  }
  if (!commandAllowedNow && p45Waiting(input)) {
    addFinding(findings, 'info', 'WAITING_FOR_P45_SEQUENCE', 'Current P46 apply transaction command remains closed until P45 sequence preflight is ready.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const preflightState: PreflightState =
    blockers > 0
      ? 'blocked_by_findings'
      : commandAllowedNow
        ? 'p46_apply_transaction_command_preflight_ready_for_contract_command'
        : 'p46_apply_transaction_command_preflight_ready_waiting_for_p45_sequence';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      preflightState,
      p59Ready: input.p59Ready,
      p59State: input.p59State,
      p59CurrentHandoffWouldOpenTransaction: input.p59CurrentHandoffWouldOpenTransaction,
      p59SimulatedPostP45P46WouldOpenTransaction: input.p59SimulatedPostP45P46WouldOpenTransaction,
      p59CommandExecutedByThisScript: input.p59CommandExecutedByThisScript,
      p45Status: input.p45Status,
      p45PreflightState: input.p45PreflightState,
      p45ReadyForProductionActivationSequence: input.p45ReadyForProductionActivationSequence,
      p46Status: input.p46Status,
      p46TransactionState: input.p46TransactionState,
      p46TargetLocale: input.p46TargetLocale,
      p46ReadyForProductionApplyTransaction: input.p46ReadyForProductionApplyTransaction,
      p46ServerManifestEntries: input.p46ServerManifestEntries,
      p46PayloadFilesChecked: input.p46PayloadFilesChecked,
      p46IndexFilesChecked: input.p46IndexFilesChecked,
      p46SliceManifestFilesChecked: input.p46SliceManifestFilesChecked,
      p46DryRunHashLocks: input.p46DryRunHashLocks,
      p46AllowedFutureMutationSteps: input.p46AllowedFutureMutationSteps,
      p46RollbackSteps: input.p46RollbackSteps,
      p46P45ReadyProbePassed: input.p46P45ReadyProbePassed,
      p46ProductionServerManifestPublishGateReady: input.p46ProductionServerManifestPublishGateReady,
      p46ProductionServerManifestPublishGateEntries: input.p46ProductionServerManifestPublishGateEntries,
      p46FrenchServerPackUploadEvidenceReady: input.p46FrenchServerPackUploadEvidenceReady,
      p46FrenchServerPackUploadEvidenceObjects: input.p46FrenchServerPackUploadEvidenceObjects,
      p46FrenchServerPackUploadExecutionGateReady: input.p46FrenchServerPackUploadExecutionGateReady,
      p46FrenchServerPackUploadExecutionGateDryRun: input.p46FrenchServerPackUploadExecutionGateDryRun,
      p46FrenchServerPackUploadExecutionStarted: input.p46FrenchServerPackUploadExecutionStarted,
      p46FrenchServerObjectRemoteVerifyReady: input.p46FrenchServerObjectRemoteVerifyReady,
      p46FrenchServerObjectRemoteVerifyFound: input.p46FrenchServerObjectRemoteVerifyFound,
      p46FrenchServerObjectRemoteVerifyHashChecked: input.p46FrenchServerObjectRemoteVerifyHashChecked,
      commandTargetsFr: input.commandTargetsFr,
      commandRunPathMatchesCurrentRun: input.commandRunPathMatchesCurrentRun,
      p46ApplyTransactionCommandAllowedNow: commandAllowedNow,
      p46ApplyTransactionCommandAllowedAfterP45Sequence: commandAllowedAfterP45Sequence,
      p46ApplyTransactionCommandWouldExecuteByThisScript: input.commandWouldExecuteByThisScript,
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

function makePostP45Ready(input: EvaluationInput): void {
  input.p45Status = 'PASS';
  input.p45PreflightState = 'production_activation_sequence_preflight_ready';
  input.p45ReadyForProductionActivationSequence = true;
}

function makeProbeDependenciesReady(input: EvaluationInput): void {
  input.p59Status = 'PASS';
  input.p59Ready = true;
  input.p59State = 'p45_to_p46_handoff_simulation_ready_waiting_for_p45_sequence';
  input.p59FreshAfterP46 = true;
  input.p59CurrentHandoffWouldOpenTransaction = false;
  input.p59SimulatedPostP45P46WouldOpenTransaction = true;
  input.p59CommandExecutedByThisScript = false;
  input.p45Status = 'HOLD';
  input.p45PreflightState = 'waiting_for_exact_approval_validation';
  input.p45ReadyForProductionActivationSequence = false;
  input.p45ReadyForApply = false;
  input.p45MayModifyProductionAppFiles = false;
  input.p45ActivationApproved = false;
  input.p46Status = 'HOLD';
  input.p46TransactionState = 'waiting_for_activation_sequence_preflight';
  input.p46TargetLocale = 'fr';
  input.p46ReadyForProductionApplyTransaction = false;
  input.p46ReadyForApply = false;
  input.p46MayModifyProductionAppFiles = false;
  input.p46ActivationApproved = false;
  input.p46ServerManifestEntries = 12;
  input.p46PayloadFilesChecked = 12;
  input.p46IndexFilesChecked = 12;
  input.p46SliceManifestFilesChecked = 12;
  input.p46DryRunHashLocks = Math.max(input.p46DryRunHashLocks, 60);
  input.p46AllowedFutureMutationSteps = Math.max(input.p46AllowedFutureMutationSteps, 3);
  input.p46RollbackSteps = Math.max(input.p46RollbackSteps, 2);
  input.p46P45ReadyProbePassed = true;
  input.p46ProductionServerManifestPublishGateReady = true;
  input.p46ProductionServerManifestPublishGateEntries = 12;
  input.p46FrenchServerPackUploadEvidenceReady = true;
  input.p46FrenchServerPackUploadEvidenceObjects = 36;
  input.p46FrenchServerPackUploadExecutionGateReady = true;
  input.p46FrenchServerPackUploadExecutionGateDryRun = true;
  input.p46FrenchServerPackUploadExecutionStarted = false;
  input.p46FrenchServerObjectRemoteVerifyReady = true;
  input.p46FrenchServerObjectRemoteVerifyFound = 36;
  input.p46FrenchServerObjectRemoteVerifyHashChecked = 36;
  input.p46ShaMismatches = 0;
  input.p46MissingEntryFiles = 0;
  input.p46InvalidServerPaths = 0;
  input.p46InvalidCacheKeys = 0;
  input.p46OpenEntryFlags = 0;
  input.masterBlockers = 0;
  input.masterReadyForApply = false;
  input.masterMayModifyProductionAppFiles = false;
  input.commandTargetsFr = true;
  input.commandRunPathMatchesCurrentRun = true;
  input.commandWouldExecuteByThisScript = false;
  input.targetManifestActivationApproved = false;
  input.targetManifestReadyForApply = false;
  input.targetManifestMayModifyProductionAppFiles = false;
  input.serverManifestActivationApproved = false;
  input.serverManifestReadyForApply = false;
  input.serverManifestMayModifyProductionAppFiles = false;
  input.serverUploadAllowed = false;
  input.firebaseUploadAllowed = false;
  input.downloadablePacksPublished = false;
  input.runtimeDownloadsEnabled = false;
  input.storageMigrationAllowed = false;
  input.cloudSyncMigrationAllowed = false;
}

function runProbes(base: EvaluationInput): Probe[] {
  const probeBase = clone(base);
  makeProbeDependenciesReady(probeBase);
  const tests: { id: string; expectedState: PreflightState; mutate: (input: EvaluationInput) => void }[] = [
    { id: 'canonical_waits_for_p45_sequence', expectedState: 'p46_apply_transaction_command_preflight_ready_waiting_for_p45_sequence', mutate: () => undefined },
    { id: 'post_p45_fixture_allows_p46_contract_command', expectedState: 'p46_apply_transaction_command_preflight_ready_for_contract_command', mutate: makePostP45Ready },
    { id: 'stale_p59_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p59FreshAfterP46 = false; } },
    { id: 'p59_simulation_not_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p59SimulatedPostP45P46WouldOpenTransaction = false; } },
    { id: 'p59_current_handoff_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p59CurrentHandoffWouldOpenTransaction = true; } },
    { id: 'p59_command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p59CommandExecutedByThisScript = true; } },
    { id: 'wrong_command_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandTargetsFr = false; } },
    { id: 'wrong_command_run_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandRunPathMatchesCurrentRun = false; } },
    { id: 'p46_wrong_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46TargetLocale = 'en'; } },
    { id: 'missing_p46_probe_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46P45ReadyProbePassed = false; } },
    { id: 'server_entry_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46ServerManifestEntries = 11; } },
    { id: 'payload_hash_check_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46PayloadFilesChecked = 11; } },
    { id: 'dry_run_hash_lock_low_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46DryRunHashLocks = 1; } },
    { id: 'p46_remote_verify_hash_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46FrenchServerObjectRemoteVerifyHashChecked = 35; } },
    { id: 'p46_upload_execution_started_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46FrenchServerPackUploadExecutionStarted = true; } },
    { id: 'p46_sha_mismatch_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46ShaMismatches = 1; } },
    { id: 'p46_ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46ReadyForApply = true; } },
    { id: 'master_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.masterBlockers = 1; } },
    { id: 'server_upload_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.serverUploadAllowed = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'storage_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; } },
    { id: 'cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.cloudSyncMigrationAllowed = true; } },
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
    '# GUSTAV Exact Approval P46 Apply Transaction Command Preflight V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Preflight state: \`${report.summary.preflightState}\``,
    `- P59 ready/state/current/sim/executed: ${report.summary.p59Ready ? 'yes' : 'no'}/${report.summary.p59State}/${report.summary.p59CurrentHandoffWouldOpenTransaction ? 'yes' : 'no'}/${report.summary.p59SimulatedPostP45P46WouldOpenTransaction ? 'yes' : 'no'}/${report.summary.p59CommandExecutedByThisScript ? 'yes' : 'no'}`,
    `- P45 status/state/sequence: ${report.summary.p45Status}/${report.summary.p45PreflightState}/${report.summary.p45ReadyForProductionActivationSequence ? 'yes' : 'no'}`,
    `- P46 status/state/contract: ${report.summary.p46Status}/${report.summary.p46TransactionState}/${report.summary.p46ReadyForProductionApplyTransaction ? 'yes' : 'no'}`,
    `- P46 target/server/payload/index/manifest/hash-locks: ${report.summary.p46TargetLocale}/${report.summary.p46ServerManifestEntries}/${report.summary.p46PayloadFilesChecked}/${report.summary.p46IndexFilesChecked}/${report.summary.p46SliceManifestFilesChecked}/${report.summary.p46DryRunHashLocks}`,
    `- P46 server publish/upload/remote: ${report.summary.p46ProductionServerManifestPublishGateReady ? 'yes' : 'no'}/${report.summary.p46FrenchServerPackUploadEvidenceReady ? 'yes' : 'no'}/${report.summary.p46FrenchServerPackUploadExecutionGateReady ? 'yes' : 'no'}/${report.summary.p46FrenchServerObjectRemoteVerifyReady ? 'yes' : 'no'}`,
    `- P46 remote found/hash checked: ${report.summary.p46FrenchServerObjectRemoteVerifyFound}/${report.summary.p46FrenchServerObjectRemoteVerifyHashChecked}`,
    `- P46 future mutations/rollback/probe: ${report.summary.p46AllowedFutureMutationSteps}/${report.summary.p46RollbackSteps}/${report.summary.p46P45ReadyProbePassed ? 'yes' : 'no'}`,
    `- Command target/run: ${report.summary.commandTargetsFr ? 'fr' : 'wrong'}/${report.summary.commandRunPathMatchesCurrentRun ? 'current' : 'wrong'}`,
    `- Command allowed now/after-P45/executed: ${report.summary.p46ApplyTransactionCommandAllowedNow ? 'yes' : 'no'}/${report.summary.p46ApplyTransactionCommandAllowedAfterP45Sequence ? 'yes' : 'no'}/${report.summary.p46ApplyTransactionCommandWouldExecuteByThisScript ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## P46 Apply Transaction Command',
    '',
    `- \`${report.p46ApplyTransactionCommandPreflight.commandString}\``,
    `- Allowed now: ${report.p46ApplyTransactionCommandPreflight.commandAllowedNow ? 'yes' : 'no'}`,
    `- Allowed after P45 sequence: ${report.p46ApplyTransactionCommandPreflight.commandAllowedAfterP45Sequence ? 'yes' : 'no'}`,
    '- Executed by this script: no',
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
  lines.push('- It does not execute P46, create active approval artifacts, write production app files, upload packs, enable runtime downloads, run storage/cloud migrations or approve production apply.');
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
  const p45Path = path.join(auditsDir, 'production_activation_sequence_preflight_v2_packet.json');
  const p46Path = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.json');
  const p59Path = path.join(auditsDir, 'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_p46_apply_transaction_command_preflight_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_p46_apply_transaction_command_preflight_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_p46_apply_transaction_command_preflight_v2_packet.md');

  const p45 = readJsonOrEmpty(p45Path);
  const p46 = readJsonOrEmpty(p46Path);
  const p59 = readJsonOrEmpty(p59Path);
  const master = readJsonOrEmpty(masterPath);
  const targetManifest = readJsonOrEmpty(targetManifestPath);
  const serverManifest = readJsonOrEmpty(serverManifestPath);
  const p45Summary = summaryOf(p45);
  const p46Summary = summaryOf(p46);
  const p59Summary = summaryOf(p59);
  const masterSummary = summaryOf(master);
  const targetActivation = object(targetManifest.activation);
  const runRel = rel(repoRoot, runDir).split('/').join('\\');
  const commandString = `npx tsx scripts\\gustav_production_apply_transaction_contract_v2_packet.ts --run ${runRel} --target fr`;

  const p59Ready =
    fs.existsSync(p59Path) &&
    s(p59, 'status') === 'PASS' &&
    n(p59Summary, 'blockers') === 0 &&
    (s(p59Summary, 'handoffState') === 'p45_to_p46_handoff_simulation_ready_waiting_for_p45_sequence' ||
      s(p59Summary, 'handoffState') === 'p45_to_p46_handoff_simulation_ready_for_p46_apply_transaction_contract') &&
    b(p59Summary, 'p58Ready') &&
    !b(p59Summary, 'currentP45ToP46HandoffWouldOpenTransaction') &&
    b(p59Summary, 'simulatedPostP45P46WouldOpenTransaction') &&
    !b(p59Summary, 'p46ContractCommandWouldExecuteByThisScript') &&
    !b(p59Summary, 'readyForApply') &&
    !b(p59Summary, 'mayModifyProductionAppFiles') &&
    n(p59Summary, 'fixtureProbes') > 0 &&
    n(p59Summary, 'fixtureProbesPassed') === n(p59Summary, 'fixtureProbes');

  const input: EvaluationInput = {
    currentRunId: runId,
    p59Status: s(p59, 'status'),
    p59Ready,
    p59State: s(p59Summary, 'handoffState'),
    p59FreshAfterP46: fileMtimeMs(p59Path) >= fileMtimeMs(p46Path) && fileMtimeMs(p46Path) > 0,
    p59CurrentHandoffWouldOpenTransaction: b(p59Summary, 'currentP45ToP46HandoffWouldOpenTransaction'),
    p59SimulatedPostP45P46WouldOpenTransaction: b(p59Summary, 'simulatedPostP45P46WouldOpenTransaction'),
    p59CommandExecutedByThisScript: b(p59Summary, 'p46ContractCommandWouldExecuteByThisScript'),
    p45Status: s(p45, 'status'),
    p45PreflightState: s(p45Summary, 'preflightState'),
    p45ReadyForProductionActivationSequence: b(p45Summary, 'readyForProductionActivationSequence'),
    p45ReadyForApply: b(p45Summary, 'readyForApply'),
    p45MayModifyProductionAppFiles: b(p45Summary, 'mayModifyProductionAppFiles'),
    p45ActivationApproved: b(p45Summary, 'activationApproved'),
    p46Status: s(p46, 'status'),
    p46TransactionState: s(p46Summary, 'transactionState'),
    p46TargetLocale: s(p46Summary, 'targetLocale'),
    p46ReadyForProductionApplyTransaction: b(p46Summary, 'readyForProductionApplyTransaction'),
    p46ReadyForApply: b(p46Summary, 'readyForApply'),
    p46MayModifyProductionAppFiles: b(p46Summary, 'mayModifyProductionAppFiles'),
    p46ActivationApproved: b(p46Summary, 'activationApproved'),
    p46ServerManifestEntries: n(p46Summary, 'serverManifestEntries'),
    p46PayloadFilesChecked: n(p46Summary, 'payloadFilesChecked'),
    p46IndexFilesChecked: n(p46Summary, 'indexFilesChecked'),
    p46SliceManifestFilesChecked: n(p46Summary, 'sliceManifestFilesChecked'),
    p46DryRunHashLocks: n(p46Summary, 'dryRunHashLocks'),
    p46AllowedFutureMutationSteps: n(p46Summary, 'allowedFutureMutationSteps'),
    p46RollbackSteps: n(p46Summary, 'rollbackSteps'),
    p46P45ReadyProbePassed: probePassed(p46, 'p45_ready_contract_ready'),
    p46ProductionServerManifestPublishGateReady: b(p46Summary, 'productionServerManifestPublishGateReady'),
    p46ProductionServerManifestPublishGateEntries: n(p46Summary, 'productionServerManifestPublishGateEntries'),
    p46FrenchServerPackUploadEvidenceReady: b(p46Summary, 'frenchServerPackUploadEvidenceReady'),
    p46FrenchServerPackUploadEvidenceObjects: n(p46Summary, 'frenchServerPackUploadEvidenceObjects'),
    p46FrenchServerPackUploadExecutionGateReady: b(p46Summary, 'frenchServerPackUploadExecutionGateReady'),
    p46FrenchServerPackUploadExecutionGateDryRun: b(p46Summary, 'frenchServerPackUploadExecutionGateDryRun'),
    p46FrenchServerPackUploadExecutionStarted: b(p46Summary, 'frenchServerPackUploadExecutionStarted'),
    p46FrenchServerObjectRemoteVerifyReady: b(p46Summary, 'frenchServerObjectRemoteVerifyReady'),
    p46FrenchServerObjectRemoteVerifyFound: n(p46Summary, 'frenchServerObjectRemoteVerifyFound'),
    p46FrenchServerObjectRemoteVerifyHashChecked: n(p46Summary, 'frenchServerObjectRemoteVerifyHashChecked'),
    p46ShaMismatches: n(p46Summary, 'shaMismatches'),
    p46MissingEntryFiles: n(p46Summary, 'missingEntryFiles'),
    p46InvalidServerPaths: n(p46Summary, 'invalidServerPaths'),
    p46InvalidCacheKeys: n(p46Summary, 'invalidCacheKeys'),
    p46OpenEntryFlags: n(p46Summary, 'openEntryFlags'),
    masterBlockers: masterActionableBlockerCount(master),
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    commandTargetsFr: commandString.endsWith('--target fr'),
    commandRunPathMatchesCurrentRun: commandString.includes(`--run ${runRel}`),
    commandWouldExecuteByThisScript: false,
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
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const nextRequiredActions = [
    'Keep the P46 apply transaction command unexecuted until P45 sequence preflight is ready.',
    'After future P45 PASS, run only the exact P46 no-write contract command recorded by this preflight.',
    'Keep P46 as no-write apply transaction contract until later rollback and post-apply gates authorize real apply execution.',
    'Regenerate P60 if P46 command path, run id, target locale, P59 handoff contract or closed production flags change.',
  ];

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-p46-apply-transaction-command-preflight-v2-packet-v0',
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
      productionApplyTransactionContractV2Packet: rel(repoRoot, p46Path),
      exactApprovalP45ToP46ApplyTransactionHandoffSimulationV2Packet: rel(repoRoot, p59Path),
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
    p46ApplyTransactionCommandPreflight: {
      dryRunOnly: true,
      commandString,
      commandAllowedNow: evaluation.p46ApplyTransactionCommandAllowedNow,
      commandAllowedAfterP45Sequence: evaluation.p46ApplyTransactionCommandAllowedAfterP45Sequence,
      executedByThisScript: false,
      requiresCurrentRun: true,
      requiresTargetFr: true,
      requiresP59Ready: true,
      requiresP45SequenceReady: true,
      requiresP46NoWriteContract: true,
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
      p46ApplyTransactionCommandExecutedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(dryRunPath, {
    schemaVersion: 'gustav-exact-approval-p46-apply-transaction-command-preflight-dry-run-v2',
    runId,
    generatedAt: report.generatedAt,
    dryRunOnly: true,
    preflightState: report.summary.preflightState,
    commandString,
    commandAllowedNow: report.summary.p46ApplyTransactionCommandAllowedNow,
    commandAllowedAfterP45Sequence: report.summary.p46ApplyTransactionCommandAllowedAfterP45Sequence,
    commandExecutedByThisScript: false,
    readyForApply: false,
    activationApproved: false,
  });
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval P46 apply transaction command preflight V2 packet: ${status}`);
  console.log(`Preflight state: ${report.summary.preflightState}`);
  console.log(`P59 ready/state: ${report.summary.p59Ready ? 'yes' : 'no'}/${report.summary.p59State}`);
  console.log(`P45 status/state: ${report.summary.p45Status}/${report.summary.p45PreflightState}`);
  console.log(`P46 status/state: ${report.summary.p46Status}/${report.summary.p46TransactionState}`);
  console.log(`P46 apply transaction command allowed now: ${report.summary.p46ApplyTransactionCommandAllowedNow ? 'yes' : 'no'}`);
  console.log(`P46 apply transaction command allowed after P45 sequence: ${report.summary.p46ApplyTransactionCommandAllowedAfterP45Sequence ? 'yes' : 'no'}`);
  console.log(`P46 apply transaction command executed by this script: ${report.summary.p46ApplyTransactionCommandWouldExecuteByThisScript ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
