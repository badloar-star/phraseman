import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type PreflightState =
  | 'p48_safe_continuation_command_preflight_ready_for_refresh_command'
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
  p63Status: string;
  p63Ready: boolean;
  p63State: string;
  p63FreshAfterP48: boolean;
  p63P62Ready: boolean;
  p63CurrentHandoffWouldOpenSafeContinuation: boolean;
  p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation: boolean;
  p63CommandExecutedByThisScript: boolean;
  p63ReadyForApply: boolean;
  p63MayModifyProductionAppFiles: boolean;
  p63ActivationApproved: boolean;
  p63ServerUploadAllowed: boolean;
  p63FirebaseUploadAllowed: boolean;
  p63DownloadablePacksPublished: boolean;
  p63RuntimeDownloadsEnabled: boolean;
  p63StorageMigrationAllowed: boolean;
  p63CloudSyncMigrationAllowed: boolean;
  p63FixtureProbesPassed: number;
  p63FixtureProbes: number;
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
  preflightState: PreflightState;
  p63Ready: boolean;
  p63State: string;
  p63P62Ready: boolean;
  p63CurrentHandoffWouldOpenSafeContinuation: boolean;
  p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation: boolean;
  p63CommandExecutedByThisScript: boolean;
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
  p48SafeContinuationCommandAllowedNow: boolean;
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
  schemaVersion: 'gustav-exact-approval-p48-safe-continuation-command-preflight-v2-packet-v0';
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
    p48SafeContinuationCommand: string;
    p48SafeContinuationCommandExecutedByThisScript: false;
    requiresP63Ready: true;
    requiresP48SafeContinuationReady: true;
    requiresOfficialSourceCoverageComplete: true;
    requiresProductionFlagsClosed: true;
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

function p63Accepted(input: EvaluationInput): boolean {
  return (
    input.p63Status === 'PASS' &&
    input.p63Ready &&
    input.p63FreshAfterP48 &&
    input.p63State === 'p47_to_p48_safe_continuation_handoff_ready_for_p48_safe_continuation_refresh' &&
    input.p63P62Ready &&
    input.p63CurrentHandoffWouldOpenSafeContinuation &&
    input.p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation &&
    !input.p63CommandExecutedByThisScript &&
    !input.p63ReadyForApply &&
    !input.p63MayModifyProductionAppFiles &&
    !input.p63ActivationApproved &&
    !input.p63ServerUploadAllowed &&
    !input.p63FirebaseUploadAllowed &&
    !input.p63DownloadablePacksPublished &&
    !input.p63RuntimeDownloadsEnabled &&
    !input.p63StorageMigrationAllowed &&
    !input.p63CloudSyncMigrationAllowed &&
    input.p63FixtureProbes > 0 &&
    input.p63FixtureProbesPassed === input.p63FixtureProbes
  );
}

