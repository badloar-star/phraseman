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
  expectedSafe: boolean;
  safe: boolean;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  p36Ready: boolean;
  readinessPresent: boolean;
  readinessChecks: number;
  readinessPassed: number;
  readinessFailed: number;
  readinessBlockers: number;
  readinessWarnings: number;
  readinessGenerationBlockers: number;
  readinessApplyBlockers: number;
  readinessFailedIds: string[];
  runtimePlanReady: boolean;
  runtimePlanItems: number;
  runtimePlanPlannedTouches: number;
  runtimePlanTouchesWithFutureGate: number;
  runtimePlanTouchesWithRollbackCheck: number;
  runtimeRuntimeBlockers: number;
  runtimeServerBlockers: number;
  runtimeStorageCloudBlockers: number;
  runtimeAdminBlockers: number;
  runtimeReviewerImportBlockers: number;
  runtimeRollbackBlockers: number;
  runtimeApplyApprovalBlockers: number;
  runtimeReadinessApplyBlockers: number;
  runtimeDirtyWorktreeOverlaps: number;
  runtimeApprovalReceiptExists: boolean;
  runtimeActiveHashLockExists: boolean;
  productionServerManifestExists: boolean;
  runtimeReadyForExplicitApprovalReceiptGate: boolean;
  runtimeActivationApproved: boolean;
  runtimeReadyForApply: boolean;
  runtimeMayModifyProductionAppFiles: boolean;
  runtimeServerUploadAllowed: boolean;
  runtimeFirebaseUploadAllowed: boolean;
  runtimeDownloadsEnabled: boolean;
  runtimeStorageMigrationAllowed: boolean;
  runtimeCloudSyncMigrationAllowed: boolean;
  productionApplyDenialReady: boolean;
  productionApplyDenied: boolean;
  productionApplyDenialState: string;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  activeApprovalArtifactsMissing: boolean;
  activeApprovalArtifactsMismatched: boolean;
  canContinueNonProductionAudit: boolean;
  readyForNonProductionContinuationAfterApplyDenial: boolean;
  productionReadyForApply: boolean;
  productionMayModifyProductionAppFiles: boolean;
  productionWritesAllowed: boolean;
  productionServerUploadAllowed: boolean;
  productionFirebaseUploadAllowed: boolean;
  productionRuntimeDownloadsEnabled: boolean;
  productionDownloadablePacksPublished: boolean;
  productionStorageMigrationAllowed: boolean;
  productionCloudSyncMigrationAllowed: boolean;
  closurePlanReady: boolean;
  closureSafeItems: number;
  closureExactApprovalOnlyItems: number;
  closureProductionLockedItems: number;
  nextGoalIsP37: boolean;
};

type Report = {
  schemaVersion: 'gustav-readiness-apply-blocker-map-refresh-v2-packet-v0';
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
    blockerMapState: 'readiness_apply_blocker_map_refreshed' | 'blocked_by_findings';
    p36Ready: boolean;
    readinessChecks: number;
    readinessPassed: number;
    readinessFailed: number;
    readinessBlockers: number;
    readinessWarnings: number;
    readinessGenerationBlockers: number;
    readinessApplyBlockers: number;
    readinessFailedIds: string[];
    readinessOnlyExpectedApplyFailures: boolean;
    runtimePlanReady: boolean;
    runtimePlanItems: number;
    runtimePlanPlannedTouches: number;
    runtimePlanTouchesWithFutureGate: number;
    runtimePlanTouchesWithRollbackCheck: number;
    runtimeBlockerAreasCovered: number;
    runtimeReadinessApplyBlockers: number;
    runtimeDirtyWorktreeOverlaps: number;
    runtimeReadyForExplicitApprovalReceiptGate: boolean;
    productionApplyDenialReady: boolean;
    productionApplyDenied: boolean;
    productionApplyDenialState: string;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    activeApprovalArtifactsMissing: boolean;
    canContinueNonProductionAudit: boolean;
    safeNonProductionItemsTotal: number;
    safeNonProductionItemsClosed: number;
    safeNonProductionItemsRemaining: number;
    exactApprovalOnlyItems: number;
    productionLockedItems: number;
    nextSafeItem: string;
    readyForNextNonProductionMasterNextPassConsistencyRefresh: boolean;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    downloadablePacksPublished: false;
    storageMigrationAllowed: false;
    cloudSyncMigrationAllowed: false;
    productionWritesAllowed: false;
    fixtureProbesPassed: number;
    fixtureProbes: number;
    blockers: number;
    warnings: number;
  };
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    approvalReceiptCreatedByThisScript: false;
    activeHashLockCreatedByThisScript: false;
    serverManifestPublishedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    storageOrCloudMigrationStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const EXPECTED_FAILED_READINESS_IDS = ['RDY-090'];
