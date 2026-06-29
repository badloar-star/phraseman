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
  p31SafeHoldReady: boolean;
  p44WaitingForExactApproval: boolean;
  p50Ready: boolean;
  p54Status: string;
  p54State: string;
  p54Ready: boolean;
  p54FreshAfterP53: boolean;
  requiredApprovalSentence: string;
  approvalSourcePath: string;
  defaultApprovalSourcePath: string;
  approvalSourceExists: boolean;
  approvalSourceContainsExactSentence: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  commandIncludesExplicitCreateFlag: boolean;
  commandUsesDefaultApprovalSource: boolean;
  commandTargetsFr: boolean;
  commandRunPathMatchesCurrentRun: boolean;
  commandWouldExecuteByThisScript: boolean;
  commandWouldWriteOnlyReservedActivePaths: boolean;
  p31CreateCommandString: string;
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
  schemaVersion: 'gustav-exact-approval-p31-create-command-preflight-v2-packet-v0';
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
    p31SafeHoldReady: boolean;
    p44WaitingForExactApproval: boolean;
    p50Ready: boolean;
    p54Ready: boolean;
    p54State: string;
    p54FreshAfterP53: boolean;
    requiredApprovalSentencePresent: boolean;
    requiredApprovalSentenceSha256: string;
    approvalSourcePath: string;
    defaultApprovalSourcePath: string;
    approvalSourceIsDefaultPath: boolean;
    approvalSourceExists: boolean;
    approvalSourceContainsExactSentence: boolean;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    commandIncludesExplicitCreateFlag: boolean;
    commandUsesDefaultApprovalSource: boolean;
    commandTargetsFr: boolean;
    commandRunPathMatchesCurrentRun: boolean;
    commandWouldWriteOnlyReservedActivePaths: boolean;
    p31CreateCommandAllowedByPreflightNow: boolean;
    p31CreateCommandAllowedWhenExactSourcePresent: boolean;
    p31CreateCommandWouldExecuteByThisScript: false;
    currentP44WouldOpenSequencing: false;
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
  p31CreateCommandPreflight: {
    dryRunOnly: true;
    commandString: string;
    commandAllowedNow: boolean;
    commandAllowedWhenExactSourcePresent: boolean;
    executedByThisScript: false;
    requiresRunScopedApprovalSource: true;
    requiresExactApprovalSentence: true;
    requiresExplicitCreateFlag: true;
    reservedApprovalReceiptPath: string;
    reservedActiveHashLockPath: string;
  };
  nextRequiredActions: string[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    dryRunOnly: true;
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
    input.p31SafeHoldReady &&
    input.p44WaitingForExactApproval &&
    input.p50Ready &&
    input.p54Ready &&
    input.p54FreshAfterP53 &&
    input.requiredApprovalSentence.trim() !== '' &&
    input.approvalSourceExists &&
    input.approvalSourceContainsExactSentence &&
    sourceIsDefault(input) &&
    !input.activeApprovalReceiptExists &&
    !input.activeHashLockExists &&
    input.commandIncludesExplicitCreateFlag &&
    input.commandUsesDefaultApprovalSource &&
    input.commandTargetsFr &&
    input.commandRunPathMatchesCurrentRun &&
    input.commandWouldWriteOnlyReservedActivePaths &&
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

function evaluate(input: EvaluationInput): { state: string; findings: Finding[]; commandAllowedNow: boolean; commandAllowedIfExactSourcePresent: boolean } {
  const findings: Finding[] = [];
  const requiredSentencePresent = input.requiredApprovalSentence.trim() !== '';
  const commandAllowedNow = commandCanRun(input);
  const exactSourceFixture = { ...input, approvalSourceExists: true, approvalSourceContainsExactSentence: true };
  const commandAllowedIfExactSourcePresent = commandCanRun(exactSourceFixture);

  if (!input.p31SafeHoldReady) {
    addFinding(findings, 'blocker', 'P31_NOT_SAFE_HOLD', 'P31 must be safe hold before its create command can be preflighted.');
  }
  if (!input.p44WaitingForExactApproval) {
    addFinding(findings, 'blocker', 'P44_NOT_WAITING_FOR_EXACT_APPROVAL', 'P44 must still wait for active approval artifacts.');
  }
  if (!input.p50Ready) {
    addFinding(findings, 'blocker', 'P50_NOT_READY', 'P50 final pre-approval hash-lock must be ready.');
  }
  if (
    input.p54Status !== 'PASS' ||
    !input.p54Ready ||
    !input.p54FreshAfterP53 ||
    (input.p54State !== 'active_artifact_pair_simulation_ready_waiting_for_exact_source' &&
      input.p54State !== 'active_artifact_pair_simulation_ready_for_p31_create')
  ) {
    addFinding(findings, 'blocker', 'P54_NOT_READY', 'P54 active artifact pair simulation must be fresh and ready before P31 create command preflight.');
  }
  if (!requiredSentencePresent) {
    addFinding(findings, 'blocker', 'REQUIRED_APPROVAL_SENTENCE_MISSING', 'The exact approval sentence must exist in P30.');
  }
  if (!sourceIsDefault(input)) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_NOT_DEFAULT', 'P31 create command must use the run-scoped default approval source.', input.approvalSourcePath);
  }
  if (input.approvalSourceExists && !input.approvalSourceContainsExactSentence) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_MISSING_EXACT_SENTENCE', 'Existing approval source does not contain the exact required approval sentence.', input.approvalSourcePath);
  }
  if (input.activeApprovalReceiptExists || input.activeHashLockExists) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACTS_ALREADY_EXIST', 'P31 create command preflight is valid only before active artifacts exist.');
  }
  if (input.activeApprovalReceiptExists !== input.activeHashLockExists) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACT_MISMATCH', 'Active approval artifacts must never exist one-sided.');
  }
  if (!input.commandIncludesExplicitCreateFlag) {
    addFinding(findings, 'blocker', 'COMMAND_MISSING_EXPLICIT_CREATE_FLAG', 'P31 create command must include --create-active-receipt.');
  }
  if (!input.commandUsesDefaultApprovalSource) {
    addFinding(findings, 'blocker', 'COMMAND_NOT_USING_DEFAULT_SOURCE', 'P31 create command must point to the run-scoped default approval source.');
  }
  if (!input.commandTargetsFr) {
    addFinding(findings, 'blocker', 'COMMAND_TARGET_NOT_FR', 'P31 create command must target fr.');
  }
  if (!input.commandRunPathMatchesCurrentRun) {
    addFinding(findings, 'blocker', 'COMMAND_RUN_NOT_CURRENT', 'P31 create command must use the current Gustav run path.');
  }
  if (!input.commandWouldWriteOnlyReservedActivePaths) {
    addFinding(findings, 'blocker', 'COMMAND_WRITE_SCOPE_NOT_RESERVED', 'P31 create command must write only the reserved active receipt/hash-lock paths.');
  }
  if (input.commandWouldExecuteByThisScript) {
    addFinding(findings, 'blocker', 'PREFLIGHT_EXECUTED_COMMAND', 'P55 is a dry-run preflight and must never execute the P31 create command.');
  }
  if (!commandAllowedIfExactSourcePresent) {
    addFinding(findings, 'blocker', 'FUTURE_EXACT_SOURCE_COMMAND_NOT_ALLOWED', 'With a valid exact source fixture, the P31 create command must become allowed by preflight.');
  }
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
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P55 must keep activation/apply/upload/download/storage/cloud flags closed.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  if (blockers > 0) return { state: 'blocked_by_findings', findings, commandAllowedNow, commandAllowedIfExactSourcePresent };
  if (commandAllowedNow) return { state: 'p31_create_command_preflight_ready_for_explicit_create_command', findings, commandAllowedNow, commandAllowedIfExactSourcePresent };
  return { state: 'p31_create_command_preflight_ready_waiting_for_exact_source', findings, commandAllowedNow, commandAllowedIfExactSourcePresent };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{ id: string; expectedState: string; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_waits_for_exact_source', expectedState: 'p31_create_command_preflight_ready_waiting_for_exact_source', mutate: () => undefined },
    { id: 'exact_source_allows_command', expectedState: 'p31_create_command_preflight_ready_for_explicit_create_command', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = true; } },
    { id: 'stale_p54_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p54FreshAfterP53 = false; } },
    { id: 'missing_create_flag_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandIncludesExplicitCreateFlag = false; } },
    { id: 'wrong_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandTargetsFr = false; } },
    { id: 'wrong_run_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandRunPathMatchesCurrentRun = false; } },
    { id: 'wrong_approval_source_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.approvalSourcePath = path.join(path.dirname(input.defaultApprovalSourcePath), '..', 'approval.txt'); input.commandUsesDefaultApprovalSource = false; } },
    { id: 'source_without_exact_sentence_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.approvalSourceExists = true; input.approvalSourceContainsExactSentence = false; } },
    { id: 'active_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'active_hash_lock_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeHashLockExists = true; } },
    { id: 'p44_not_waiting_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44WaitingForExactApproval = false; } },
    { id: 'write_scope_drift_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.commandWouldWriteOnlyReservedActivePaths = false; } },
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
    '# GUSTAV Exact Approval P31 Create Command Preflight V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Preflight state: ${report.summary.preflightState}`,
    `- P31/P44/P50/P54 ready: ${report.summary.p31SafeHoldReady ? 'yes' : 'no'}/${report.summary.p44WaitingForExactApproval ? 'yes' : 'no'}/${report.summary.p50Ready ? 'yes' : 'no'}/${report.summary.p54Ready ? 'yes' : 'no'}`,
    `- Approval source exists/exact/default: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}/${report.summary.approvalSourceIsDefaultPath ? 'yes' : 'no'}`,
    `- Active approval receipt/hash-lock exists: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Command create/default/fr/current-run/reserved-paths: ${report.summary.commandIncludesExplicitCreateFlag ? 'yes' : 'no'}/${report.summary.commandUsesDefaultApprovalSource ? 'yes' : 'no'}/${report.summary.commandTargetsFr ? 'yes' : 'no'}/${report.summary.commandRunPathMatchesCurrentRun ? 'yes' : 'no'}/${report.summary.commandWouldWriteOnlyReservedActivePaths ? 'yes' : 'no'}`,
    `- Command allowed now / when exact source present / executed by this script: ${report.summary.p31CreateCommandAllowedByPreflightNow ? 'yes' : 'no'}/${report.summary.p31CreateCommandAllowedWhenExactSourcePresent ? 'yes' : 'no'}/${report.summary.p31CreateCommandWouldExecuteByThisScript ? 'yes' : 'no'}`,
    `- Current P44 would open sequencing: ${report.summary.currentP44WouldOpenSequencing ? 'yes' : 'no'}`,
    `- Activation/apply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Upload/download/storage/cloud flags: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}/${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.storageMigrationAllowed ? 'yes' : 'no'}/${report.summary.cloudSyncMigrationAllowed ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Command',
    '',
    `\`${report.p31CreateCommandPreflight.commandString}\``,
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
  lines.push('- It records the future P31 create command but does not execute it.');
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
  const p53Path = path.join(auditsDir, 'exact_approval_source_intake_transition_v2_packet.json');
  const p54Path = path.join(auditsDir, 'exact_approval_active_artifact_pair_simulation_v2_packet.json');
  const defaultApprovalSourcePath = path.join(applyPlanDir, 'explicit_approval_input_v2.txt');
  const approvalSourcePath = path.resolve(repoRoot, argValue('--approval-source') ?? defaultApprovalSourcePath);
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const dryRunPath = path.join(applyPlanDir, 'exact_approval_p31_create_command_preflight_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_p31_create_command_preflight_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_p31_create_command_preflight_v2_packet.md');

  const master = readJsonOrEmpty(masterPath);
  const p30 = readJsonOrEmpty(p30Path);
  const p31 = readJsonOrEmpty(p31Path);
  const p44 = readJsonOrEmpty(p44Path);
  const p50 = readJsonOrEmpty(p50Path);
  const p54 = readJsonOrEmpty(p54Path);
  const masterSummary = summaryOf(master);
  const p30Summary = summaryOf(p30);
  const p31Summary = summaryOf(p31);
  const p44Summary = summaryOf(p44);
  const p50Summary = summaryOf(p50);
  const p54Summary = summaryOf(p54);

  const approvalSourceExists = fs.existsSync(approvalSourcePath);
  const approvalSourceText = approvalSourceExists ? fs.readFileSync(approvalSourcePath, 'utf8') : '';
  const requiredApprovalSentence = s(p30, 'requiredApprovalSentence');
  const requiredApprovalSentenceSha256 = sha256Text(requiredApprovalSentence);
  const approvalSourceContainsExactSentence = requiredApprovalSentence.trim() !== '' && approvalSourceText.includes(requiredApprovalSentence);
  const commandString = [
    'npx tsx scripts\\gustav_explicit_approval_receipt_creation_gate_v2_packet.ts',
    `--run ${runRel}`,
    '--target fr',
    `--approval-source ${rel(repoRoot, defaultApprovalSourcePath)}`,
    '--create-active-receipt',
  ].join(' ');

  const input: EvaluationInput = {
    currentRunId: runId,
    p31SafeHoldReady:
      s(p31, 'status') === 'HOLD' &&
      n(p31Summary, 'blockers') === 0 &&
      (s(p31Summary, 'receiptCreationState') === 'approval_receipt_creation_waiting_for_exact_sentence' ||
        s(p31Summary, 'receiptCreationState') === 'exact_sentence_present_creation_not_requested') &&
      !b(p31Summary, 'activeApprovalReceiptCreated') &&
      !b(p31Summary, 'activeHashLockCreated') &&
      !b(p31Summary, 'readyForApply'),
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
    p54Status: s(p54, 'status'),
    p54State: s(p54Summary, 'pairSimulationState'),
    p54Ready:
      s(p54, 'status') === 'PASS' &&
      n(p54Summary, 'blockers') === 0 &&
      b(p54Summary, 'p53Ready') &&
      b(p54Summary, 'simulatedPairWouldPassP44AfterP31Create') &&
      !b(p54Summary, 'currentP44WouldOpenSequencing') &&
      !b(p54Summary, 'activeApprovalReceiptExists') &&
      !b(p54Summary, 'activeHashLockExists') &&
      !b(p54Summary, 'readyForApply') &&
      n(p54Summary, 'fixtureProbes') > 0 &&
      n(p54Summary, 'fixtureProbesPassed') === n(p54Summary, 'fixtureProbes'),
    p54FreshAfterP53: fileMtimeMs(p54Path) >= fileMtimeMs(p53Path) && fileMtimeMs(p53Path) > 0,
    requiredApprovalSentence,
    approvalSourcePath,
    defaultApprovalSourcePath,
    approvalSourceExists,
    approvalSourceContainsExactSentence,
    activeApprovalReceiptExists: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExists: fs.existsSync(activeHashLockPath),
    commandIncludesExplicitCreateFlag: true,
    commandUsesDefaultApprovalSource: path.resolve(approvalSourcePath) === path.resolve(defaultApprovalSourcePath),
    commandTargetsFr: true,
    commandRunPathMatchesCurrentRun: runId === '2026-05-19_fr_inventory_v0a1',
    commandWouldExecuteByThisScript: false,
    commandWouldWriteOnlyReservedActivePaths: true,
    p31CreateCommandString: commandString,
    activationApproved: b(masterSummary, 'activationApproved') || b(p54Summary, 'activationApproved'),
    readyForApply: b(masterSummary, 'readyForApply') || b(p54Summary, 'readyForApply'),
    mayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles') || b(p54Summary, 'mayModifyProductionAppFiles'),
    productionWritesAllowed: b(masterSummary, 'productionWritesAllowed') || b(p54Summary, 'productionWritesAllowed'),
    serverUploadAllowed: b(masterSummary, 'serverUploadAllowed') || b(p54Summary, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(masterSummary, 'firebaseUploadAllowed') || b(p54Summary, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(masterSummary, 'runtimeDownloadsEnabled') || b(p54Summary, 'runtimeDownloadsEnabled'),
    storageMigrationAllowed: b(masterSummary, 'storageMigrationAllowed') || b(p54Summary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(masterSummary, 'cloudSyncMigrationAllowed') || b(p54Summary, 'cloudSyncMigrationAllowed'),
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
    'Do not run the P31 create command until the run-scoped approval source file exists and contains the exact required approval sentence.',
    'When exact source exists, run only the command recorded by this preflight, including --create-active-receipt and the default approval source path.',
    'After P31 creates both active artifacts, immediately run P44 validation before any production activation sequencing, app apply, upload, runtime download or storage/cloud migration can open.',
    'If any command argument, run path, target, approval source path or reserved write path changes, regenerate P55 before allowing P31 create.',
  ];

  const dryRun = {
    schemaVersion: 'gustav-exact-approval-p31-create-command-preflight-dry-run-v2-v0',
    runId,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    preflightState,
    commandString,
    commandAllowedNow: result.commandAllowedNow,
    commandAllowedWhenExactSourcePresent: result.commandAllowedIfExactSourcePresent,
    executedByThisScript: false,
    activeApprovalReceiptCreatedByThisScript: false,
    activeHashLockCreatedByThisScript: false,
    reservedApprovalReceiptPath: rel(repoRoot, activeApprovalReceiptPath),
    reservedActiveHashLockPath: rel(repoRoot, activeHashLockPath),
    approvalSourcePath: rel(repoRoot, approvalSourcePath),
    approvalSourceExists,
    approvalSourceContainsExactSentence,
    activationApproved: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
  writeJson(dryRunPath, dryRun);

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-p31-create-command-preflight-v2-packet-v0',
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
      exactApprovalActiveArtifactPairSimulationV2Packet: rel(repoRoot, p54Path),
      approvalSource: rel(repoRoot, approvalSourcePath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      p31CreateCommandPreflightDryRun: rel(repoRoot, dryRunPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      preflightState,
      p31SafeHoldReady: input.p31SafeHoldReady,
      p44WaitingForExactApproval: input.p44WaitingForExactApproval,
      p50Ready: input.p50Ready,
      p54Ready: input.p54Ready,
      p54State: input.p54State,
      p54FreshAfterP53: input.p54FreshAfterP53,
      requiredApprovalSentencePresent: input.requiredApprovalSentence.trim() !== '',
      requiredApprovalSentenceSha256,
      approvalSourcePath: rel(repoRoot, input.approvalSourcePath),
      defaultApprovalSourcePath: rel(repoRoot, input.defaultApprovalSourcePath),
      approvalSourceIsDefaultPath: sourceIsDefault(input),
      approvalSourceExists: input.approvalSourceExists,
      approvalSourceContainsExactSentence: input.approvalSourceContainsExactSentence,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      commandIncludesExplicitCreateFlag: input.commandIncludesExplicitCreateFlag,
      commandUsesDefaultApprovalSource: input.commandUsesDefaultApprovalSource,
      commandTargetsFr: input.commandTargetsFr,
      commandRunPathMatchesCurrentRun: input.commandRunPathMatchesCurrentRun,
      commandWouldWriteOnlyReservedActivePaths: input.commandWouldWriteOnlyReservedActivePaths,
      p31CreateCommandAllowedByPreflightNow: result.commandAllowedNow,
      p31CreateCommandAllowedWhenExactSourcePresent: result.commandAllowedIfExactSourcePresent,
      p31CreateCommandWouldExecuteByThisScript: false,
      currentP44WouldOpenSequencing: false,
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
    p31CreateCommandPreflight: {
      dryRunOnly: true,
      commandString,
      commandAllowedNow: result.commandAllowedNow,
      commandAllowedWhenExactSourcePresent: result.commandAllowedIfExactSourcePresent,
      executedByThisScript: false,
      requiresRunScopedApprovalSource: true,
      requiresExactApprovalSentence: true,
      requiresExplicitCreateFlag: true,
      reservedApprovalReceiptPath: rel(repoRoot, activeApprovalReceiptPath),
      reservedActiveHashLockPath: rel(repoRoot, activeHashLockPath),
    },
    nextRequiredActions,
    probes,
    findings: result.findings,
    safety: {
      dryRunOnly: true,
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

  console.log(`GUSTAV exact approval P31 create command preflight V2 packet: ${status}`);
  console.log(`Preflight state: ${report.summary.preflightState}`);
  console.log(`Approval source exists/exact: ${report.summary.approvalSourceExists ? 'yes' : 'no'}/${report.summary.approvalSourceContainsExactSentence ? 'yes' : 'no'}`);
  console.log(`P31 create command allowed now: ${report.summary.p31CreateCommandAllowedByPreflightNow ? 'yes' : 'no'}`);
  console.log(`P31 create command allowed when exact source present: ${report.summary.p31CreateCommandAllowedWhenExactSourcePresent ? 'yes' : 'no'}`);
  console.log(`P31 create command executed by this script: ${report.summary.p31CreateCommandWouldExecuteByThisScript ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