function p48SafeContinuationReady(input: EvaluationInput): boolean {
  return (
    input.p48Status === 'PASS' &&
    input.p48ContinuationState === 'approval_wait_safe_continuation_ready' &&
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
    input.p63ReadyForApply ||
    input.p63MayModifyProductionAppFiles ||
    input.p63ActivationApproved ||
    input.p63ServerUploadAllowed ||
    input.p63FirebaseUploadAllowed ||
    input.p63DownloadablePacksPublished ||
    input.p63RuntimeDownloadsEnabled ||
    input.p63StorageMigrationAllowed ||
    input.p63CloudSyncMigrationAllowed ||
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

function commandCanRun(input: EvaluationInput): boolean {
  return (
    p63Accepted(input) &&
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
  const commandAllowedNow = commandCanRun(input);

  if (!p63Accepted(input)) {
    addFinding(findings, 'blocker', 'P63_NOT_READY', 'P64 requires fresh P63 PASS with P47-to-P48 handoff proof and no P48 command execution.');
  }
  if (!p48SafeContinuationReady(input)) {
    addFinding(findings, 'blocker', 'P48_SAFE_CONTINUATION_NOT_READY', 'P48 must be PASS and ready for no-write safe continuation refresh.');
  }
  if (!input.commandTargetsFr) {
    addFinding(findings, 'blocker', 'COMMAND_TARGET_NOT_FR', 'P48 safe continuation refresh command must target fr.');
  }
  if (!input.commandRunPathMatchesCurrentRun) {
    addFinding(findings, 'blocker', 'COMMAND_RUN_NOT_CURRENT', 'P48 safe continuation refresh command must use the current Gustav run path.');
  }
  if (forbiddenProductionFlagsOpen(input)) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P64 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }
  if (input.masterBlockers > 0) {
    addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', `Master manifest has ${input.masterBlockers} blocker(s).`);
  }
  if (input.commandWouldExecuteByThisScript) {
    addFinding(findings, 'blocker', 'PREFLIGHT_EXECUTED_COMMAND', 'P64 is a command preflight and must not execute P48 safe continuation refresh.');
  }
  if (!commandAllowedNow) {
    addFinding(findings, 'blocker', 'P48_SAFE_CONTINUATION_COMMAND_NOT_ALLOWED', 'The exact P48 safe continuation command is not allowed under current evidence.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const preflightState: PreflightState =
    blockers > 0 ? 'blocked_by_findings' : 'p48_safe_continuation_command_preflight_ready_for_refresh_command';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      preflightState,
      p63Ready: input.p63Ready,
      p63State: input.p63State,
      p63P62Ready: input.p63P62Ready,
      p63CurrentHandoffWouldOpenSafeContinuation: input.p63CurrentHandoffWouldOpenSafeContinuation,
      p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation: input.p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation,
      p63CommandExecutedByThisScript: input.p63CommandExecutedByThisScript,
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
      p48SafeContinuationCommandAllowedNow: commandAllowedNow,
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

function runProbes(base: EvaluationInput): Probe[] {
  const tests: Array<{ id: string; expectedState: PreflightState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_allows_p48_safe_continuation_refresh_command', expectedState: 'p48_safe_continuation_command_preflight_ready_for_refresh_command', mutate: () => undefined },
    { id: 'stale_p63_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p63FreshAfterP48 = false; } },
    { id: 'p63_state_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p63State = 'blocked_by_findings'; } },
    { id: 'p63_current_handoff_closed_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p63CurrentHandoffWouldOpenSafeContinuation = false; } },
    { id: 'p63_simulated_handoff_closed_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation = false; } },
    { id: 'p63_command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p63CommandExecutedByThisScript = true; } },
    { id: 'p63_probe_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p63FixtureProbesPassed = Math.max(0, input.p63FixtureProbes - 1); } },
    { id: 'p48_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48Status = 'BLOCK'; input.p48ContinuationState = 'blocked_by_findings'; } },
    { id: 'p48_not_ready_for_next_safe_pass_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ReadyForNextSafePass = false; } },
    { id: 'p48_active_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ActiveApprovalReceiptExists = true; } },
    { id: 'p48_active_hash_lock_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ActiveHashLockExists = true; } },
    { id: 'p48_official_source_rows_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48OfficialSourceRows = 1599; } },
    { id: 'p48_official_source_refs_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48OfficialSourceRowsWithRefs = 1599; } },
    { id: 'p48_legacy_residue_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48LegacyReviewResidueMatches = 1; } },
    { id: 'p48_generation_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ReadinessGenerationBlockers = 1; } },
    { id: 'p48_ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ReadyForApply = true; } },
    { id: 'p48_server_upload_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48ServerUploadAllowed = true; } },
    { id: 'p48_runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48RuntimeDownloadsEnabled = true; } },
    { id: 'p48_storage_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48StorageMigrationAllowed = true; } },
    { id: 'wrong_command_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandTargetsFr = false; } },
    { id: 'wrong_command_run_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandRunPathMatchesCurrentRun = false; } },
    { id: 'master_blockers_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.masterBlockers = 1; } },
    { id: 'safe_continuation_command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandWouldExecuteByThisScript = true; } },
  ];
  return tests.map((test) => {
    const input = clone(base);
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
    '# GUSTAV Exact Approval P48 Safe Continuation Command Preflight V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Preflight state: \`${report.summary.preflightState}\``,
    `- P63 ready/state/current/sim/executed: ${report.summary.p63Ready ? 'yes' : 'no'}/${report.summary.p63State}/${report.summary.p63CurrentHandoffWouldOpenSafeContinuation ? 'yes' : 'no'}/${report.summary.p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation ? 'yes' : 'no'}/${report.summary.p63CommandExecutedByThisScript ? 'yes' : 'no'}`,
    `- P48 status/state/next-safe: ${report.summary.p48Status}/${report.summary.p48ContinuationState}/${report.summary.p48ReadyForNextSafePass ? 'yes' : 'no'}`,
    `- P48 work/locked: ${report.summary.p48SafeContinuationWorkItems}/${report.summary.p48RemainingProductionLockedItems}`,
    `- P48 official-source rows/AI/refs/gates: ${report.summary.p48OfficialSourceRows}/${report.summary.p48OfficialSourceAi}/${report.summary.p48OfficialSourceRowsWithRefs}/${report.summary.p48OfficialSourceRowsWithGates}`,
    `- P48 active receipt/hash/residue: ${report.summary.p48ActiveApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.p48ActiveHashLockExists ? 'yes' : 'no'}/${report.summary.p48LegacyReviewResidueMatches}`,
    `- Command target/run/allowed/executed: ${report.summary.commandTargetsFr ? 'fr' : 'wrong'}/${report.summary.commandRunPathMatchesCurrentRun ? 'current' : 'wrong'}/${report.summary.p48SafeContinuationCommandAllowedNow ? 'yes' : 'no'}/${report.summary.p48SafeContinuationCommandWouldExecuteByThisScript ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Command Preflight',
    '',
    `- P48 safe continuation command: \`${report.commandPreflight.p48SafeContinuationCommand}\``,
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
  lines.push('', '## Safety', '');
  lines.push('- This packet is dry-run command preflight only.');
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
  const p63Path = path.join(auditsDir, 'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_packet.json');
  const p48Path = path.join(auditsDir, 'approval_wait_safe_continuation_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_p48_safe_continuation_command_preflight_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_p48_safe_continuation_command_preflight_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_p48_safe_continuation_command_preflight_v2_packet.md');

  const p63 = readJsonOrEmpty(p63Path);
  const p48 = readJsonOrEmpty(p48Path);
  const master = readJsonOrEmpty(masterPath);
  const p63Summary = summaryOf(p63);
  const p48Summary = summaryOf(p48);
  const masterSummary = summaryOf(master);
  const p63Handoff = object(p63.handoffSimulation);
  const runRel = rel(repoRoot, runDir).split('/').join('\\');
  const expectedP48SafeContinuationCommand = `npx tsx scripts\\gustav_approval_wait_safe_continuation_v2_packet.ts --run ${runRel} --target fr`;
  const p48SafeContinuationCommand = s(p63Handoff, 'p48SafeContinuationCommand') || expectedP48SafeContinuationCommand;

  const p63Ready =
    fs.existsSync(p63Path) &&
    s(p63, 'status') === 'PASS' &&
    n(p63Summary, 'blockers') === 0 &&
    s(p63Summary, 'targetLocale') === 'fr' &&
    s(p63Summary, 'handoffState') === 'p47_to_p48_safe_continuation_handoff_ready_for_p48_safe_continuation_refresh' &&
    b(p63Summary, 'p62Ready') &&
    b(p63Summary, 'currentP47ToP48HandoffWouldOpenSafeContinuation') &&
    b(p63Summary, 'simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation') &&
    !b(p63Summary, 'p48SafeContinuationCommandWouldExecuteByThisScript') &&
    !b(p63Summary, 'readyForApply') &&
    !b(p63Summary, 'mayModifyProductionAppFiles') &&
    !b(p63Summary, 'activationApproved') &&
    !b(p63Summary, 'serverUploadAllowed') &&
    !b(p63Summary, 'firebaseUploadAllowed') &&
    !b(p63Summary, 'downloadablePacksPublished') &&
    !b(p63Summary, 'runtimeDownloadsEnabled') &&
    !b(p63Summary, 'storageMigrationAllowed') &&
    !b(p63Summary, 'cloudSyncMigrationAllowed') &&
    n(p63Summary, 'fixtureProbes') > 0 &&
    n(p63Summary, 'fixtureProbesPassed') === n(p63Summary, 'fixtureProbes');

  const masterActionableBlockers = masterActionableBlockerCount(master);

  const input: EvaluationInput = {
    currentRunId: runId,
    p63Status: s(p63, 'status'),
    p63Ready,
    p63State: s(p63Summary, 'handoffState'),
    p63FreshAfterP48: fileMtimeMs(p63Path) >= fileMtimeMs(p48Path) && fileMtimeMs(p48Path) > 0,
    p63P62Ready: b(p63Summary, 'p62Ready'),
    p63CurrentHandoffWouldOpenSafeContinuation: b(p63Summary, 'currentP47ToP48HandoffWouldOpenSafeContinuation'),
    p63SimulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation: b(p63Summary, 'simulatedP62CommandReadyWouldOpenOnlyP48SafeContinuation'),
    p63CommandExecutedByThisScript: b(p63Summary, 'p48SafeContinuationCommandWouldExecuteByThisScript'),
    p63ReadyForApply: b(p63Summary, 'readyForApply'),
    p63MayModifyProductionAppFiles: b(p63Summary, 'mayModifyProductionAppFiles'),
    p63ActivationApproved: b(p63Summary, 'activationApproved'),
    p63ServerUploadAllowed: b(p63Summary, 'serverUploadAllowed'),
    p63FirebaseUploadAllowed: b(p63Summary, 'firebaseUploadAllowed'),
    p63DownloadablePacksPublished: b(p63Summary, 'downloadablePacksPublished'),
    p63RuntimeDownloadsEnabled: b(p63Summary, 'runtimeDownloadsEnabled'),
    p63StorageMigrationAllowed: b(p63Summary, 'storageMigrationAllowed'),
    p63CloudSyncMigrationAllowed: b(p63Summary, 'cloudSyncMigrationAllowed'),
    p63FixtureProbesPassed: n(p63Summary, 'fixtureProbesPassed'),
    p63FixtureProbes: n(p63Summary, 'fixtureProbes'),
    p48Status: s(p48, 'status'),
    p48ContinuationState: s(p48Summary, 'continuationState'),
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
    masterBlockers: masterActionableBlockers,
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    commandTargetsFr: p48SafeContinuationCommand.includes('--target fr'),
    commandRunPathMatchesCurrentRun: p48SafeContinuationCommand.includes(runRel),
    commandWouldExecuteByThisScript: false,
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-p48-safe-continuation-command-preflight-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      exactApprovalP47ToP48SafeContinuationHandoffSimulationV2Packet: rel(repoRoot, p63Path),
      approvalWaitSafeContinuationV2Packet: rel(repoRoot, p48Path),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      dryRun: rel(repoRoot, dryRunPath),
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
      p48SafeContinuationCommand,
      p48SafeContinuationCommandExecutedByThisScript: false,
      requiresP63Ready: true,
      requiresP48SafeContinuationReady: true,
      requiresOfficialSourceCoverageComplete: true,
      requiresProductionFlagsClosed: true,
    },
    nextRequiredActions: [
      'Integrate P64 into next-pass selection so ready P64 routes to P49 production-readiness completion audit refresh while production remains HOLD.',
      'Integrate P64 into the master manifest and consistency refresh.',
      'Re-run next-pass, master and consistency so P64 becomes a first-class checkpoint.',
      'Keep active approval receipt, hash lock, production apply, uploads, runtime downloads and storage/cloud migrations closed.',
    ],
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
    schemaVersion: 'gustav-exact-approval-p48-safe-continuation-command-preflight-dry-run-v2',
    runId,
    generatedAt: report.generatedAt,
    dryRunOnly: true,
    p48SafeContinuationCommand,
    p48SafeContinuationCommandAllowedNow: report.summary.p48SafeContinuationCommandAllowedNow,
    p48SafeContinuationCommandExecutedByThisScript: false,
    requiresP63Ready: true,
    requiresP48SafeContinuationReady: true,
    requiresOfficialSourceCoverageComplete: true,
    requiresProductionFlagsClosed: true,
    activationApproved: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
    storageMigrationAllowed: false,
    cloudSyncMigrationAllowed: false,
  });
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval P48 safe continuation command preflight V2 packet: ${status}`);
  console.log(`Preflight state: ${report.summary.preflightState}`);
  console.log(`P63 ready/state: ${report.summary.p63Ready ? 'yes' : 'no'}/${report.summary.p63State}`);
  console.log(`P48 status/state: ${report.summary.p48Status}/${report.summary.p48ContinuationState}`);
  console.log(`P48 command allowed/executed: ${report.summary.p48SafeContinuationCommandAllowedNow ? 'yes' : 'no'}/${report.summary.p48SafeContinuationCommandWouldExecuteByThisScript ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
