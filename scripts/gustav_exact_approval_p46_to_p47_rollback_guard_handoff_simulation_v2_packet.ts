import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type HandoffState =
  | 'p46_to_p47_handoff_simulation_ready_waiting_for_p46_apply_transaction_contract'
  | 'p46_to_p47_handoff_simulation_ready_for_p47_rollback_guard_contract'
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
  p60Status: string;
  p60Ready: boolean;
  p60State: string;
  p60FreshAfterP47: boolean;
  p60CommandAllowedNow: boolean;
  p60CommandAllowedAfterP45Sequence: boolean;
  p60CommandExecutedByThisScript: boolean;
  p60ReadyForApply: boolean;
  p60MayModifyProductionAppFiles: boolean;
  p60ActivationApproved: boolean;
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
  handoffState: HandoffState;
  p60Ready: boolean;
  p60State: string;
  p60CommandAllowedNow: boolean;
  p60CommandAllowedAfterP45Sequence: boolean;
  p60CommandExecutedByThisScript: boolean;
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
  currentP46ToP47HandoffWouldOpenRollbackGuard: boolean;
  simulatedPostP46P47WouldOpenRollbackGuard: boolean;
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
  schemaVersion: 'gustav-exact-approval-p46-to-p47-rollback-guard-handoff-simulation-v2-packet-v0';
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
    p47RollbackGuardCommand: string;
    p47RollbackGuardCommandExecutedByThisScript: false;
    requiresP60Ready: true;
    requiresP46NoWriteContract: true;
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

