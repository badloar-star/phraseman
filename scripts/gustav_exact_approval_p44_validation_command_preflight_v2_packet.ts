import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedState: string;
  preflightState: string;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  currentRunId: string;
  p31HandoffReady: boolean;
  p44WaitingForExactApproval: boolean;
  p50Ready: boolean;
  p55Status: string;
  p55State: string;
  p55Ready: boolean;
  p55FreshAfterP54: boolean;
  requiredApprovalSentence: string;
  approvalSourcePath: string;
  defaultApprovalSourcePath: string;
  approvalSourceExists: boolean;
  approvalSourceContainsExactSentence: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  commandTargetsFr: boolean;
  commandRunPathMatchesCurrentRun: boolean;
  commandUsesDefaultApprovalSource: boolean;
  commandWouldExecuteByThisScript: boolean;
  commandWouldOnlyValidateReservedActivePaths: boolean;
  p44ValidationCommandString: string;
  activationApproved: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
  productionWritesAllowed: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  runtimeDownloadsEnabled: boolean;
  storageMigrationAllowed: boolean;
  cloudSyncMigrationAllowed: boolean;
};

type Report = {
  schemaVersion: 'gustav-exact-approval-p44-validation-command-preflight-v2-packet-v0';
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
  summary: {
    targetLocale: 'fr';
    sourceLocales: ['ru', 'uk'];
    preflightState: string;
    p31HandoffReady: boolean;
    p44WaitingForExactApproval: boolean;
    p50Ready: boolean;
    p55Ready: boolean;
    p55State: string;
    p55FreshAfterP54: boolean;
    requiredApprovalSentencePresent: boolean;
    requiredApprovalSentenceSha256: string;
    approvalSourcePath: string;
    defaultApprovalSourcePath: string;
    approvalSourceIsDefaultPath: boolean;
    approvalSourceExists: boolean;
    approvalSourceContainsExactSentence: boolean;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    commandTargetsFr: boolean;
    commandRunPathMatchesCurrentRun: boolean;
    commandUsesDefaultApprovalSource: boolean;
    commandWouldOnlyValidateReservedActivePaths: boolean;
    p44ValidationCommandAllowedNow: boolean;
    p44ValidationCommandAllowedAfterP31Create: boolean;
    p44ValidationCommandWouldExecuteByThisScript: false;
    currentP44WouldOpenSequencing: boolean;
    simulatedPostP31P44WouldOpenSequencing: boolean;
    activeApprovalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    productionWritesAllowed: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    downloadablePacksPublished: false;
    storageMigrationAllowed: false;
    cloudSyncMigrationAllowed: false;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  p44ValidationCommandPreflight: {
    dryRunOnly: true;
    commandString: string;
    commandAllowedNow: boolean;
    commandAllowedAfterP31Create: boolean;
    executedByThisScript: false;
    requiresRunScopedApprovalSource: true;
    requiresExactApprovalSentence: true;
    requiresBothActiveApprovalArtifacts: true;
    reservedApprovalReceiptPath: string;
    reservedActiveHashLockPath: string;
  };
  nextRequiredActions: string[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    dryRunOnly: true;
    p44ValidationCommandExecutedByThisScript: false;
    activeApprovalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    productionAppFilesModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
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

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return readJson<JsonObject>(filePath);
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function summaryOf(value: JsonObject): JsonObject {
  return object(value.summary);
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
}

function b(value: JsonObject, key: string): boolean {
  return value[key] === true;
}

function fileMtimeMs(filePath: string): number {
  return fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
}

function sha256Text(value: string): string {
  if (value.trim() === '') return '';
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function sourceIsDefault(input: EvaluationInput): boolean {
  return path.resolve(input.approvalSourcePath) === path.resolve(input.defaultApprovalSourcePath);
}

function commandCanRun(input: EvaluationInput): boolean {
  return (
    input.p31HandoffReady &&
    input.p44WaitingForExactApproval &&
    input.p50Ready &&
    input.p55Ready &&
    input.p55FreshAfterP54 &&
    input.requiredApprovalSentence.trim() !== '' &&
    input.approvalSourceExists &&
    input.approvalSourceContainsExactSentence &&
    sourceIsDefault(input) &&
    input.activeApprovalReceiptExists &&
    input.activeHashLockExists &&
    input.commandTargetsFr &&
    input.commandRunPathMatchesCurrentRun &&
    input.commandUsesDefaultApprovalSource &&
    input.commandWouldOnlyValidateReservedActivePaths &&
    !input.commandWouldExecuteByThisScript &&
    !input.activationApproved &&
    !input.readyForApply &&
    !input.mayModifyProductionAppFiles &&
    !input.productionWritesAllowed &&
    !input.serverUploadAllowed &&
    !input.firebaseUploadAllowed &&
    !input.runtimeDownloadsEnabled &&
    !input.storageMigrationAllowed &&
    !input.cloudSyncMigrationAllowed
  );
}

function evaluate(input: EvaluationInput): { state: string; findings: Finding[]; commandAllowedNow: boolean; commandAllowedAfterP31Create: boolean } {
  const findings: Finding[] = [];
  const commandAllowedNow = commandCanRun(input);
  const postP31Fixture = {
    ...input,
    approvalSourceExists: true,
    approvalSourceContainsExactSentence: true,
    activeApprovalReceiptExists: true,
    activeHashLockExists: true,
  };
  const commandAllowedAfterP31Create = commandCanRun(postP31Fixture);

  if (!input.p31HandoffReady) addFinding(findings, 'blocker', 'P31_HANDOFF_NOT_READY', 'P31 handoff must be safe-hold or future-created before P44 validation preflight.');
  if (!input.p44WaitingForExactApproval) addFinding(findings, 'blocker', 'P44_NOT_WAITING_FOR_EXACT_APPROVAL', 'P44 must still wait for exact approval artifacts.');
  if (!input.p50Ready) addFinding(findings, 'blocker', 'P50_NOT_READY', 'P50 final pre-approval hash-lock must be ready.');
  if (
    input.p55Status !== 'PASS' ||
    !input.p55Ready ||
    !input.p55FreshAfterP54 ||
    (input.p55State !== 'p31_create_command_preflight_ready_waiting_for_exact_source' &&
      input.p55State !== 'p31_create_command_preflight_ready_for_explicit_create_command')
  ) {
    addFinding(findings, 'blocker', 'P55_NOT_READY', 'P55 P31 create command preflight must be fresh and ready before P44 validation command preflight.');
  }
  if (input.requiredApprovalSentence.trim() === '') addFinding(findings, 'blocker', 'REQUIRED_APPROVAL_SENTENCE_MISSING', 'The exact approval sentence must exist in P30.');
  if (!sourceIsDefault(input)) addFinding(findings, 'blocker', 'APPROVAL_SOURCE_NOT_DEFAULT', 'P44 validation command must use the run-scoped default approval source.', input.approvalSourcePath);
  if (input.approvalSourceExists && !input.approvalSourceContainsExactSentence) addFinding(findings, 'blocker', 'APPROVAL_SOURCE_MISSING_EXACT_SENTENCE', 'Existing approval source does not contain the exact required approval sentence.', input.approvalSourcePath);
  if (input.activeApprovalReceiptExists !== input.activeHashLockExists) addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACT_MISMATCH', 'P44 validation command requires both active approval artifacts together.');
  if (!input.commandTargetsFr) addFinding(findings, 'blocker', 'COMMAND_TARGET_NOT_FR', 'P44 validation command must target fr.');
  if (!input.commandRunPathMatchesCurrentRun) addFinding(findings, 'blocker', 'COMMAND_RUN_NOT_CURRENT', 'P44 validation command must use the current Gustav run path.');
  if (!input.commandUsesDefaultApprovalSource) addFinding(findings, 'blocker', 'COMMAND_NOT_USING_DEFAULT_SOURCE', 'P44 validation command must point to the run-scoped default approval source.');
  if (!input.commandWouldOnlyValidateReservedActivePaths) addFinding(findings, 'blocker', 'COMMAND_VALIDATION_SCOPE_NOT_RESERVED', 'P44 validation command must validate only the reserved active approval artifact paths.');
  if (input.commandWouldExecuteByThisScript) addFinding(findings, 'blocker', 'PREFLIGHT_EXECUTED_COMMAND', 'P56 is a dry-run preflight and must not execute P44 validation.');
  if (!commandAllowedAfterP31Create) addFinding(findings, 'blocker', 'POST_P31_P44_COMMAND_NOT_ALLOWED', 'With exact source plus both active artifacts, P44 validation command must become allowed by preflight.');
  if (
    input.activationApproved ||
    input.readyForApply ||
    input.mayModifyProductionAppFiles ||
    input.productionWritesAllowed ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.runtimeDownloadsEnabled ||
    input.storageMigrationAllowed ||
    input.cloudSyncMigrationAllowed
  ) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P56 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  if (blockers > 0) return { state: 'blocked_by_findings', findings, commandAllowedNow, commandAllowedAfterP31Create };
  if (commandAllowedNow) return { state: 'p44_validation_command_preflight_ready_for_validation_command', findings, commandAllowedNow, commandAllowedAfterP31Create };
  return { state: 'p44_validation_command_preflight_ready_waiting_for_p31_active_artifacts', findings, commandAllowedNow, commandAllowedAfterP31Create };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{ id: string; expectedState: string; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_waits_for_p31_active_artifacts', expectedState: 'p44_validation_command_preflight_ready_waiting_for_p31_active_artifacts', mutate: () => undefined },
    { id: 'post_p31_fixture_allows_validation', expectedState: 'p44_validation_command_preflight_ready_for_validation_command', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = true; input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; } },
    { id: 'stale_p55_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p55FreshAfterP54 = false; } },
    { id: 'source_without_exact_sentence_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = false; } },
    { id: 'only_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'only_hash_lock_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeHashLockExists = true; } },
    { id: 'wrong_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandTargetsFr = false; } },
    { id: 'wrong_run_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandRunPathMatchesCurrentRun = false; } },
    { id: 'wrong_source_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.approvalSourcePath = path.join(path.dirname(input.defaultApprovalSourcePath), '..', 'approval.txt'); input.commandUsesDefaultApprovalSource = false; } },
    { id: 'validation_scope_drift_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandWouldOnlyValidateReservedActivePaths = false; } },
    { id: 'preflight_execute_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandWouldExecuteByThisScript = true; } },
    { id: 'ready_for_apply_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.readyForApply = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'storage_cloud_migration_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.storageMigrationAllowed = true; input.cloudSyncMigrationAllowed = true; } },
  ];
  return cases.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    const result = evaluate(fixture);
    const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
    return {
      id: test.id,
      expectedState: test.expectedState,
      preflightState: result.state,
      blockers,
      passed: result.state === test.expectedState,
    };
  });
}

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Exact Approval P44 Validation Command Preflight V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Preflight state: ${report.summary.preflightState}`,
    `- P31/P44/P50/P55 ready: ${report.summary.p31HandoffReady ? 'yes' : 'no'}/${report.summary.p44WaitingForExactApproval ? 'yes' : 'no'}/${report.summary.p50Ready ? 'yes' : 'no'}/${report.summary.p55Ready ? 'yes' : 'no'}`,
    `- Approval source exists/exact/default: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.approvalSourceIsDefaultPath ? 'yes' : 'no'}`,
    `- Active approval receipt/hash-lock exists: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Command fr/current-run/default-source/reserved-paths: ${report.summary.commandTargetsFr ? 'yes' : 'no'}/${report.summary.commandRunPathMatchesCurrentRun ? 'yes' : 'no'}/${report.summary.commandUsesDefaultApprovalSource ? 'yes' : 'no'}/${report.summary.commandWouldOnlyValidateReservedActivePaths ? 'yes' : 'no'}`,
    `- Command allowed now / after P31 create / executed by this script: ${report.summary.p44ValidationCommandAllowedNow ? 'yes' : 'no'}/${report.summary.p44ValidationCommandAllowedAfterP31Create ? 'yes' : 'no'}/${report.summary.p44ValidationCommandWouldExecuteByThisScript ? 'yes' : 'no'}`,
    `- Current/simulated P44 sequencing: ${report.summary.currentP44WouldOpenSequencing ? 'yes' : 'no'}/${report.summary.simulatedPostP31P44WouldOpenSequencing ? 'yes' : 'no'}`,
    `- Activation/apply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Upload/download/storage/cloud flags: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}/${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.storageMigrationAllowed ? 'yes' : 'no'}/${report.summary.cloudSyncMigrationAllowed ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Command',
    '',
    `\`${report.p44ValidationCommandPreflight.commandString}\``,
    '',
    '## Next Required Actions',
    '',
    ...report.nextRequiredActions.map((item) => `- ${item}`),
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  lines.push('', '## Safety', '');
  lines.push('- This packet is dry-run only.');
  lines.push('- It records the future P44 validation command but does not execute it.');
  lines.push('- It does not create active approval receipt/hash-lock files, modify production app files, upload, enable runtime downloads, migrate storage/cloud or approve activation.');
  lines.push('');
  return lines.join('\n');
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
  const reviewerDir = path.join(runDir, 'generated/fr/reviewer');
  const runRel = rel(repoRoot, runDir);

  const masterPath = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const p30Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const p31Path = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const p44Path = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const p50Path = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const p54Path = path.join(auditsDir, 'exact_approval_active_artifact_pair_simulation_v2_packet.json');
  const p55Path = path.join(auditsDir, 'exact_approval_p31_create_command_preflight_v2_packet.json');
  const defaultApprovalSourcePath = path.join(applyPlanDir, 'explicit_approval_input_v2.txt');
  const approvalSourcePath = path.resolve(repoRoot, argValue('--approval-source') ?? defaultApprovalSourcePath);
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_p44_validation_command_preflight_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_p44_validation_command_preflight_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_p44_validation_command_preflight_v2_packet.md');

  const master = readJsonOrEmpty(masterPath);
  const p30 = readJsonOrEmpty(p30Path);
  const p31 = readJsonOrEmpty(p31Path);
  const p44 = readJsonOrEmpty(p44Path);
  const p50 = readJsonOrEmpty(p50Path);
  const p55 = readJsonOrEmpty(p55Path);
  const masterSummary = summaryOf(master);
  const p31Summary = summaryOf(p31);
  const p44Summary = summaryOf(p44);
  const p50Summary = summaryOf(p50);
  const p55Summary = summaryOf(p55);

  const approvalSourceExists = fs.existsSync(approvalSourcePath);
  const approvalSourceText = approvalSourceExists ? fs.readFileSync(approvalSourcePath, 'utf8') : '';
  const requiredApprovalSentence = s(p30, 'requiredApprovalSentence');
  const requiredApprovalSentenceSha256 = sha256Text(requiredApprovalSentence);
  const approvalSourceContainsExactSentence = requiredApprovalSentence.trim() !== '' && approvalSourceText.includes(requiredApprovalSentence);
  const commandString = [
    'npx tsx scripts\\gustav_exact_approval_validation_gate_v2_packet.ts',
    `--run ${runRel}`,
    '--target fr',
    `--approval-source ${rel(repoRoot, defaultApprovalSourcePath)}`,
  ].join(' ');

  const activeApprovalReceiptExists = fs.existsSync(activeApprovalReceiptPath);
  const activeHashLockExists = fs.existsSync(activeHashLockPath);
  const input: EvaluationInput = {
    currentRunId: runId,
    p31HandoffReady:
      (s(p31, 'status') === 'HOLD' &&
        n(p31Summary, 'blockers') === 0 &&
        (s(p31Summary, 'receiptCreationState') === 'approval_receipt_creation_waiting_for_exact_sentence' ||
          s(p31Summary, 'receiptCreationState') === 'exact_sentence_present_creation_not_requested')) ||
      (b(p31Summary, 'activeApprovalReceiptCreated') && b(p31Summary, 'activeHashLockCreated')),
    p44WaitingForExactApproval:
      s(p44, 'status') === 'HOLD' &&
      n(p44Summary, 'blockers') === 0 &&
      s(p44Summary, 'validationState') === 'waiting_for_exact_approval_artifacts' &&
      !b(p44Summary, 'readyForProductionActivationSequencing') &&
      !b(p44Summary, 'readyForApply'),
    p50Ready:
      s(p50, 'status') === 'PASS' &&
      n(p50Summary, 'blockers') === 0 &&
      s(p50Summary, 'lockState') === 'final_preapproval_evidence_hash_lock_ready',
    p55Status: s(p55, 'status'),
    p55State: s(p55Summary, 'preflightState'),
    p55Ready:
      s(p55, 'status') === 'PASS' &&
      n(p55Summary, 'blockers') === 0 &&
      b(p55Summary, 'p31CreateCommandAllowedWhenExactSourcePresent') &&
      !b(p55Summary, 'p31CreateCommandWouldExecuteByThisScript') &&
      !b(p55Summary, 'readyForApply') &&
      n(p55Summary, 'fixtureProbes') > 0 &&
      n(p55Summary, 'fixtureProbesPassed') === n(p55Summary, 'fixtureProbes'),
    p55FreshAfterP54: fileMtimeMs(p55Path) >= fileMtimeMs(p54Path) && fileMtimeMs(p54Path) > 0,
    requiredApprovalSentence,
    approvalSourcePath,
    defaultApprovalSourcePath,
    approvalSourceExists,
    approvalSourceContainsExactSentence,
    activeApprovalReceiptExists,
    activeHashLockExists,
    commandTargetsFr: true,
    commandRunPathMatchesCurrentRun: runId === '2026-05-19_fr_inventory_v0a1',
    commandUsesDefaultApprovalSource: path.resolve(approvalSourcePath) === path.resolve(defaultApprovalSourcePath),
    commandWouldExecuteByThisScript: false,
    commandWouldOnlyValidateReservedActivePaths: true,
    p44ValidationCommandString: commandString,
    activationApproved: b(masterSummary, 'activationApproved') || b(p55Summary, 'activationApproved'),
    readyForApply: b(masterSummary, 'readyForApply') || b(p55Summary, 'readyForApply'),
    mayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles') || b(p55Summary, 'mayModifyProductionAppFiles'),
    productionWritesAllowed: b(masterSummary, 'productionWritesAllowed') || b(p55Summary, 'productionWritesAllowed'),
    serverUploadAllowed: b(masterSummary, 'serverUploadAllowed') || b(p55Summary, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(masterSummary, 'firebaseUploadAllowed') || b(p55Summary, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(masterSummary, 'runtimeDownloadsEnabled') || b(p55Summary, 'runtimeDownloadsEnabled'),
    storageMigrationAllowed: b(masterSummary, 'storageMigrationAllowed') || b(p55Summary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(masterSummary, 'cloudSyncMigrationAllowed') || b(p55Summary, 'cloudSyncMigrationAllowed'),
  };

  const result = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(result.findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = result.findings.filter((finding) => finding.severity === 'warning').length;
  const preflightState = blockers > 0 ? 'blocked_by_findings' : result.state;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const nextRequiredActions = [
    'Do not run P44 validation until P31 creates both active approval artifacts from the exact approval source.',
    'When both active artifacts exist, run only the P44 validation command recorded by this preflight and keep production apply closed until P44 passes.',
    'If P44 validates active artifacts, continue through P45-P47 production activation sequence preflights before any apply/upload/download/storage/cloud migration opens.',
    'If command target, run path, source path or reserved validation scope changes, regenerate P56 before P44 validation.',
  ];

  const dryRun = {
    schemaVersion: 'gustav-exact-approval-p44-validation-command-preflight-dry-run-v2-v0',
    runId,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    preflightState,
    commandString,
    commandAllowedNow: result.commandAllowedNow,
    commandAllowedAfterP31Create: result.commandAllowedAfterP31Create,
    executedByThisScript: false,
    currentP44WouldOpenSequencing: result.commandAllowedNow,
    simulatedPostP31P44WouldOpenSequencing: result.commandAllowedAfterP31Create,
    reservedApprovalReceiptPath: rel(repoRoot, activeApprovalReceiptPath),
    reservedActiveHashLockPath: rel(repoRoot, activeHashLockPath),
    approvalSourcePath: rel(repoRoot, approvalSourcePath),
    approvalSourceExists,
    approvalSourceContainsExactSentence,
    activeApprovalReceiptExists,
    activeHashLockExists,
    activationApproved: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
  writeJson(dryRunPath, dryRun);

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-p44-validation-command-preflight-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      masterManifest: rel(repoRoot, masterPath),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, p30Path),
      explicitApprovalReceiptCreationGateV2Packet: rel(repoRoot, p31Path),
      exactApprovalValidationGateV2Packet: rel(repoRoot, p44Path),
      finalPreapprovalEvidenceHashLockV2Packet: rel(repoRoot, p50Path),
      exactApprovalP31CreateCommandPreflightV2Packet: rel(repoRoot, p55Path),
      approvalSource: rel(repoRoot, approvalSourcePath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      p44ValidationCommandPreflightDryRun: rel(repoRoot, dryRunPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      preflightState,
      p31HandoffReady: input.p31HandoffReady,
      p44WaitingForExactApproval: input.p44WaitingForExactApproval,
      p50Ready: input.p50Ready,
      p55Ready: input.p55Ready,
      p55State: input.p55State,
      p55FreshAfterP54: input.p55FreshAfterP54,
      requiredApprovalSentencePresent: input.requiredApprovalSentence.trim() !== '',
      requiredApprovalSentenceSha256,
      approvalSourcePath: rel(repoRoot, input.approvalSourcePath),
      defaultApprovalSourcePath: rel(repoRoot, input.defaultApprovalSourcePath),
      approvalSourceIsDefaultPath: sourceIsDefault(input),
      approvalSourceExists: input.approvalSourceExists,
      approvalSourceContainsExactSentence: input.approvalSourceContainsExactSentence,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      commandTargetsFr: input.commandTargetsFr,
      commandRunPathMatchesCurrentRun: input.commandRunPathMatchesCurrentRun,
      commandUsesDefaultApprovalSource: input.commandUsesDefaultApprovalSource,
      commandWouldOnlyValidateReservedActivePaths: input.commandWouldOnlyValidateReservedActivePaths,
      p44ValidationCommandAllowedNow: result.commandAllowedNow,
      p44ValidationCommandAllowedAfterP31Create: result.commandAllowedAfterP31Create,
      p44ValidationCommandWouldExecuteByThisScript: false,
      currentP44WouldOpenSequencing: result.commandAllowedNow,
      simulatedPostP31P44WouldOpenSequencing: result.commandAllowedAfterP31Create,
      activeApprovalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      productionWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      downloadablePacksPublished: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    p44ValidationCommandPreflight: {
      dryRunOnly: true,
      commandString,
      commandAllowedNow: result.commandAllowedNow,
      commandAllowedAfterP31Create: result.commandAllowedAfterP31Create,
      executedByThisScript: false,
      requiresRunScopedApprovalSource: true,
      requiresExactApprovalSentence: true,
      requiresBothActiveApprovalArtifacts: true,
      reservedApprovalReceiptPath: rel(repoRoot, activeApprovalReceiptPath),
      reservedActiveHashLockPath: rel(repoRoot, activeHashLockPath),
    },
    nextRequiredActions,
    probes,
    findings: result.findings,
    safety: {
      dryRunOnly: true,
      p44ValidationCommandExecutedByThisScript: false,
      activeApprovalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      productionAppFilesModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV exact approval P44 validation command preflight V2 packet: ${status}`);
  console.log(`Preflight state: ${report.summary.preflightState}`);
  console.log(`Approval source exists/exact: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`);
  console.log(`Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`P44 validation command allowed now: ${report.summary.p44ValidationCommandAllowedNow ? 'yes' : 'no'}`);
  console.log(`P44 validation command allowed after P31 create: ${report.summary.p44ValidationCommandAllowedAfterP31Create ? 'yes' : 'no'}`);
  console.log(`P44 validation command executed by this script: ${report.summary.p44ValidationCommandWouldExecuteByThisScript ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
