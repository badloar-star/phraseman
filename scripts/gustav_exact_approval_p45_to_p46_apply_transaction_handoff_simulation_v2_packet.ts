import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type HandoffState =
  | 'p45_to_p46_handoff_simulation_ready_waiting_for_p45_sequence'
  | 'p45_to_p46_handoff_simulation_ready_for_p46_apply_transaction_contract'
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
  p58Status: string;
  p58Ready: boolean;
  p58State: string;
  p58FreshAfterP46: boolean;
  p58CommandAllowedNow: boolean;
  p58CommandAllowedAfterP44Validation: boolean;
  p58CommandExecutedByThisScript: boolean;
  p45Status: string;
  p45PreflightState: string;
  p45ReadyForProductionActivationSequence: boolean;
  p45ReadyForApply: boolean;
  p45MayModifyProductionAppFiles: boolean;
  p45ActivationApproved: boolean;
  p46Status: string;
  p46TransactionState: string;
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
  p46ShaMismatches: number;
  p46MissingEntryFiles: number;
  p46InvalidServerPaths: number;
  p46InvalidCacheKeys: number;
  p46OpenEntryFlags: number;
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
  p58Ready: boolean;
  p58State: string;
  p58CommandAllowedNow: boolean;
  p58CommandAllowedAfterP44Validation: boolean;
  p58CommandExecutedByThisScript: boolean;
  p45Status: string;
  p45PreflightState: string;
  p45ReadyForProductionActivationSequence: boolean;
  p46Status: string;
  p46TransactionState: string;
  p46ReadyForProductionApplyTransaction: boolean;
  p46ServerManifestEntries: number;
  p46PayloadFilesChecked: number;
  p46IndexFilesChecked: number;
  p46SliceManifestFilesChecked: number;
  p46DryRunHashLocks: number;
  p46AllowedFutureMutationSteps: number;
  p46RollbackSteps: number;
  p46P45ReadyProbePassed: boolean;
  currentP45ToP46HandoffWouldOpenTransaction: boolean;
  simulatedPostP45P46WouldOpenTransaction: boolean;
  p46ContractCommandWouldExecuteByThisScript: boolean;
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
  schemaVersion: 'gustav-exact-approval-p45-to-p46-apply-transaction-handoff-simulation-v2-packet-v0';
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
    p46ContractCommand: string;
    p46ContractCommandExecutedByThisScript: false;
    requiresP58Ready: true;
    requiresP45SequenceReady: true;
    requiresP46NoWriteContract: true;
    requiresRuntimeSliceIntegrity: true;
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
    p46ContractCommandExecutedByThisScript: false;
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

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const p58Accepted =
    input.p58Status === 'PASS' &&
    input.p58Ready &&
    input.p58FreshAfterP46 &&
    (input.p58State === 'p45_sequence_command_preflight_ready_waiting_for_p44_validation' ||
      input.p58State === 'p45_sequence_command_preflight_ready_for_sequence_refresh') &&
    input.p58CommandAllowedAfterP44Validation &&
    !input.p58CommandExecutedByThisScript;
  const p45Waiting =
    input.p45Status === 'HOLD' &&
    input.p45PreflightState === 'waiting_for_exact_approval_validation' &&
    !input.p45ReadyForProductionActivationSequence;
  const p45Ready =
    input.p45Status === 'PASS' &&
    input.p45PreflightState === 'production_activation_sequence_preflight_ready' &&
    input.p45ReadyForProductionActivationSequence;
  const p46Waiting =
    input.p46Status === 'HOLD' &&
    input.p46TransactionState === 'waiting_for_activation_sequence_preflight' &&
    !input.p46ReadyForProductionApplyTransaction;
  const p46Ready =
    input.p46Status === 'PASS' &&
    input.p46TransactionState === 'production_apply_transaction_contract_ready' &&
    input.p46ReadyForProductionApplyTransaction;
  const runtimeSliceIntegrityReady =
    input.p46ServerManifestEntries === 12 &&
    input.p46PayloadFilesChecked === 12 &&
    input.p46IndexFilesChecked === 12 &&
    input.p46SliceManifestFilesChecked === 12 &&
    input.p46DryRunHashLocks >= 60 &&
    input.p46AllowedFutureMutationSteps >= 3 &&
    input.p46RollbackSteps >= 2 &&
    input.p46ShaMismatches === 0 &&
    input.p46MissingEntryFiles === 0 &&
    input.p46InvalidServerPaths === 0 &&
    input.p46InvalidCacheKeys === 0 &&
    input.p46OpenEntryFlags === 0;
  const currentHandoffWouldOpenTransaction = p45Ready && p46Ready;
  const simulatedPostP45P46WouldOpenTransaction =
    p58Accepted &&
    input.p46P45ReadyProbePassed &&
    runtimeSliceIntegrityReady;

  if (!p58Accepted) {
    addFinding(findings, 'blocker', 'P58_NOT_READY_FOR_P45_TO_P46_HANDOFF', 'P59 requires P58 to be fresh, PASS and closed, with P45 command allowed only after P44 validation.');
  }
  if (!p45Waiting && !p45Ready) {
    addFinding(findings, 'blocker', 'P45_NOT_IN_ACCEPTED_HANDOFF_STATE', 'P45 must be waiting for exact approval validation or sequence-preflight ready.');
  }
  if (!p46Waiting && !p46Ready) {
    addFinding(findings, 'blocker', 'P46_NOT_IN_ACCEPTED_HANDOFF_STATE', 'P46 must be waiting for activation sequence preflight or apply-transaction contract ready.');
  }
  if (p45Ready && !p46Ready) {
    addFinding(findings, 'blocker', 'P45_READY_BUT_P46_NOT_READY', 'If P45 is already sequence-ready, P46 must be refreshed into production_apply_transaction_contract_ready before apply can continue.');
  }
  if (p46Ready && !p45Ready) {
    addFinding(findings, 'blocker', 'P46_READY_WITHOUT_P45_READY', 'P46 cannot be contract-ready unless P45 is sequence-preflight ready.');
  }
  if (!input.p46P45ReadyProbePassed) {
    addFinding(findings, 'blocker', 'P46_P45_READY_PROBE_MISSING', 'P46 must prove p45_ready_contract_ready advances to production_apply_transaction_contract_ready.');
  }
  if (!runtimeSliceIntegrityReady) {
    addFinding(findings, 'blocker', 'P46_RUNTIME_SLICE_INTEGRITY_NOT_READY', 'P46 must prove 12 server entries, payload/index/manifest hashes, rollback markers and dry-run hash-lock coverage.');
  }
  if (!simulatedPostP45P46WouldOpenTransaction) {
    addFinding(findings, 'blocker', 'POST_P45_P46_TRANSACTION_SIMULATION_NOT_OPEN', 'A simulated sequence-ready P45 must open only the P46 no-write transaction contract.');
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
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P59 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }
  if (input.masterBlockers > 0) {
    addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', `Master manifest has ${input.masterBlockers} blocker(s).`);
  }
  if (input.commandWouldExecuteByThisScript) {
    addFinding(findings, 'blocker', 'PREFLIGHT_EXECUTED_COMMAND', 'P59 is a simulation and must not execute P46 contract generation.');
  }
  if (p45Waiting && p46Waiting) {
    addFinding(findings, 'info', 'WAITING_FOR_P45_SEQUENCE', 'Current apply transaction remains closed until P45 sequence preflight is ready.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const handoffState: HandoffState =
    blockers > 0
      ? 'blocked_by_findings'
      : currentHandoffWouldOpenTransaction
        ? 'p45_to_p46_handoff_simulation_ready_for_p46_apply_transaction_contract'
        : 'p45_to_p46_handoff_simulation_ready_waiting_for_p45_sequence';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      handoffState,
      p58Ready: input.p58Ready,
      p58State: input.p58State,
      p58CommandAllowedNow: input.p58CommandAllowedNow,
      p58CommandAllowedAfterP44Validation: input.p58CommandAllowedAfterP44Validation,
      p58CommandExecutedByThisScript: input.p58CommandExecutedByThisScript,
      p45Status: input.p45Status,
      p45PreflightState: input.p45PreflightState,
      p45ReadyForProductionActivationSequence: input.p45ReadyForProductionActivationSequence,
      p46Status: input.p46Status,
      p46TransactionState: input.p46TransactionState,
      p46ReadyForProductionApplyTransaction: input.p46ReadyForProductionApplyTransaction,
      p46ServerManifestEntries: input.p46ServerManifestEntries,
      p46PayloadFilesChecked: input.p46PayloadFilesChecked,
      p46IndexFilesChecked: input.p46IndexFilesChecked,
      p46SliceManifestFilesChecked: input.p46SliceManifestFilesChecked,
      p46DryRunHashLocks: input.p46DryRunHashLocks,
      p46AllowedFutureMutationSteps: input.p46AllowedFutureMutationSteps,
      p46RollbackSteps: input.p46RollbackSteps,
      p46P45ReadyProbePassed: input.p46P45ReadyProbePassed,
      currentP45ToP46HandoffWouldOpenTransaction: currentHandoffWouldOpenTransaction,
      simulatedPostP45P46WouldOpenTransaction,
      p46ContractCommandWouldExecuteByThisScript: input.commandWouldExecuteByThisScript,
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
  input.p46Status = 'PASS';
  input.p46TransactionState = 'production_apply_transaction_contract_ready';
  input.p46ReadyForProductionApplyTransaction = true;
}

function runProbes(base: EvaluationInput): Probe[] {
  const tests: Array<{ id: string; expectedState: HandoffState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_waits_for_p45_sequence', expectedState: 'p45_to_p46_handoff_simulation_ready_waiting_for_p45_sequence', mutate: () => undefined },
    { id: 'post_p45_fixture_allows_p46_contract', expectedState: 'p45_to_p46_handoff_simulation_ready_for_p46_apply_transaction_contract', mutate: makePostP45Ready },
    { id: 'stale_p58_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p58FreshAfterP46 = false; } },
    { id: 'p58_command_after_p44_not_allowed_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p58CommandAllowedAfterP44Validation = false; } },
    { id: 'p58_command_executed_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p58CommandExecutedByThisScript = true; } },
    { id: 'missing_p46_probe_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46P45ReadyProbePassed = false; } },
    { id: 'p45_ready_p46_not_ready_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45Status = 'PASS'; input.p45PreflightState = 'production_activation_sequence_preflight_ready'; input.p45ReadyForProductionActivationSequence = true; } },
    { id: 'p46_ready_without_p45_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46Status = 'PASS'; input.p46TransactionState = 'production_apply_transaction_contract_ready'; input.p46ReadyForProductionApplyTransaction = true; } },
    { id: 'server_entry_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46ServerManifestEntries = 11; } },
    { id: 'payload_hash_check_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46PayloadFilesChecked = 11; } },
    { id: 'dry_run_hash_lock_low_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46DryRunHashLocks = 1; } },
    { id: 'p46_sha_mismatch_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46ShaMismatches = 1; } },
    { id: 'p46_open_entry_flag_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46OpenEntryFlags = 1; } },
    { id: 'p46_ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46ReadyForApply = true; } },
    { id: 'server_upload_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.serverUploadAllowed = true; } },
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
    '# GUSTAV Exact Approval P45 To P46 Apply Transaction Handoff Simulation V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Handoff state: \`${report.summary.handoffState}\``,
    `- P58 ready/state/command now/after-P44/executed: ${report.summary.p58Ready ? 'yes' : 'no'}/${report.summary.p58State}/${report.summary.p58CommandAllowedNow ? 'yes' : 'no'}/${report.summary.p58CommandAllowedAfterP44Validation ? 'yes' : 'no'}/${report.summary.p58CommandExecutedByThisScript ? 'yes' : 'no'}`,
    `- P45 status/state/sequence: ${report.summary.p45Status}/${report.summary.p45PreflightState}/${report.summary.p45ReadyForProductionActivationSequence ? 'yes' : 'no'}`,
    `- P46 status/state/transaction: ${report.summary.p46Status}/${report.summary.p46TransactionState}/${report.summary.p46ReadyForProductionApplyTransaction ? 'yes' : 'no'}`,
    `- P46 server/payload/index/manifest/hash-locks: ${report.summary.p46ServerManifestEntries}/${report.summary.p46PayloadFilesChecked}/${report.summary.p46IndexFilesChecked}/${report.summary.p46SliceManifestFilesChecked}/${report.summary.p46DryRunHashLocks}`,
    `- P46 future mutations/rollback/probe: ${report.summary.p46AllowedFutureMutationSteps}/${report.summary.p46RollbackSteps}/${report.summary.p46P45ReadyProbePassed ? 'yes' : 'no'}`,
    `- Current handoff would open transaction: ${report.summary.currentP45ToP46HandoffWouldOpenTransaction ? 'yes' : 'no'}`,
    `- Simulated post-P45 P46 would open transaction: ${report.summary.simulatedPostP45P46WouldOpenTransaction ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Handoff Simulation',
    '',
    `- P46 contract command: \`${report.handoffSimulation.p46ContractCommand}\``,
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
  const p58Path = path.join(auditsDir, 'exact_approval_p45_sequence_command_preflight_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_packet.md');

  const p45 = readJsonOrEmpty(p45Path);
  const p46 = readJsonOrEmpty(p46Path);
  const p58 = readJsonOrEmpty(p58Path);
  const master = readJsonOrEmpty(masterPath);
  const targetManifest = readJsonOrEmpty(targetManifestPath);
  const serverManifest = readJsonOrEmpty(serverManifestPath);
  const p45Summary = summaryOf(p45);
  const p46Summary = summaryOf(p46);
  const p58Summary = summaryOf(p58);
  const masterSummary = summaryOf(master);
  const targetActivation = object(targetManifest.activation);
  const runRel = rel(repoRoot, runDir).split('/').join('\\');
  const p46ContractCommand = `npx tsx scripts\\gustav_production_apply_transaction_contract_v2_packet.ts --run ${runRel} --target fr`;

  const p58Ready =
    fs.existsSync(p58Path) &&
    s(p58, 'status') === 'PASS' &&
    n(p58Summary, 'blockers') === 0 &&
    (s(p58Summary, 'preflightState') === 'p45_sequence_command_preflight_ready_waiting_for_p44_validation' ||
      s(p58Summary, 'preflightState') === 'p45_sequence_command_preflight_ready_for_sequence_refresh') &&
    b(p58Summary, 'p57Ready') &&
    b(p58Summary, 'p45SequenceCommandAllowedAfterP44Validation') &&
    !b(p58Summary, 'p45SequenceCommandWouldExecuteByThisScript') &&
    !b(p58Summary, 'readyForApply') &&
    !b(p58Summary, 'mayModifyProductionAppFiles') &&
    n(p58Summary, 'fixtureProbes') > 0 &&
    n(p58Summary, 'fixtureProbesPassed') === n(p58Summary, 'fixtureProbes');

  const input: EvaluationInput = {
    currentRunId: runId,
    p58Status: s(p58, 'status'),
    p58Ready,
    p58State: s(p58Summary, 'preflightState'),
    p58FreshAfterP46: fileMtimeMs(p58Path) >= fileMtimeMs(p46Path) && fileMtimeMs(p46Path) > 0,
    p58CommandAllowedNow: b(p58Summary, 'p45SequenceCommandAllowedNow'),
    p58CommandAllowedAfterP44Validation: b(p58Summary, 'p45SequenceCommandAllowedAfterP44Validation'),
    p58CommandExecutedByThisScript: b(p58Summary, 'p45SequenceCommandWouldExecuteByThisScript'),
    p45Status: s(p45, 'status'),
    p45PreflightState: s(p45Summary, 'preflightState'),
    p45ReadyForProductionActivationSequence: b(p45Summary, 'readyForProductionActivationSequence'),
    p45ReadyForApply: b(p45Summary, 'readyForApply'),
    p45MayModifyProductionAppFiles: b(p45Summary, 'mayModifyProductionAppFiles'),
    p45ActivationApproved: b(p45Summary, 'activationApproved'),
    p46Status: s(p46, 'status'),
    p46TransactionState: s(p46Summary, 'transactionState'),
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
    p46ShaMismatches: n(p46Summary, 'shaMismatches'),
    p46MissingEntryFiles: n(p46Summary, 'missingEntryFiles'),
    p46InvalidServerPaths: n(p46Summary, 'invalidServerPaths'),
    p46InvalidCacheKeys: n(p46Summary, 'invalidCacheKeys'),
    p46OpenEntryFlags: n(p46Summary, 'openEntryFlags'),
    masterBlockers: masterActionableBlockerCount(master),
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
    'Keep P46 contract command unexecuted until P45 is sequence-preflight ready.',
    'After future P45 PASS, run only the P46 contract command recorded by this simulation and keep apply execution closed.',
    'Use P46 only as a no-write apply transaction contract until a later explicit apply gate verifies rollback and post-apply guards.',
    'Regenerate P59 if P46 probe ids, server manifest integrity, hash-lock coverage, run id or closed production flags change.',
  ];

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-p45-to-p46-apply-transaction-handoff-simulation-v2-packet-v0',
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
      exactApprovalP45SequenceCommandPreflightV2Packet: rel(repoRoot, p58Path),
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
      p46ContractCommand,
      p46ContractCommandExecutedByThisScript: false,
      requiresP58Ready: true,
      requiresP45SequenceReady: true,
      requiresP46NoWriteContract: true,
      requiresRuntimeSliceIntegrity: true,
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
      p46ContractCommandExecutedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(dryRunPath, {
    schemaVersion: 'gustav-exact-approval-p45-to-p46-apply-transaction-handoff-simulation-dry-run-v2',
    runId,
    generatedAt: report.generatedAt,
    dryRunOnly: true,
    handoffState: report.summary.handoffState,
    currentP45ToP46HandoffWouldOpenTransaction: report.summary.currentP45ToP46HandoffWouldOpenTransaction,
    simulatedPostP45P46WouldOpenTransaction: report.summary.simulatedPostP45P46WouldOpenTransaction,
    p46ContractCommand,
    p46ContractCommandExecutedByThisScript: false,
    readyForApply: false,
    activationApproved: false,
  });
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval P45 to P46 apply transaction handoff simulation V2 packet: ${status}`);
  console.log(`Handoff state: ${report.summary.handoffState}`);
  console.log(`P58 ready/state: ${report.summary.p58Ready ? 'yes' : 'no'}/${report.summary.p58State}`);
  console.log(`P45 status/state: ${report.summary.p45Status}/${report.summary.p45PreflightState}`);
  console.log(`P46 status/state: ${report.summary.p46Status}/${report.summary.p46TransactionState}`);
  console.log(`Current handoff would open transaction: ${report.summary.currentP45ToP46HandoffWouldOpenTransaction ? 'yes' : 'no'}`);
  console.log(`Simulated post-P45 P46 would open transaction: ${report.summary.simulatedPostP45P46WouldOpenTransaction ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
