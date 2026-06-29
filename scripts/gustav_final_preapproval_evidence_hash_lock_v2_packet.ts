import * as childProcess from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type LockState =
  | 'final_preapproval_evidence_hash_lock_ready'
  | 'blocked_by_findings';

type JsonObject = Record<string, unknown>;

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
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
  expectedState: LockState;
  lockState: LockState;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  p29Status: string;
  p29State: string;
  p29Ready: boolean;
  p29ActiveApprovalReceiptExists: boolean;
  p29ActiveHashLockExists: boolean;
  p29ReadyForApply: boolean;
  p29MayModifyProductionAppFiles: boolean;
  p30Status: string;
  p30State: string;
  p30ReadyForReceiptCreation: boolean;
  p30ApprovalRequestHashLinked: boolean;
  p30ExactApprovalSentenceIncluded: boolean;
  p30IncludesMainHashLock: boolean;
  p30IncludesFinalHashLock: boolean;
  p30IncludesCompletionAudit: boolean;
  p30ActiveApprovalReceiptExists: boolean;
  p30ActiveHashLockExists: boolean;
  p31Status: string;
  p31State: string;
  p31ActiveApprovalReceiptCreated: boolean;
  p31ActiveHashLockCreated: boolean;
  p31ReadyForApply: boolean;
  p32Status: string;
  p32State: string;
  p32ProductionApplyDenied: boolean;
  p32ActiveApprovalReceiptExists: boolean;
  p32ActiveHashLockExists: boolean;
  p43Status: string;
  p43State: string;
  p43ClosedEvidenceReady: boolean;
  p44Status: string;
  p44State: string;
  p44ActiveApprovalReceiptExists: boolean;
  p44ActiveHashLockExists: boolean;
  p44ReadyForProductionActivationSequencing: boolean;
  p45Status: string;
  p45State: string;
  p46Status: string;
  p46State: string;
  p47Status: string;
  p47State: string;
  p48Status: string;
  p48State: string;
  p48ReadyForNextSafePass: boolean;
  p48LegacyReviewResidueMatches: number;
  p49Status: string;
  p49State: string;
  p49RequirementsProved: number;
  p49RequirementsProductionLocked: number;
  p49RequirementsMissing: number;
  p49RequirementsContradicted: number;
  p49FixtureProbesPassed: number;
  p49FixtureProbes: number;
  postApprovalRunbookStatus: string;
  postApprovalRunbookState: string;
  postApprovalRunbookReady: boolean;
  postApprovalRunbookSteps: number;
  postApprovalRunbookFixtureProbesPassed: number;
  postApprovalRunbookFixtureProbes: number;
  postApprovalRunbookReadyForApply: boolean;
  postApprovalRunbookMayModifyProductionAppFiles: boolean;
  runtimeDeliveryEvidenceChainStatus: string;
  runtimeDeliveryEvidenceChainState: string;
  runtimeDeliveryEvidenceChainReady: boolean;
  runtimeDeliveryEvidenceChainFixtureProbesPassed: number;
  runtimeDeliveryEvidenceChainFixtureProbes: number;
  runtimeDeliveryEvidenceChainReadyForApply: boolean;
  runtimeDeliveryEvidenceChainMayModifyProductionAppFiles: boolean;
  criticalArtifacts: CriticalArtifact[];
  missingCriticalArtifacts: string[];
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  targetManifestActivationApproved: boolean;
  targetManifestReadyForApply: boolean;
  targetManifestMayModifyProductionAppFiles: boolean;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  runtimeDownloadsEnabled: boolean;
  downloadablePacksPublished: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  lockState: LockState;
  finalHashLocks: number;
  missingCriticalArtifacts: number;
  missingRequiredRoleLocks: number;
  p29Ready: boolean;
  p30Ready: boolean;
  p30IncludesFinalHashLock: boolean;
  p31HeldWithoutActiveArtifacts: boolean;
  p32ApplyDenied: boolean;
  p43P49ChainReady: boolean;
  p49CompletionReady: boolean;
  postExactApprovalApplyRunbookReady: boolean;
  runtimeDeliveryEvidenceChainReady: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
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
  readyForExplicitApprovalReceiptCreationGateV2: boolean;
  blockers: number;
  warnings: number;
};

