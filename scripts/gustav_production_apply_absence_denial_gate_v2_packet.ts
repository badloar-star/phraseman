import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type DenialState =
  | 'blocked_by_findings'
  | 'production_apply_denied_missing_active_approval_artifacts'
  | 'production_apply_denied_mismatched_active_approval_artifacts'
  | 'production_apply_denied_active_artifacts_require_separate_validation';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedState: DenialState;
  expectedApplyDenied: boolean;
  denialState: DenialState;
  productionApplyDenied: boolean;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type EvaluationInput = {
  p31SafeHoldReady: boolean;
  p31State: string;
  p31Blockers: number;
  p31PlainContinueRejected: boolean;
  p31CanContinueNonProductionAudit: boolean;
  p31ReadyForApply: boolean;
  p31MayModifyProductionAppFiles: boolean;
  p31ActiveApprovalReceiptCreated: boolean;
  p31ActiveHashLockCreated: boolean;
  p30Ready: boolean;
  p30Blockers: number;
  p30ReadyForApply: boolean;
  p30MayModifyProductionAppFiles: boolean;
  p29Ready: boolean;
  p29Blockers: number;
  p29ReadyForApply: boolean;
  p28Ready: boolean;
  p28Blockers: number;
  readinessApplyBlockers: number;
  readinessMayModifyProductionAppFiles: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  currentDirtyFiles: number;
  criticalHashLocks: number;
  targetManifestActivationApproved: boolean;
  targetManifestProductionReady: boolean;
  targetManifestReadyForApply: boolean;
  targetManifestMayModifyProductionAppFiles: boolean;
  targetManifestReadyForStorageCloudMigration: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  runtimeDownloadsEnabled: boolean;
  downloadablePacksPublished: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  denialState: DenialState;
  productionApplyDenied: true;
  denialReason: string;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  activeApprovalArtifactsMissing: boolean;
  activeApprovalArtifactsMismatched: boolean;
  p31SafeHoldReady: boolean;
  p31State: string;
  p31PlainContinueRejected: boolean;
  p31CanContinueNonProductionAudit: boolean;
  p30Ready: boolean;
  p29Ready: boolean;
  p28Ready: boolean;
  currentDirtyFiles: number;
  criticalHashLocks: number;
  readinessApplyBlockers: number;
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
  readyForProductionApply: false;
  readyForNonProductionContinuationAfterApplyDenialV2: boolean;
  canContinueNonProductionAudit: boolean;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-production-apply-absence-denial-gate-v2-packet-v0';
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
  activeApprovalPaths: {
    approvalReceipt: string;
    hashLockManifest: string;
  };
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    adminStateModifiedByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
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

function gitDirtyCount(repoRoot: string): number {
  const stdout = childProcess.execFileSync('git', ['status', '--short'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return stdout.split(/\r?\n/).filter((line) => line.trim() !== '').length;
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  if (!input.p31SafeHoldReady) {
    addFinding(findings, 'blocker', 'P31_NOT_SAFE_HOLD_READY', `P31 must be safe HOLD before P32, got state=${input.p31State}.`);
  }
  if (input.p31Blockers > 0) addFinding(findings, 'blocker', 'P31_BLOCKERS', `P31 has ${input.p31Blockers} blocker(s).`);
  if (!input.p31PlainContinueRejected) addFinding(findings, 'blocker', 'P31_DID_NOT_REJECT_PLAIN_CONTINUE', 'P31 must reject plain continue prompts.');
  if (!input.p31CanContinueNonProductionAudit) addFinding(findings, 'blocker', 'P31_CANNOT_CONTINUE_NON_PRODUCTION_AUDIT', 'P31 did not allow continued non-production audit work.');
  if (input.p31ActiveApprovalReceiptCreated || input.p31ActiveHashLockCreated) {
    addFinding(findings, 'blocker', 'P31_CREATED_ACTIVE_APPROVAL_ARTIFACTS', 'P31 must not create active approval/hash-lock artifacts in a plain continue pass.');
  }
  if (!input.p30Ready) addFinding(findings, 'blocker', 'P30_NOT_READY', 'P30 approval request presentation must be ready before P32.');
  if (input.p30Blockers > 0) addFinding(findings, 'blocker', 'P30_BLOCKERS', `P30 has ${input.p30Blockers} blocker(s).`);
  if (!input.p29Ready) addFinding(findings, 'blocker', 'P29_NOT_READY', 'P29 approval/hash-lock dry-run package must be ready before P32.');
  if (input.p29Blockers > 0) addFinding(findings, 'blocker', 'P29_BLOCKERS', `P29 has ${input.p29Blockers} blocker(s).`);
  if (!input.p28Ready) addFinding(findings, 'blocker', 'P28_NOT_READY', 'P28 runtime activation blocker plan must be ready before P32.');
  if (input.p28Blockers > 0) addFinding(findings, 'blocker', 'P28_BLOCKERS', `P28 has ${input.p28Blockers} blocker(s).`);
  if (input.criticalHashLocks < 12) addFinding(findings, 'blocker', 'HASH_LOCK_COVERAGE_TOO_LOW', 'Critical hash lock coverage is too low for apply-denial evidence.');

  const activeMismatch = input.activeApprovalReceiptExists !== input.activeHashLockExists;
  if (activeMismatch) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACTS_MISMATCH', 'Active approval receipt and active hash-lock must appear together; one without the other is invalid.');
  }
  if (input.activeApprovalReceiptExists && input.activeHashLockExists) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACTS_REQUIRE_SEPARATE_VALIDATION', 'Active approval artifacts are present; this absence-denial gate must be superseded by a separate active-approval validation gate.');
  }

  const forbiddenOpen =
    input.p31ReadyForApply ||
    input.p31MayModifyProductionAppFiles ||
    input.p30ReadyForApply ||
    input.p30MayModifyProductionAppFiles ||
    input.p29ReadyForApply ||
    input.readinessMayModifyProductionAppFiles ||
    input.targetManifestActivationApproved ||
    input.targetManifestProductionReady ||
    input.targetManifestReadyForApply ||
    input.targetManifestMayModifyProductionAppFiles ||
    input.targetManifestReadyForStorageCloudMigration ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.runtimeDownloadsEnabled ||
    input.downloadablePacksPublished;
  if (forbiddenOpen) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'At least one activation/upload/download/migration/apply flag is open.');
  }

  if (!input.activeApprovalReceiptExists && !input.activeHashLockExists) {
    addFinding(findings, 'info', 'PRODUCTION_APPLY_DENIED_BY_MISSING_ACTIVE_APPROVAL_ARTIFACTS', 'Production apply is denied because no active approval receipt and no active hash-lock exist.');
  }
  if (input.readinessApplyBlockers > 0) {
    addFinding(findings, 'info', 'READINESS_APPLY_BLOCKERS_REMAIN', `${input.readinessApplyBlockers} apply blocker(s) remain; production apply stays closed.`);
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  let denialState: DenialState = 'production_apply_denied_missing_active_approval_artifacts';
  if (blockers > 0) denialState = 'blocked_by_findings';
  else if (activeMismatch) denialState = 'production_apply_denied_mismatched_active_approval_artifacts';
  else if (input.activeApprovalReceiptExists && input.activeHashLockExists) denialState = 'production_apply_denied_active_artifacts_require_separate_validation';

  const canContinue =
    blockers === 0 &&
    input.p31CanContinueNonProductionAudit &&
    !input.activeApprovalReceiptExists &&
    !input.activeHashLockExists;

  return {
    findings,
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      denialState,
      productionApplyDenied: true,
      denialReason: !input.activeApprovalReceiptExists && !input.activeHashLockExists
        ? 'missing_active_approval_receipt_and_hash_lock'
        : activeMismatch
          ? 'mismatched_active_approval_artifacts'
          : 'active_artifacts_present_require_separate_validation',
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      activeApprovalArtifactsMissing: !input.activeApprovalReceiptExists && !input.activeHashLockExists,
      activeApprovalArtifactsMismatched: activeMismatch,
      p31SafeHoldReady: input.p31SafeHoldReady,
      p31State: input.p31State,
      p31PlainContinueRejected: input.p31PlainContinueRejected,
      p31CanContinueNonProductionAudit: input.p31CanContinueNonProductionAudit,
      p30Ready: input.p30Ready,
      p29Ready: input.p29Ready,
      p28Ready: input.p28Ready,
      currentDirtyFiles: input.currentDirtyFiles,
      criticalHashLocks: input.criticalHashLocks,
      readinessApplyBlockers: input.readinessApplyBlockers,
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
      readyForProductionApply: false,
      readyForNonProductionContinuationAfterApplyDenialV2: canContinue,
      canContinueNonProductionAudit: canContinue,
      blockers,
      warnings,
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{
    id: string;
    expectedState: DenialState;
    expectedApplyDenied: boolean;
    mutate: (input: EvaluationInput) => void;
  }> = [
    {
      id: 'missing_active_artifacts_denies_apply_without_blockers',
      expectedState: 'production_apply_denied_missing_active_approval_artifacts',
      expectedApplyDenied: true,
      mutate: () => undefined,
    },
    {
      id: 'active_receipt_without_hash_lock_rejected',
      expectedState: 'blocked_by_findings',
      expectedApplyDenied: true,
      mutate: (input) => { input.activeApprovalReceiptExists = true; },
    },
    {
      id: 'active_hash_lock_without_receipt_rejected',
      expectedState: 'blocked_by_findings',
      expectedApplyDenied: true,
      mutate: (input) => { input.activeHashLockExists = true; },
    },
    {
      id: 'both_active_artifacts_require_separate_validation',
      expectedState: 'blocked_by_findings',
      expectedApplyDenied: true,
      mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; },
    },
    {
      id: 'ready_for_apply_open_rejected',
      expectedState: 'blocked_by_findings',
      expectedApplyDenied: true,
      mutate: (input) => { input.targetManifestReadyForApply = true; },
    },
    {
      id: 'may_modify_production_app_files_rejected',
      expectedState: 'blocked_by_findings',
      expectedApplyDenied: true,
      mutate: (input) => { input.p31MayModifyProductionAppFiles = true; },
    },
    {
      id: 'server_upload_open_rejected',
      expectedState: 'blocked_by_findings',
      expectedApplyDenied: true,
      mutate: (input) => { input.serverUploadAllowed = true; },
    },
    {
      id: 'runtime_downloads_open_rejected',
      expectedState: 'blocked_by_findings',
      expectedApplyDenied: true,
      mutate: (input) => { input.runtimeDownloadsEnabled = true; },
    },
    {
      id: 'p31_not_safe_hold_rejected',
      expectedState: 'blocked_by_findings',
      expectedApplyDenied: true,
      mutate: (input) => { input.p31SafeHoldReady = false; input.p31State = 'blocked_by_findings'; },
    },
    {
      id: 'activation_approved_rejected',
      expectedState: 'blocked_by_findings',
      expectedApplyDenied: true,
      mutate: (input) => { input.targetManifestActivationApproved = true; },
    },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    testCase.mutate(fixture);
    const result = evaluate(fixture).evaluation;
    return {
      id: testCase.id,
      expectedState: testCase.expectedState,
      expectedApplyDenied: testCase.expectedApplyDenied,
      denialState: result.denialState,
      productionApplyDenied: result.productionApplyDenied,
      blockers: result.blockers,
      passed: result.denialState === testCase.expectedState && result.productionApplyDenied === testCase.expectedApplyDenied,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Production Apply Absence Denial Gate V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Denial state: ${report.summary.denialState}`,
    `- Denial reason: ${report.summary.denialReason}`,
    `- Production apply denied: ${report.summary.productionApplyDenied ? 'yes' : 'no'}`,
    `- Active approval receipt/hash lock exists: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Active approval artifacts missing: ${report.summary.activeApprovalArtifactsMissing ? 'yes' : 'no'}`,
    `- Active approval artifacts mismatched: ${report.summary.activeApprovalArtifactsMismatched ? 'yes' : 'no'}`,
    `- P31 safe HOLD ready: ${report.summary.p31SafeHoldReady ? 'yes' : 'no'}`,
    `- P31 state: ${report.summary.p31State}`,
    `- Plain continue rejected by P31: ${report.summary.p31PlainContinueRejected ? 'yes' : 'no'}`,
    `- Critical hash locks: ${report.summary.criticalHashLocks}`,
    `- Current dirty files: ${report.summary.currentDirtyFiles}`,
    `- Readiness apply blockers: ${report.summary.readinessApplyBlockers}`,
    `- Ready for production apply: ${report.summary.readyForProductionApply ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Server/Firebase upload allowed: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Storage/cloud migration allowed: ${report.summary.storageMigrationAllowed ? 'yes' : 'no'}/${report.summary.cloudSyncMigrationAllowed ? 'yes' : 'no'}`,
    `- Can continue non-production audit: ${report.summary.canContinueNonProductionAudit ? 'yes' : 'no'}`,
    `- Ready for non-production continuation after apply denial V2: ${report.summary.readyForNonProductionContinuationAfterApplyDenialV2 ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet writes only Gustav audit artifacts.',
    '- It does not create an active approval receipt.',
    '- It does not create an active hash-lock manifest.',
    '- It does not modify production app files, server delivery, storage/cloud state or runtime download flags.',
    '',
  );
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
  const packDir = path.join(runDir, 'pack_candidates', 'fr');
  const applyPlanDir = path.join(runDir, 'apply_plan');

  const p31Path = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const p30Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const p29Path = path.join(auditsDir, 'explicit_approval_receipt_hash_lock_gate_v2_packet.json');
  const p28Path = path.join(auditsDir, 'runtime_activation_blocker_plan_v2_packet.json');
  const readinessPath = path.join(auditsDir, 'readiness_blocker_reduction_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestDraftPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const outputJsonPath = path.join(auditsDir, 'production_apply_absence_denial_gate_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'production_apply_absence_denial_gate_v2_packet.md');

  const p31 = readJson<JsonObject>(p31Path);
  const p30 = readJson<JsonObject>(p30Path);
  const p29 = readJson<JsonObject>(p29Path);
  const p28 = readJson<JsonObject>(p28Path);
  const readiness = readJson<JsonObject>(readinessPath);
  const targetManifest = readJson<JsonObject>(targetManifestPath);
  const serverManifestDraft = readJson<JsonObject>(serverManifestDraftPath);
  const p31Summary = summaryOf(p31);
  const p30Summary = summaryOf(p30);
  const p29Summary = summaryOf(p29);
  const p28Summary = summaryOf(p28);
  const readinessSummary = summaryOf(readiness);
  const activation = object(targetManifest.activation);
  const currentDirtyFiles = gitDirtyCount(repoRoot);

  const p31SafeHoldReady =
    n(p31Summary, 'blockers') === 0 &&
    b(p31Summary, 'plainContinueRejected') &&
    !b(p31Summary, 'exactApprovalSentencePresent') &&
    !b(p31Summary, 'activeApprovalReceiptCreated') &&
    !b(p31Summary, 'activeHashLockCreated') &&
    !b(p31Summary, 'readyForApply') &&
    b(p31Summary, 'canContinueNonProductionAudit') &&
    s(p31Summary, 'receiptCreationState') === 'approval_receipt_creation_waiting_for_exact_sentence';

  const input: EvaluationInput = {
    p31SafeHoldReady,
    p31State: s(p31Summary, 'receiptCreationState'),
    p31Blockers: n(p31Summary, 'blockers'),
    p31PlainContinueRejected: b(p31Summary, 'plainContinueRejected'),
    p31CanContinueNonProductionAudit: b(p31Summary, 'canContinueNonProductionAudit'),
    p31ReadyForApply: b(p31Summary, 'readyForApply'),
    p31MayModifyProductionAppFiles: b(p31Summary, 'mayModifyProductionAppFiles'),
    p31ActiveApprovalReceiptCreated: b(p31Summary, 'activeApprovalReceiptCreated'),
    p31ActiveHashLockCreated: b(p31Summary, 'activeHashLockCreated'),
    p30Ready:
      n(p30Summary, 'blockers') === 0 &&
      b(p30Summary, 'readyForExplicitApprovalReceiptCreationGateV2') &&
      s(p30Summary, 'requestState') === 'approval_request_presented',
    p30Blockers: n(p30Summary, 'blockers'),
    p30ReadyForApply: b(p30Summary, 'readyForApply'),
    p30MayModifyProductionAppFiles: b(p30Summary, 'mayModifyProductionAppFiles'),
    p29Ready:
      n(p29Summary, 'blockers') === 0 &&
      b(p29Summary, 'readyForApprovalRequestPresentationV2') &&
      s(p29Summary, 'gateState') === 'approval_request_package_ready',
    p29Blockers: n(p29Summary, 'blockers'),
    p29ReadyForApply: b(p29Summary, 'readyForApply'),
    p28Ready:
      n(p28Summary, 'blockers') === 0 &&
      b(p28Summary, 'readyForExplicitApprovalReceiptGateV2') &&
      s(p28Summary, 'planState') === 'runtime_activation_blocker_plan_ready',
    p28Blockers: n(p28Summary, 'blockers'),
    readinessApplyBlockers: n(readinessSummary, 'applyBlockers'),
    readinessMayModifyProductionAppFiles: b(readinessSummary, 'mayModifyProductionAppFiles'),
    activeApprovalReceiptExists: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExists: fs.existsSync(activeHashLockPath),
    currentDirtyFiles,
    criticalHashLocks: n(p29Summary, 'criticalHashLocks'),
    targetManifestActivationApproved: b(activation, 'activationApproved'),
    targetManifestProductionReady: b(activation, 'productionReady'),
    targetManifestReadyForApply: b(activation, 'readyForApply'),
    targetManifestMayModifyProductionAppFiles: b(activation, 'mayModifyProductionAppFiles'),
    targetManifestReadyForStorageCloudMigration: b(activation, 'readyForStorageCloudMigration'),
    serverUploadAllowed: b(serverManifestDraft, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(serverManifestDraft, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(serverManifestDraft, 'runtimeDownloadsEnabled'),
    downloadablePacksPublished: b(serverManifestDraft, 'downloadablePacksPublished'),
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
    evaluation.blockers += 1;
    evaluation.denialState = 'blocked_by_findings';
  }
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-production-apply-absence-denial-gate-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      explicitApprovalReceiptCreationGateV2Packet: rel(repoRoot, p31Path),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, p30Path),
      explicitApprovalReceiptHashLockGateV2Packet: rel(repoRoot, p29Path),
      runtimeActivationBlockerPlanV2Packet: rel(repoRoot, p28Path),
      readinessBlockerReductionPacket: rel(repoRoot, readinessPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestDraftPath),
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
    activeApprovalPaths: {
      approvalReceipt: rel(repoRoot, activeApprovalReceiptPath),
      hashLockManifest: rel(repoRoot, activeHashLockPath),
    },
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      adminStateModifiedByThisScript: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV production apply absence denial gate V2 packet: ${report.status}`);
  console.log(`Denial state: ${report.summary.denialState}`);
  console.log(`Production apply denied: ${report.summary.productionApplyDenied ? 'yes' : 'no'}`);
  console.log(`Active approval receipt/hash lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
}

main();