const P37_REPLAY_SAFE_NEXT_GOALS = new Set([
  'NEXT-PASS-P37-READINESS-APPLY-BLOCKER-MAP-REFRESH-V2',
  'NEXT-PASS-P26-SERVER-DELIVERY-PUBLISH-PREFLIGHT-V2',
  'NEXT-PASS-P27-ADMIN-SERVER-DELIVERY-RUNTIME-PREFLIGHT-V2',
  'NEXT-PASS-P28-RUNTIME-ACTIVATION-BLOCKER-PLAN-V2',
  'NEXT-PASS-P29-EXPLICIT-APPROVAL-RECEIPT-HASH-LOCK-GATE-V2',
  'NEXT-PASS-P30-ACTIVATION-APPROVAL-REQUEST-PRESENTATION-V2',
  'NEXT-PASS-P31-EXPLICIT-APPROVAL-RECEIPT-CREATION-GATE-V2',
  'NEXT-PASS-P32-PRODUCTION-APPLY-ABSENCE-DENIAL-GATE-V2',
  'NEXT-PASS-P33-NONPRODUCTION-BLOCKER-CLOSURE-PLAN-V2',
  'NEXT-PASS-P34-NONPRODUCTION-EVIDENCE-REFRESH-V2',
  'NEXT-PASS-P35-RUNTIME-SERVER-MANIFEST-CONSISTENCY-RECHECK-V2',
  'NEXT-PASS-P36-LANGUAGE-ISOLATION-REGRESSION-RECHECK-V2',
  'NEXT-PASS-P38-MASTER-NEXT-PASS-CONSISTENCY-REFRESH-V2',
  'NEXT-PASS-P39-OFFICIAL-SOURCE-CONTENT-COVERAGE-V2',
  'NEXT-PASS-P40-REVIEWER-DECISION-IMPORT-DRY-RUN-REFRESH-V2',
  'NEXT-PASS-P41-PAYLOAD-CREATION-APPROVAL-PREFLIGHT-REFRESH-V2',
  'NEXT-PASS-P42-CLOSED-LOCAL-PAYLOAD-MATERIALIZATION-REFRESH-V2',
  'NEXT-PASS-P43-PRODUCTION-ACTIVATION-HOLD-EXACT-APPROVAL-REQUIRED-V2',
  'NEXT-PASS-P44-EXACT-APPROVAL-VALIDATION-GATE-V2',
  'NEXT-PASS-P45-PRODUCTION-ACTIVATION-SEQUENCE-PREFLIGHT-V2',
  'NEXT-PASS-P46-PRODUCTION-APPLY-TRANSACTION-CONTRACT-V2',
  'NEXT-PASS-P47-POST-APPLY-ROLLBACK-GUARD-CONTRACT-V2',
  'NEXT-PASS-P48-APPROVAL-WAIT-SAFE-CONTINUATION-V2',
  'NEXT-PASS-P49-PRODUCTION-READINESS-COMPLETION-AUDIT-V2',
  'NEXT-PASS-P50-FINAL-PREAPPROVAL-EVIDENCE-HASH-LOCK-V2',
  'NEXT-PASS-P51-EXACT-APPROVAL-APPLY-REHEARSAL-V2',
  'NEXT-PASS-P52-EXACT-APPROVAL-SOURCE-FIREWALL-V2',
  'NEXT-PASS-P53-EXACT-APPROVAL-SOURCE-INTAKE-TRANSITION-V2',
  'NEXT-PASS-P54-EXACT-APPROVAL-ACTIVE-ARTIFACT-PAIR-SIMULATION-V2',
  'NEXT-PASS-P55-EXACT-APPROVAL-P31-CREATE-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P56-EXACT-APPROVAL-P44-VALIDATION-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P57-EXACT-APPROVAL-P44-TO-P45-SEQUENCE-HANDOFF-SIMULATION-V2',
  'NEXT-PASS-P58-EXACT-APPROVAL-P45-SEQUENCE-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2',
  'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2',
  'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2',
  'NEXT-PASS-P64-EXACT-APPROVAL-P48-SAFE-CONTINUATION-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P65-EXACT-APPROVAL-WAIT-STATE-V2',
  'NEXT-PASS-P66-SAFE-PREAPPROVAL-CONTINUATION-V2',
  'NEXT-PASS-P67-FINAL-PRODUCTION-READINESS-GAP-V2',
  'NEXT-PASS-P68-EXACT-APPROVAL-SOURCE-HANDOFF-FIREWALL-V2',
  'NEXT-PASS-P69-EXACT-APPROVAL-SOURCE-WAIT-TERMINAL-STATE-V2',
]);
const P37_ALL_SAFE_ITEMS_CLOSED_NEXT_GOALS = new Set([
  'NEXT-PASS-P39-OFFICIAL-SOURCE-CONTENT-COVERAGE-V2',
  'NEXT-PASS-P40-REVIEWER-DECISION-IMPORT-DRY-RUN-REFRESH-V2',
  'NEXT-PASS-P41-PAYLOAD-CREATION-APPROVAL-PREFLIGHT-REFRESH-V2',
  'NEXT-PASS-P42-CLOSED-LOCAL-PAYLOAD-MATERIALIZATION-REFRESH-V2',
  'NEXT-PASS-P43-PRODUCTION-ACTIVATION-HOLD-EXACT-APPROVAL-REQUIRED-V2',
  'NEXT-PASS-P44-EXACT-APPROVAL-VALIDATION-GATE-V2',
  'NEXT-PASS-P45-PRODUCTION-ACTIVATION-SEQUENCE-PREFLIGHT-V2',
  'NEXT-PASS-P46-PRODUCTION-APPLY-TRANSACTION-CONTRACT-V2',
  'NEXT-PASS-P47-POST-APPLY-ROLLBACK-GUARD-CONTRACT-V2',
  'NEXT-PASS-P48-APPROVAL-WAIT-SAFE-CONTINUATION-V2',
  'NEXT-PASS-P49-PRODUCTION-READINESS-COMPLETION-AUDIT-V2',
  'NEXT-PASS-P50-FINAL-PREAPPROVAL-EVIDENCE-HASH-LOCK-V2',
  'NEXT-PASS-P51-EXACT-APPROVAL-APPLY-REHEARSAL-V2',
  'NEXT-PASS-P52-EXACT-APPROVAL-SOURCE-FIREWALL-V2',
  'NEXT-PASS-P53-EXACT-APPROVAL-SOURCE-INTAKE-TRANSITION-V2',
  'NEXT-PASS-P54-EXACT-APPROVAL-ACTIVE-ARTIFACT-PAIR-SIMULATION-V2',
  'NEXT-PASS-P55-EXACT-APPROVAL-P31-CREATE-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P56-EXACT-APPROVAL-P44-VALIDATION-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P57-EXACT-APPROVAL-P44-TO-P45-SEQUENCE-HANDOFF-SIMULATION-V2',
  'NEXT-PASS-P58-EXACT-APPROVAL-P45-SEQUENCE-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P59-EXACT-APPROVAL-P45-TO-P46-APPLY-TRANSACTION-HANDOFF-SIMULATION-V2',
  'NEXT-PASS-P60-EXACT-APPROVAL-P46-APPLY-TRANSACTION-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P61-EXACT-APPROVAL-P46-TO-P47-ROLLBACK-GUARD-HANDOFF-SIMULATION-V2',
  'NEXT-PASS-P62-EXACT-APPROVAL-P47-ROLLBACK-GUARD-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P63-EXACT-APPROVAL-P47-TO-P48-SAFE-CONTINUATION-HANDOFF-SIMULATION-V2',
  'NEXT-PASS-P64-EXACT-APPROVAL-P48-SAFE-CONTINUATION-COMMAND-PREFLIGHT-V2',
  'NEXT-PASS-P65-EXACT-APPROVAL-WAIT-STATE-V2',
  'NEXT-PASS-P66-SAFE-PREAPPROVAL-CONTINUATION-V2',
  'NEXT-PASS-P67-FINAL-PRODUCTION-READINESS-GAP-V2',
  'NEXT-PASS-P68-EXACT-APPROVAL-SOURCE-HANDOFF-FIREWALL-V2',
  'NEXT-PASS-P69-EXACT-APPROVAL-SOURCE-WAIT-TERMINAL-STATE-V2',
]);
const EXPECTED_RUNTIME_PLAN_ITEMS = 9;
const EXPECTED_PLANNED_TOUCHES = 18;

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

