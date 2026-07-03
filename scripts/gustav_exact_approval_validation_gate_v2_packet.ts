import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'HOLD' | 'PASS' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type ValidationState =
  | 'waiting_for_exact_approval_artifacts'
  | 'exact_approval_artifacts_validated_for_next_sequencing'
  | 'blocked_by_findings';
type ActiveApprovalArtifactPairState =
  | 'absent_waiting_for_exact_approval_source'
  | 'one_sided_active_approval_artifacts_blocked'
  | 'active_approval_artifact_pair_invalid'
  | 'exact_approval_artifact_pair_validated_for_p45_sequence';

type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedState: ValidationState;
  validationState: ValidationState;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  currentRunId: string;
  p43Ready: boolean;
  p43HoldState: string;
  p43ClosedEvidenceReady: boolean;
  p43ReadyForApply: boolean;
  p43ActivationApproved: boolean;
  p30ApprovalRequestReady: boolean;
  p50Ready: boolean;
  p50Blockers: number;
  finalDryRunHashLocks: number;
  requiredApprovalSentence: string;
  approvalSourceExists: boolean;
  approvalSourceIsCanonical: boolean;
  exactApprovalSentencePresent: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  activeApprovalReceiptApprovalSourcePath: string;
  activeHashLockApprovalSourcePath: string;
  activeApprovalReceiptApprovalSourceIsCanonical: boolean;
  activeHashLockApprovalSourceIsCanonical: boolean;
  activeApprovalSourcePathsMatch: boolean;
  activeApprovalReceiptTargetLocale: string;
  activeApprovalReceiptRunId: string;
  activeApprovalReceiptRequiredSentenceMatches: boolean;
  activeHashLockRunId: string;
  activeHashLockTargetLocale: string;
  activeHashLockReferencesDryRun: boolean;
  activeHashLockReferencesFinalDryRun: boolean;
  activeHashLockCriticalHashes: number;
  dryRunHashLocks: number;
  targetManifestActivationApproved: boolean;
  targetManifestReadyForApply: boolean;
  targetManifestMayModifyProductionAppFiles: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  downloadablePacksPublished: boolean;
  runtimeDownloadsEnabled: boolean;
  serverManifestActivationApproved: boolean;
  serverManifestReadyForApply: boolean;
  serverManifestMayModifyProductionAppFiles: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  validationState: ValidationState;
  p43Ready: boolean;
  p43ClosedEvidenceReady: boolean;
  p50Ready: boolean;
  finalDryRunHashLocks: number;
  requiredApprovalSentencePresent: boolean;
  approvalSourceExists: boolean;
  approvalSourceIsCanonical: boolean;
  exactApprovalSentencePresent: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  activeApprovalArtifactsMatched: boolean;
  activeApprovalArtifactPairState: ActiveApprovalArtifactPairState;
  activeApprovalArtifactsOneSided: boolean;
  activeApprovalArtifactPairAtomicityRequired: true;
  activeApprovalArtifactPairAtomicitySatisfied: boolean;
  activeApprovalArtifactPairLineageRequired: true;
  activeApprovalArtifactPairLineageSatisfied: boolean;
  activeApprovalArtifactPairTargetRunSatisfied: boolean;
  activeApprovalArtifactPairReadyForP45: boolean;
  activeApprovalReceiptApprovalSourcePath: string;
  activeHashLockApprovalSourcePath: string;
  activeApprovalReceiptApprovalSourceIsCanonical: boolean;
  activeHashLockApprovalSourceIsCanonical: boolean;
  activeApprovalSourcePathsMatch: boolean;
  activeApprovalExpectedRunId: string;
  activeApprovalReceiptTargetLocale: string;
  activeApprovalReceiptRunId: string;
  activeApprovalReceiptRequiredSentenceMatches: boolean;
  activeHashLockRunId: string;
  activeHashLockTargetLocale: string;
  activeHashLockReferencesDryRun: boolean;
  activeHashLockReferencesFinalDryRun: boolean;
  activeHashLockCriticalHashes: number;
  dryRunHashLocks: number;
  readyForProductionActivationSequencing: boolean;
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
  schemaVersion: 'gustav-exact-approval-validation-gate-v2-packet-v0';
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
    approvalSource: string;
    approvalReceipt: string;
    hashLockManifest: string;
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

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function sha256Text(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function firstString(value: JsonObject, keys: string[]): string {
  for (const key of keys) {
    const raw = value[key];
    if (typeof raw === 'string' && raw.trim() !== '') return raw;
  }
  return '';
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  if (!input.p43Ready || input.p43HoldState !== 'production_activation_hold_exact_approval_required' || !input.p43ClosedEvidenceReady) {
    addFinding(findings, 'blocker', 'P43_HOLD_NOT_READY', 'P44 requires P43 closed-evidence activation hold to be ready.');
  }
  if (input.p43ReadyForApply || input.p43ActivationApproved) {
    addFinding(findings, 'blocker', 'P43_OPENED_APPLY_OR_ACTIVATION', 'P43 must keep readyForApply and activationApproved closed.');
  }
  if (!input.p30ApprovalRequestReady || input.requiredApprovalSentence === '') {
    addFinding(findings, 'blocker', 'APPROVAL_REQUEST_OR_SENTENCE_MISSING', 'P30 approval request must provide the exact approval sentence.');
  }
  const oneActiveArtifactMissing = input.activeApprovalReceiptExists !== input.activeHashLockExists;
  if (oneActiveArtifactMissing) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACT_MISMATCH', 'Active approval receipt and active hash-lock manifest must appear together.');
  }

  const activeArtifactsPresent = input.activeApprovalReceiptExists && input.activeHashLockExists;
  if (activeArtifactsPresent && !input.p50Ready) {
    addFinding(findings, 'blocker', 'P50_FINAL_HASH_LOCK_NOT_READY_FOR_ACTIVE_ARTIFACTS', 'Active approval artifacts require P50 final pre-approval evidence hash-lock to be ready.');
  }
  if (activeArtifactsPresent && input.p50Blockers > 0) {
    addFinding(findings, 'blocker', 'P50_BLOCKERS_FOR_ACTIVE_ARTIFACTS', `P50 has ${input.p50Blockers} blocker(s).`);
  }
  if (activeArtifactsPresent && !input.approvalSourceExists) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_MISSING_FOR_ACTIVE_ARTIFACTS', 'Active approval artifacts require the approval source file.');
  }
  if (activeArtifactsPresent && !input.approvalSourceIsCanonical) {
    addFinding(findings, 'blocker', 'APPROVAL_SOURCE_NOT_CANONICAL_FOR_ACTIVE_ARTIFACTS', 'Active approval validation can only use the run-scoped apply_plan/explicit_approval_input_v2.txt source.');
  }
  if (activeArtifactsPresent && !input.exactApprovalSentencePresent) {
    addFinding(findings, 'blocker', 'EXACT_APPROVAL_SENTENCE_MISSING_FOR_ACTIVE_ARTIFACTS', 'Active approval artifacts require the exact approval sentence in the approval source.');
  }
  if (activeArtifactsPresent && !input.activeApprovalReceiptApprovalSourceIsCanonical) {
    addFinding(findings, 'blocker', 'ACTIVE_RECEIPT_APPROVAL_SOURCE_NOT_CANONICAL', 'Active approval receipt must reference the canonical run-scoped approval source.');
  }
  if (activeArtifactsPresent && !input.activeHashLockApprovalSourceIsCanonical) {
    addFinding(findings, 'blocker', 'ACTIVE_HASH_LOCK_APPROVAL_SOURCE_NOT_CANONICAL', 'Active hash lock must reference the canonical run-scoped approval source.');
  }
  if (activeArtifactsPresent && !input.activeApprovalSourcePathsMatch) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_SOURCE_PATH_MISMATCH', 'Active approval receipt and hash lock must reference the same approval source path.');
  }
  if (activeArtifactsPresent && input.activeApprovalReceiptTargetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'ACTIVE_RECEIPT_TARGET_LOCALE_MISMATCH', 'Active approval receipt must be scoped to targetLocale=fr.');
  }
  if (activeArtifactsPresent && input.activeHashLockTargetLocale !== 'fr') {
    addFinding(findings, 'blocker', 'ACTIVE_HASH_LOCK_TARGET_LOCALE_MISMATCH', 'Active hash lock must be scoped to targetLocale=fr.');
  }
  if (activeArtifactsPresent && input.activeApprovalReceiptRunId !== input.activeHashLockRunId) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_RUN_MISMATCH', 'Active approval receipt and hash lock must reference the same run.');
  }
  if (activeArtifactsPresent && input.activeApprovalReceiptRunId !== input.currentRunId) {
    addFinding(findings, 'blocker', 'ACTIVE_RECEIPT_RUN_NOT_CURRENT', 'Active approval receipt must be scoped to the current run id.');
  }
  if (activeArtifactsPresent && input.activeHashLockRunId !== input.currentRunId) {
    addFinding(findings, 'blocker', 'ACTIVE_HASH_LOCK_RUN_NOT_CURRENT', 'Active hash lock must be scoped to the current run id.');
  }
  if (activeArtifactsPresent && !input.activeApprovalReceiptRequiredSentenceMatches) {
    addFinding(findings, 'blocker', 'ACTIVE_RECEIPT_SENTENCE_MISMATCH', 'Active approval receipt must bind the same exact approval sentence.');
  }
  if (activeArtifactsPresent && !input.activeHashLockReferencesDryRun) {
    addFinding(findings, 'blocker', 'ACTIVE_HASH_LOCK_DRY_RUN_LINK_MISSING', 'Active hash lock must reference the dry-run hash lock lineage.');
  }
  if (activeArtifactsPresent && !input.activeHashLockReferencesFinalDryRun) {
    addFinding(findings, 'blocker', 'ACTIVE_HASH_LOCK_FINAL_DRY_RUN_LINK_MISSING', 'Active hash lock must reference the final pre-approval evidence hash-lock lineage.');
  }
  if (activeArtifactsPresent && input.activeHashLockCriticalHashes < input.dryRunHashLocks + input.finalDryRunHashLocks) {
    addFinding(findings, 'blocker', 'ACTIVE_HASH_LOCK_INCOMPLETE', 'Active hash lock must carry at least the main and final dry-run critical hash coverage.');
  }

  const targetActivationApprovedAllowed =
    input.targetManifestActivationApproved &&
    activeArtifactsPresent &&
    input.approvalSourceExists &&
    input.approvalSourceIsCanonical &&
    input.exactApprovalSentencePresent &&
    input.activeApprovalReceiptApprovalSourceIsCanonical &&
    input.activeHashLockApprovalSourceIsCanonical &&
    input.activeApprovalSourcePathsMatch &&
    input.activeApprovalReceiptTargetLocale === 'fr' &&
    input.activeHashLockTargetLocale === 'fr' &&
    input.activeApprovalReceiptRunId === input.currentRunId &&
    input.activeHashLockRunId === input.currentRunId &&
    input.activeApprovalReceiptRunId === input.activeHashLockRunId &&
    input.activeApprovalReceiptRequiredSentenceMatches &&
    input.activeHashLockReferencesDryRun &&
    input.activeHashLockReferencesFinalDryRun &&
    input.activeHashLockCriticalHashes >= input.dryRunHashLocks + input.finalDryRunHashLocks;

  if (
    (input.targetManifestActivationApproved && !targetActivationApprovedAllowed) ||
    input.targetManifestReadyForApply ||
    input.targetManifestMayModifyProductionAppFiles ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.downloadablePacksPublished ||
    input.runtimeDownloadsEnabled ||
    input.serverManifestActivationApproved ||
    input.serverManifestReadyForApply ||
    input.serverManifestMayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'P44 validation must not open activation/apply/upload/download/publication/production-write flags.');
  }

  if (!activeArtifactsPresent) {
    addFinding(findings, 'info', 'WAITING_FOR_ACTIVE_APPROVAL_ARTIFACTS', 'No active approval receipt/hash lock exists; production activation sequencing remains closed.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const readyForProductionActivationSequencing = blockers === 0 && activeArtifactsPresent;
  const activeApprovalArtifactPairLineageSatisfied =
    activeArtifactsPresent &&
    input.approvalSourceExists &&
    input.approvalSourceIsCanonical &&
    input.exactApprovalSentencePresent &&
    input.activeApprovalReceiptApprovalSourceIsCanonical &&
    input.activeHashLockApprovalSourceIsCanonical &&
    input.activeApprovalSourcePathsMatch &&
    input.activeApprovalReceiptRequiredSentenceMatches &&
    input.activeHashLockReferencesDryRun &&
    input.activeHashLockReferencesFinalDryRun &&
    input.activeHashLockCriticalHashes >= input.dryRunHashLocks + input.finalDryRunHashLocks;
  const activeApprovalArtifactPairTargetRunSatisfied =
    activeArtifactsPresent &&
    input.activeApprovalReceiptTargetLocale === 'fr' &&
    input.activeHashLockTargetLocale === 'fr' &&
    input.activeApprovalReceiptRunId === input.currentRunId &&
    input.activeHashLockRunId === input.currentRunId &&
    input.activeApprovalReceiptRunId === input.activeHashLockRunId;
  const activeApprovalArtifactPairReadyForP45 =
    readyForProductionActivationSequencing &&
    activeApprovalArtifactPairLineageSatisfied &&
    activeApprovalArtifactPairTargetRunSatisfied;
  const activeApprovalArtifactPairState: ActiveApprovalArtifactPairState =
    oneActiveArtifactMissing
      ? 'one_sided_active_approval_artifacts_blocked'
      : !activeArtifactsPresent
        ? 'absent_waiting_for_exact_approval_source'
        : activeApprovalArtifactPairReadyForP45
          ? 'exact_approval_artifact_pair_validated_for_p45_sequence'
          : 'active_approval_artifact_pair_invalid';
  const validationState: ValidationState =
    blockers > 0
      ? 'blocked_by_findings'
      : readyForProductionActivationSequencing
        ? 'exact_approval_artifacts_validated_for_next_sequencing'
        : 'waiting_for_exact_approval_artifacts';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      validationState,
      p43Ready: input.p43Ready,
      p43ClosedEvidenceReady: input.p43ClosedEvidenceReady,
      p50Ready: input.p50Ready,
      finalDryRunHashLocks: input.finalDryRunHashLocks,
      requiredApprovalSentencePresent: input.requiredApprovalSentence !== '',
      approvalSourceExists: input.approvalSourceExists,
      approvalSourceIsCanonical: input.approvalSourceIsCanonical,
      exactApprovalSentencePresent: input.exactApprovalSentencePresent,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      activeApprovalArtifactsMatched: activeArtifactsPresent && !oneActiveArtifactMissing,
      activeApprovalArtifactPairState,
      activeApprovalArtifactsOneSided: oneActiveArtifactMissing,
      activeApprovalArtifactPairAtomicityRequired: true,
      activeApprovalArtifactPairAtomicitySatisfied: !oneActiveArtifactMissing,
      activeApprovalArtifactPairLineageRequired: true,
      activeApprovalArtifactPairLineageSatisfied,
      activeApprovalArtifactPairTargetRunSatisfied,
      activeApprovalArtifactPairReadyForP45,
      activeApprovalReceiptApprovalSourcePath: input.activeApprovalReceiptApprovalSourcePath,
      activeHashLockApprovalSourcePath: input.activeHashLockApprovalSourcePath,
      activeApprovalReceiptApprovalSourceIsCanonical: input.activeApprovalReceiptApprovalSourceIsCanonical,
      activeHashLockApprovalSourceIsCanonical: input.activeHashLockApprovalSourceIsCanonical,
      activeApprovalSourcePathsMatch: input.activeApprovalSourcePathsMatch,
      activeApprovalExpectedRunId: input.currentRunId,
      activeApprovalReceiptTargetLocale: input.activeApprovalReceiptTargetLocale,
      activeApprovalReceiptRunId: input.activeApprovalReceiptRunId,
      activeApprovalReceiptRequiredSentenceMatches: input.activeApprovalReceiptRequiredSentenceMatches,
      activeHashLockRunId: input.activeHashLockRunId,
      activeHashLockTargetLocale: input.activeHashLockTargetLocale,
      activeHashLockReferencesDryRun: input.activeHashLockReferencesDryRun,
      activeHashLockReferencesFinalDryRun: input.activeHashLockReferencesFinalDryRun,
      activeHashLockCriticalHashes: input.activeHashLockCriticalHashes,
      dryRunHashLocks: input.dryRunHashLocks,
      readyForProductionActivationSequencing,
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
  const tests: Array<{ id: string; expectedState: ValidationState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'current_waiting_hold', expectedState: 'waiting_for_exact_approval_artifacts', mutate: () => undefined },
    { id: 'missing_p43_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p43Ready = false; } },
    { id: 'only_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = false; } },
    { id: 'only_hash_lock_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = false; input.activeHashLockExists = true; } },
    { id: 'active_without_exact_sentence_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.exactApprovalSentencePresent = false; } },
    { id: 'noncanonical_command_source_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.approvalSourceIsCanonical = false; input.exactApprovalSentencePresent = true; } },
    { id: 'noncanonical_receipt_source_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.exactApprovalSentencePresent = true; input.activeApprovalReceiptApprovalSourceIsCanonical = false; } },
    { id: 'receipt_hash_source_mismatch_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.exactApprovalSentencePresent = true; input.activeApprovalSourcePathsMatch = false; } },
    { id: 'wrong_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.exactApprovalSentencePresent = true; input.activeApprovalReceiptTargetLocale = 'en'; } },
    { id: 'wrong_hash_target_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.exactApprovalSentencePresent = true; input.activeApprovalReceiptTargetLocale = 'fr'; input.activeHashLockTargetLocale = 'en'; } },
    { id: 'wrong_run_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.exactApprovalSentencePresent = true; input.activeApprovalReceiptTargetLocale = 'fr'; input.activeHashLockTargetLocale = 'fr'; input.activeApprovalReceiptRunId = 'wrong_run'; input.activeHashLockRunId = 'wrong_run'; } },
    { id: 'receipt_hash_run_mismatch_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.exactApprovalSentencePresent = true; input.activeApprovalReceiptTargetLocale = 'fr'; input.activeHashLockTargetLocale = 'fr'; input.activeApprovalReceiptRunId = input.currentRunId; input.activeHashLockRunId = 'wrong_run'; } },
    { id: 'sentence_mismatch_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.exactApprovalSentencePresent = true; input.activeApprovalReceiptTargetLocale = 'fr'; input.activeHashLockTargetLocale = 'fr'; input.activeApprovalReceiptRunId = input.currentRunId; input.activeHashLockRunId = input.currentRunId; input.activeApprovalReceiptRequiredSentenceMatches = false; input.activeHashLockReferencesDryRun = true; input.activeHashLockReferencesFinalDryRun = true; input.activeHashLockCriticalHashes = Math.max(input.activeHashLockCriticalHashes, input.dryRunHashLocks + input.finalDryRunHashLocks); } },
    { id: 'missing_dry_run_link_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.exactApprovalSentencePresent = true; input.activeApprovalReceiptTargetLocale = 'fr'; input.activeHashLockTargetLocale = 'fr'; input.activeApprovalReceiptRunId = input.currentRunId; input.activeHashLockRunId = input.currentRunId; input.activeApprovalReceiptRequiredSentenceMatches = true; input.activeHashLockReferencesDryRun = false; input.activeHashLockReferencesFinalDryRun = true; input.activeHashLockCriticalHashes = Math.max(input.activeHashLockCriticalHashes, input.dryRunHashLocks + input.finalDryRunHashLocks); } },
    { id: 'incomplete_hash_coverage_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; input.activeHashLockExists = true; input.approvalSourceExists = true; input.exactApprovalSentencePresent = true; input.activeApprovalReceiptTargetLocale = 'fr'; input.activeHashLockTargetLocale = 'fr'; input.activeApprovalReceiptRunId = input.currentRunId; input.activeHashLockRunId = input.currentRunId; input.activeApprovalReceiptRequiredSentenceMatches = true; input.activeHashLockReferencesDryRun = true; input.activeHashLockReferencesFinalDryRun = true; input.activeHashLockCriticalHashes = Math.max(0, input.dryRunHashLocks + input.finalDryRunHashLocks - 1); } },
    { id: 'ready_for_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.targetManifestReadyForApply = true; } },
    { id: 'server_upload_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.serverUploadAllowed = true; } },
    { id: 'p30_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p30ApprovalRequestReady = false; } },
    { id: 'p43_open_apply_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p43ReadyForApply = true; } },
    {
      id: 'valid_active_artifacts_advance_to_sequencing',
      expectedState: 'exact_approval_artifacts_validated_for_next_sequencing',
      mutate: (input) => {
        input.activeApprovalReceiptExists = true;
        input.activeHashLockExists = true;
        input.approvalSourceExists = true;
        input.exactApprovalSentencePresent = true;
        input.approvalSourceIsCanonical = true;
        input.activeApprovalReceiptApprovalSourceIsCanonical = true;
        input.activeHashLockApprovalSourceIsCanonical = true;
        input.activeApprovalSourcePathsMatch = true;
        input.activeApprovalReceiptTargetLocale = 'fr';
        input.activeHashLockTargetLocale = 'fr';
        input.activeApprovalReceiptRunId = input.currentRunId;
        input.activeHashLockRunId = input.currentRunId;
        input.activeApprovalReceiptRequiredSentenceMatches = true;
        input.p50Ready = true;
        input.finalDryRunHashLocks = Math.max(input.finalDryRunHashLocks, 20);
        input.activeHashLockReferencesDryRun = true;
        input.activeHashLockReferencesFinalDryRun = true;
        input.activeHashLockCriticalHashes = Math.max(input.activeHashLockCriticalHashes, input.dryRunHashLocks + input.finalDryRunHashLocks);
      },
    },
  ];
  return tests.map((test) => {
    const input = clone(base);
    input.activeApprovalReceiptExists = false;
    input.activeHashLockExists = false;
    input.approvalSourceExists = false;
    input.exactApprovalSentencePresent = false;
    input.targetManifestActivationApproved = false;
    input.targetManifestReadyForApply = false;
    input.targetManifestMayModifyProductionAppFiles = false;
    test.mutate(input);
    const result = evaluate(input).evaluation;
    return {
      id: test.id,
      expectedState: test.expectedState,
      validationState: result.validationState,
      blockers: result.blockers,
      passed: result.validationState === test.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Exact Approval Validation Gate V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Validation state: \`${report.summary.validationState}\``,
    `- P43 ready: ${report.summary.p43Ready ? 'yes' : 'no'}`,
    `- Approval source exists: ${report.summary.approvalSourceExists ? 'yes' : 'no'}`,
    `- Approval source canonical: ${report.summary.approvalSourceIsCanonical ? 'yes' : 'no'}`,
    `- Exact approval sentence present: ${report.summary.exactApprovalSentencePresent ? 'yes' : 'no'}`,
    `- Active approval receipt/hash lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Active artifacts matched: ${report.summary.activeApprovalArtifactsMatched ? 'yes' : 'no'}`,
    `- Active approval artifact pair state: \`${report.summary.activeApprovalArtifactPairState}\``,
    `- Active artifact pair atomicity/lineage/target-run: ${report.summary.activeApprovalArtifactPairAtomicitySatisfied ? 'yes' : 'no'}/${report.summary.activeApprovalArtifactPairLineageSatisfied ? 'yes' : 'no'}/${report.summary.activeApprovalArtifactPairTargetRunSatisfied ? 'yes' : 'no'}`,
    `- Active artifact pair ready for P45: ${report.summary.activeApprovalArtifactPairReadyForP45 ? 'yes' : 'no'}`,
    `- Active approval source paths canonical/match: ${report.summary.activeApprovalReceiptApprovalSourceIsCanonical ? 'yes' : 'no'}/${report.summary.activeHashLockApprovalSourceIsCanonical ? 'yes' : 'no'}/${report.summary.activeApprovalSourcePathsMatch ? 'yes' : 'no'}`,
    `- Active artifacts expected run id: \`${report.summary.activeApprovalExpectedRunId}\``,
    `- Ready for production activation sequencing: ${report.summary.readyForProductionActivationSequencing ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Active Approval Paths',
    '',
    `- Approval source: \`${report.activeApprovalPaths.approvalSource}\``,
    `- Approval receipt: \`${report.activeApprovalPaths.approvalReceipt}\``,
    `- Hash-lock manifest: \`${report.activeApprovalPaths.hashLockManifest}\``,
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
  lines.push('- This packet validates approval artifacts only.');
  lines.push('- It does not create approval receipts, active hash locks, production app writes, server uploads, runtime downloads, storage/cloud migrations or production apply approval.');
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

  const p43Path = path.join(auditsDir, 'production_activation_hold_exact_approval_required_v2_packet.json');
  const p30Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const p50Path = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const defaultApprovalSourcePath = path.join(applyPlanDir, 'explicit_approval_input_v2.txt');
  const approvalSourcePath = path.resolve(repoRoot, argValue('--approval-source') ?? defaultApprovalSourcePath);
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const dryRunHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_dry_run_v2.json');
  const finalDryRunHashLockPath = path.join(applyPlanDir, 'final_preapproval_evidence_hash_lock_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.md');

  const p43 = readJsonOrEmpty(p43Path);
  const p30 = readJsonOrEmpty(p30Path);
  const p50 = readJsonOrEmpty(p50Path);
  const targetManifest = readJsonOrEmpty(targetManifestPath);
  const serverManifest = readJsonOrEmpty(serverManifestPath);
  const activeReceipt = readJsonOrEmpty(activeApprovalReceiptPath);
  const activeHashLock = readJsonOrEmpty(activeHashLockPath);
  const dryRunHashLock = readJsonOrEmpty(dryRunHashLockPath);
  const finalDryRunHashLock = readJsonOrEmpty(finalDryRunHashLockPath);

  const p43Summary = summaryOf(p43);
  const p30Summary = summaryOf(p30);
  const p50Summary = summaryOf(p50);
  const targetActivation = object(targetManifest.activation);
  const approvalSourceExists = fs.existsSync(approvalSourcePath);
  const approvalSourceText = approvalSourceExists ? fs.readFileSync(approvalSourcePath, 'utf8') : '';
  const approvalSourceIsCanonical = path.resolve(approvalSourcePath) === path.resolve(defaultApprovalSourcePath);
  const requiredApprovalSentence = s(p30, 'requiredApprovalSentence');
  const activeApprovalReceiptExists = fs.existsSync(activeApprovalReceiptPath);
  const activeHashLockExists = fs.existsSync(activeHashLockPath);
  const activeReceiptSentence = firstString(activeReceipt, ['requiredApprovalSentence', 'approvalSentence', 'exactApprovalSentence']);
  const activeReceiptSentenceSha = firstString(activeReceipt, ['requiredApprovalSentenceSha256', 'approvalSentenceSha256', 'exactApprovalSentenceSha256']);
  const activeReceiptRunId = firstString(activeReceipt, ['runId', 'approvedRunId']);
  const activeHashRunId = firstString(activeHashLock, ['runId', 'approvedRunId']);
  const activeReceiptApprovalSourcePath = firstString(activeReceipt, ['approvalSourcePath']);
  const activeHashApprovalSourcePath = firstString(activeHashLock, ['approvalSourcePath']);
  const activeReceiptApprovalSourceIsCanonical = activeReceiptApprovalSourcePath !== '' && path.resolve(repoRoot, activeReceiptApprovalSourcePath) === path.resolve(defaultApprovalSourcePath);
  const activeHashApprovalSourceIsCanonical = activeHashApprovalSourcePath !== '' && path.resolve(repoRoot, activeHashApprovalSourcePath) === path.resolve(defaultApprovalSourcePath);
  const activeApprovalSourcePathsMatch =
    activeReceiptApprovalSourcePath !== '' &&
    activeHashApprovalSourcePath !== '' &&
    path.resolve(repoRoot, activeReceiptApprovalSourcePath) === path.resolve(repoRoot, activeHashApprovalSourcePath);
  const activeHashCriticalHashes = n(activeHashLock, 'criticalHashLocks') || arr(activeHashLock.hashLocks).length || arr(activeHashLock.criticalArtifacts).length;
  const dryRunHashLocks = n(dryRunHashLock, 'criticalHashLocks') || arr(dryRunHashLock.hashLocks).length || arr(dryRunHashLock.criticalArtifacts).length;
  const finalDryRunHashLocks = n(finalDryRunHashLock, 'criticalHashLocks') || n(p50Summary, 'finalHashLocks') || arr(finalDryRunHashLock.hashLocks).length || arr(finalDryRunHashLock.criticalArtifacts).length;

  const input: EvaluationInput = {
    currentRunId: runId,
    p43Ready:
      s(p43, 'status') === 'HOLD' &&
      n(p43Summary, 'blockers') === 0 &&
      b(p43Summary, 'closedEvidenceReady') &&
      b(p43Summary, 'exactApprovalRequired') &&
      s(p43Summary, 'holdState') === 'production_activation_hold_exact_approval_required',
    p43HoldState: s(p43Summary, 'holdState'),
    p43ClosedEvidenceReady: b(p43Summary, 'closedEvidenceReady'),
    p43ReadyForApply: b(p43Summary, 'readyForApply'),
    p43ActivationApproved: b(p43Summary, 'activationApproved'),
    p30ApprovalRequestReady:
      s(p30, 'status') === 'PASS' &&
      n(p30Summary, 'blockers') === 0 &&
      s(p30Summary, 'requestState') === 'approval_request_presented' &&
      b(p30Summary, 'exactApprovalSentenceIncluded'),
    p50Ready:
      s(p50, 'status') === 'PASS' &&
      n(p50Summary, 'blockers') === 0 &&
      b(p50Summary, 'readyForExplicitApprovalReceiptCreationGateV2') &&
      s(p50Summary, 'lockState') === 'final_preapproval_evidence_hash_lock_ready',
    p50Blockers: n(p50Summary, 'blockers'),
    finalDryRunHashLocks,
    requiredApprovalSentence,
    approvalSourceExists,
    approvalSourceIsCanonical,
    exactApprovalSentencePresent: requiredApprovalSentence !== '' && approvalSourceText.includes(requiredApprovalSentence),
    activeApprovalReceiptExists,
    activeHashLockExists,
    activeApprovalReceiptApprovalSourcePath: activeReceiptApprovalSourcePath,
    activeHashLockApprovalSourcePath: activeHashApprovalSourcePath,
    activeApprovalReceiptApprovalSourceIsCanonical: activeReceiptApprovalSourceIsCanonical,
    activeHashLockApprovalSourceIsCanonical: activeHashApprovalSourceIsCanonical,
    activeApprovalSourcePathsMatch,
    activeApprovalReceiptTargetLocale: firstString(activeReceipt, ['targetLocale', 'studyTarget']),
    activeApprovalReceiptRunId: activeReceiptRunId,
    activeApprovalReceiptRequiredSentenceMatches:
      activeReceiptSentence === requiredApprovalSentence ||
      (activeReceiptSentenceSha !== '' && requiredApprovalSentence !== '' && activeReceiptSentenceSha === sha256Text(requiredApprovalSentence)),
    activeHashLockRunId: activeHashRunId,
    activeHashLockTargetLocale: firstString(activeHashLock, ['targetLocale', 'studyTarget']),
    activeHashLockReferencesDryRun:
      s(activeHashLock, 'hashLockDryRunPath') !== '' ||
      s(activeHashLock, 'dryRunHashLockPath') !== '' ||
      b(activeHashLock, 'referencesDryRunHashLock'),
    activeHashLockReferencesFinalDryRun:
      s(activeHashLock, 'finalPreapprovalEvidenceHashLockDryRunPath') !== '' ||
      s(activeHashLock, 'finalHashLockDryRunPath') !== '' ||
      b(activeHashLock, 'referencesFinalPreapprovalEvidenceHashLock'),
    activeHashLockCriticalHashes: activeHashCriticalHashes,
    dryRunHashLocks,
    targetManifestActivationApproved: b(targetActivation, 'activationApproved'),
    targetManifestReadyForApply: b(targetActivation, 'readyForApply'),
    targetManifestMayModifyProductionAppFiles: b(targetActivation, 'mayModifyProductionAppFiles'),
    serverUploadAllowed: b(serverManifest, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(serverManifest, 'firebaseUploadAllowed'),
    downloadablePacksPublished: b(serverManifest, 'downloadablePacksPublished'),
    runtimeDownloadsEnabled: b(serverManifest, 'runtimeDownloadsEnabled'),
    serverManifestActivationApproved: b(serverManifest, 'activationApproved'),
    serverManifestReadyForApply: b(serverManifest, 'readyForApply'),
    serverManifestMayModifyProductionAppFiles: b(serverManifest, 'mayModifyProductionAppFiles'),
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status =
    blockers > 0
      ? 'BLOCK'
      : evaluation.validationState === 'exact_approval_artifacts_validated_for_next_sequencing'
        ? 'PASS'
        : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-validation-gate-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      productionActivationHoldExactApprovalRequiredV2Packet: rel(repoRoot, p43Path),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, p30Path),
      finalPreapprovalEvidenceHashLockV2Packet: rel(repoRoot, p50Path),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestPath),
      hashLockManifestDryRunV2: rel(repoRoot, dryRunHashLockPath),
      finalPreapprovalEvidenceHashLockDryRunV2: rel(repoRoot, finalDryRunHashLockPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      ...evaluation,
      validationState: blockers > 0 ? 'blocked_by_findings' : evaluation.validationState,
      blockers,
      warnings,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    activeApprovalPaths: {
      approvalSource: rel(repoRoot, approvalSourcePath),
      approvalReceipt: rel(repoRoot, activeApprovalReceiptPath),
      hashLockManifest: rel(repoRoot, activeHashLockPath),
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

  console.log(`GUSTAV exact approval validation gate V2 packet: ${report.status}`);
  console.log(`Validation state: ${report.summary.validationState}`);
  console.log(`Active approval receipt/hash lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Ready for production activation sequencing: ${report.summary.readyForProductionActivationSequencing ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
