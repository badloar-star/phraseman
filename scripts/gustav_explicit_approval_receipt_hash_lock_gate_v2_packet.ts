import * as childProcess from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type GateState =
  | 'blocked_by_findings'
  | 'closed_missing_runtime_activation_plan'
  | 'approval_request_package_ready';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type PlannedTouch = {
  path: string;
  touchType: string;
  futureGate: string;
  rollbackCheck: string;
  productionWriteAllowedNow?: boolean;
};

type DirtyStatus = {
  code: string;
  path: string;
};

type PlannedTouchDirtyMap = PlannedTouch & {
  dirtyStatus: 'clean' | 'dirty' | 'pattern_or_virtual';
  matchingDirtyFiles: string[];
};

type CriticalArtifact = {
  role: string;
  path: string;
  bytes: number;
  sha256: string;
  requiredForGate: boolean;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  expectedState: GateState;
  accepted: boolean;
  gateState: GateState;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type EvaluationInput = {
  p28Ready: boolean;
  p28State: string;
  p28Blockers: number;
  p28ReadyForApply: boolean;
  p28MayModifyProductionAppFiles: boolean;
  p28ActivationApproved: boolean;
  p28PlanItems: number;
  p28PlannedTouches: PlannedTouch[];
  p28ReadinessApplyBlockers: number;
  p28ReadinessDirtyWorktreeOverlaps: number;
  readinessApplyBlockers: number;
  readinessDirtyWorktreeOverlaps: number;
  p1aExactApprovalReadyToRequest: boolean;
  p1aApprovalReceiptExists: boolean;
  p1aActiveHashLockExists: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  legacyP1aArtifacts: number;
  targetManifestActivationApproved: boolean;
  targetManifestReadyForApply: boolean;
  targetManifestMayModifyProductionAppFiles: boolean;
  serverManifestServerUploadAllowed: boolean;
  serverManifestFirebaseUploadAllowed: boolean;
  serverManifestRuntimeDownloadsEnabled: boolean;
  serverManifestActivationApproved: boolean;
  serverManifestReadyForApply: boolean;
  serverManifestMayModifyProductionAppFiles: boolean;
  dirtyFiles: DirtyStatus[];
  dirtyWorktreeAcknowledgedInHashLock: boolean;
  plannedTouchDirtyMap: PlannedTouchDirtyMap[];
  approvalReceiptTemplateWritten: boolean;
  hashLockManifestDryRunWritten: boolean;
  applyPlanDryRunPresent: boolean;
  criticalArtifacts: CriticalArtifact[];
  missingCriticalArtifacts: string[];
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  gateState: GateState;
  p28Ready: boolean;
  p28State: string;
  p28PlanItems: number;
  plannedTouches: number;
  plannedTouchesWithFutureGate: number;
  plannedTouchesWithRollbackCheck: number;
  plannedTouchesMappedToDirtyStatus: number;
  dirtyFiles: number;
  dirtyProductionCandidateFiles: number;
  dirtyWorktreeAcknowledgedInHashLock: boolean;
  legacyP1aArtifacts: number;
  p1aExactApprovalReadyToRequest: boolean;
  p1aApprovalReceiptExists: boolean;
  p1aActiveHashLockExists: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  approvalReceiptTemplateWritten: boolean;
  hashLockManifestDryRunWritten: boolean;
  criticalHashLocks: number;
  missingCriticalArtifacts: number;
  readinessApplyBlockers: number;
  readinessDirtyWorktreeOverlaps: number;
  p28ReadinessApplyBlockers: number;
  p28ReadinessDirtyWorktreeOverlaps: number;
  applyPlanDryRunPresent: boolean;
  activationApproved: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  productionWritesAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
  storageMigrationAllowed: false;
  cloudSyncMigrationAllowed: false;
  approvalReceiptCreatedByThisScript: false;
  activeHashLockCreatedByThisScript: false;
  readyForApprovalRequestPresentationV2: boolean;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-explicit-approval-receipt-hash-lock-gate-v2-packet-v0';
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
  plannedTouchDirtyMap: PlannedTouchDirtyMap[];
  criticalArtifacts: CriticalArtifact[];
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

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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

function parseGitStatus(repoRoot: string): DirtyStatus[] {
  const stdout = childProcess.execFileSync('git', ['status', '--short'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const code = line.slice(0, 2).trim() || line.slice(0, 2);
      let filePath = line.slice(3).trim();
      const renameIndex = filePath.indexOf(' -> ');
      if (renameIndex >= 0) filePath = filePath.slice(renameIndex + 4).trim();
      return { code, path: filePath.split('\\').join('/') };
    });
}

function isProductionCandidatePath(filePath: string): boolean {
  return (
    filePath.startsWith('app/') ||
    filePath.startsWith('admin/') ||
    filePath.startsWith('functions/') ||
    filePath === 'firestore.rules' ||
    filePath === 'storage.rules' ||
    filePath === 'package.json' ||
    filePath === 'package-lock.json' ||
    filePath.startsWith('tests/')
  );
}

function hasPatternSyntax(filePath: string): boolean {
  return filePath.includes('*') || filePath.includes('**') || filePath.includes('{') || filePath.includes('}') || filePath.includes('Firebase Storage') || filePath.includes('git working tree');
}

function patternMatches(pattern: string, filePath: string): boolean {
  if (!hasPatternSyntax(pattern)) return pattern === filePath;
  if (pattern.includes('Firebase Storage') || pattern.includes('git working tree')) return false;
  const star = pattern.indexOf('*');
  if (star < 0) return pattern === filePath;
  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(pattern.lastIndexOf('*') + 1);
  return filePath.startsWith(prefix) && (suffix === '' || filePath.endsWith(suffix));
}

function mapTouchesToDirty(touches: PlannedTouch[], dirtyFiles: DirtyStatus[]): PlannedTouchDirtyMap[] {
  return touches.map((touch) => {
    const matches = dirtyFiles.filter((dirty) => patternMatches(touch.path, dirty.path)).map((dirty) => dirty.path);
    const dirtyStatus: PlannedTouchDirtyMap['dirtyStatus'] =
      matches.length > 0 ? 'dirty' : hasPatternSyntax(touch.path) ? 'pattern_or_virtual' : 'clean';
    return {
      ...touch,
      dirtyStatus,
      matchingDirtyFiles: matches.slice(0, 25),
    };
  });
}

function collectFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const found: string[] = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile()) found.push(fullPath);
    }
  }
  return found.sort((a, b) => a.localeCompare(b));
}