function p60Accepted(input: EvaluationInput): boolean {
  return (
    input.p60Status === 'PASS' &&
    input.p60Ready &&
    input.p60FreshAfterP47 &&
    (input.p60State === 'p46_apply_transaction_command_preflight_ready_waiting_for_p45_sequence' ||
      input.p60State === 'p46_apply_transaction_command_preflight_ready_for_contract_command') &&
    input.p60CommandAllowedAfterP45Sequence &&
    !input.p60CommandExecutedByThisScript &&
    !input.p60ReadyForApply &&
    !input.p60MayModifyProductionAppFiles &&
    !input.p60ActivationApproved
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

function p47GuardIntegrityReady(input: EvaluationInput): boolean {
  return (
    input.p47Blockers === 0 &&
    input.p47RuntimeCacheContracts === 12 &&
    input.p47RuntimeCacheRollbackContracts === 12 &&
    input.p47ServerManifestEntries === 12 &&
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

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const currentHandoffWouldOpenRollbackGuard = p46Ready(input) && p47Ready(input);
  const simulatedPostP46P47WouldOpenRollbackGuard =
    p60Accepted(input) &&
    p47GuardIntegrityReady(input);

  if (!p60Accepted(input)) {
    addFinding(findings, 'blocker', 'P60_NOT_READY', 'P61 requires fresh P60 PASS with P46 command allowed only after P45 sequence and no command execution.');
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
    addFinding(findings, 'blocker', 'P46_NOT_IN_ACCEPTED_HANDOFF_STATE', 'P46 must be waiting for activation sequence preflight or apply-transaction contract ready.');
  }
  if (!p47Waiting(input) && !p47Ready(input)) {
    addFinding(findings, 'blocker', 'P47_NOT_IN_ACCEPTED_HANDOFF_STATE', 'P47 must be waiting for apply transaction contract or ready after P47 PASS.');
  }
  if (p46Ready(input) && !p47Ready(input)) {
    addFinding(findings, 'blocker', 'P46_READY_BUT_P47_NOT_READY', 'If P46 is already transaction-ready, P47 must be refreshed into post_apply_rollback_guard_contract_ready.');
  }
  if (p47Ready(input) && !p46Ready(input)) {
    addFinding(findings, 'blocker', 'P47_READY_WITHOUT_P46_READY', 'P47 cannot be rollback-guard-ready unless P46 is production apply transaction contract ready.');
  }
  if (!input.p47ProbePassed) {
    addFinding(findings, 'blocker', 'P47_P46_READY_PROBE_MISSING', 'P47 must prove p46_ready_guard_ready advances to post_apply_rollback_guard_contract_ready.');
  }
  if (!p47GuardIntegrityReady(input)) {
    addFinding(findings, 'blocker', 'P47_ROLLBACK_GUARD_INTEGRITY_NOT_READY', 'P47 must prove runtime cache rollback, server manifest, prompt isolation, storage/admin and readiness guard coverage.');
  }
  if (!simulatedPostP46P47WouldOpenRollbackGuard) {
    addFinding(findings, 'blocker', 'POST_P46_P47_ROLLBACK_GUARD_SIMULATION_NOT_OPEN', 'A simulated transaction-ready P46 must open only the P47 no-write rollback/post-apply guard contract.');
  }
  if (forbiddenProductionFlagsOpen(input)) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P61 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }
  if (input.masterBlockers > 0) {
    addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', `Master manifest has ${input.masterBlockers} blocker(s).`);
  }
  if (input.commandWouldExecuteByThisScript) {
    addFinding(findings, 'blocker', 'PREFLIGHT_EXECUTED_COMMAND', 'P61 is a simulation and must not execute P47 rollback guard generation.');
  }
  if (p46Waiting(input) && p47Waiting(input)) {
    addFinding(findings, 'info', 'WAITING_FOR_P46_TRANSACTION_CONTRACT', 'Current rollback guard remains closed until P46 apply transaction contract is ready.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const handoffState: HandoffState =
    blockers > 0
      ? 'blocked_by_findings'
      : currentHandoffWouldOpenRollbackGuard
        ? 'p46_to_p47_handoff_simulation_ready_for_p47_rollback_guard_contract'
        : 'p46_to_p47_handoff_simulation_ready_waiting_for_p46_apply_transaction_contract';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      handoffState,
      p60Ready: input.p60Ready,
      p60State: input.p60State,
      p60CommandAllowedNow: input.p60CommandAllowedNow,
      p60CommandAllowedAfterP45Sequence: input.p60CommandAllowedAfterP45Sequence,
      p60CommandExecutedByThisScript: input.p60CommandExecutedByThisScript,
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
      currentP46ToP47HandoffWouldOpenRollbackGuard: currentHandoffWouldOpenRollbackGuard,
      simulatedPostP46P47WouldOpenRollbackGuard,
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

function makePostP46Ready(input: EvaluationInput): void {
  input.p46Status = 'PASS';
  input.p46TransactionState = 'production_apply_transaction_contract_ready';
  input.p46ReadyForProductionApplyTransaction = true;
  input.p47Status = 'PASS';
  input.p47GuardState = 'post_apply_rollback_guard_contract_ready';
  input.p47ReadyForPostApplyRollbackGuard = true;
}

function runProbes(base: EvaluationInput): Probe[] {
  const tests: Array<{ id: string; expectedState: HandoffState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_waits_for_p46_transaction_contract', expectedState: 'p46_to_p47_handoff_simulation_ready_waiting_for_p46_apply_transaction_contract', mutate: () => undefined },
    { id: 'post_p46_fixture_allows_p47_guard', expectedState: 'p46_to_p47_handoff_simulation_ready_for_p47_rollback_guard_contract', mutate: makePostP46Ready },
    { id: 'stale_p60_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p60FreshAfterP47 = false; } },
    { id: 'p60_after_p45_not_allowed_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p60CommandAllowedAfterP45Sequence = false; } },
    { id: 'p60_command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p60CommandExecutedByThisScript = true; } },
    { id: 'p60_ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p60ReadyForApply = true; } },
    { id: 'p46_wrong_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46TargetLocale = 'en'; } },
    { id: 'p46_ready_p47_not_ready_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46Status = 'PASS'; input.p46TransactionState = 'production_apply_transaction_contract_ready'; input.p46ReadyForProductionApplyTransaction = true; } },
    { id: 'p47_ready_without_p46_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47Status = 'PASS'; input.p47GuardState = 'post_apply_rollback_guard_contract_ready'; input.p47ReadyForPostApplyRollbackGuard = true; } },
    { id: 'missing_p47_probe_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47ProbePassed = false; } },
    { id: 'runtime_cache_contract_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RuntimeCacheContracts = 11; } },
    { id: 'runtime_cache_rollback_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RuntimeCacheRollbackContracts = 11; } },
    { id: 'server_manifest_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47ServerManifestEntries = 11; } },
    { id: 'language_prompt_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47LanguagePromptContracts = 1; } },
    { id: 'post_apply_step_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47PostApplyGuardSteps = 1; } },
    { id: 'rollback_step_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RollbackGuardSteps = 1; } },
    { id: 'p47_ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47ReadyForApply = true; } },
    { id: 'server_upload_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47ServerUploadAllowed = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RuntimeDownloadsEnabled = true; } },
    { id: 'storage_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47StorageMigrationAllowed = true; } },
    { id: 'cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47CloudSyncMigrationAllowed = true; } },
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
    '# GUSTAV Exact Approval P46 To P47 Rollback Guard Handoff Simulation V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Handoff state: \`${report.summary.handoffState}\``,
    `- P60 ready/state/command now/after-P45/executed: ${report.summary.p60Ready ? 'yes' : 'no'}/${report.summary.p60State}/${report.summary.p60CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p60CommandAllowedAfterP45Sequence ? 'yes' : 'no'}/${report.summary.p60CommandExecutedByThisScript ? 'yes' : 'no'}`,
    `- P46 status/state/transaction: ${report.summary.p46Status}/${report.summary.p46TransactionState}/${report.summary.p46ReadyForProductionApplyTransaction ? 'yes' : 'no'}`,
    `- P47 status/state/guard: ${report.summary.p47Status}/${report.summary.p47GuardState}/${report.summary.p47ReadyForPostApplyRollbackGuard ? 'yes' : 'no'}`,
    `- P47 runtime/server/prompts/storage: ${report.summary.p47RuntimeCacheContracts}/${report.summary.p47RuntimeCacheRollbackContracts}/${report.summary.p47ServerManifestEntries}/${report.summary.p47LanguagePromptContracts}/${report.summary.p47StorageTargetKeyDomains}`,
    `- P47 readiness/post/rollback/probe: ${report.summary.p47ReadinessApplyBlockers}/${report.summary.p47PostApplyGuardSteps}/${report.summary.p47RollbackGuardSteps}/${report.summary.p47ProbePassed ? 'yes' : 'no'}`,
    `- Current handoff would open rollback guard: ${report.summary.currentP46ToP47HandoffWouldOpenRollbackGuard ? 'yes' : 'no'}`,
    `- Simulated post-P46 P47 would open rollback guard: ${report.summary.simulatedPostP46P47WouldOpenRollbackGuard ? 'yes' : 'no'}`,
    `- Command target/run/executed: ${report.summary.commandTargetsFr ? 'fr' : 'wrong'}/${report.summary.commandRunPathMatchesCurrentRun ? 'current' : 'wrong'}/${report.summary.p47RollbackGuardCommandWouldExecuteByThisScript ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Handoff Simulation',
    '',
    `- P47 rollback guard command: \`${report.handoffSimulation.p47RollbackGuardCommand}\``,
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
  lines.push('- This packet is dry-run simulation only.');
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
  const p46Path = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.json');
  const p47Path = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.json');
  const p60Path = path.join(auditsDir, 'exact_approval_p46_apply_transaction_command_preflight_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_packet.md');

  const p46 = readJsonOrEmpty(p46Path);
  const p47 = readJsonOrEmpty(p47Path);
  const p60 = readJsonOrEmpty(p60Path);
  const master = readJsonOrEmpty(masterPath);
  const p46Summary = summaryOf(p46);
  const p47Summary = summaryOf(p47);
  const p60Summary = summaryOf(p60);
  const masterSummary = summaryOf(master);
  const runRel = rel(repoRoot, runDir).split('/').join('\\');
  const p47RollbackGuardCommand = `npx tsx scripts\\gustav_post_apply_rollback_guard_contract_v2_packet.ts --run ${runRel} --target fr`;

  const p60Ready =
    fs.existsSync(p60Path) &&
    s(p60, 'status') === 'PASS' &&
    n(p60Summary, 'blockers') === 0 &&
    s(p60Summary, 'targetLocale') === 'fr' &&
    (s(p60Summary, 'preflightState') === 'p46_apply_transaction_command_preflight_ready_waiting_for_p45_sequence' ||
      s(p60Summary, 'preflightState') === 'p46_apply_transaction_command_preflight_ready_for_contract_command') &&
    b(p60Summary, 'p59Ready') &&
    b(p60Summary, 'p46ApplyTransactionCommandAllowedAfterP45Sequence') &&
    !b(p60Summary, 'p46ApplyTransactionCommandWouldExecuteByThisScript') &&
    !b(p60Summary, 'readyForApply') &&
    !b(p60Summary, 'mayModifyProductionAppFiles') &&
    n(p60Summary, 'fixtureProbes') > 0 &&
    n(p60Summary, 'fixtureProbesPassed') === n(p60Summary, 'fixtureProbes');

  const input: EvaluationInput = {
    currentRunId: runId,
    p60Status: s(p60, 'status'),
    p60Ready,
    p60State: s(p60Summary, 'preflightState'),
    p60FreshAfterP47: fileMtimeMs(p60Path) >= fileMtimeMs(p47Path) && fileMtimeMs(p47Path) > 0,
    p60CommandAllowedNow: b(p60Summary, 'p46ApplyTransactionCommandAllowedNow'),
    p60CommandAllowedAfterP45Sequence: b(p60Summary, 'p46ApplyTransactionCommandAllowedAfterP45Sequence'),
    p60CommandExecutedByThisScript: b(p60Summary, 'p46ApplyTransactionCommandWouldExecuteByThisScript'),
    p60ReadyForApply: b(p60Summary, 'readyForApply'),
    p60MayModifyProductionAppFiles: b(p60Summary, 'mayModifyProductionAppFiles'),
    p60ActivationApproved: b(p60Summary, 'activationApproved'),
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
    commandTargetsFr: p47RollbackGuardCommand.endsWith('--target fr'),
    commandRunPathMatchesCurrentRun: p47RollbackGuardCommand.includes(`--run ${runRel}`),
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
    'Keep the P47 rollback/post-apply guard command unexecuted until P46 is production-apply-transaction-contract ready.',
    'After future P46 PASS, run only the exact P47 no-write rollback guard command recorded by this simulation.',
    'Keep P47 as no-write guard contract until a later command preflight proves the exact guard command can refresh without production apply execution.',
    'Regenerate P61 if P60, P46, P47 guard dependencies, run id, target locale or closed production flags change.',
  ];

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-p46-to-p47-rollback-guard-handoff-simulation-v2-packet-v0',
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
      postApplyRollbackGuardContractV2Packet: rel(repoRoot, p47Path),
      exactApprovalP46ApplyTransactionCommandPreflightV2Packet: rel(repoRoot, p60Path),
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
      p47RollbackGuardCommand,
      p47RollbackGuardCommandExecutedByThisScript: false,
      requiresP60Ready: true,
      requiresP46NoWriteContract: true,
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
    schemaVersion: 'gustav-exact-approval-p46-to-p47-rollback-guard-handoff-simulation-dry-run-v2',
    runId,
    generatedAt: report.generatedAt,
    dryRunOnly: true,
    handoffState: report.summary.handoffState,
    currentP46ToP47HandoffWouldOpenRollbackGuard: report.summary.currentP46ToP47HandoffWouldOpenRollbackGuard,
    simulatedPostP46P47WouldOpenRollbackGuard: report.summary.simulatedPostP46P47WouldOpenRollbackGuard,
    p47RollbackGuardCommand,
    p47RollbackGuardCommandExecutedByThisScript: false,
    readyForApply: false,
    activationApproved: false,
  });
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval P46 to P47 rollback guard handoff simulation V2 packet: ${status}`);
  console.log(`Handoff state: ${report.summary.handoffState}`);
  console.log(`P60 ready/state: ${report.summary.p60Ready ? 'yes' : 'no'}/${report.summary.p60State}`);
  console.log(`P46 status/state: ${report.summary.p46Status}/${report.summary.p46TransactionState}`);
  console.log(`P47 status/state: ${report.summary.p47Status}/${report.summary.p47GuardState}`);
  console.log(`Current handoff would open rollback guard: ${report.summary.currentP46ToP47HandoffWouldOpenRollbackGuard ? 'yes' : 'no'}`);
  console.log(`Simulated post-P46 P47 would open rollback guard: ${report.summary.simulatedPostP46P47WouldOpenRollbackGuard ? 'yes' : 'no'}`);
  console.log(`P47 rollback guard command executed by this script: ${report.summary.p47RollbackGuardCommandWouldExecuteByThisScript ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
