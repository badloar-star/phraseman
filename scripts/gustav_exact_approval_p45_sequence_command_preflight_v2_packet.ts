import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type PreflightState =
  | 'p45_sequence_command_preflight_ready_waiting_for_p44_validation'
  | 'p45_sequence_command_preflight_ready_for_sequence_refresh'
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
  p57Status: string;
  p57Ready: boolean;
  p57State: string;
  p57FreshAfterP45: boolean;
  p57P45ClosedStateEquivalent: boolean;
  p57CurrentHandoffWouldOpenSequence: boolean;
  p57SimulatedPostP44P45WouldOpenSequence: boolean;
  p57CommandExecutedByThisScript: boolean;
  p44Status: string;
  p44ValidationState: string;
  p44ReadyForProductionActivationSequencing: boolean;
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
  p57Ready: boolean;
  p57State: string;
  p57FreshAfterP45OrEquivalent: boolean;
  p57CurrentHandoffWouldOpenSequence: boolean;
  p57SimulatedPostP44P45WouldOpenSequence: boolean;
  p57CommandExecutedByThisScript: boolean;
  p44Status: string;
  p44ValidationState: string;
  p44ReadyForProductionActivationSequencing: boolean;
  p45Status: string;
  p45PreflightState: string;
  p45ReadyForProductionActivationSequence: boolean;
  p45ValidatedP44ProbePassed: boolean;
  commandTargetsFr: boolean;
  commandRunPathMatchesCurrentRun: boolean;
  p45SequenceCommandAllowedNow: boolean;
  p45SequenceCommandAllowedAfterP44Validation: boolean;
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
  schemaVersion: 'gustav-exact-approval-p45-sequence-command-preflight-v2-packet-v0';
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
  p45SequenceCommandPreflight: {
    dryRunOnly: true;
    commandString: string;
    commandAllowedNow: boolean;
    commandAllowedAfterP44Validation: boolean;
    executedByThisScript: false;
    requiresCurrentRun: true;
    requiresTargetFr: true;
    requiresP57Ready: true;
    requiresP44ValidatedForSequence: true;
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
    p45SequenceCommandExecutedByThisScript: false;
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
  const p57Accepted =
    input.p57Status === 'PASS' &&
    input.p57Ready &&
    (input.p57FreshAfterP45 || input.p57P45ClosedStateEquivalent) &&
    (input.p57State === 'p44_to_p45_handoff_simulation_ready_waiting_for_p31_p44_validation' ||
      input.p57State === 'p44_to_p45_handoff_simulation_ready_for_p45_sequence_after_p44_validation') &&
    input.p57SimulatedPostP44P45WouldOpenSequence &&
    !input.p57CommandExecutedByThisScript;
  const p45Waiting =
    input.p45Status === 'HOLD' &&
    input.p45PreflightState === 'waiting_for_exact_approval_validation' &&
    !input.p45ReadyForProductionActivationSequence;
  const p45Ready =
    input.p45Status === 'PASS' &&
    input.p45PreflightState === 'production_activation_sequence_preflight_ready' &&
    input.p45ReadyForProductionActivationSequence;
  const p45SequenceCommandAllowedNow = p45Ready;
  const p45SequenceCommandAllowedAfterP44Validation =
    p57Accepted &&
    input.p45ValidatedP44ProbePassed;

  if (!p57Accepted) {
    addFinding(findings, 'blocker', 'P57_NOT_READY', 'P58 requires P57 to be fresh, PASS and closed, with simulated post-P44 P45 sequence handoff open.');
  }
  if (!input.commandTargetsFr) {
    addFinding(findings, 'blocker', 'COMMAND_TARGET_NOT_FR', 'P45 sequence command must target fr.');
  }
  if (!input.commandRunPathMatchesCurrentRun) {
    addFinding(findings, 'blocker', 'COMMAND_RUN_NOT_CURRENT', 'P45 sequence command must use the current Gustav run path.');
  }
  if (input.p45TargetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'P45_TARGET_LOCALE_MISMATCH', 'P45 source packet must stay scoped to targetLocale=fr.');
  }
  if (!p45Waiting && !p45Ready) {
    addFinding(findings, 'blocker', 'P45_NOT_IN_ACCEPTED_STATE', 'P45 must be waiting for exact approval validation or already sequence-preflight ready.');
  }
  if (!input.p45ValidatedP44ProbePassed) {
    addFinding(findings, 'blocker', 'P45_VALIDATED_P44_PROBE_MISSING', 'P45 must prove validated P44 advances to production_activation_sequence_preflight_ready.');
  }
  if (!p45SequenceCommandAllowedAfterP44Validation) {
    addFinding(findings, 'blocker', 'P45_COMMAND_NOT_ALLOWED_AFTER_P44_VALIDATION', 'P45 sequence command must become allowed under the validated-P44 fixture.');
  }
  if (p45SequenceCommandAllowedNow && input.p44ValidationState !== 'exact_approval_artifacts_validated_for_next_sequencing') {
    addFinding(findings, 'blocker', 'P45_COMMAND_OPEN_WITHOUT_VALIDATED_P44', 'P45 sequence command cannot be open now unless P44 is already validated for next sequencing.');
  }
  if (
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
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P58 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }
  if (input.masterBlockers > 0) {
    addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', `Master manifest has ${input.masterBlockers} blocker(s).`);
  }
  if (input.commandWouldExecuteByThisScript) {
    addFinding(findings, 'blocker', 'PREFLIGHT_EXECUTED_COMMAND', 'P58 is a command preflight and must not execute the P45 sequence command.');
  }
  if (p45Waiting) {
    addFinding(findings, 'info', 'WAITING_FOR_P44_VALIDATION', 'Current P45 sequence command remains closed until P44 validates active approval artifacts.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const preflightState: PreflightState =
    blockers > 0
      ? 'blocked_by_findings'
      : p45SequenceCommandAllowedNow
        ? 'p45_sequence_command_preflight_ready_for_sequence_refresh'
        : 'p45_sequence_command_preflight_ready_waiting_for_p44_validation';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      preflightState,
      p57Ready: input.p57Ready,
      p57State: input.p57State,
      p57FreshAfterP45OrEquivalent: input.p57FreshAfterP45 || input.p57P45ClosedStateEquivalent,
      p57CurrentHandoffWouldOpenSequence: input.p57CurrentHandoffWouldOpenSequence,
      p57SimulatedPostP44P45WouldOpenSequence: input.p57SimulatedPostP44P45WouldOpenSequence,
      p57CommandExecutedByThisScript: input.p57CommandExecutedByThisScript,
      p44Status: input.p44Status,
      p44ValidationState: input.p44ValidationState,
      p44ReadyForProductionActivationSequencing: input.p44ReadyForProductionActivationSequencing,
      p45Status: input.p45Status,
      p45PreflightState: input.p45PreflightState,
      p45ReadyForProductionActivationSequence: input.p45ReadyForProductionActivationSequence,
      p45ValidatedP44ProbePassed: input.p45ValidatedP44ProbePassed,
      commandTargetsFr: input.commandTargetsFr,
      commandRunPathMatchesCurrentRun: input.commandRunPathMatchesCurrentRun,
      p45SequenceCommandAllowedNow,
      p45SequenceCommandAllowedAfterP44Validation,
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

function makeP45Ready(input: EvaluationInput): void {
  input.p44Status = 'PASS';
  input.p44ValidationState = 'exact_approval_artifacts_validated_for_next_sequencing';
  input.p44ReadyForProductionActivationSequencing = true;
  input.p45Status = 'PASS';
  input.p45PreflightState = 'production_activation_sequence_preflight_ready';
  input.p45ReadyForProductionActivationSequence = true;
}

function runProbes(base: EvaluationInput): Probe[] {
  const tests: Array<{ id: string; expectedState: PreflightState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_waits_for_p44_validation', expectedState: 'p45_sequence_command_preflight_ready_waiting_for_p44_validation', mutate: () => undefined },
    { id: 'validated_p44_fixture_allows_sequence_refresh', expectedState: 'p45_sequence_command_preflight_ready_for_sequence_refresh', mutate: makeP45Ready },
    { id: 'stale_p57_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p57FreshAfterP45 = false; input.p57P45ClosedStateEquivalent = false; } },
    { id: 'p57_simulation_not_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p57SimulatedPostP44P45WouldOpenSequence = false; } },
    { id: 'p57_command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p57CommandExecutedByThisScript = true; } },
    { id: 'missing_p45_probe_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45ValidatedP44ProbePassed = false; } },
    { id: 'wrong_command_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandTargetsFr = false; } },
    { id: 'wrong_command_run_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandRunPathMatchesCurrentRun = false; } },
    { id: 'p45_wrong_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45TargetLocale = 'en'; } },
    { id: 'p45_ready_without_p44_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45Status = 'PASS'; input.p45PreflightState = 'production_activation_sequence_preflight_ready'; input.p45ReadyForProductionActivationSequence = true; } },
    { id: 'p45_ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45ReadyForApply = true; } },
    { id: 'p45_activation_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45ActivationApproved = true; } },
    { id: 'master_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.masterBlockers = 1; } },
    { id: 'server_upload_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.serverUploadAllowed = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'storage_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; } },
    { id: 'cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.cloudSyncMigrationAllowed = true; } },
    { id: 'command_execution_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandWouldExecuteByThisScript = true; } },
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
    '# GUSTAV Exact Approval P45 Sequence Command Preflight V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Preflight state: \`${report.summary.preflightState}\``,
    `- P57 ready/state/fresh-or-equivalent/sim/executed: ${report.summary.p57Ready ? 'yes' : 'no'}/${report.summary.p57State}/${report.summary.p57FreshAfterP45OrEquivalent ? 'yes' : 'no'}/${report.summary.p57SimulatedPostP44P45WouldOpenSequence ? 'yes' : 'no'}/${report.summary.p57CommandExecutedByThisScript ? 'yes' : 'no'}`,
    `- P44 status/state/sequence: ${report.summary.p44Status}/${report.summary.p44ValidationState}/${report.summary.p44ReadyForProductionActivationSequencing ? 'yes' : 'no'}`,
    `- P45 status/state/sequence/probe: ${report.summary.p45Status}/${report.summary.p45PreflightState}/${report.summary.p45ReadyForProductionActivationSequence ? 'yes' : 'no'}/${report.summary.p45ValidatedP44ProbePassed ? 'yes' : 'no'}`,
    `- Command target/run: ${report.summary.commandTargetsFr ? 'fr' : 'wrong'}/${report.summary.commandRunPathMatchesCurrentRun ? 'current' : 'wrong'}`,
    `- Command allowed now/after-P44/executed: ${report.summary.p45SequenceCommandAllowedNow ? 'yes' : 'no'}/${report.summary.p45SequenceCommandAllowedAfterP44Validation ? 'yes' : 'no'}/${report.summary.p45SequenceCommandWouldExecuteByThisScript ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## P45 Sequence Command',
    '',
    `- \`${report.p45SequenceCommandPreflight.commandString}\``,
    `- Allowed now: ${report.p45SequenceCommandPreflight.commandAllowedNow ? 'yes' : 'no'}`,
    `- Allowed after P44 validation: ${report.p45SequenceCommandPreflight.commandAllowedAfterP44Validation ? 'yes' : 'no'}`,
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
  lines.push('- It does not execute P45, create active approval artifacts, write production app files, upload packs, enable runtime downloads, run storage/cloud migrations or approve production apply.');
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
  const p57Path = path.join(auditsDir, 'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_p45_sequence_command_preflight_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_p45_sequence_command_preflight_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_p45_sequence_command_preflight_v2_packet.md');

  const p44 = readJsonOrEmpty(p44Path);
  const p45 = readJsonOrEmpty(p45Path);
  const p57 = readJsonOrEmpty(p57Path);
  const master = readJsonOrEmpty(masterPath);
  const targetManifest = readJsonOrEmpty(targetManifestPath);
  const serverManifest = readJsonOrEmpty(serverManifestPath);
  const p44Summary = summaryOf(p44);
  const p45Summary = summaryOf(p45);
  const p57Summary = summaryOf(p57);
  const masterSummary = summaryOf(master);
  const targetActivation = object(targetManifest.activation);
  const runRel = rel(repoRoot, runDir).split('/').join('\\');
  const commandString = `npx tsx scripts\\gustav_production_activation_sequence_preflight_v2_packet.ts --run ${runRel} --target fr`;

  const p57Ready =
    fs.existsSync(p57Path) &&
    s(p57, 'status') === 'PASS' &&
    n(p57Summary, 'blockers') === 0 &&
    (s(p57Summary, 'handoffState') === 'p44_to_p45_handoff_simulation_ready_waiting_for_p31_p44_validation' ||
      s(p57Summary, 'handoffState') === 'p44_to_p45_handoff_simulation_ready_for_p45_sequence_after_p44_validation') &&
    b(p57Summary, 'p56Ready') &&
    b(p57Summary, 'simulatedPostP44P45WouldOpenSequence') &&
    !b(p57Summary, 'p45SequenceCommandWouldExecuteByThisScript') &&
    !b(p57Summary, 'readyForApply') &&
    !b(p57Summary, 'mayModifyProductionAppFiles') &&
    n(p57Summary, 'fixtureProbes') > 0 &&
    n(p57Summary, 'fixtureProbesPassed') === n(p57Summary, 'fixtureProbes');

  const input: EvaluationInput = {
    currentRunId: runId,
    p57Status: s(p57, 'status'),
    p57Ready,
    p57State: s(p57Summary, 'handoffState'),
    p57FreshAfterP45: fileMtimeMs(p57Path) >= fileMtimeMs(p45Path) && fileMtimeMs(p45Path) > 0,
    p57P45ClosedStateEquivalent:
      s(p57, 'status') === 'PASS' &&
      b(p57Summary, 'simulatedPostP44P45WouldOpenSequence') &&
      s(p57Summary, 'p45Status') === s(p45, 'status') &&
      s(p57Summary, 'p45PreflightState') === s(p45Summary, 'preflightState') &&
      s(p45, 'status') === 'HOLD' &&
      s(p45Summary, 'preflightState') === 'waiting_for_exact_approval_validation' &&
      !b(p45Summary, 'readyForProductionActivationSequence') &&
      !b(p45Summary, 'activationApproved') &&
      !b(p45Summary, 'readyForApply') &&
      !b(p45Summary, 'mayModifyProductionAppFiles'),
    p57CurrentHandoffWouldOpenSequence: b(p57Summary, 'currentP44ToP45HandoffWouldOpenSequence'),
    p57SimulatedPostP44P45WouldOpenSequence: b(p57Summary, 'simulatedPostP44P45WouldOpenSequence'),
    p57CommandExecutedByThisScript: b(p57Summary, 'p45SequenceCommandWouldExecuteByThisScript'),
    p44Status: s(p44, 'status'),
    p44ValidationState: s(p44Summary, 'validationState'),
    p44ReadyForProductionActivationSequencing: b(p44Summary, 'readyForProductionActivationSequencing'),
    p45Status: s(p45, 'status'),
    p45PreflightState: s(p45Summary, 'preflightState'),
    p45TargetLocale: s(p45Summary, 'targetLocale'),
    p45ReadyForProductionActivationSequence: b(p45Summary, 'readyForProductionActivationSequence'),
    p45ReadyForApply: b(p45Summary, 'readyForApply'),
    p45MayModifyProductionAppFiles: b(p45Summary, 'mayModifyProductionAppFiles'),
    p45ActivationApproved: b(p45Summary, 'activationApproved'),
    p45ValidatedP44ProbePassed: probePassed(p45, 'validated_p44_preflight_ready'),
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
    'Keep P45 sequence command unexecuted until P44 validates active approval artifacts.',
    'After future P44 validation, run only the exact P45 sequence command recorded by this preflight.',
    'Keep activationApproved, readyForApply, uploads, runtime downloads and storage/cloud migrations closed after P45 refresh.',
    'Regenerate P58 if P45 command path, run id, target locale, P57 handoff contract or closed production flags change.',
  ];

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-p45-sequence-command-preflight-v2-packet-v0',
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
      exactApprovalP44ToP45SequenceHandoffSimulationV2Packet: rel(repoRoot, p57Path),
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
    p45SequenceCommandPreflight: {
      dryRunOnly: true,
      commandString,
      commandAllowedNow: evaluation.p45SequenceCommandAllowedNow,
      commandAllowedAfterP44Validation: evaluation.p45SequenceCommandAllowedAfterP44Validation,
      executedByThisScript: false,
      requiresCurrentRun: true,
      requiresTargetFr: true,
      requiresP57Ready: true,
      requiresP44ValidatedForSequence: true,
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
      p45SequenceCommandExecutedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(dryRunPath, {
    schemaVersion: 'gustav-exact-approval-p45-sequence-command-preflight-dry-run-v2',
    runId,
    generatedAt: report.generatedAt,
    dryRunOnly: true,
    preflightState: report.summary.preflightState,
    commandString,
    commandAllowedNow: report.summary.p45SequenceCommandAllowedNow,
    commandAllowedAfterP44Validation: report.summary.p45SequenceCommandAllowedAfterP44Validation,
    commandExecutedByThisScript: false,
    readyForApply: false,
    activationApproved: false,
  });
  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval P45 sequence command preflight V2 packet: ${status}`);
  console.log(`Preflight state: ${report.summary.preflightState}`);
  console.log(`P57 ready/state: ${report.summary.p57Ready ? 'yes' : 'no'}/${report.summary.p57State}`);
  console.log(`P45 status/state: ${report.summary.p45Status}/${report.summary.p45PreflightState}`);
  console.log(`P45 sequence command allowed now: ${report.summary.p45SequenceCommandAllowedNow ? 'yes' : 'no'}`);
  console.log(`P45 sequence command allowed after P44 validation: ${report.summary.p45SequenceCommandAllowedAfterP44Validation ? 'yes' : 'no'}`);
  console.log(`P45 sequence command executed by this script: ${report.summary.p45SequenceCommandWouldExecuteByThisScript ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