function writeJson(filePath: string, value: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function arr(value: JsonObject, key: string): unknown[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw : [];
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

function sameSet(a: string[], bList: string[]): boolean {
  const left = [...a].sort();
  const right = [...bList].sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function evaluate(input: EvaluationInput): Finding[] {
  const findings: Finding[] = [];
  const expectedApplyFailures = sameSet(input.readinessFailedIds, EXPECTED_FAILED_READINESS_IDS);

  if (!input.p36Ready) addFinding(findings, 'blocker', 'P36_NOT_READY', 'P37 requires language isolation regression recheck V2 to be ready.');
  if (!input.readinessPresent) addFinding(findings, 'blocker', 'READINESS_GATE_MISSING', 'gustav_readiness_gate.json must exist.');
  if (input.readinessChecks <= 0) addFinding(findings, 'blocker', 'READINESS_CHECKS_EMPTY', 'Readiness gate must contain checks.');
  if (input.readinessGenerationBlockers !== 0) addFinding(findings, 'blocker', 'GENERATION_BLOCKERS_REMAIN', `${input.readinessGenerationBlockers} generation blocker(s) remain.`);
  if (
    input.readinessApplyBlockers !== EXPECTED_FAILED_READINESS_IDS.length ||
    input.readinessBlockers !== EXPECTED_FAILED_READINESS_IDS.length ||
    input.readinessFailed !== EXPECTED_FAILED_READINESS_IDS.length
  ) {
    addFinding(findings, 'blocker', 'READINESS_APPLY_BLOCKER_COUNT_DRIFT', `P37 expects exactly ${EXPECTED_FAILED_READINESS_IDS.length} apply blocker(s) and no generation blockers.`);
  }
  if (!expectedApplyFailures) addFinding(findings, 'blocker', 'READINESS_FAILED_IDS_DRIFT', `Expected failed readiness checks ${EXPECTED_FAILED_READINESS_IDS.join(', ')}, got ${input.readinessFailedIds.join(', ') || 'none'}.`);
  if (input.readinessWarnings !== 0) addFinding(findings, 'blocker', 'READINESS_WARNINGS_PRESENT', `${input.readinessWarnings} readiness warning(s) remain.`);

  if (!input.runtimePlanReady) addFinding(findings, 'blocker', 'RUNTIME_ACTIVATION_BLOCKER_PLAN_NOT_READY', 'Runtime activation blocker plan must be ready.');
  if (input.runtimePlanItems !== EXPECTED_RUNTIME_PLAN_ITEMS) addFinding(findings, 'blocker', 'RUNTIME_PLAN_ITEM_COUNT_DRIFT', `Expected ${EXPECTED_RUNTIME_PLAN_ITEMS} runtime activation blocker items, got ${input.runtimePlanItems}.`);
  if (input.runtimePlanPlannedTouches !== EXPECTED_PLANNED_TOUCHES) addFinding(findings, 'blocker', 'RUNTIME_PLAN_TOUCH_COUNT_DRIFT', `Expected ${EXPECTED_PLANNED_TOUCHES} planned touches, got ${input.runtimePlanPlannedTouches}.`);
  if (input.runtimePlanTouchesWithFutureGate !== input.runtimePlanPlannedTouches) addFinding(findings, 'blocker', 'RUNTIME_PLAN_FUTURE_GATES_MISSING', 'Every planned touch must have a future gate.');
  if (input.runtimePlanTouchesWithRollbackCheck !== input.runtimePlanPlannedTouches) addFinding(findings, 'blocker', 'RUNTIME_PLAN_ROLLBACK_CHECKS_MISSING', 'Every planned touch must have a rollback check.');
  if (
    input.runtimeRuntimeBlockers !== 3 ||
    input.runtimeServerBlockers !== 1 ||
    input.runtimeStorageCloudBlockers !== 1 ||
    input.runtimeAdminBlockers !== 1 ||
    input.runtimeReviewerImportBlockers !== 1 ||
    input.runtimeRollbackBlockers !== 1 ||
    input.runtimeApplyApprovalBlockers !== 1
  ) {
    addFinding(findings, 'blocker', 'RUNTIME_BLOCKER_AREA_COUNTS_DRIFT', 'Runtime activation blocker areas must remain mapped as 3 runtime, 1 server, 1 storage/cloud, 1 admin, 1 reviewer import, 1 rollback, 1 apply approval.');
  }
  if (input.runtimeReadinessApplyBlockers !== EXPECTED_FAILED_READINESS_IDS.length) {
    addFinding(
      findings,
      'blocker',
      'RUNTIME_READINESS_APPLY_BLOCKERS_DRIFT',
      `Runtime plan must still reference the ${EXPECTED_FAILED_READINESS_IDS.length} readiness apply blocker(s).`,
    );
  }
  if (input.runtimeDirtyWorktreeOverlaps < 0) addFinding(findings, 'blocker', 'RUNTIME_DIRTY_WORKTREE_OVERLAPS_INVALID', 'Dirty worktree overlap count must be available.');
  if (input.runtimeApprovalReceiptExists || input.runtimeActiveHashLockExists) addFinding(findings, 'blocker', 'RUNTIME_APPROVAL_ARTIFACTS_ALREADY_ACTIVE', 'Runtime plan must not see active approval receipt/hash lock in P37.');
  if (input.productionServerManifestExists) addFinding(findings, 'blocker', 'PRODUCTION_SERVER_MANIFEST_EXISTS', 'Production server manifest must not exist in P37.');
  if (!input.runtimeReadyForExplicitApprovalReceiptGate) addFinding(findings, 'blocker', 'RUNTIME_PLAN_NOT_READY_FOR_EXACT_APPROVAL_GATE', 'Runtime plan should be ready for exact approval gate while apply remains closed.');
  if (
    input.runtimeActivationApproved ||
    input.runtimeReadyForApply ||
    input.runtimeMayModifyProductionAppFiles ||
    input.runtimeServerUploadAllowed ||
    input.runtimeFirebaseUploadAllowed ||
    input.runtimeDownloadsEnabled ||
    input.runtimeStorageMigrationAllowed ||
    input.runtimeCloudSyncMigrationAllowed
  ) {
    addFinding(findings, 'blocker', 'RUNTIME_PLAN_OPENED_FORBIDDEN_FLAG', 'Runtime plan must keep activation/apply/upload/download/storage/cloud flags closed.');
  }

  if (!input.productionApplyDenialReady) addFinding(findings, 'blocker', 'PRODUCTION_APPLY_DENIAL_NOT_READY', 'Production apply absence denial must be safe HOLD ready.');
  if (!input.productionApplyDenied) addFinding(findings, 'blocker', 'PRODUCTION_APPLY_NOT_DENIED', 'Production apply must remain denied in P37.');
  if (input.productionApplyDenialState !== 'production_apply_denied_missing_active_approval_artifacts') addFinding(findings, 'blocker', 'PRODUCTION_APPLY_DENIAL_STATE_DRIFT', `Unexpected denial state: ${input.productionApplyDenialState}.`);
  if (input.activeApprovalReceiptExists || input.activeHashLockExists) addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACTS_EXIST', 'Active approval receipt/hash lock must not exist in P37.');
  if (!input.activeApprovalArtifactsMissing || input.activeApprovalArtifactsMismatched) addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACT_STATE_DRIFT', 'P37 expects active approval artifacts to be missing, not mismatched.');
  if (!input.canContinueNonProductionAudit || !input.readyForNonProductionContinuationAfterApplyDenial) addFinding(findings, 'blocker', 'NON_PRODUCTION_CONTINUATION_NOT_ALLOWED', 'P37 must be able to continue non-production audit after apply denial.');
  if (
    input.productionReadyForApply ||
    input.productionMayModifyProductionAppFiles ||
    input.productionWritesAllowed ||
    input.productionServerUploadAllowed ||
    input.productionFirebaseUploadAllowed ||
    input.productionRuntimeDownloadsEnabled ||
    input.productionDownloadablePacksPublished ||
    input.productionStorageMigrationAllowed ||
    input.productionCloudSyncMigrationAllowed
  ) {
    addFinding(findings, 'blocker', 'PRODUCTION_DENIAL_OPENED_FORBIDDEN_FLAG', 'Production apply denial must keep all apply/upload/download/storage/cloud flags closed.');
  }

  if (!input.closurePlanReady) addFinding(findings, 'blocker', 'NONPRODUCTION_CLOSURE_PLAN_NOT_READY', 'Non-production closure plan must remain ready.');
  if (input.closureSafeItems !== 5 || input.closureExactApprovalOnlyItems !== 2 || input.closureProductionLockedItems !== 2) addFinding(findings, 'blocker', 'CLOSURE_ITEM_COUNTS_DRIFT', 'Closure plan must keep 5 safe, 2 exact-approval and 2 production-locked items.');
  if (!input.nextGoalIsP37) addFinding(findings, 'blocker', 'NEXT_GOAL_NOT_REPLAY_SAFE_FOR_P37', 'Next-pass contract must point at P37 or a downstream replay-safe safe/approval-hold goal before this refresh runs.');

  return findings;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{ id: string; expectedSafe: boolean; mutate: (input: EvaluationInput) => void }> = [
    { id: 'current_readiness_apply_blocker_map_is_safe', expectedSafe: true, mutate: () => undefined },
    { id: 'p36_not_ready_is_rejected', expectedSafe: false, mutate: (input) => { input.p36Ready = false; } },
    { id: 'generation_blocker_is_rejected', expectedSafe: false, mutate: (input) => { input.readinessGenerationBlockers = 1; } },
    { id: 'apply_blockers_disappear_before_approval_is_rejected', expectedSafe: false, mutate: (input) => { input.readinessApplyBlockers = 0; input.readinessBlockers = 0; input.readinessFailed = 0; input.readinessFailedIds = []; } },
    { id: 'unexpected_readiness_failed_id_is_rejected', expectedSafe: false, mutate: (input) => { input.readinessFailedIds = ['RDY-090', 'RDY-099']; } },
    { id: 'runtime_plan_item_missing_is_rejected', expectedSafe: false, mutate: (input) => { input.runtimePlanItems = 8; } },
    { id: 'planned_touch_missing_future_gate_is_rejected', expectedSafe: false, mutate: (input) => { input.runtimePlanTouchesWithFutureGate = 17; } },
    { id: 'planned_touch_missing_rollback_is_rejected', expectedSafe: false, mutate: (input) => { input.runtimePlanTouchesWithRollbackCheck = 17; } },
    { id: 'production_apply_not_denied_is_rejected', expectedSafe: false, mutate: (input) => { input.productionApplyDenied = false; } },
    { id: 'active_approval_receipt_is_rejected', expectedSafe: false, mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'active_hash_lock_is_rejected', expectedSafe: false, mutate: (input) => { input.activeHashLockExists = true; } },
    { id: 'ready_for_apply_is_rejected', expectedSafe: false, mutate: (input) => { input.productionReadyForApply = true; } },
    { id: 'server_upload_open_is_rejected', expectedSafe: false, mutate: (input) => { input.productionServerUploadAllowed = true; } },
    { id: 'runtime_download_open_is_rejected', expectedSafe: false, mutate: (input) => { input.productionRuntimeDownloadsEnabled = true; } },
    { id: 'closure_counts_drift_is_rejected', expectedSafe: false, mutate: (input) => { input.closureSafeItems = 4; } },
  ];
  return cases.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    const blockers = evaluate(fixture).filter((finding) => finding.severity === 'blocker').length;
    const safe = blockers === 0;
    return {
      id: test.id,
      expectedSafe: test.expectedSafe,
      safe,
      blockers,
      passed: safe === test.expectedSafe,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Readiness/Apply Blocker Map Refresh V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Blocker map state: ${report.summary.blockerMapState}`,
    `- P36 ready: ${report.summary.p36Ready ? 'yes' : 'no'}`,
    `- Readiness checks passed/failed: ${report.summary.readinessPassed}/${report.summary.readinessFailed} of ${report.summary.readinessChecks}`,
    `- Readiness generation/apply blockers: ${report.summary.readinessGenerationBlockers}/${report.summary.readinessApplyBlockers}`,
    `- Failed readiness ids: ${report.summary.readinessFailedIds.join(', ') || 'none'}`,
    `- Runtime plan items/touches: ${report.summary.runtimePlanItems}/${report.summary.runtimePlanPlannedTouches}`,
    `- Runtime future gates/rollback checks: ${report.summary.runtimePlanTouchesWithFutureGate}/${report.summary.runtimePlanTouchesWithRollbackCheck}`,
    `- Runtime blocker areas covered: ${report.summary.runtimeBlockerAreasCovered}`,
    `- Runtime ready for exact approval receipt gate: ${report.summary.runtimeReadyForExplicitApprovalReceiptGate ? 'yes' : 'no'}`,
    `- Production apply denied: ${report.summary.productionApplyDenied ? 'yes' : 'no'}`,
    `- Production apply denial state: ${report.summary.productionApplyDenialState}`,
    `- Active approval receipt/hash lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Safe non-production items closed/total: ${report.summary.safeNonProductionItemsClosed}/${report.summary.safeNonProductionItemsTotal}`,
    `- Safe non-production items remaining: ${report.summary.safeNonProductionItemsRemaining}`,
    `- Exact approval / production locked items: ${report.summary.exactApprovalOnlyItems}/${report.summary.productionLockedItems}`,
    `- Next safe item: ${report.summary.nextSafeItem}`,
    `- Ready for next master/next-pass consistency refresh: ${report.summary.readyForNextNonProductionMasterNextPassConsistencyRefresh ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Server/Firebase upload allowed: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}`,
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
    '- This packet is audit-only.',
    '- It does not create approval receipts or hash locks, publish server manifests, upload to Firebase/server, enable runtime downloads, import reviewer decisions, change storage/cloud migration or approve apply.',
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

  const p36Path = path.join(auditsDir, 'language_isolation_regression_recheck_v2_packet.json');
  const readinessPath = path.join(auditsDir, 'gustav_readiness_gate.json');
  const runtimePlanPath = path.join(auditsDir, 'runtime_activation_blocker_plan_v2_packet.json');
  const productionDenialPath = path.join(auditsDir, 'production_apply_absence_denial_gate_v2_packet.json');
  const closurePlanPath = path.join(auditsDir, 'nonproduction_blocker_closure_plan_v2_packet.json');
  const nextPassPath = path.join(auditsDir, 'next_pass_goal_contract_packet.json');
  const outputJsonPath = path.join(auditsDir, 'readiness_apply_blocker_map_refresh_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'readiness_apply_blocker_map_refresh_v2_packet.md');

  const p36 = readJsonOrEmpty(p36Path);
  const readiness = readJsonOrEmpty(readinessPath);
  const runtimePlan = readJsonOrEmpty(runtimePlanPath);
  const productionDenial = readJsonOrEmpty(productionDenialPath);
  const closurePlan = readJsonOrEmpty(closurePlanPath);
  const nextPass = readJsonOrEmpty(nextPassPath);

  const p36Summary = summaryOf(p36);
  const readinessSummary = summaryOf(readiness);
  const runtimeSummary = summaryOf(runtimePlan);
  const denialSummary = summaryOf(productionDenial);
  const closureSummary = summaryOf(closurePlan);
  const failedReadinessIds = arr(readiness, 'checks').map(object)
    .filter((check) => s(check, 'status') === 'FAIL')
    .map((check) => s(check, 'id'))
    .filter((id) => id !== '');
  const nextGoals = arr(nextPass, 'nextPassGoals').map(object);

  const input: EvaluationInput = {
    p36Ready:
      s(p36, 'status') === 'PASS' &&
      n(p36Summary, 'blockers') === 0 &&
      s(p36Summary, 'languageIsolationRegressionRecheckState') === 'language_isolation_regression_recheck_ready' &&
      b(p36Summary, 'readyForNextNonProductionReadinessApplyBlockerMapRefresh') &&
      !b(p36Summary, 'readyForApply') &&
      !b(p36Summary, 'mayModifyProductionAppFiles'),
    readinessPresent: fs.existsSync(readinessPath),
    readinessChecks: n(readinessSummary, 'checks'),
    readinessPassed: n(readinessSummary, 'passed'),
    readinessFailed: n(readinessSummary, 'failed'),
    readinessBlockers: n(readinessSummary, 'blockers'),
    readinessWarnings: n(readinessSummary, 'warnings'),
    readinessGenerationBlockers: n(readinessSummary, 'generationBlockers'),
    readinessApplyBlockers: n(readinessSummary, 'applyBlockers'),
    readinessFailedIds: failedReadinessIds,
    runtimePlanReady:
      s(runtimePlan, 'status') === 'PASS' &&
      n(runtimeSummary, 'blockers') === 0 &&
      s(runtimeSummary, 'planState') === 'runtime_activation_blocker_plan_ready' &&
      b(runtimeSummary, 'readyForExplicitApprovalReceiptGateV2'),
    runtimePlanItems: n(runtimeSummary, 'planItems'),
    runtimePlanPlannedTouches: n(runtimeSummary, 'plannedTouches'),
    runtimePlanTouchesWithFutureGate: n(runtimeSummary, 'plannedTouchesWithFutureGate'),
    runtimePlanTouchesWithRollbackCheck: n(runtimeSummary, 'plannedTouchesWithRollbackCheck'),
    runtimeRuntimeBlockers: n(runtimeSummary, 'runtimeBlockers'),
    runtimeServerBlockers: n(runtimeSummary, 'serverBlockers'),
    runtimeStorageCloudBlockers: n(runtimeSummary, 'storageCloudBlockers'),
    runtimeAdminBlockers: n(runtimeSummary, 'adminBlockers'),
    runtimeReviewerImportBlockers: n(runtimeSummary, 'reviewerImportBlockers'),
    runtimeRollbackBlockers: n(runtimeSummary, 'rollbackBlockers'),
    runtimeApplyApprovalBlockers: n(runtimeSummary, 'applyApprovalBlockers'),
    runtimeReadinessApplyBlockers: n(runtimeSummary, 'readinessApplyBlockers'),
    runtimeDirtyWorktreeOverlaps: n(runtimeSummary, 'readinessDirtyWorktreeOverlaps'),
    runtimeApprovalReceiptExists: b(runtimeSummary, 'p1aApprovalReceiptExists'),
    runtimeActiveHashLockExists: b(runtimeSummary, 'p1aActiveHashLockExists'),
    productionServerManifestExists: b(runtimeSummary, 'productionServerManifestExists'),
    runtimeReadyForExplicitApprovalReceiptGate: b(runtimeSummary, 'readyForExplicitApprovalReceiptGateV2'),
    runtimeActivationApproved: b(runtimeSummary, 'activationApproved'),
    runtimeReadyForApply: b(runtimeSummary, 'readyForApply'),
    runtimeMayModifyProductionAppFiles: b(runtimeSummary, 'mayModifyProductionAppFiles'),
    runtimeServerUploadAllowed: b(runtimeSummary, 'serverUploadAllowed'),
    runtimeFirebaseUploadAllowed: b(runtimeSummary, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(runtimeSummary, 'runtimeDownloadsEnabled'),
    runtimeStorageMigrationAllowed: b(runtimeSummary, 'storageMigrationAllowed'),
    runtimeCloudSyncMigrationAllowed: b(runtimeSummary, 'cloudSyncMigrationAllowed'),
    productionApplyDenialReady:
      n(denialSummary, 'blockers') === 0 &&
      b(denialSummary, 'productionApplyDenied') &&
      b(denialSummary, 'readyForNonProductionContinuationAfterApplyDenialV2') &&
      s(denialSummary, 'denialState') === 'production_apply_denied_missing_active_approval_artifacts',
    productionApplyDenied: b(denialSummary, 'productionApplyDenied'),
    productionApplyDenialState: s(denialSummary, 'denialState'),
    activeApprovalReceiptExists: b(denialSummary, 'activeApprovalReceiptExists'),
    activeHashLockExists: b(denialSummary, 'activeHashLockExists'),
    activeApprovalArtifactsMissing: b(denialSummary, 'activeApprovalArtifactsMissing'),
    activeApprovalArtifactsMismatched: b(denialSummary, 'activeApprovalArtifactsMismatched'),
    canContinueNonProductionAudit: b(denialSummary, 'canContinueNonProductionAudit'),
    readyForNonProductionContinuationAfterApplyDenial: b(denialSummary, 'readyForNonProductionContinuationAfterApplyDenialV2'),
    productionReadyForApply: b(denialSummary, 'readyForApply'),
    productionMayModifyProductionAppFiles: b(denialSummary, 'mayModifyProductionAppFiles'),
    productionWritesAllowed: b(denialSummary, 'productionWritesAllowed'),
    productionServerUploadAllowed: b(denialSummary, 'serverUploadAllowed'),
    productionFirebaseUploadAllowed: b(denialSummary, 'firebaseUploadAllowed'),
    productionRuntimeDownloadsEnabled: b(denialSummary, 'runtimeDownloadsEnabled'),
    productionDownloadablePacksPublished: b(denialSummary, 'downloadablePacksPublished'),
    productionStorageMigrationAllowed: b(denialSummary, 'storageMigrationAllowed'),
    productionCloudSyncMigrationAllowed: b(denialSummary, 'cloudSyncMigrationAllowed'),
    closurePlanReady:
      s(closurePlan, 'status') === 'PASS' &&
      n(closureSummary, 'blockers') === 0 &&
      s(closureSummary, 'planState') === 'nonproduction_closure_plan_ready',
    closureSafeItems: n(closureSummary, 'safeNonProductionItems'),
    closureExactApprovalOnlyItems: n(closureSummary, 'exactApprovalOnlyItems'),
    closureProductionLockedItems: n(closureSummary, 'productionLockedItems'),
    nextGoalIsP37: nextGoals.length > 0 && P37_REPLAY_SAFE_NEXT_GOALS.has(s(nextGoals[0], 'id')),
  };

  const findings = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const accepted = blockers === 0;
  const nextGoalId = nextGoals.length > 0 ? s(nextGoals[0], 'id') : '';
  const allSafeItemsClosed = accepted && P37_ALL_SAFE_ITEMS_CLOSED_NEXT_GOALS.has(nextGoalId);
  const safeClosed = accepted ? (allSafeItemsClosed ? input.closureSafeItems : 4) : 3;
  const nextSafeItem = allSafeItemsClosed ? '' : 'NP-05-MASTER-NEXT-PASS-CONSISTENCY-REFRESH';

  const report: Report = {
    schemaVersion: 'gustav-readiness-apply-blocker-map-refresh-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: accepted ? 'PASS' : 'BLOCK',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      languageIsolationRegressionRecheckV2Packet: rel(repoRoot, p36Path),
      gustavReadinessGate: rel(repoRoot, readinessPath),
      runtimeActivationBlockerPlanV2Packet: rel(repoRoot, runtimePlanPath),
      productionApplyAbsenceDenialGateV2Packet: rel(repoRoot, productionDenialPath),
      nonproductionBlockerClosurePlanV2Packet: rel(repoRoot, closurePlanPath),
      nextPassGoalContractPacket: rel(repoRoot, nextPassPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      blockerMapState: accepted ? 'readiness_apply_blocker_map_refreshed' : 'blocked_by_findings',
      p36Ready: input.p36Ready,
      readinessChecks: input.readinessChecks,
      readinessPassed: input.readinessPassed,
      readinessFailed: input.readinessFailed,
      readinessBlockers: input.readinessBlockers,
      readinessWarnings: input.readinessWarnings,
      readinessGenerationBlockers: input.readinessGenerationBlockers,
      readinessApplyBlockers: input.readinessApplyBlockers,
      readinessFailedIds: input.readinessFailedIds,
      readinessOnlyExpectedApplyFailures: sameSet(input.readinessFailedIds, EXPECTED_FAILED_READINESS_IDS),
      runtimePlanReady: input.runtimePlanReady,
      runtimePlanItems: input.runtimePlanItems,
      runtimePlanPlannedTouches: input.runtimePlanPlannedTouches,
      runtimePlanTouchesWithFutureGate: input.runtimePlanTouchesWithFutureGate,
      runtimePlanTouchesWithRollbackCheck: input.runtimePlanTouchesWithRollbackCheck,
      runtimeBlockerAreasCovered: [
        input.runtimeRuntimeBlockers > 0,
        input.runtimeServerBlockers > 0,
        input.runtimeStorageCloudBlockers > 0,
        input.runtimeAdminBlockers > 0,
        input.runtimeReviewerImportBlockers > 0,
        input.runtimeRollbackBlockers > 0,
        input.runtimeApplyApprovalBlockers > 0,
      ].filter(Boolean).length,
      runtimeReadinessApplyBlockers: input.runtimeReadinessApplyBlockers,
      runtimeDirtyWorktreeOverlaps: input.runtimeDirtyWorktreeOverlaps,
      runtimeReadyForExplicitApprovalReceiptGate: input.runtimeReadyForExplicitApprovalReceiptGate,
      productionApplyDenialReady: input.productionApplyDenialReady,
      productionApplyDenied: input.productionApplyDenied,
      productionApplyDenialState: input.productionApplyDenialState,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      activeApprovalArtifactsMissing: input.activeApprovalArtifactsMissing,
      canContinueNonProductionAudit: input.canContinueNonProductionAudit,
      safeNonProductionItemsTotal: input.closureSafeItems,
      safeNonProductionItemsClosed: safeClosed,
      safeNonProductionItemsRemaining: Math.max(0, input.closureSafeItems - safeClosed),
      exactApprovalOnlyItems: input.closureExactApprovalOnlyItems,
      productionLockedItems: input.closureProductionLockedItems,
      nextSafeItem,
      readyForNextNonProductionMasterNextPassConsistencyRefresh: accepted && !allSafeItemsClosed,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      downloadablePacksPublished: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      productionWritesAllowed: false,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
      blockers,
      warnings,
    },
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
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

  console.log(`GUSTAV readiness/apply blocker map refresh V2 packet: ${report.status}`);
  console.log(`Blocker map state: ${report.summary.blockerMapState}`);
  console.log(`Readiness generation/apply blockers: ${report.summary.readinessGenerationBlockers}/${report.summary.readinessApplyBlockers}`);
  console.log(`Safe items closed/remaining: ${report.summary.safeNonProductionItemsClosed}/${report.summary.safeNonProductionItemsRemaining}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
