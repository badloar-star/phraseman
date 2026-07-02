import * as childProcess from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type ReceiptCreationState =
  | 'blocked_by_findings'
  | 'approval_receipt_creation_waiting_for_exact_sentence'
  | 'exact_sentence_present_creation_not_requested'
  | 'active_approval_artifacts_created';
type ActiveApprovalArtifactPairState =
  | 'blocked_by_findings'
  | 'absent_waiting_for_exact_approval_source'
  | 'exact_approval_source_present_creation_not_requested'
  | 'active_approval_artifact_pair_created';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedState: ReceiptCreationState;
  expectedReceiptCreated: boolean;
  receiptCreationState: ReceiptCreationState;
  activeApprovalReceiptCreated: boolean;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type EvaluationInput = {
  p30Ready: boolean;
  p30State: string;
  p30Blockers: number;
  p30ReadyForApply: boolean;
  p30MayModifyProductionAppFiles: boolean;
  p29Ready: boolean;
  p29Blockers: number;
  p29ReadyForApply: boolean;
  p28Ready: boolean;
  p28Blockers: number;
  p50Ready: boolean;
  p50Blockers: number;
  finalHashLockDryRunPresent: boolean;
  finalHashLocks: number;
  readinessApplyBlockers: number;
  readinessMayModifyProductionAppFiles: boolean;
  approvalSourceExists: boolean;
  approvalSourceIsCanonical: boolean;
  exactApprovalSentencePresent: boolean;
  createActiveReceiptRequested: boolean;
  activeApprovalReceiptExistsBefore: boolean;
  activeHashLockExistsBefore: boolean;
  currentDirtyFiles: number;
  p30DirtyFiles: number;
  dirtyWorktreeDriftDetected: boolean;
  criticalHashLocks: number;
  p30CriticalHashLocks: number;
  hashLockDryRunPresent: boolean;
  approvalRequestPresent: boolean;
  approvalTemplatePresent: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  runtimeDownloadsEnabled: boolean;
  targetManifestActivationApproved: boolean;
  targetManifestReadyForApply: boolean;
  targetManifestMayModifyProductionAppFiles: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  receiptCreationState: ReceiptCreationState;
  approvalSourceExists: boolean;
  approvalSourceIsCanonical: boolean;
  exactApprovalSentencePresent: boolean;
  plainContinueRejected: true;
  createActiveReceiptRequested: boolean;
  activeApprovalReceiptExistsBefore: boolean;
  activeHashLockExistsBefore: boolean;
  activeApprovalReceiptCreated: boolean;
  activeHashLockCreated: boolean;
  activeApprovalReceiptExistsAfter: boolean;
  activeHashLockExistsAfter: boolean;
  activeApprovalArtifactPairState: ActiveApprovalArtifactPairState;
  activeApprovalArtifactsOneSidedBefore: boolean;
  activeApprovalArtifactsOneSidedAfter: boolean;
  activeApprovalArtifactPairAtomicityRequired: true;
  activeApprovalArtifactPairAtomicitySatisfied: boolean;
  activeApprovalArtifactPairLineageRequired: true;
  activeApprovalArtifactPairReferencesCanonicalApprovalSource: boolean;
  activeApprovalArtifactPairReferencesDryRunHashLock: boolean;
  activeApprovalArtifactPairReferencesFinalPreapprovalEvidenceHashLock: boolean;
  activeApprovalArtifactPairReadyForP44: boolean;
  p30Ready: boolean;
  p30State: string;
  p29Ready: boolean;
  p28Ready: boolean;
  p50Ready: boolean;
  finalHashLockDryRunPresent: boolean;
  finalHashLocks: number;
  currentDirtyFiles: number;
  p30DirtyFiles: number;
  dirtyWorktreeDriftDetected: boolean;
  criticalHashLocks: number;
  p30CriticalHashLocks: number;
  readinessApplyBlockers: number;
  approvalRequestPresent: boolean;
  approvalTemplatePresent: boolean;
  hashLockDryRunPresent: boolean;
  activationApproved: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  productionWritesAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
  storageMigrationAllowed: false;
  cloudSyncMigrationAllowed: false;
  readyForProductionApplyGateV2: false;
  canContinueNonProductionAudit: boolean;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-explicit-approval-receipt-creation-gate-v2-packet-v0';
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
  requiredApprovalSentence: string;
  approvalInput: {
    sourcePath: string;
    sourceExists: boolean;
    sourceIsCanonical: boolean;
    exactSentencePresent: boolean;
    createActiveReceiptRequested: boolean;
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
    approvalReceiptCreatedByThisScript: boolean;
    activeHashLockCreatedByThisScript: boolean;
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

function hasArg(name: string): boolean {
  return process.argv.includes(name);
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

function safeUnlink(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Best-effort cleanup only; the caller still receives the original write error.
  }
}

function writeJsonActiveArtifactPair(receiptPath: string, receiptValue: unknown, hashLockPath: string, hashLockValue: unknown): void {
  ensureDir(path.dirname(receiptPath));
  ensureDir(path.dirname(hashLockPath));
  const suffix = `.tmp-${process.pid}-${Date.now()}`;
  const receiptTmpPath = `${receiptPath}${suffix}`;
  const hashLockTmpPath = `${hashLockPath}${suffix}`;

  try {
    if (fs.existsSync(receiptPath) || fs.existsSync(hashLockPath)) {
      throw new Error('Active approval artifacts already exist; refusing to overwrite receipt/hash-lock pair.');
    }
    fs.writeFileSync(receiptTmpPath, `${JSON.stringify(receiptValue, null, 2)}\n`, 'utf8');
    fs.writeFileSync(hashLockTmpPath, `${JSON.stringify(hashLockValue, null, 2)}\n`, 'utf8');
    fs.renameSync(receiptTmpPath, receiptPath);
    fs.renameSync(hashLockTmpPath, hashLockPath);
  } catch (error) {
    safeUnlink(receiptTmpPath);
    safeUnlink(hashLockTmpPath);
    const receiptExists = fs.existsSync(receiptPath);
    const hashLockExists = fs.existsSync(hashLockPath);
    if (receiptExists !== hashLockExists) {
      safeUnlink(receiptPath);
      safeUnlink(hashLockPath);
    }
    throw error;
  }
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function sha256Text(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function readJsonOrEmpty(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
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
  const activeApprovalArtifactsOneSidedBefore = input.activeApprovalReceiptExistsBefore !== input.activeHashLockExistsBefore;
  if (!input.p30Ready) addFinding(findings, 'blocker', 'P30_NOT_READY', `P30 must be ready, got state=${input.p30State}.`);
  if (input.p30Blockers > 0) addFinding(findings, 'blocker', 'P30_BLOCKERS', `P30 has ${input.p30Blockers} blocker(s).`);
  if (!input.p29Ready) addFinding(findings, 'blocker', 'P29_NOT_READY', 'P29 approval/hash-lock package must be ready before P31.');
  if (input.p29Blockers > 0) addFinding(findings, 'blocker', 'P29_BLOCKERS', `P29 has ${input.p29Blockers} blocker(s).`);
  if (!input.p28Ready) addFinding(findings, 'blocker', 'P28_NOT_READY', 'P28 activation blocker plan must be ready before P31.');
  if (input.p28Blockers > 0) addFinding(findings, 'blocker', 'P28_BLOCKERS', `P28 has ${input.p28Blockers} blocker(s).`);
  const exactApprovalPathOpened = input.exactApprovalSentencePresent || input.createActiveReceiptRequested;
  if (exactApprovalPathOpened && !input.approvalSourceIsCanonical) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_NOT_CANONICAL', 'Active receipt creation can only use the run-scoped apply_plan/explicit_approval_input_v2.txt source.');
  }
  if (exactApprovalPathOpened && !input.p50Ready) addFinding(findings, 'blocker', 'P50_FINAL_HASH_LOCK_NOT_READY', 'Exact approval handling requires P50 final pre-approval evidence hash-lock to be ready.');
  if (exactApprovalPathOpened && input.p50Blockers > 0) addFinding(findings, 'blocker', 'P50_BLOCKERS', `P50 has ${input.p50Blockers} blocker(s).`);
  if (exactApprovalPathOpened && !input.finalHashLockDryRunPresent) addFinding(findings, 'blocker', 'FINAL_HASH_LOCK_DRY_RUN_MISSING', 'Final pre-approval evidence hash-lock dry run is required before active receipt creation.');
  if (exactApprovalPathOpened && input.finalHashLocks < 20) addFinding(findings, 'blocker', 'FINAL_HASH_LOCK_COVERAGE_INSUFFICIENT', `Expected at least 20 final hash locks, got ${input.finalHashLocks}.`);
  if (!input.approvalRequestPresent) addFinding(findings, 'blocker', 'APPROVAL_REQUEST_MISSING', 'P30 approval request markdown is required.');
  if (!input.approvalTemplatePresent) addFinding(findings, 'blocker', 'APPROVAL_TEMPLATE_MISSING', 'P29 approval template is required.');
  if (!input.hashLockDryRunPresent) addFinding(findings, 'blocker', 'HASH_LOCK_DRY_RUN_MISSING', 'P29 hash-lock dry run is required.');
  if (input.criticalHashLocks < 12 || input.p30CriticalHashLocks < 12) addFinding(findings, 'blocker', 'HASH_LOCKS_INSUFFICIENT', 'P29/P30 critical hash lock coverage is insufficient.');

  const forbiddenOpen =
    input.p30ReadyForApply ||
    input.p30MayModifyProductionAppFiles ||
    input.p29ReadyForApply ||
    input.readinessMayModifyProductionAppFiles ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.runtimeDownloadsEnabled ||
    input.targetManifestActivationApproved ||
    input.targetManifestReadyForApply ||
    input.targetManifestMayModifyProductionAppFiles;
  if (forbiddenOpen) addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'At least one production activation/upload/download/apply flag is open.');
  if (activeApprovalArtifactsOneSidedBefore) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACT_PAIR_ONE_SIDED_BEFORE', 'P31 refuses one-sided active approval artifacts; receipt and hash-lock must be absent before atomic creation.');
  }
  if (input.activeApprovalReceiptExistsBefore) addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_RECEIPT_ALREADY_EXISTS', 'P31 must not run over an existing active approval receipt.');
  if (input.activeHashLockExistsBefore) addFinding(findings, 'blocker', 'ACTIVE_HASH_LOCK_ALREADY_EXISTS', 'P31 must not run over an existing active hash lock.');
  if (input.createActiveReceiptRequested && !input.exactApprovalSentencePresent) {
    addFinding(findings, 'blocker', 'CREATE_REQUEST_WITHOUT_EXACT_APPROVAL', 'Active receipt creation was requested without the exact approval sentence.');
  }
  if (input.createActiveReceiptRequested && input.dirtyWorktreeDriftDetected) {
    addFinding(findings, 'blocker', 'DIRTY_WORKTREE_DRIFT_ON_CREATE_REQUEST', 'Active receipt creation cannot proceed while dirty-worktree evidence has drifted.');
  }

  if (!input.exactApprovalSentencePresent) addFinding(findings, 'info', 'EXACT_APPROVAL_SENTENCE_ABSENT', 'No active receipt/hash-lock is created because the exact approval sentence is absent.');
  if (input.readinessApplyBlockers > 0) addFinding(findings, 'info', 'APPLY_BLOCKERS_REMAIN', `${input.readinessApplyBlockers} apply blocker(s) remain; production apply stays closed.`);
  if (input.dirtyWorktreeDriftDetected) addFinding(findings, 'info', 'DIRTY_WORKTREE_DRIFT_CAPTURED', `Current dirty count ${input.currentDirtyFiles} differs from P30 dirty count ${input.p30DirtyFiles}; this is recorded and blocks creation if requested.`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  let receiptCreationState: ReceiptCreationState = 'approval_receipt_creation_waiting_for_exact_sentence';
  if (blockers > 0) receiptCreationState = 'blocked_by_findings';
  else if (input.exactApprovalSentencePresent && !input.createActiveReceiptRequested) receiptCreationState = 'exact_sentence_present_creation_not_requested';
  else if (input.exactApprovalSentencePresent && input.createActiveReceiptRequested) receiptCreationState = 'active_approval_artifacts_created';
  const activeApprovalReceiptCreated = blockers === 0 && input.exactApprovalSentencePresent && input.createActiveReceiptRequested;
  const activeHashLockCreated = blockers === 0 && input.exactApprovalSentencePresent && input.createActiveReceiptRequested;
  const activeApprovalReceiptExistsAfter = input.activeApprovalReceiptExistsBefore || activeApprovalReceiptCreated;
  const activeHashLockExistsAfter = input.activeHashLockExistsBefore || activeHashLockCreated;
  const activeApprovalArtifactsOneSidedAfter = activeApprovalReceiptExistsAfter !== activeHashLockExistsAfter;
  const activeApprovalArtifactPairAtomicitySatisfied =
    !activeApprovalArtifactsOneSidedBefore &&
    !activeApprovalArtifactsOneSidedAfter &&
    activeApprovalReceiptCreated === activeHashLockCreated;
  const activeApprovalArtifactPairReferencesCanonicalApprovalSource =
    activeApprovalReceiptCreated && input.approvalSourceExists && input.approvalSourceIsCanonical;
  const activeApprovalArtifactPairReferencesDryRunHashLock =
    activeApprovalReceiptCreated && input.hashLockDryRunPresent && input.criticalHashLocks >= 12;
  const activeApprovalArtifactPairReferencesFinalPreapprovalEvidenceHashLock =
    activeApprovalReceiptCreated && input.finalHashLockDryRunPresent && input.p50Ready && input.finalHashLocks >= 20;
  const activeApprovalArtifactPairReadyForP44 =
    activeApprovalArtifactPairAtomicitySatisfied &&
    activeApprovalArtifactPairReferencesCanonicalApprovalSource &&
    activeApprovalArtifactPairReferencesDryRunHashLock &&
    activeApprovalArtifactPairReferencesFinalPreapprovalEvidenceHashLock;
  const activeApprovalArtifactPairState: ActiveApprovalArtifactPairState =
    blockers > 0
      ? 'blocked_by_findings'
      : activeApprovalArtifactPairReadyForP44
        ? 'active_approval_artifact_pair_created'
        : input.exactApprovalSentencePresent
          ? 'exact_approval_source_present_creation_not_requested'
          : 'absent_waiting_for_exact_approval_source';

  return {
    findings,
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      receiptCreationState,
      approvalSourceExists: input.approvalSourceExists,
      approvalSourceIsCanonical: input.approvalSourceIsCanonical,
      exactApprovalSentencePresent: input.exactApprovalSentencePresent,
      plainContinueRejected: true,
      createActiveReceiptRequested: input.createActiveReceiptRequested,
      activeApprovalReceiptExistsBefore: input.activeApprovalReceiptExistsBefore,
      activeHashLockExistsBefore: input.activeHashLockExistsBefore,
      activeApprovalReceiptCreated,
      activeHashLockCreated,
      activeApprovalReceiptExistsAfter,
      activeHashLockExistsAfter,
      activeApprovalArtifactPairState,
      activeApprovalArtifactsOneSidedBefore,
      activeApprovalArtifactsOneSidedAfter,
      activeApprovalArtifactPairAtomicityRequired: true,
      activeApprovalArtifactPairAtomicitySatisfied,
      activeApprovalArtifactPairLineageRequired: true,
      activeApprovalArtifactPairReferencesCanonicalApprovalSource,
      activeApprovalArtifactPairReferencesDryRunHashLock,
      activeApprovalArtifactPairReferencesFinalPreapprovalEvidenceHashLock,
      activeApprovalArtifactPairReadyForP44,
      p30Ready: input.p30Ready,
      p30State: input.p30State,
      p29Ready: input.p29Ready,
      p28Ready: input.p28Ready,
      p50Ready: input.p50Ready,
      finalHashLockDryRunPresent: input.finalHashLockDryRunPresent,
      finalHashLocks: input.finalHashLocks,
      currentDirtyFiles: input.currentDirtyFiles,
      p30DirtyFiles: input.p30DirtyFiles,
      dirtyWorktreeDriftDetected: input.dirtyWorktreeDriftDetected,
      criticalHashLocks: input.criticalHashLocks,
      p30CriticalHashLocks: input.p30CriticalHashLocks,
      readinessApplyBlockers: input.readinessApplyBlockers,
      approvalRequestPresent: input.approvalRequestPresent,
      approvalTemplatePresent: input.approvalTemplatePresent,
      hashLockDryRunPresent: input.hashLockDryRunPresent,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      productionWritesAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      storageMigrationAllowed: false,
      cloudSyncMigrationAllowed: false,
      readyForProductionApplyGateV2: false,
      canContinueNonProductionAudit: blockers === 0,
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
    expectedState: ReceiptCreationState;
    expectedReceiptCreated: boolean;
    mutate: (input: EvaluationInput) => void;
  }> = [
    {
      id: 'plain_continue_without_exact_sentence_holds',
      expectedState: 'approval_receipt_creation_waiting_for_exact_sentence',
      expectedReceiptCreated: false,
      mutate: () => undefined,
    },
    {
      id: 'exact_sentence_without_create_request_holds',
      expectedState: 'exact_sentence_present_creation_not_requested',
      expectedReceiptCreated: false,
      mutate: (input) => {
        input.approvalSourceExists = true;
        input.exactApprovalSentencePresent = true;
        input.p50Ready = true;
        input.finalHashLockDryRunPresent = true;
        input.finalHashLocks = 20;
        input.dirtyWorktreeDriftDetected = false;
        input.currentDirtyFiles = input.p30DirtyFiles;
      },
    },
    {
      id: 'create_request_without_exact_sentence_rejected',
      expectedState: 'blocked_by_findings',
      expectedReceiptCreated: false,
      mutate: (input) => { input.createActiveReceiptRequested = true; },
    },
    {
      id: 'ready_for_apply_open_rejected',
      expectedState: 'blocked_by_findings',
      expectedReceiptCreated: false,
      mutate: (input) => { input.targetManifestReadyForApply = true; },
    },
    {
      id: 'active_receipt_already_exists_rejected',
      expectedState: 'blocked_by_findings',
      expectedReceiptCreated: false,
      mutate: (input) => { input.activeApprovalReceiptExistsBefore = true; },
    },
    {
      id: 'active_hash_lock_already_exists_rejected',
      expectedState: 'blocked_by_findings',
      expectedReceiptCreated: false,
      mutate: (input) => { input.activeHashLockExistsBefore = true; },
    },
    {
      id: 'one_sided_pair_before_rejected',
      expectedState: 'blocked_by_findings',
      expectedReceiptCreated: false,
      mutate: (input) => { input.activeApprovalReceiptExistsBefore = true; input.activeHashLockExistsBefore = false; },
    },
    {
      id: 'server_upload_open_rejected',
      expectedState: 'blocked_by_findings',
      expectedReceiptCreated: false,
      mutate: (input) => { input.serverUploadAllowed = true; },
    },
    {
      id: 'dirty_drift_blocks_create_request',
      expectedState: 'blocked_by_findings',
      expectedReceiptCreated: false,
      mutate: (input) => { input.createActiveReceiptRequested = true; input.exactApprovalSentencePresent = true; input.dirtyWorktreeDriftDetected = true; },
    },
    {
      id: 'exact_sentence_requires_p50',
      expectedState: 'blocked_by_findings',
      expectedReceiptCreated: false,
      mutate: (input) => { input.approvalSourceExists = true; input.exactApprovalSentencePresent = true; input.p50Ready = false; },
    },
    {
      id: 'exact_sentence_with_create_and_p50_would_create',
      expectedState: 'active_approval_artifacts_created',
      expectedReceiptCreated: true,
      mutate: (input) => {
        input.approvalSourceExists = true;
        input.exactApprovalSentencePresent = true;
        input.createActiveReceiptRequested = true;
        input.p50Ready = true;
        input.finalHashLockDryRunPresent = true;
        input.finalHashLocks = 20;
        input.dirtyWorktreeDriftDetected = false;
        input.currentDirtyFiles = input.p30DirtyFiles;
      },
    },
    {
      id: 'noncanonical_exact_source_rejected',
      expectedState: 'blocked_by_findings',
      expectedReceiptCreated: false,
      mutate: (input) => {
        input.approvalSourceExists = true;
        input.approvalSourceIsCanonical = false;
        input.exactApprovalSentencePresent = true;
        input.createActiveReceiptRequested = true;
        input.p50Ready = true;
        input.finalHashLockDryRunPresent = true;
        input.finalHashLocks = 20;
        input.dirtyWorktreeDriftDetected = false;
        input.currentDirtyFiles = input.p30DirtyFiles;
      },
    },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    fixture.approvalSourceExists = false;
    fixture.exactApprovalSentencePresent = false;
    fixture.createActiveReceiptRequested = false;
    fixture.activeApprovalReceiptExistsBefore = false;
    fixture.activeHashLockExistsBefore = false;
    fixture.dirtyWorktreeDriftDetected = false;
    fixture.currentDirtyFiles = fixture.p30DirtyFiles;
    // Fixture probes simulate hypothetical wait-state transitions; real-run P50
    // blockers (e.g. the expected remote-verify hold) are not part of the simulated
    // premise. Probes that require a not-ready P50 set p50Ready=false explicitly.
    fixture.p50Blockers = 0;
    testCase.mutate(fixture);
    const result = evaluate(fixture).evaluation;
    return {
      id: testCase.id,
      expectedState: testCase.expectedState,
      expectedReceiptCreated: testCase.expectedReceiptCreated,
      receiptCreationState: result.receiptCreationState,
      activeApprovalReceiptCreated: result.activeApprovalReceiptCreated,
      blockers: result.blockers,
      passed: result.receiptCreationState === testCase.expectedState && result.activeApprovalReceiptCreated === testCase.expectedReceiptCreated,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Explicit Approval Receipt Creation Gate V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Receipt creation state: ${report.summary.receiptCreationState}`,
    `- Approval source exists: ${report.summary.approvalSourceExists ? 'yes' : 'no'}`,
    `- Approval source canonical: ${report.summary.approvalSourceIsCanonical ? 'yes' : 'no'}`,
    `- Exact approval sentence present: ${report.summary.exactApprovalSentencePresent ? 'yes' : 'no'}`,
    `- Plain continue rejected: ${report.summary.plainContinueRejected ? 'yes' : 'no'}`,
    `- Create active receipt requested: ${report.summary.createActiveReceiptRequested ? 'yes' : 'no'}`,
    `- Active approval receipt created: ${report.summary.activeApprovalReceiptCreated ? 'yes' : 'no'}`,
    `- Active hash lock created: ${report.summary.activeHashLockCreated ? 'yes' : 'no'}`,
    `- Active approval receipt/hash lock after run: ${report.summary.activeApprovalReceiptExistsAfter ? 'yes' : 'no'}/${report.summary.activeHashLockExistsAfter ? 'yes' : 'no'}`,
    `- Active approval artifact pair state: \`${report.summary.activeApprovalArtifactPairState}\``,
    `- Active artifact pair atomicity satisfied: ${report.summary.activeApprovalArtifactPairAtomicitySatisfied ? 'yes' : 'no'}`,
    `- Active artifact pair ready for P44: ${report.summary.activeApprovalArtifactPairReadyForP44 ? 'yes' : 'no'}`,
    `- Dirty files current/P30: ${report.summary.currentDirtyFiles}/${report.summary.p30DirtyFiles}`,
    `- Dirty worktree drift detected: ${report.summary.dirtyWorktreeDriftDetected ? 'yes' : 'no'}`,
    `- Critical hash locks P29/P30: ${report.summary.criticalHashLocks}/${report.summary.p30CriticalHashLocks}`,
    `- Readiness apply blockers: ${report.summary.readinessApplyBlockers}`,
    `- Can continue non-production audit: ${report.summary.canContinueNonProductionAudit ? 'yes' : 'no'}`,
    `- Ready for production apply gate V2: ${report.summary.readyForProductionApplyGateV2 ? 'yes' : 'no'}`,
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
  const applyPlanDir = path.join(runDir, 'apply_plan');

  const p30Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const p29Path = path.join(auditsDir, 'explicit_approval_receipt_hash_lock_gate_v2_packet.json');
  const p50Path = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const p28Path = path.join(auditsDir, 'runtime_activation_blocker_plan_v2_packet.json');
  const readinessPath = path.join(auditsDir, 'readiness_blocker_reduction_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestDraftPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const approvalRequestPath = path.join(applyPlanDir, 'activation_approval_request_v2.md');
  const approvalTemplatePath = path.join(applyPlanDir, 'explicit_approval_receipt_template_v2.md');
  const hashLockDryRunPath = path.join(applyPlanDir, 'hash_lock_manifest_dry_run_v2.json');
  const finalHashLockDryRunPath = path.join(applyPlanDir, 'final_preapproval_evidence_hash_lock_dry_run_v2.json');
  const defaultApprovalSourcePath = path.join(applyPlanDir, 'explicit_approval_input_v2.txt');
  const approvalSourcePath = path.resolve(repoRoot, argValue('--approval-source') ?? defaultApprovalSourcePath);
  const approvalSourceIsCanonical = path.resolve(approvalSourcePath) === path.resolve(defaultApprovalSourcePath);
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const outputJsonPath = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.md');

  const p30 = readJson<JsonObject>(p30Path);
  const p29 = readJson<JsonObject>(p29Path);
  const p50 = fs.existsSync(p50Path) ? readJson<JsonObject>(p50Path) : {};
  const p28 = readJson<JsonObject>(p28Path);
  const readiness = readJson<JsonObject>(readinessPath);
  const targetManifest = readJson<JsonObject>(targetManifestPath);
  const serverManifestDraft = readJson<JsonObject>(serverManifestDraftPath);
  const p30Summary = summaryOf(p30);
  const p29Summary = summaryOf(p29);
  const p50Summary = summaryOf(p50);
  const p28Summary = summaryOf(p28);
  const readinessSummary = summaryOf(readiness);
  const activation = object(targetManifest.activation);
  const requiredApprovalSentence = s(p30, 'requiredApprovalSentence');
  const approvalSourceExists = fs.existsSync(approvalSourcePath);
  const approvalSourceText = approvalSourceExists ? fs.readFileSync(approvalSourcePath, 'utf8') : '';
  const exactApprovalSentencePresent = requiredApprovalSentence !== '' && approvalSourceText.includes(requiredApprovalSentence);
  const currentDirtyFiles = gitDirtyCount(repoRoot);
  const p30DirtyFiles = n(p30Summary, 'dirtyFiles');

  const input: EvaluationInput = {
    p30Ready:
      n(p30Summary, 'blockers') === 0 &&
      b(p30Summary, 'readyForExplicitApprovalReceiptCreationGateV2') &&
      s(p30Summary, 'requestState') === 'approval_request_presented',
    p30State: s(p30Summary, 'requestState'),
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
    p50Ready:
      s(p50, 'status') === 'PASS' &&
      n(p50Summary, 'blockers') === 0 &&
      b(p50Summary, 'readyForExplicitApprovalReceiptCreationGateV2') &&
      s(p50Summary, 'lockState') === 'final_preapproval_evidence_hash_lock_ready',
    p50Blockers: n(p50Summary, 'blockers'),
    finalHashLockDryRunPresent: fs.existsSync(finalHashLockDryRunPath),
    finalHashLocks: n(p50Summary, 'finalHashLocks'),
    readinessApplyBlockers: n(readinessSummary, 'applyBlockers'),
    readinessMayModifyProductionAppFiles: b(readinessSummary, 'mayModifyProductionAppFiles'),
    approvalSourceExists,
    approvalSourceIsCanonical,
    exactApprovalSentencePresent,
    createActiveReceiptRequested: hasArg('--create-active-receipt'),
    activeApprovalReceiptExistsBefore: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExistsBefore: fs.existsSync(activeHashLockPath),
    currentDirtyFiles,
    p30DirtyFiles,
    dirtyWorktreeDriftDetected: currentDirtyFiles !== p30DirtyFiles,
    criticalHashLocks: n(p29Summary, 'criticalHashLocks'),
    p30CriticalHashLocks: n(p30Summary, 'criticalHashLocks'),
    hashLockDryRunPresent: fs.existsSync(hashLockDryRunPath),
    approvalRequestPresent: fs.existsSync(approvalRequestPath),
    approvalTemplatePresent: fs.existsSync(approvalTemplatePath),
    serverUploadAllowed: b(serverManifestDraft, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(serverManifestDraft, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(serverManifestDraft, 'runtimeDownloadsEnabled'),
    targetManifestActivationApproved: b(activation, 'activationApproved'),
    targetManifestReadyForApply: b(activation, 'readyForApply'),
    targetManifestMayModifyProductionAppFiles: b(activation, 'mayModifyProductionAppFiles'),
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
    evaluation.blockers += 1;
    evaluation.receiptCreationState = 'blocked_by_findings';
    evaluation.activeApprovalArtifactPairState = 'blocked_by_findings';
    evaluation.activeApprovalArtifactPairReadyForP44 = false;
  }
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : evaluation.exactApprovalSentencePresent && evaluation.createActiveReceiptRequested ? 'PASS' : 'HOLD';
  const shouldCreateActiveApprovalArtifacts =
    status === 'PASS' &&
    evaluation.exactApprovalSentencePresent &&
    evaluation.createActiveReceiptRequested &&
    !evaluation.activeApprovalReceiptExistsBefore &&
    !evaluation.activeHashLockExistsBefore;
  let activeApprovalReceiptCreatedByThisScript = false;
  let activeHashLockCreatedByThisScript = false;
  if (shouldCreateActiveApprovalArtifacts) {
    const mainHashLockDryRun = readJsonOrEmpty(hashLockDryRunPath);
    const finalHashLockDryRun = readJsonOrEmpty(finalHashLockDryRunPath);
    const mainCriticalArtifacts = Array.isArray(mainHashLockDryRun.criticalArtifacts) ? mainHashLockDryRun.criticalArtifacts : [];
    const finalCriticalArtifacts = Array.isArray(finalHashLockDryRun.criticalArtifacts) ? finalHashLockDryRun.criticalArtifacts : [];
    const createdAt = new Date().toISOString();
    const activeApprovalArtifactPairId = `${runId}:fr:explicit-approval-v2`;
    const activeReceipt = {
      schemaVersion: 'gustav-explicit-approval-receipt-v2-v0',
      runId,
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      createdAt,
      activeApprovalArtifactPairId,
      activeApprovalReceipt: true,
      requiredApprovalSentence,
      requiredApprovalSentenceSha256: sha256Text(requiredApprovalSentence),
      approvalSourcePath: rel(repoRoot, approvalSourcePath),
      approvalSourceSha256: sha256(approvalSourcePath),
      pairedHashLockManifestPath: rel(repoRoot, activeHashLockPath),
      approvalArtifactPairAtomicityContract: 'receipt_and_hash_lock_must_exist_together',
      hashLockDryRunPath: rel(repoRoot, hashLockDryRunPath),
      finalPreapprovalEvidenceHashLockDryRunPath: rel(repoRoot, finalHashLockDryRunPath),
      finalPreapprovalEvidenceHashLockPacketPath: rel(repoRoot, p50Path),
      productionWritesAllowed: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    };
    const activeHashLock = {
      schemaVersion: 'gustav-active-hash-lock-manifest-v2-v0',
      runId,
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      createdAt,
      activeApprovalArtifactPairId,
      activeHashLock: true,
      approvalReceiptPath: rel(repoRoot, activeApprovalReceiptPath),
      pairedApprovalReceiptPath: rel(repoRoot, activeApprovalReceiptPath),
      approvalSourcePath: rel(repoRoot, approvalSourcePath),
      approvalArtifactPairAtomicityContract: 'receipt_and_hash_lock_must_exist_together',
      hashLockDryRunPath: rel(repoRoot, hashLockDryRunPath),
      finalPreapprovalEvidenceHashLockDryRunPath: rel(repoRoot, finalHashLockDryRunPath),
      referencesDryRunHashLock: true,
      referencesFinalPreapprovalEvidenceHashLock: true,
      mainCriticalHashLocks: mainCriticalArtifacts.length,
      finalCriticalHashLocks: finalCriticalArtifacts.length,
      criticalHashLocks: mainCriticalArtifacts.length + finalCriticalArtifacts.length,
      mainCriticalArtifacts,
      finalCriticalArtifacts,
      productionWritesAllowed: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    };
    writeJsonActiveArtifactPair(activeApprovalReceiptPath, activeReceipt, activeHashLockPath, activeHashLock);
    activeApprovalReceiptCreatedByThisScript = true;
    activeHashLockCreatedByThisScript = true;
    evaluation.activeApprovalReceiptCreated = true;
    evaluation.activeHashLockCreated = true;
    evaluation.activeApprovalReceiptExistsAfter = true;
    evaluation.activeHashLockExistsAfter = true;
    evaluation.activeApprovalArtifactPairState = 'active_approval_artifact_pair_created';
    evaluation.activeApprovalArtifactsOneSidedAfter = false;
    evaluation.activeApprovalArtifactPairAtomicitySatisfied = true;
    evaluation.activeApprovalArtifactPairReferencesCanonicalApprovalSource = true;
    evaluation.activeApprovalArtifactPairReferencesDryRunHashLock = true;
    evaluation.activeApprovalArtifactPairReferencesFinalPreapprovalEvidenceHashLock = true;
    evaluation.activeApprovalArtifactPairReadyForP44 = true;
  }

  const report: Report = {
    schemaVersion: 'gustav-explicit-approval-receipt-creation-gate-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, p30Path),
      explicitApprovalReceiptHashLockGateV2Packet: rel(repoRoot, p29Path),
      finalPreapprovalEvidenceHashLockV2Packet: rel(repoRoot, p50Path),
      runtimeActivationBlockerPlanV2Packet: rel(repoRoot, p28Path),
      readinessBlockerReductionPacket: rel(repoRoot, readinessPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestDraftPath),
      approvalRequest: rel(repoRoot, approvalRequestPath),
      approvalTemplate: rel(repoRoot, approvalTemplatePath),
      hashLockDryRun: rel(repoRoot, hashLockDryRunPath),
      finalHashLockDryRun: rel(repoRoot, finalHashLockDryRunPath),
      approvalSource: rel(repoRoot, approvalSourcePath),
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
    requiredApprovalSentence,
    approvalInput: {
      sourcePath: rel(repoRoot, approvalSourcePath),
      sourceExists: approvalSourceExists,
      sourceIsCanonical: approvalSourceIsCanonical,
      exactSentencePresent: exactApprovalSentencePresent,
      createActiveReceiptRequested: hasArg('--create-active-receipt'),
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
      approvalReceiptCreatedByThisScript: activeApprovalReceiptCreatedByThisScript,
      activeHashLockCreatedByThisScript: activeHashLockCreatedByThisScript,
      serverManifestPublishedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      storageOrCloudMigrationStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV explicit approval receipt creation gate V2 packet: ${report.status}`);
  console.log(`Receipt creation state: ${report.summary.receiptCreationState}`);
  console.log(`Exact approval sentence present: ${report.summary.exactApprovalSentencePresent ? 'yes' : 'no'}`);
  console.log(`Active approval receipt created: ${report.summary.activeApprovalReceiptCreated ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
}

main();