const EXPECTED_FINAL_HASH_LOCK_ROLES = [
  'p29_explicit_approval_receipt_hash_lock_gate_v2_packet',
  'p30_activation_approval_request_presentation_v2_packet',
  'p31_explicit_approval_receipt_creation_gate_v2_packet',
  'p32_production_apply_absence_denial_gate_v2_packet',
  'p43_production_activation_hold_exact_approval_required_v2_packet',
  'p44_exact_approval_validation_gate_v2_packet',
  'p45_production_activation_sequence_preflight_v2_packet',
  'p46_production_apply_transaction_contract_v2_packet',
  'p47_post_apply_rollback_guard_contract_v2_packet',
  'p48_approval_wait_safe_continuation_v2_packet',
  'p49_production_readiness_completion_audit_v2_packet',
  'post_exact_approval_apply_runbook_v2_packet',
  'runtime_delivery_evidence_chain_v2_packet',
  'ai_prompt_contract_v2_packet',
  'llm_official_source_promoted_decision_file_generation_v2_packet',
  'legacy_generated_research_evidence_bridge_v2_packet',
  'french_official_source_content_coverage_v2_packet',
  'main_payload_runtime_hash_lock_manifest_dry_run_v2',
  'activation_approval_request_v2_markdown',
  'explicit_approval_receipt_template_v2_markdown',
  'script_p29_explicit_approval_receipt_hash_lock_gate_v2',
  'script_p30_activation_approval_request_presentation_v2',
  'script_p31_explicit_approval_receipt_creation_gate_v2',
  'script_p32_production_apply_absence_denial_gate_v2',
  'script_p43_production_activation_hold_exact_approval_required_v2',
  'script_p44_exact_approval_validation_gate_v2',
  'script_p45_production_activation_sequence_preflight_v2',
  'script_p46_production_apply_transaction_contract_v2',
  'script_p47_post_apply_rollback_guard_contract_v2',
  'script_p48_approval_wait_safe_continuation_v2',
  'script_p49_production_readiness_completion_audit_v2',
  'script_post_exact_approval_apply_runbook_v2',
  'script_runtime_delivery_evidence_chain_v2',
  'script_ai_prompt_contract_v2',
  'script_llm_official_source_promoted_decision_file_generation_v2',
  'script_legacy_generated_research_evidence_bridge_v2',
  'script_french_official_source_content_coverage_v2',
  'script_p50_final_preapproval_evidence_hash_lock_v2',
] as const;

const EXPECTED_FINAL_HASH_LOCKS = EXPECTED_FINAL_HASH_LOCK_ROLES.length;