function artifact(repoRoot: string, filePath: string, role: string, requiredForGate: boolean): CriticalArtifact {
  return {
    role,
    path: rel(repoRoot, filePath),
    bytes: fs.statSync(filePath).size,
    sha256: sha256(filePath),
    requiredForGate,
  };
}

function buildCriticalArtifacts(repoRoot: string, requiredFiles: Array<{ path: string; role: string }>, extraFiles: Array<{ path: string; role: string }>): { artifacts: CriticalArtifact[]; missing: string[] } {
  const missing: string[] = [];
  const artifacts: CriticalArtifact[] = [];
  for (const item of requiredFiles) {
    if (!fs.existsSync(item.path)) {
      missing.push(rel(repoRoot, item.path));
      continue;
    }
    artifacts.push(artifact(repoRoot, item.path, item.role, true));
  }
  for (const item of extraFiles) {
    if (fs.existsSync(item.path)) artifacts.push(artifact(repoRoot, item.path, item.role, false));
  }
  return { artifacts, missing };
}

function flattenPlannedTouches(p28: JsonObject): PlannedTouch[] {
  const plan = Array.isArray(p28.blockerPlan) ? p28.blockerPlan : [];
  const touches: PlannedTouch[] = [];
  for (const item of plan) {
    const record = object(item);
    const plannedTouches = Array.isArray(record.plannedTouches) ? record.plannedTouches : [];
    for (const plannedTouch of plannedTouches) {
      const touch = object(plannedTouch);
      touches.push({
        path: s(touch, 'path'),
        touchType: s(touch, 'touchType'),
        futureGate: s(touch, 'futureGate'),
        rollbackCheck: s(touch, 'rollbackCheck'),
        productionWriteAllowedNow: b(touch, 'productionWriteAllowedNow'),
      });
    }
  }
  return touches;
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  if (!input.p28Ready) addFinding(findings, 'blocker', 'P28_NOT_READY', `P28 must be ready before P29, got state=${input.p28State}.`);
  if (input.p28Blockers > 0) addFinding(findings, 'blocker', 'P28_BLOCKERS', `P28 has ${input.p28Blockers} blocker(s).`);
  if (input.p28PlanItems < 9) addFinding(findings, 'blocker', 'P28_PLAN_ITEMS_INSUFFICIENT', `Expected at least 9 P28 plan items, got ${input.p28PlanItems}.`);
  if (input.p28PlannedTouches.length < 18) addFinding(findings, 'blocker', 'PLANNED_TOUCHES_INSUFFICIENT', `Expected at least 18 planned touches, got ${input.p28PlannedTouches.length}.`);
  if (!input.applyPlanDryRunPresent) addFinding(findings, 'blocker', 'APPLY_PLAN_DRY_RUN_MISSING', 'P28 apply-plan dry run must exist before P29.');
  if (!input.approvalReceiptTemplateWritten) addFinding(findings, 'blocker', 'APPROVAL_TEMPLATE_MISSING', 'Request-only approval template was not written.');
  if (!input.hashLockManifestDryRunWritten) addFinding(findings, 'blocker', 'HASH_LOCK_DRY_RUN_MISSING', 'Hash-lock manifest dry run was not written.');
  if (input.criticalArtifacts.length < 12) addFinding(findings, 'blocker', 'CRITICAL_HASH_LOCKS_INSUFFICIENT', `Expected at least 12 critical hash locks, got ${input.criticalArtifacts.length}.`);
  if (input.missingCriticalArtifacts.length > 0) addFinding(findings, 'blocker', 'CRITICAL_ARTIFACTS_MISSING', `Missing critical artifacts: ${input.missingCriticalArtifacts.join(', ')}.`);

  const plannedTouchesWithFutureGate = input.p28PlannedTouches.filter((touch) => touch.futureGate.trim() !== '').length;
  const plannedTouchesWithRollbackCheck = input.p28PlannedTouches.filter((touch) => touch.rollbackCheck.trim() !== '').length;
  if (plannedTouchesWithFutureGate !== input.p28PlannedTouches.length) addFinding(findings, 'blocker', 'PLANNED_TOUCH_MISSING_GATE', 'Every planned touch must have a future gate before approval can be requested.');
  if (plannedTouchesWithRollbackCheck !== input.p28PlannedTouches.length) addFinding(findings, 'blocker', 'PLANNED_TOUCH_MISSING_ROLLBACK', 'Every planned touch must have a rollback check before approval can be requested.');
  if (input.p28PlannedTouches.some((touch) => touch.productionWriteAllowedNow)) addFinding(findings, 'blocker', 'PLANNED_TOUCH_ALLOWS_PRODUCTION_WRITE_NOW', 'No planned touch may allow production writes in P29.');
  if (input.plannedTouchDirtyMap.length !== input.p28PlannedTouches.length) addFinding(findings, 'blocker', 'PLANNED_TOUCH_DIRTY_MAP_INCOMPLETE', 'Every planned touch must be mapped to dirty-worktree status.');
  if (input.dirtyFiles.length > 0 && !input.dirtyWorktreeAcknowledgedInHashLock) addFinding(findings, 'blocker', 'DIRTY_WORKTREE_NOT_ACKNOWLEDGED', 'Dirty worktree must be explicitly captured in the hash-lock dry run.');

  const forbiddenOpen =
    input.p28ReadyForApply ||
    input.p28MayModifyProductionAppFiles ||
    input.p28ActivationApproved ||
    input.targetManifestActivationApproved ||
    input.targetManifestReadyForApply ||
    input.targetManifestMayModifyProductionAppFiles ||
    input.serverManifestServerUploadAllowed ||
    input.serverManifestFirebaseUploadAllowed ||
    input.serverManifestRuntimeDownloadsEnabled ||
    input.serverManifestActivationApproved ||
    input.serverManifestReadyForApply ||
    input.serverManifestMayModifyProductionAppFiles;
  if (forbiddenOpen) addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'At least one activation/upload/download/apply flag is open.');
  if (input.p1aApprovalReceiptExists || input.activeApprovalReceiptExists) addFinding(findings, 'blocker', 'APPROVAL_RECEIPT_ALREADY_ACTIVE', 'P29 is request-only and must not see an active approval receipt.');
  if (input.p1aActiveHashLockExists || input.activeHashLockExists) addFinding(findings, 'blocker', 'HASH_LOCK_ALREADY_ACTIVE', 'P29 is request-only and must not see an active hash lock.');

  if (input.legacyP1aArtifacts > 0) addFinding(findings, 'info', 'LEGACY_P1A_ARTIFACTS_PRESENT', `${input.legacyP1aArtifacts} legacy P1A apply-plan artifact(s) exist, but they are not treated as active approval.`);
  if (input.dirtyFiles.length > 0) addFinding(findings, 'info', 'DIRTY_WORKTREE_APPLY_HOLD', `${input.dirtyFiles.length} dirty worktree file(s) are captured; apply remains closed.`);
  if (input.readinessApplyBlockers > 0) addFinding(findings, 'info', 'READINESS_APPLY_BLOCKERS_REMAIN', `${input.readinessApplyBlockers} readiness apply blocker(s) remain by design.`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const accepted = blockers === 0;
  return {
    findings,
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      gateState: blockers > 0 ? 'blocked_by_findings' : input.p28Ready ? 'approval_request_package_ready' : 'closed_missing_runtime_activation_plan',
      p28Ready: input.p28Ready,
      p28State: input.p28State,
      p28PlanItems: input.p28PlanItems,
      plannedTouches: input.p28PlannedTouches.length,
      plannedTouchesWithFutureGate,
      plannedTouchesWithRollbackCheck,
      plannedTouchesMappedToDirtyStatus: input.plannedTouchDirtyMap.length,
      dirtyFiles: input.dirtyFiles.length,
      dirtyProductionCandidateFiles: input.dirtyFiles.filter((dirty) => isProductionCandidatePath(dirty.path)).length,
      dirtyWorktreeAcknowledgedInHashLock: input.dirtyWorktreeAcknowledgedInHashLock,
      legacyP1aArtifacts: input.legacyP1aArtifacts,
      p1aExactApprovalReadyToRequest: input.p1aExactApprovalReadyToRequest,
      p1aApprovalReceiptExists: input.p1aApprovalReceiptExists,
      p1aActiveHashLockExists: input.p1aActiveHashLockExists,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      approvalReceiptTemplateWritten: input.approvalReceiptTemplateWritten,
      hashLockManifestDryRunWritten: input.hashLockManifestDryRunWritten,
      criticalHashLocks: input.criticalArtifacts.length,
      missingCriticalArtifacts: input.missingCriticalArtifacts.length,
      readinessApplyBlockers: input.readinessApplyBlockers,
      readinessDirtyWorktreeOverlaps: input.readinessDirtyWorktreeOverlaps,
      p28ReadinessApplyBlockers: input.p28ReadinessApplyBlockers,
      p28ReadinessDirtyWorktreeOverlaps: input.p28ReadinessDirtyWorktreeOverlaps,
      applyPlanDryRunPresent: input.applyPlanDryRunPresent,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      productionWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      approvalReceiptCreatedByThisScript: false,
      activeHashLockCreatedByThisScript: false,
      readyForApprovalRequestPresentationV2: accepted,
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
    expectedAccept: boolean;
    expectedState: GateState;
    mutate: (input: EvaluationInput) => void;
  }> = [
    { id: 'canonical_request_package_is_accepted', expectedAccept: true, expectedState: 'approval_request_package_ready', mutate: () => undefined },
    { id: 'missing_p28_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.p28Ready = false; input.p28State = 'blocked_by_findings'; } },
    { id: 'ready_for_apply_open_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.targetManifestReadyForApply = true; } },
    { id: 'active_approval_receipt_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'active_hash_lock_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.activeHashLockExists = true; } },
    { id: 'server_upload_open_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.serverManifestServerUploadAllowed = true; } },
    { id: 'missing_touch_rollback_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.p28PlannedTouches[0].rollbackCheck = ''; } },
    { id: 'production_write_now_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.p28PlannedTouches[0].productionWriteAllowedNow = true; } },
    { id: 'missing_hash_locks_are_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.criticalArtifacts = []; } },
    { id: 'dirty_worktree_not_acknowledged_is_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.dirtyWorktreeAcknowledgedInHashLock = false; } },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    testCase.mutate(fixture);
    const result = evaluate(fixture).evaluation;
    const accepted = result.readyForApprovalRequestPresentationV2;
    return {
      id: testCase.id,
      expectedAccept: testCase.expectedAccept,
      expectedState: testCase.expectedState,
      accepted,
      gateState: result.gateState,
      blockers: result.blockers,
      passed: accepted === testCase.expectedAccept && result.gateState === testCase.expectedState,
    };
  });
}

function renderApprovalTemplate(runId: string, hashLockPath: string, finalHashLockPath: string, p28Path: string, completionAuditPath: string): string {
  const approvalSentence = `I approve PhraseMan French activation apply for run ${runId} after reviewing ${hashLockPath}, ${finalHashLockPath}, ${p28Path}, and ${completionAuditPath}. I understand this permits only the listed future-gated production changes, keeps studyTarget=fr isolated from sourceLocale/uiLocale/cloud/cache/prompts, and does not allow unlisted writes, uploads, runtime downloads, migrations or activation flags.`;
  return [
    '# French Activation Explicit Approval Receipt Template V2',
    '',
    'REQUEST ONLY - NOT APPROVAL.',
    '',
    `Run: ${runId}`,
    'Target locale: fr',
    'Source locales: ru, uk',
    '',
    'This file is a template for a future approval receipt. This script does not create an active receipt and does not create an active hash lock.',
    '',
    '## Required Approval Sentence',
    '',
    'The future active receipt must include this exact sentence:',
    '',
    '```text',
    approvalSentence,
    '```',
    '',
    '## Required Attachments',
    '',
    `- Hash-lock manifest reviewed: ${hashLockPath}`,
    `- Final pre-approval evidence hash-lock reviewed: ${finalHashLockPath}`,
    `- Runtime activation blocker plan reviewed: ${p28Path}`,
    `- Production readiness completion audit reviewed: ${completionAuditPath}`,
    '- Dirty worktree status reviewed and either preserved or isolated before apply.',
    '- Rollback plan reviewed before any activation/upload/runtime-download/storage-cloud migration.',
    '',
    '## Closed Until A Later Gate',
    '',
    '- activationApproved=false',
    '- readyForApply=false',
    '- mayModifyProductionAppFiles=false',
    '- productionWritesAllowed=false',
    '- serverUploadAllowed=false',
    '- firebaseUploadAllowed=false',
    '- runtimeDownloadsEnabled=false',
    '- storageMigrationAllowed=false',
    '- cloudSyncMigrationAllowed=false',
    '',
  ].join('\n');
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Explicit Approval Receipt Hash-Lock Gate V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Gate state: ${report.summary.gateState}`,
    `- P28 ready: ${report.summary.p28Ready ? 'yes' : 'no'}`,
    `- Planned touches mapped: ${report.summary.plannedTouchesMappedToDirtyStatus}/${report.summary.plannedTouches}`,
    `- Critical hash locks: ${report.summary.criticalHashLocks}`,
    `- Missing critical artifacts: ${report.summary.missingCriticalArtifacts}`,
    `- Dirty files captured: ${report.summary.dirtyFiles}`,
    `- Dirty production-candidate files captured: ${report.summary.dirtyProductionCandidateFiles}`,
    `- Legacy P1A artifacts present: ${report.summary.legacyP1aArtifacts}`,
    `- Approval receipt template written: ${report.summary.approvalReceiptTemplateWritten ? 'yes' : 'no'}`,
    `- Hash-lock dry run written: ${report.summary.hashLockManifestDryRunWritten ? 'yes' : 'no'}`,
    `- Active approval receipt exists: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}`,
    `- Active hash lock exists: ${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Ready for approval request presentation V2: ${report.summary.readyForApprovalRequestPresentationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- May modify production app files: ${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Findings',
    '',
  ];
  if (report.findings.length === 0) lines.push('- none');
  else for (const finding of report.findings) lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}`);
  lines.push('');
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
  const runtimeSlicesDir = path.join(packDir, 'runtime_slices');
  const applyPlanDir = path.join(runDir, 'apply_plan');

  const p28Path = path.join(auditsDir, 'runtime_activation_blocker_plan_v2_packet.json');
  const completionAuditPath = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const readinessPath = path.join(auditsDir, 'readiness_blocker_reduction_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestDraftPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const applyPlanDryRunPath = path.join(applyPlanDir, 'fr_activation_apply_plan_dry_run.md');
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const approvalTemplatePath = path.join(applyPlanDir, 'explicit_approval_receipt_template_v2.md');
  const hashLockDryRunPath = path.join(applyPlanDir, 'hash_lock_manifest_dry_run_v2.json');
  const finalHashLockDryRunPath = path.join(applyPlanDir, 'final_preapproval_evidence_hash_lock_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'explicit_approval_receipt_hash_lock_gate_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'explicit_approval_receipt_hash_lock_gate_v2_packet.md');

  const p28 = readJson<JsonObject>(p28Path);
  const readiness = readJson<JsonObject>(readinessPath);
  const targetManifest = readJson<JsonObject>(targetManifestPath);
  const serverManifestDraft = readJson<JsonObject>(serverManifestDraftPath);
  const p28Summary = summaryOf(p28);
  const readinessSummary = summaryOf(readiness);
  const activation = object(targetManifest.activation);

  const p28PlannedTouches = flattenPlannedTouches(p28);
  const dirtyFiles = parseGitStatus(repoRoot);
  const plannedTouchDirtyMap = mapTouchesToDirty(p28PlannedTouches, dirtyFiles);
  const legacyP1aArtifacts = fs.existsSync(applyPlanDir)
    ? fs.readdirSync(applyPlanDir).filter((name) => name.toLowerCase().startsWith('p1a_')).length
    : 0;

  const requiredFiles = [
    { path: p28Path, role: 'runtime_activation_blocker_plan_v2_packet' },
    { path: readinessPath, role: 'readiness_blocker_reduction_packet' },
    { path: targetManifestPath, role: 'target_pack_manifest_v2_draft' },
    { path: serverManifestDraftPath, role: 'server_delivery_manifest_v2_draft' },
    { path: applyPlanDryRunPath, role: 'fr_activation_apply_plan_dry_run' },
    { path: path.join(auditsDir, 'payload_creation_approval_preflight_v2_packet.json'), role: 'payload_creation_approval_preflight_v2_packet' },
    { path: path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.json'), role: 'closed_local_payload_materialization_v2_packet' },
    { path: path.join(auditsDir, 'server_delivery_publish_preflight_v2_packet.json'), role: 'server_delivery_publish_preflight_v2_packet' },
    { path: path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.json'), role: 'admin_server_delivery_runtime_preflight_v2_packet' },
    { path: path.join(auditsDir, 'llm_official_source_promoted_decision_file_generation_v2_packet.json'), role: 'llm_official_source_promoted_decision_file_generation_v2_packet' },
    { path: path.join(auditsDir, 'reviewer_decision_import_execution_gate_v2_packet.json'), role: 'reviewer_decision_import_execution_gate_v2_packet' },
    { path: path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.json'), role: 'runtime_cache_integrity_rollback_v2_packet' },
  ];
  const checksumFiles = collectFiles(auditsDir).filter((filePath) => path.basename(filePath).startsWith('payload_checksum_fr_'));
  const runtimeFiles = collectFiles(runtimeSlicesDir).filter((filePath) => /\.(json|jsonl)$/i.test(filePath));
  const extraFiles = checksumFiles
    .map((filePath) => ({ path: filePath, role: 'payload_checksum_report' }))
    .concat(runtimeFiles.map((filePath) => ({ path: filePath, role: 'local_runtime_slice_artifact' })));
  const critical = buildCriticalArtifacts(repoRoot, requiredFiles, extraFiles);

  const hashLockDryRun = {
    schemaVersion: 'gustav-hash-lock-manifest-dry-run-v2-v0',
    runId,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    activeHashLock: false,
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    approvalReceiptCreated: false,
    productionWritesAllowed: false,
    activationApproved: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    closedFlags: {
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
    },
    dirtyWorktree: {
      dirtyFiles: dirtyFiles.length,
      dirtyProductionCandidateFiles: dirtyFiles.filter((dirty) => isProductionCandidatePath(dirty.path)).length,
      statusSample: dirtyFiles.slice(0, 100),
      acknowledgedForFutureApplyGate: true,
    },
    plannedTouchDirtyMap,
    criticalArtifacts: critical.artifacts,
    missingCriticalArtifacts: critical.missing,
  };

  ensureDir(applyPlanDir);
  fs.writeFileSync(approvalTemplatePath, renderApprovalTemplate(runId, rel(repoRoot, hashLockDryRunPath), rel(repoRoot, finalHashLockDryRunPath), rel(repoRoot, p28Path), rel(repoRoot, completionAuditPath)), 'utf8');
  writeJson(hashLockDryRunPath, hashLockDryRun);

  const input: EvaluationInput = {
    p28Ready:
      n(p28Summary, 'blockers') === 0 &&
      b(p28Summary, 'readyForExplicitApprovalReceiptGateV2') &&
      s(p28Summary, 'planState') === 'runtime_activation_blocker_plan_ready',
    p28State: s(p28Summary, 'planState'),
    p28Blockers: n(p28Summary, 'blockers'),
    p28ReadyForApply: b(p28Summary, 'readyForApply'),
    p28MayModifyProductionAppFiles: b(p28Summary, 'mayModifyProductionAppFiles'),
    p28ActivationApproved: b(p28Summary, 'activationApproved'),
    p28PlanItems: n(p28Summary, 'planItems'),
    p28PlannedTouches,
    p28ReadinessApplyBlockers: n(p28Summary, 'readinessApplyBlockers'),
    p28ReadinessDirtyWorktreeOverlaps: n(p28Summary, 'readinessDirtyWorktreeOverlaps'),
    readinessApplyBlockers: n(readinessSummary, 'applyBlockers'),
    readinessDirtyWorktreeOverlaps: n(readinessSummary, 'dirtyWorktreeOverlaps'),
    p1aExactApprovalReadyToRequest: b(readinessSummary, 'p1aExactApprovalReadyToRequest'),
    p1aApprovalReceiptExists: b(readinessSummary, 'p1aApprovalReceiptExists'),
    p1aActiveHashLockExists: b(readinessSummary, 'p1aActiveHashLockExists'),
    activeApprovalReceiptExists: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExists: fs.existsSync(activeHashLockPath),
    legacyP1aArtifacts,
    targetManifestActivationApproved: b(activation, 'activationApproved'),
    targetManifestReadyForApply: b(activation, 'readyForApply'),
    targetManifestMayModifyProductionAppFiles: b(activation, 'mayModifyProductionAppFiles'),
    serverManifestServerUploadAllowed: b(serverManifestDraft, 'serverUploadAllowed'),
    serverManifestFirebaseUploadAllowed: b(serverManifestDraft, 'firebaseUploadAllowed'),
    serverManifestRuntimeDownloadsEnabled: b(serverManifestDraft, 'runtimeDownloadsEnabled'),
    serverManifestActivationApproved: b(serverManifestDraft, 'activationApproved'),
    serverManifestReadyForApply: b(serverManifestDraft, 'readyForApply'),
    serverManifestMayModifyProductionAppFiles: b(serverManifestDraft, 'mayModifyProductionAppFiles'),
    dirtyFiles,
    dirtyWorktreeAcknowledgedInHashLock: true,
    plannedTouchDirtyMap,
    approvalReceiptTemplateWritten: fs.existsSync(approvalTemplatePath),
    hashLockManifestDryRunWritten: fs.existsSync(hashLockDryRunPath),
    applyPlanDryRunPresent: fs.existsSync(applyPlanDryRunPath),
    criticalArtifacts: critical.artifacts,
    missingCriticalArtifacts: critical.missing,
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
    evaluation.blockers += 1;
    evaluation.gateState = 'blocked_by_findings';
    evaluation.readyForApprovalRequestPresentationV2 = false;
  }
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : evaluation.readyForApprovalRequestPresentationV2 ? 'PASS' : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-explicit-approval-receipt-hash-lock-gate-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      runtimeActivationBlockerPlanV2Packet: rel(repoRoot, p28Path),
      readinessBlockerReductionPacket: rel(repoRoot, readinessPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestDraftPath),
      applyPlanDryRun: rel(repoRoot, applyPlanDryRunPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      approvalReceiptTemplate: rel(repoRoot, approvalTemplatePath),
      hashLockManifestDryRun: rel(repoRoot, hashLockDryRunPath),
    },
    summary: {
      ...evaluation,
      blockers,
      warnings,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    plannedTouchDirtyMap,
    criticalArtifacts: critical.artifacts,
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

  console.log(`GUSTAV explicit approval receipt hash-lock gate V2 packet: ${report.status}`);
  console.log(`Gate state: ${report.summary.gateState}`);
  console.log(`Critical hash locks: ${report.summary.criticalHashLocks}`);
  console.log(`Dirty files captured: ${report.summary.dirtyFiles}`);
  console.log(`Ready for approval request presentation V2: ${report.summary.readyForApprovalRequestPresentationV2 ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
}

main();