type Report = {
  schemaVersion: 'gustav-final-preapproval-evidence-hash-lock-v2-packet-v0';
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
  finalHashLockDryRun: {
    path: string;
    sha256: string;
  };
  criticalArtifacts: CriticalArtifact[];
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
    runtimeDownloadsEnabledByThisScript: false;
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

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function buildCriticalArtifacts(repoRoot: string, entries: Array<{ path: string; role: string; requiredForGate?: boolean }>): { artifacts: CriticalArtifact[]; missing: string[] } {
  const artifacts: CriticalArtifact[] = [];
  const missing: string[] = [];
  for (const entry of entries) {
    if (!fs.existsSync(entry.path)) {
      missing.push(rel(repoRoot, entry.path));
      continue;
    }
    artifacts.push({
      role: entry.role,
      path: rel(repoRoot, entry.path),
      bytes: fs.statSync(entry.path).size,
      sha256: sha256(entry.path),
      requiredForGate: entry.requiredForGate ?? true,
    });
  }
  return { artifacts, missing };
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const artifactRoles = new Set(input.criticalArtifacts.map((artifact) => artifact.role));
  const missingRequiredRoleLocks = EXPECTED_FINAL_HASH_LOCK_ROLES.filter((role) => !artifactRoles.has(role)).length;
  const p29Ready =
    input.p29Status === 'PASS' &&
    input.p29State === 'approval_request_package_ready' &&
    input.p29Ready &&
    !input.p29ActiveApprovalReceiptExists &&
    !input.p29ActiveHashLockExists &&
    !input.p29ReadyForApply &&
    !input.p29MayModifyProductionAppFiles;
  const p30Ready =
    input.p30Status === 'PASS' &&
    input.p30State === 'approval_request_presented' &&
    input.p30ReadyForReceiptCreation &&
    input.p30ApprovalRequestHashLinked &&
    input.p30ExactApprovalSentenceIncluded &&
    input.p30IncludesMainHashLock &&
    input.p30IncludesFinalHashLock &&
    input.p30IncludesCompletionAudit &&
    !input.p30ActiveApprovalReceiptExists &&
    !input.p30ActiveHashLockExists;
  const p31HeldWithoutActiveArtifacts =
    input.p31Status === 'HOLD' &&
    input.p31State === 'approval_receipt_creation_waiting_for_exact_sentence' &&
    !input.p31ActiveApprovalReceiptCreated &&
    !input.p31ActiveHashLockCreated &&
    !input.p31ReadyForApply;
  const p32ApplyDenied =
    input.p32Status === 'HOLD' &&
    input.p32State === 'production_apply_denied_missing_active_approval_artifacts' &&
    input.p32ProductionApplyDenied &&
    !input.p32ActiveApprovalReceiptExists &&
    !input.p32ActiveHashLockExists;
  const p43P49ChainReady =
    input.p43Status === 'HOLD' &&
    input.p43State === 'production_activation_hold_exact_approval_required' &&
    input.p43ClosedEvidenceReady &&
    input.p44Status === 'HOLD' &&
    input.p44State === 'waiting_for_exact_approval_artifacts' &&
    !input.p44ActiveApprovalReceiptExists &&
    !input.p44ActiveHashLockExists &&
    !input.p44ReadyForProductionActivationSequencing &&
    input.p45Status === 'HOLD' &&
    input.p45State === 'waiting_for_exact_approval_validation' &&
    input.p46Status === 'HOLD' &&
    input.p46State === 'waiting_for_activation_sequence_preflight' &&
    input.p47Status === 'HOLD' &&
    input.p47State === 'waiting_for_apply_transaction_contract' &&
    input.p48Status === 'PASS' &&
    input.p48State === 'approval_wait_safe_continuation_ready' &&
    input.p48ReadyForNextSafePass &&
    input.p48LegacyReviewResidueMatches === 0;
  const p49CompletionReady =
    input.p49Status === 'HOLD' &&
    input.p49State === 'closed_mode_evidence_complete_production_locked' &&
    input.p49RequirementsProved + input.p49RequirementsProductionLocked >= 16 &&
    input.p49RequirementsMissing === 0 &&
    input.p49RequirementsContradicted === 0 &&
    input.p49FixtureProbes > 0 &&
    input.p49FixtureProbesPassed === input.p49FixtureProbes;
  const postExactApprovalApplyRunbookReady =
    input.postApprovalRunbookStatus === 'PASS' &&
    input.postApprovalRunbookReady &&
    input.postApprovalRunbookState === 'post_exact_approval_runbook_ready_waiting_for_canonical_source' &&
    input.postApprovalRunbookSteps === 6 &&
    input.postApprovalRunbookFixtureProbes === 13 &&
    input.postApprovalRunbookFixtureProbesPassed === input.postApprovalRunbookFixtureProbes &&
    !input.postApprovalRunbookReadyForApply &&
    !input.postApprovalRunbookMayModifyProductionAppFiles;
  const runtimeDeliveryEvidenceChainReady =
    input.runtimeDeliveryEvidenceChainStatus === 'PASS' &&
    input.runtimeDeliveryEvidenceChainState === 'runtime_delivery_evidence_chain_ready_no_writes' &&
    input.runtimeDeliveryEvidenceChainReady &&
    input.runtimeDeliveryEvidenceChainFixtureProbes > 0 &&
    input.runtimeDeliveryEvidenceChainFixtureProbesPassed === input.runtimeDeliveryEvidenceChainFixtureProbes &&
    !input.runtimeDeliveryEvidenceChainReadyForApply &&
    !input.runtimeDeliveryEvidenceChainMayModifyProductionAppFiles;
  const forbiddenOpen =
    input.activeApprovalReceiptExists ||
    input.activeHashLockExists ||
    input.targetManifestActivationApproved ||
    input.targetManifestReadyForApply ||
    input.targetManifestMayModifyProductionAppFiles ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.runtimeDownloadsEnabled ||
    input.downloadablePacksPublished;

  if (!p29Ready) addFinding(findings, 'blocker', 'P29_NOT_FINAL_LOCK_READY', 'P29 request package must be PASS, closed and active-artifact free.');
  if (!p30Ready) addFinding(findings, 'blocker', 'P30_NOT_LINKED_TO_FINAL_LOCK', 'P30 approval request must link main hash lock, final hash lock and P49 completion audit.');
  if (!p31HeldWithoutActiveArtifacts) addFinding(findings, 'blocker', 'P31_NOT_SAFE_HOLD', 'P31 must remain HOLD without active approval/hash-lock creation.');
  if (!p32ApplyDenied) addFinding(findings, 'blocker', 'P32_NOT_DENYING_APPLY', 'P32 must deny production apply while active approval artifacts are absent.');
  if (!p43P49ChainReady) addFinding(findings, 'blocker', 'P43_P49_CHAIN_NOT_READY', 'P43-P49 safe activation-hold chain must be fresh and closed.');
  if (!p49CompletionReady) addFinding(findings, 'blocker', 'P49_COMPLETION_NOT_READY', 'P49 completion matrix must prove closed-mode evidence with zero missing/contradicted requirements.');
  if (!postExactApprovalApplyRunbookReady) addFinding(findings, 'blocker', 'POST_EXACT_APPROVAL_RUNBOOK_NOT_READY', 'P50 final hash-lock requires the post-exact-approval P31-P48 runbook to be PASS and no-write.');
  if (!runtimeDeliveryEvidenceChainReady) addFinding(findings, 'blocker', 'RUNTIME_DELIVERY_EVIDENCE_CHAIN_NOT_READY', 'P50 final hash-lock requires runtime delivery evidence chain V2 PASS and no-write readiness.');
  if (input.missingCriticalArtifacts.length > 0) {
    addFinding(findings, 'blocker', 'FINAL_HASH_LOCK_MISSING_ARTIFACTS', `${input.missingCriticalArtifacts.length} final hash-lock artifact(s) are missing.`);
  }
  if (input.criticalArtifacts.length < EXPECTED_FINAL_HASH_LOCKS) {
    addFinding(findings, 'blocker', 'FINAL_HASH_LOCK_COVERAGE_TOO_SMALL', `Expected at least ${EXPECTED_FINAL_HASH_LOCKS} final evidence hash locks, got ${input.criticalArtifacts.length}.`);
  }
  if (missingRequiredRoleLocks > 0) {
    addFinding(findings, 'blocker', 'FINAL_HASH_LOCK_REQUIRED_ROLE_GAP', `${missingRequiredRoleLocks} required final hash-lock role(s) are missing.`);
  }
  if (forbiddenOpen) addFinding(findings, 'blocker', 'PRODUCTION_FLAG_OPEN_BEFORE_APPROVAL', 'Final pre-approval evidence lock requires all active/apply/upload/download flags closed.');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const lockState: LockState = blockers > 0 ? 'blocked_by_findings' : 'final_preapproval_evidence_hash_lock_ready';

  return {
    findings,
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      lockState,
      finalHashLocks: input.criticalArtifacts.length,
      missingCriticalArtifacts: input.missingCriticalArtifacts.length,
      missingRequiredRoleLocks,
      p29Ready,
      p30Ready,
      p30IncludesFinalHashLock: input.p30IncludesFinalHashLock,
      p31HeldWithoutActiveArtifacts,
      p32ApplyDenied,
      p43P49ChainReady,
      p49CompletionReady,
      postExactApprovalApplyRunbookReady,
      runtimeDeliveryEvidenceChainReady,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
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
      readyForExplicitApprovalReceiptCreationGateV2: blockers === 0,
      blockers,
      warnings,
    },
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{ id: string; expectedState: LockState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_final_lock_ready', expectedState: 'final_preapproval_evidence_hash_lock_ready', mutate: () => undefined },
    { id: 'missing_p30_final_link_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p30IncludesFinalHashLock = false; } },
    { id: 'missing_p49_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p49RequirementsMissing = 1; } },
    { id: 'active_receipt_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'server_upload_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.serverUploadAllowed = true; } },
    { id: 'critical_artifact_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.missingCriticalArtifacts.push('missing.json'); } },
    { id: 'ai_prompt_bridge_role_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.criticalArtifacts = input.criticalArtifacts.filter((artifact) => artifact.role !== 'llm_official_source_promoted_decision_file_generation_v2_packet'); } },
    { id: 'legacy_review_residue_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p48LegacyReviewResidueMatches = 1; } },
    { id: 'post_exact_approval_runbook_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.postApprovalRunbookReady = false; } },
    { id: 'runtime_delivery_evidence_chain_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDeliveryEvidenceChainReady = false; } },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    testCase.mutate(fixture);
    const result = evaluate(fixture).evaluation;
    return {
      id: testCase.id,
      expectedState: testCase.expectedState,
      lockState: result.lockState,
      blockers: result.blockers,
      passed: result.lockState === testCase.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Final Pre-Approval Evidence Hash-Lock V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Lock state: \`${report.summary.lockState}\``,
    `- Final hash locks: ${report.summary.finalHashLocks}`,
    `- Missing critical artifacts: ${report.summary.missingCriticalArtifacts}`,
    `- Missing required role locks: ${report.summary.missingRequiredRoleLocks}`,
    `- P29/P30/P31/P32 ready: ${report.summary.p29Ready ? 'yes' : 'no'}/${report.summary.p30Ready ? 'yes' : 'no'}/${report.summary.p31HeldWithoutActiveArtifacts ? 'yes' : 'no'}/${report.summary.p32ApplyDenied ? 'yes' : 'no'}`,
    `- P43-P49 chain/P49 completion: ${report.summary.p43P49ChainReady ? 'yes' : 'no'}/${report.summary.p49CompletionReady ? 'yes' : 'no'}`,
    `- Post exact approval apply runbook ready: ${report.summary.postExactApprovalApplyRunbookReady ? 'yes' : 'no'}`,
    `- Runtime delivery evidence chain ready: ${report.summary.runtimeDeliveryEvidenceChainReady ? 'yes' : 'no'}`,
    `- Active receipt/hash lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- readyForApply/mayModify: ${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Final Hash-Lock Dry Run',
    '',
    `- Path: \`${report.finalHashLockDryRun.path}\``,
    `- sha256: \`${report.finalHashLockDryRun.sha256}\``,
    '',
    '## Critical Artifacts',
    '',
  ];
  for (const artifact of report.criticalArtifacts) {
    lines.push(`- ${artifact.role}: \`${artifact.path}\` (${artifact.sha256})`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  for (const finding of report.findings) {
    lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- This packet writes only a dry-run final evidence hash-lock and an audit report.');
  lines.push('- It does not create active approval artifacts, production app writes, server uploads, runtime downloads, storage/cloud migrations or apply approval.');
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

  const p29Path = path.join(auditsDir, 'explicit_approval_receipt_hash_lock_gate_v2_packet.json');
  const p30Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const p31Path = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const p32Path = path.join(auditsDir, 'production_apply_absence_denial_gate_v2_packet.json');
  const p43Path = path.join(auditsDir, 'production_activation_hold_exact_approval_required_v2_packet.json');
  const p44Path = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const p45Path = path.join(auditsDir, 'production_activation_sequence_preflight_v2_packet.json');
  const p46Path = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.json');
  const p47Path = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.json');
  const p48Path = path.join(auditsDir, 'approval_wait_safe_continuation_v2_packet.json');
  const p49Path = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const postApprovalRunbookPath = path.join(auditsDir, 'post_exact_approval_apply_runbook_v2_packet.json');
  const runtimeDeliveryEvidenceChainPath = path.join(auditsDir, 'runtime_delivery_evidence_chain_v2_packet.json');
  const aiPromptContractPath = path.join(auditsDir, 'ai_prompt_contract_v2_packet.json');
  const promotedDecisionFileGenerationPath = path.join(auditsDir, 'llm_official_source_promoted_decision_file_generation_v2_packet.json');
  const legacyGeneratedResearchEvidenceBridgePath = path.join(auditsDir, 'legacy_generated_research_evidence_bridge_v2_packet.json');
  const officialSourceContentCoveragePath = path.join(auditsDir, 'french_official_source_content_coverage_v2_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const mainHashLockDryRunPath = path.join(applyPlanDir, 'hash_lock_manifest_dry_run_v2.json');
  const finalHashLockDryRunPath = path.join(applyPlanDir, 'final_preapproval_evidence_hash_lock_dry_run_v2.json');
  const approvalRequestPath = path.join(applyPlanDir, 'activation_approval_request_v2.md');
  const approvalTemplatePath = path.join(applyPlanDir, 'explicit_approval_receipt_template_v2.md');
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const outputJsonPath = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.md');

  const p29 = readJsonOrEmpty(p29Path);
  const p30 = readJsonOrEmpty(p30Path);
  const p31 = readJsonOrEmpty(p31Path);
  const p32 = readJsonOrEmpty(p32Path);
  const p43 = readJsonOrEmpty(p43Path);
  const p44 = readJsonOrEmpty(p44Path);
  const p45 = readJsonOrEmpty(p45Path);
  const p46 = readJsonOrEmpty(p46Path);
  const p47 = readJsonOrEmpty(p47Path);
  const p48 = readJsonOrEmpty(p48Path);
  const p49 = readJsonOrEmpty(p49Path);
  const postApprovalRunbook = readJsonOrEmpty(postApprovalRunbookPath);
  const runtimeDeliveryEvidenceChain = readJsonOrEmpty(runtimeDeliveryEvidenceChainPath);
  const targetManifest = readJsonOrEmpty(targetManifestPath);
  const serverManifest = readJsonOrEmpty(serverManifestPath);

  const p29Summary = summaryOf(p29);
  const p30Summary = summaryOf(p30);
  const p31Summary = summaryOf(p31);
  const p32Summary = summaryOf(p32);
  const p43Summary = summaryOf(p43);
  const p44Summary = summaryOf(p44);
  const p45Summary = summaryOf(p45);
  const p46Summary = summaryOf(p46);
  const p47Summary = summaryOf(p47);
  const p48Summary = summaryOf(p48);
  const p49Summary = summaryOf(p49);
  const postApprovalRunbookSummary = summaryOf(postApprovalRunbook);
  const runtimeDeliveryEvidenceChainSummary = summaryOf(runtimeDeliveryEvidenceChain);
  const targetActivation = object(targetManifest.activation);

  const finalLockEntries = [
    { path: p29Path, role: 'p29_explicit_approval_receipt_hash_lock_gate_v2_packet' },
    { path: p30Path, role: 'p30_activation_approval_request_presentation_v2_packet' },
    { path: p31Path, role: 'p31_explicit_approval_receipt_creation_gate_v2_packet' },
    { path: p32Path, role: 'p32_production_apply_absence_denial_gate_v2_packet' },
    { path: p43Path, role: 'p43_production_activation_hold_exact_approval_required_v2_packet' },
    { path: p44Path, role: 'p44_exact_approval_validation_gate_v2_packet' },
    { path: p45Path, role: 'p45_production_activation_sequence_preflight_v2_packet' },
    { path: p46Path, role: 'p46_production_apply_transaction_contract_v2_packet' },
    { path: p47Path, role: 'p47_post_apply_rollback_guard_contract_v2_packet' },
    { path: p48Path, role: 'p48_approval_wait_safe_continuation_v2_packet' },
    { path: p49Path, role: 'p49_production_readiness_completion_audit_v2_packet' },
    { path: postApprovalRunbookPath, role: 'post_exact_approval_apply_runbook_v2_packet' },
    { path: runtimeDeliveryEvidenceChainPath, role: 'runtime_delivery_evidence_chain_v2_packet' },
    { path: aiPromptContractPath, role: 'ai_prompt_contract_v2_packet' },
    { path: promotedDecisionFileGenerationPath, role: 'llm_official_source_promoted_decision_file_generation_v2_packet' },
    { path: legacyGeneratedResearchEvidenceBridgePath, role: 'legacy_generated_research_evidence_bridge_v2_packet' },
    { path: officialSourceContentCoveragePath, role: 'french_official_source_content_coverage_v2_packet' },
    { path: mainHashLockDryRunPath, role: 'main_payload_runtime_hash_lock_manifest_dry_run_v2' },
    { path: approvalRequestPath, role: 'activation_approval_request_v2_markdown' },
    { path: approvalTemplatePath, role: 'explicit_approval_receipt_template_v2_markdown' },
    { path: path.join(repoRoot, 'scripts/gustav_explicit_approval_receipt_hash_lock_gate_v2_packet.ts'), role: 'script_p29_explicit_approval_receipt_hash_lock_gate_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_activation_approval_request_presentation_v2_packet.ts'), role: 'script_p30_activation_approval_request_presentation_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_explicit_approval_receipt_creation_gate_v2_packet.ts'), role: 'script_p31_explicit_approval_receipt_creation_gate_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_production_apply_absence_denial_gate_v2_packet.ts'), role: 'script_p32_production_apply_absence_denial_gate_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_production_activation_hold_exact_approval_required_v2_packet.ts'), role: 'script_p43_production_activation_hold_exact_approval_required_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_exact_approval_validation_gate_v2_packet.ts'), role: 'script_p44_exact_approval_validation_gate_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_production_activation_sequence_preflight_v2_packet.ts'), role: 'script_p45_production_activation_sequence_preflight_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_production_apply_transaction_contract_v2_packet.ts'), role: 'script_p46_production_apply_transaction_contract_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_post_apply_rollback_guard_contract_v2_packet.ts'), role: 'script_p47_post_apply_rollback_guard_contract_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_approval_wait_safe_continuation_v2_packet.ts'), role: 'script_p48_approval_wait_safe_continuation_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_production_readiness_completion_audit_v2_packet.ts'), role: 'script_p49_production_readiness_completion_audit_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_post_exact_approval_apply_runbook_v2_packet.ts'), role: 'script_post_exact_approval_apply_runbook_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_runtime_delivery_evidence_chain_v2_packet.ts'), role: 'script_runtime_delivery_evidence_chain_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_ai_prompt_contract_v2_packet.ts'), role: 'script_ai_prompt_contract_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_llm_official_source_promoted_decision_file_generation_v2_packet.ts'), role: 'script_llm_official_source_promoted_decision_file_generation_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_legacy_generated_research_evidence_bridge_v2_packet.ts'), role: 'script_legacy_generated_research_evidence_bridge_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_french_official_source_content_coverage_v2_packet.ts'), role: 'script_french_official_source_content_coverage_v2' },
    { path: path.join(repoRoot, 'scripts/gustav_final_preapproval_evidence_hash_lock_v2_packet.ts'), role: 'script_p50_final_preapproval_evidence_hash_lock_v2' },
  ];
  const critical = buildCriticalArtifacts(repoRoot, finalLockEntries);

  const finalHashLockDryRun = {
    schemaVersion: 'gustav-final-preapproval-evidence-hash-lock-dry-run-v2-v0',
    runId,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    activeHashLock: false,
    finalPreapprovalEvidenceHashLock: true,
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    approvalReceiptCreated: false,
    productionWritesAllowed: false,
    activationApproved: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    currentDirtyFiles: gitDirtyCount(repoRoot),
    mainHashLockDryRunPath: rel(repoRoot, mainHashLockDryRunPath),
    criticalArtifacts: critical.artifacts,
    missingCriticalArtifacts: critical.missing,
  };
  writeJson(finalHashLockDryRunPath, finalHashLockDryRun);

  const requiredSentence = s(p30, 'requiredApprovalSentence');
  const input: EvaluationInput = {
    p29Status: s(p29, 'status'),
    p29State: s(p29Summary, 'gateState'),
    p29Ready: b(p29Summary, 'readyForApprovalRequestPresentationV2'),
    p29ActiveApprovalReceiptExists: b(p29Summary, 'activeApprovalReceiptExists'),
    p29ActiveHashLockExists: b(p29Summary, 'activeHashLockExists'),
    p29ReadyForApply: b(p29Summary, 'readyForApply'),
    p29MayModifyProductionAppFiles: b(p29Summary, 'mayModifyProductionAppFiles'),
    p30Status: s(p30, 'status'),
    p30State: s(p30Summary, 'requestState'),
    p30ReadyForReceiptCreation: b(p30Summary, 'readyForExplicitApprovalReceiptCreationGateV2'),
    p30ApprovalRequestHashLinked: b(p30Summary, 'approvalRequestHashLinked'),
    p30ExactApprovalSentenceIncluded: b(p30Summary, 'exactApprovalSentenceIncluded'),
    p30IncludesMainHashLock: requiredSentence.includes(rel(repoRoot, mainHashLockDryRunPath)),
    p30IncludesFinalHashLock: requiredSentence.includes(rel(repoRoot, finalHashLockDryRunPath)),
    p30IncludesCompletionAudit: requiredSentence.includes(rel(repoRoot, p49Path)),
    p30ActiveApprovalReceiptExists: b(p30Summary, 'activeApprovalReceiptExists'),
    p30ActiveHashLockExists: b(p30Summary, 'activeHashLockExists'),
    p31Status: s(p31, 'status'),
    p31State: s(p31Summary, 'receiptCreationState'),
    p31ActiveApprovalReceiptCreated: b(p31Summary, 'activeApprovalReceiptCreated'),
    p31ActiveHashLockCreated: b(p31Summary, 'activeHashLockCreated'),
    p31ReadyForApply: b(p31Summary, 'readyForApply'),
    p32Status: s(p32, 'status'),
    p32State: s(p32Summary, 'denialState'),
    p32ProductionApplyDenied: b(p32Summary, 'productionApplyDenied'),
    p32ActiveApprovalReceiptExists: b(p32Summary, 'activeApprovalReceiptExists'),
    p32ActiveHashLockExists: b(p32Summary, 'activeHashLockExists'),
    p43Status: s(p43, 'status'),
    p43State: s(p43Summary, 'holdState'),
    p43ClosedEvidenceReady: b(p43Summary, 'closedEvidenceReady'),
    p44Status: s(p44, 'status'),
    p44State: s(p44Summary, 'validationState'),
    p44ActiveApprovalReceiptExists: b(p44Summary, 'activeApprovalReceiptExists'),
    p44ActiveHashLockExists: b(p44Summary, 'activeHashLockExists'),
    p44ReadyForProductionActivationSequencing: b(p44Summary, 'readyForProductionActivationSequencing'),
    p45Status: s(p45, 'status'),
    p45State: s(p45Summary, 'preflightState'),
    p46Status: s(p46, 'status'),
    p46State: s(p46Summary, 'transactionState'),
    p47Status: s(p47, 'status'),
    p47State: s(p47Summary, 'guardState'),
    p48Status: s(p48, 'status'),
    p48State: s(p48Summary, 'continuationState'),
    p48ReadyForNextSafePass: b(p48Summary, 'readyForNextSafePass'),
    p48LegacyReviewResidueMatches: n(p48Summary, 'legacyReviewResidueMatches'),
    p49Status: s(p49, 'status'),
    p49State: s(p49Summary, 'completionState'),
    p49RequirementsProved: n(p49Summary, 'requirementsProved'),
    p49RequirementsProductionLocked: n(p49Summary, 'requirementsProductionLocked'),
    p49RequirementsMissing: n(p49Summary, 'requirementsMissing'),
    p49RequirementsContradicted: n(p49Summary, 'requirementsContradicted'),
    p49FixtureProbesPassed: n(p49Summary, 'fixtureProbesPassed'),
    p49FixtureProbes: n(p49Summary, 'fixtureProbes'),
    postApprovalRunbookStatus: s(postApprovalRunbook, 'status'),
    postApprovalRunbookState: s(postApprovalRunbookSummary, 'runbookState'),
    postApprovalRunbookReady:
      s(postApprovalRunbook, 'status') === 'PASS' &&
      s(postApprovalRunbookSummary, 'runbookState') === 'post_exact_approval_runbook_ready_waiting_for_canonical_source' &&
      n(postApprovalRunbookSummary, 'blockers') === 0,
    postApprovalRunbookSteps: n(postApprovalRunbookSummary, 'runbookSteps'),
    postApprovalRunbookFixtureProbesPassed: n(postApprovalRunbookSummary, 'fixtureProbesPassed'),
    postApprovalRunbookFixtureProbes: n(postApprovalRunbookSummary, 'fixtureProbes'),
    postApprovalRunbookReadyForApply: b(postApprovalRunbookSummary, 'readyForApply'),
    postApprovalRunbookMayModifyProductionAppFiles: b(postApprovalRunbookSummary, 'mayModifyProductionAppFiles'),
    runtimeDeliveryEvidenceChainStatus: s(runtimeDeliveryEvidenceChain, 'status'),
    runtimeDeliveryEvidenceChainState: s(runtimeDeliveryEvidenceChainSummary, 'chainState'),
    runtimeDeliveryEvidenceChainReady: b(runtimeDeliveryEvidenceChainSummary, 'runtimeDeliveryEvidenceChainReady'),
    runtimeDeliveryEvidenceChainFixtureProbesPassed: n(runtimeDeliveryEvidenceChainSummary, 'fixtureProbesPassed'),
    runtimeDeliveryEvidenceChainFixtureProbes: n(runtimeDeliveryEvidenceChainSummary, 'fixtureProbes'),
    runtimeDeliveryEvidenceChainReadyForApply: b(runtimeDeliveryEvidenceChainSummary, 'readyForApply'),
    runtimeDeliveryEvidenceChainMayModifyProductionAppFiles: b(runtimeDeliveryEvidenceChainSummary, 'mayModifyProductionAppFiles'),
    criticalArtifacts: critical.artifacts,
    missingCriticalArtifacts: critical.missing,
    activeApprovalReceiptExists: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExists: fs.existsSync(activeHashLockPath),
    targetManifestActivationApproved: b(targetActivation, 'activationApproved'),
    targetManifestReadyForApply: b(targetActivation, 'readyForApply'),
    targetManifestMayModifyProductionAppFiles: b(targetActivation, 'mayModifyProductionAppFiles'),
    serverUploadAllowed: b(serverManifest, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(serverManifest, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(serverManifest, 'runtimeDownloadsEnabled'),
    downloadablePacksPublished: b(serverManifest, 'downloadablePacksPublished'),
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';

  const report: Report = {
    schemaVersion: 'gustav-final-preapproval-evidence-hash-lock-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      explicitApprovalReceiptHashLockGateV2Packet: rel(repoRoot, p29Path),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, p30Path),
      explicitApprovalReceiptCreationGateV2Packet: rel(repoRoot, p31Path),
      productionApplyAbsenceDenialGateV2Packet: rel(repoRoot, p32Path),
      productionActivationHoldExactApprovalRequiredV2Packet: rel(repoRoot, p43Path),
      exactApprovalValidationGateV2Packet: rel(repoRoot, p44Path),
      approvalWaitSafeContinuationV2Packet: rel(repoRoot, p48Path),
      productionReadinessCompletionAuditV2Packet: rel(repoRoot, p49Path),
      postExactApprovalApplyRunbookV2Packet: rel(repoRoot, postApprovalRunbookPath),
      runtimeDeliveryEvidenceChainV2Packet: rel(repoRoot, runtimeDeliveryEvidenceChainPath),
      mainHashLockManifestDryRunV2: rel(repoRoot, mainHashLockDryRunPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      finalHashLockDryRun: rel(repoRoot, finalHashLockDryRunPath),
    },
    summary: {
      ...evaluation,
      lockState: blockers > 0 ? 'blocked_by_findings' : evaluation.lockState,
      blockers,
      warnings,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    finalHashLockDryRun: {
      path: rel(repoRoot, finalHashLockDryRunPath),
      sha256: sha256(finalHashLockDryRunPath),
    },
    criticalArtifacts: critical.artifacts,
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
      runtimeDownloadsEnabledByThisScript: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outputJsonPath, report);
  fs.writeFileSync(outputMdPath, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV final pre-approval evidence hash-lock V2 packet: ${status}`);
  console.log(`Lock state: ${report.summary.lockState}`);
  console.log(`Final hash locks: ${report.summary.finalHashLocks}`);
  console.log(`P30 includes final lock: ${report.summary.p30IncludesFinalHashLock ? 'yes' : 'no'}`);
  console.log(`Ready for explicit approval receipt creation gate V2: ${report.summary.readyForExplicitApprovalReceiptCreationGateV2 ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (status === 'BLOCK') process.exitCode = 1;
}

main();
