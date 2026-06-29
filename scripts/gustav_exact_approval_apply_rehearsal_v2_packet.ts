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
  rehearsalState: string;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  readinessDecision: string;
  readinessGenerationBlockers: number;
  readinessApplyBlockers: number;
  readinessFailedIds: string[];
  masterStatus: string;
  masterBlockers: number;
  masterReadyForApply: boolean;
  masterMayModifyProductionAppFiles: boolean;
  p30Status: string;
  p30State: string;
  p30ReadyForReceiptCreation: boolean;
  requiredApprovalSentence: string;
  p31Status: string;
  p31State: string;
  p31ActiveReceiptCreated: boolean;
  p31ActiveHashCreated: boolean;
  p31ProbesPassed: number;
  p31Probes: number;
  p44Status: string;
  p44State: string;
  p44P50Ready: boolean;
  p44ReadyForProductionActivationSequencing: boolean;
  p45Status: string;
  p45State: string;
  p46Status: string;
  p46State: string;
  p47Status: string;
  p47State: string;
  p48Status: string;
  p48State: string;
  p49Status: string;
  p49State: string;
  p49MissingRequirements: number;
  p49ContradictedRequirements: number;
  p50Status: string;
  p50State: string;
  p50FinalHashLocks: number;
  p50MissingCriticalArtifacts: number;
  p50P30IncludesFinalHashLock: boolean;
  p50ReadyForReceiptCreation: boolean;
  mainHashLockDryRunPresent: boolean;
  finalHashLockDryRunPresent: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
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
  schemaVersion: 'gustav-exact-approval-apply-rehearsal-v2-packet-v0';
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
    rehearsalState: string;
    readinessDecision: string;
    readinessGenerationBlockers: number;
    readinessApplyBlockers: number;
    readinessFailedIds: string[];
    exactApprovalRequired: true;
    requiredApprovalSentencePresent: boolean;
    activeApprovalReceiptExists: boolean;
    activeHashLockExists: boolean;
    wouldCreateActiveArtifactsNow: false;
    wouldModifyProductionAppFilesNow: false;
    mainHashLockDryRunPresent: boolean;
    finalHashLockDryRunPresent: boolean;
    p31SafeHoldReady: boolean;
    p44WaitingForExactApproval: boolean;
    p45WaitingForP44: boolean;
    p46WaitingForP45: boolean;
    p47WaitingForP46: boolean;
    p48SafeContinuationReady: boolean;
    p49CompletionReady: boolean;
    p50FinalHashLockReady: boolean;
    finalHashLocks: number;
    missingCriticalArtifacts: number;
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

const EXPECTED_FINAL_HASH_LOCKS = 38;

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

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function sameSet(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && expected.every((item) => actual.includes(item));
}

const MASTER_SELF_CYCLE_BLOCKERS = new Set([
  'official_source_content_coverage_v2_not_ready_for_import_dry_run_refresh',
  'activation_approval_request_presentation_v2_not_ready_for_receipt_creation_gate',
  'nonproduction_blocker_closure_plan_v2_not_ready_for_next_pass',
  'ordered_approval_wait_refresh_v2_blockers',
  'ordered_approval_wait_refresh_v2_not_ready',
  'ordered_approval_wait_refresh_v2_missing_probe_passes',
  'safe_preapproval_continuation_v2_blockers',
  'safe_preapproval_continuation_v2_not_ready',
  'safe_preapproval_continuation_v2_missing_probe_passes',
  'production_apply_absence_denial_gate_v2_blockers',
  'production_apply_absence_denial_gate_v2_not_denied',
  'production_apply_absence_denial_gate_v2_wrong_state',
  'production_apply_absence_denial_gate_v2_not_ready_for_non_production_continuation',
  'production_apply_absence_denial_gate_v2_missing_probe_passes',
  'production_activation_hold_exact_approval_required_v2_blockers',
  'production_activation_hold_exact_approval_required_v2_not_ready',
  'production_activation_hold_exact_approval_required_v2_missing_probe_passes',
  'production_readiness_completion_audit_v2_blockers',
  'production_readiness_completion_audit_v2_not_ready',
  'production_readiness_completion_audit_v2_missing_requirements',
  'production_readiness_completion_audit_v2_missing_proved_requirements',
  'production_readiness_completion_audit_v2_unexpected_locked_requirements',
  'production_readiness_completion_audit_v2_missing_probe_passes',
  'final_preapproval_evidence_hash_lock_v2_blockers',
  'final_preapproval_evidence_hash_lock_v2_not_ready',
  'final_preapproval_evidence_hash_lock_v2_missing_probe_passes',
  'production_activation_sequence_preflight_v2_blockers',
  'production_activation_sequence_preflight_v2_not_ready',
  'production_activation_sequence_preflight_v2_missing_probe_passes',
  'production_apply_transaction_contract_v2_blockers',
  'production_apply_transaction_contract_v2_not_ready',
  'production_apply_transaction_contract_v2_missing_probe_passes',
  'post_apply_rollback_guard_contract_v2_blockers',
  'post_apply_rollback_guard_contract_v2_not_ready',
  'post_apply_rollback_guard_contract_v2_missing_probe_passes',
  'approval_wait_safe_continuation_v2_blockers',
  'approval_wait_safe_continuation_v2_not_ready',
  'approval_wait_safe_continuation_v2_missing_probe_passes',
  'exact_approval_validation_gate_v2_not_ready',
  'exact_approval_apply_rehearsal_v2_blockers',
  'exact_approval_apply_rehearsal_v2_not_ready',
  'exact_approval_apply_rehearsal_v2_missing_probe_passes',
  'exact_approval_source_firewall_v2_blockers',
  'exact_approval_source_firewall_v2_not_ready',
  'exact_approval_source_firewall_v2_missing_probe_passes',
  'exact_approval_source_intake_transition_v2_blockers',
  'exact_approval_source_intake_transition_v2_not_ready',
  'exact_approval_source_intake_transition_v2_missing_probe_passes',
  'exact_approval_active_artifact_pair_simulation_v2_blockers',
  'exact_approval_active_artifact_pair_simulation_v2_not_ready',
  'exact_approval_active_artifact_pair_simulation_v2_missing_probe_passes',
  'exact_approval_p31_create_command_preflight_v2_blockers',
  'exact_approval_p31_create_command_preflight_v2_not_ready',
  'exact_approval_p31_create_command_preflight_v2_missing_probe_passes',
  'exact_approval_p44_validation_command_preflight_v2_blockers',
  'exact_approval_p44_validation_command_preflight_v2_not_ready',
  'exact_approval_p44_validation_command_preflight_v2_missing_probe_passes',
  'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_blockers',
  'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_not_ready',
  'exact_approval_p44_to_p45_sequence_handoff_simulation_v2_missing_probe_passes',
  'exact_approval_p45_sequence_command_preflight_v2_blockers',
  'exact_approval_p45_sequence_command_preflight_v2_not_ready',
  'exact_approval_p45_sequence_command_preflight_v2_missing_probe_passes',
  'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_blockers',
  'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_not_ready',
  'exact_approval_p45_to_p46_apply_transaction_handoff_simulation_v2_missing_probe_passes',
  'exact_approval_p46_apply_transaction_command_preflight_v2_blockers',
  'exact_approval_p46_apply_transaction_command_preflight_v2_not_ready',
  'exact_approval_p46_apply_transaction_command_preflight_v2_missing_probe_passes',
  'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_blockers',
  'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_not_ready',
  'exact_approval_p46_to_p47_rollback_guard_handoff_simulation_v2_missing_probe_passes',
  'exact_approval_p47_rollback_guard_command_preflight_v2_blockers',
  'exact_approval_p47_rollback_guard_command_preflight_v2_not_ready',
  'exact_approval_p47_rollback_guard_command_preflight_v2_missing_probe_passes',
  'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_blockers',
  'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_not_ready',
  'exact_approval_p47_to_p48_safe_continuation_handoff_simulation_v2_missing_probe_passes',
  'exact_approval_p48_safe_continuation_command_preflight_v2_blockers',
  'exact_approval_p48_safe_continuation_command_preflight_v2_not_ready',
  'exact_approval_p48_safe_continuation_command_preflight_v2_missing_probe_passes',
]);

function evaluate(input: EvaluationInput): { state: string; findings: Finding[] } {
  const findings: Finding[] = [];
  if (input.readinessDecision !== 'GO' || input.readinessGenerationBlockers !== 0 || input.readinessApplyBlockers !== 1 || !sameSet(input.readinessFailedIds, ['RDY-090'])) {
    addFinding(findings, 'blocker', 'READINESS_NOT_READY_FOR_EXACT_APPROVAL_REHEARSAL', 'Rehearsal requires readiness GO with only RDY-090 apply approval remaining.');
  }
  if (input.masterStatus !== 'HOLD' || input.masterBlockers > 1 || input.masterReadyForApply || input.masterMayModifyProductionAppFiles) {
    addFinding(findings, 'blocker', 'MASTER_NOT_IN_CLOSED_READY_STATE', 'Master must have no non-approval blockers while readyForApply and mayModifyProductionAppFiles stay false.');
  }
  if (input.p30Status !== 'PASS' || input.p30State !== 'approval_request_presented' || !input.p30ReadyForReceiptCreation || input.requiredApprovalSentence.trim() === '') {
    addFinding(findings, 'blocker', 'P30_APPROVAL_REQUEST_NOT_READY', 'P30 must present the exact required approval sentence before rehearsal can be ready.');
  }
  if (input.p31Status !== 'HOLD' || input.p31State !== 'approval_receipt_creation_waiting_for_exact_sentence' || input.p31ActiveReceiptCreated || input.p31ActiveHashCreated || input.p31ProbesPassed !== input.p31Probes || input.p31Probes <= 0) {
    addFinding(findings, 'blocker', 'P31_SAFE_HOLD_NOT_READY', 'P31 must be waiting for the exact sentence, create no active artifacts and pass all probes.');
  }
  if (input.p44Status !== 'HOLD' || input.p44State !== 'waiting_for_exact_approval_artifacts' || !input.p44P50Ready || input.p44ReadyForProductionActivationSequencing) {
    addFinding(findings, 'blocker', 'P44_EXACT_APPROVAL_WAIT_NOT_READY', 'P44 must wait for active approval artifacts, know P50 is ready and not open production activation sequencing.');
  }
  if (input.p45Status !== 'HOLD' || input.p45State !== 'waiting_for_exact_approval_validation') {
    addFinding(findings, 'blocker', 'P45_SEQUENCE_PREFLIGHT_NOT_WAITING', 'P45 must remain waiting for exact approval validation.');
  }
  if (input.p46Status !== 'HOLD' || input.p46State !== 'waiting_for_activation_sequence_preflight') {
    addFinding(findings, 'blocker', 'P46_TRANSACTION_CONTRACT_NOT_WAITING', 'P46 must remain waiting for activation sequence preflight.');
  }
  if (input.p47Status !== 'HOLD' || input.p47State !== 'waiting_for_apply_transaction_contract') {
    addFinding(findings, 'blocker', 'P47_ROLLBACK_GUARD_NOT_WAITING', 'P47 must remain waiting for the apply transaction contract.');
  }
  if (input.p48Status !== 'PASS' || input.p48State !== 'approval_wait_safe_continuation_ready') {
    addFinding(findings, 'blocker', 'P48_SAFE_CONTINUATION_NOT_READY', 'P48 must prove safe continuation while exact approval is absent.');
  }
  if (input.p49Status !== 'HOLD' || input.p49State !== 'closed_mode_evidence_complete_production_locked' || input.p49MissingRequirements !== 0 || input.p49ContradictedRequirements !== 0) {
    addFinding(findings, 'blocker', 'P49_COMPLETION_AUDIT_NOT_READY', 'P49 must have complete closed-mode evidence with no missing or contradicted requirements.');
  }
  if (input.p50Status !== 'PASS' || input.p50State !== 'final_preapproval_evidence_hash_lock_ready' || input.p50FinalHashLocks < EXPECTED_FINAL_HASH_LOCKS || input.p50MissingCriticalArtifacts !== 0 || !input.p50P30IncludesFinalHashLock || !input.p50ReadyForReceiptCreation) {
    addFinding(findings, 'blocker', 'P50_FINAL_HASH_LOCK_NOT_READY', 'P50 must lock final pre-approval evidence and be ready for P31 receipt creation gate.');
  }
  if (!input.mainHashLockDryRunPresent || !input.finalHashLockDryRunPresent) {
    addFinding(findings, 'blocker', 'HASH_LOCK_DRY_RUNS_MISSING', 'Both main and final hash-lock dry-run manifests must exist before exact approval rehearsal is ready.');
  }
  if (input.activeApprovalReceiptExists || input.activeHashLockExists) {
    addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACTS_ALREADY_EXIST', 'This rehearsal is only valid before active approval receipt/hash-lock artifacts exist.');
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
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'Rehearsal must not open activation/apply/upload/download/storage/cloud flags.');
  }
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  return {
    state: blockers > 0 ? 'blocked_by_findings' : 'exact_approval_apply_rehearsal_ready_waiting_for_exact_approval',
    findings,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runProbes(base: EvaluationInput): Probe[] {
  const cases: Array<{ id: string; expectedState: string; mutate: (input: EvaluationInput) => void }> = [
    { id: 'canonical_rehearsal_ready', expectedState: 'exact_approval_apply_rehearsal_ready_waiting_for_exact_approval', mutate: () => undefined },
    { id: 'readiness_extra_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.readinessFailedIds = ['RDY-080', 'RDY-090']; input.readinessApplyBlockers = 2; } },
    { id: 'missing_required_sentence_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.requiredApprovalSentence = ''; } },
    { id: 'p31_created_active_artifact_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p31ActiveReceiptCreated = true; } },
    { id: 'p44_sequence_open_before_approval_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44ReadyForProductionActivationSequencing = true; } },
    { id: 'p50_not_ready_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p50State = 'blocked_by_findings'; } },
    { id: 'final_hash_lock_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.finalHashLockDryRunPresent = false; } },
    { id: 'activation_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.activationApproved = true; } },
    { id: 'runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
  ];
  return cases.map((test) => {
    const fixture = clone(base);
    test.mutate(fixture);
    const result = evaluate(fixture);
    const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
    return {
      id: test.id,
      expectedState: test.expectedState,
      rehearsalState: result.state,
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
    '# GUSTAV Exact Approval Apply Rehearsal V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Rehearsal state: ${report.summary.rehearsalState}`,
    `- Readiness generation/apply blockers: ${report.summary.readinessGenerationBlockers}/${report.summary.readinessApplyBlockers}`,
    `- Failed readiness ids: ${report.summary.readinessFailedIds.join(', ') || 'none'}`,
    `- Required approval sentence present: ${report.summary.requiredApprovalSentencePresent ? 'yes' : 'no'}`,
    `- Active approval receipt/hash-lock exists: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Would create active artifacts now: ${report.summary.wouldCreateActiveArtifactsNow ? 'yes' : 'no'}`,
    `- Main/final hash-lock dry-runs present: ${report.summary.mainHashLockDryRunPresent ? 'yes' : 'no'}/${report.summary.finalHashLockDryRunPresent ? 'yes' : 'no'}`,
    `- P31/P44/P48/P49/P50 ready: ${report.summary.p31SafeHoldReady ? 'yes' : 'no'}/${report.summary.p44WaitingForExactApproval ? 'yes' : 'no'}/${report.summary.p48SafeContinuationReady ? 'yes' : 'no'}/${report.summary.p49CompletionReady ? 'yes' : 'no'}/${report.summary.p50FinalHashLockReady ? 'yes' : 'no'}`,
    `- Final hash locks/missing: ${report.summary.finalHashLocks}/${report.summary.missingCriticalArtifacts}`,
    `- Activation/apply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Upload/download/storage/cloud flags: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}/${report.summary.firebaseUploadAllowed ? 'yes' : 'no'}/${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}/${report.summary.storageMigrationAllowed ? 'yes' : 'no'}/${report.summary.cloudSyncMigrationAllowed ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
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
  lines.push('- It does not create active approval receipt or active hash-lock files.');
  lines.push('- It does not modify production app files, import reviewer decisions, publish server manifests, upload to Firebase/server, enable runtime downloads or approve activation.');
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

  const readinessPath = path.join(auditsDir, 'gustav_readiness_gate.json');
  const p30Path = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const p31Path = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const p44Path = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const p45Path = path.join(auditsDir, 'production_activation_sequence_preflight_v2_packet.json');
  const p46Path = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.json');
  const p47Path = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.json');
  const p48Path = path.join(auditsDir, 'approval_wait_safe_continuation_v2_packet.json');
  const p49Path = path.join(auditsDir, 'production_readiness_completion_audit_v2_packet.json');
  const p50Path = path.join(auditsDir, 'final_preapproval_evidence_hash_lock_v2_packet.json');
  const masterPath = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const mainHashLockDryRunPath = path.join(applyPlanDir, 'hash_lock_manifest_dry_run_v2.json');
  const finalHashLockDryRunPath = path.join(applyPlanDir, 'final_preapproval_evidence_hash_lock_dry_run_v2.json');
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const rehearsalDryRunPath = path.join(applyPlanDir, 'exact_approval_apply_rehearsal_dry_run_v2.json');
  const outputJsonPath = path.join(auditsDir, 'exact_approval_apply_rehearsal_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'exact_approval_apply_rehearsal_v2_packet.md');

  const readiness = readJsonOrEmpty(readinessPath);
  const p30 = readJsonOrEmpty(p30Path);
  const p31 = readJsonOrEmpty(p31Path);
  const p44 = readJsonOrEmpty(p44Path);
  const p45 = readJsonOrEmpty(p45Path);
  const p46 = readJsonOrEmpty(p46Path);
  const p47 = readJsonOrEmpty(p47Path);
  const p48 = readJsonOrEmpty(p48Path);
  const p49 = readJsonOrEmpty(p49Path);
  const p50 = readJsonOrEmpty(p50Path);
  const master = readJsonOrEmpty(masterPath);
  const readinessSummary = summaryOf(readiness);
  const p30Summary = summaryOf(p30);
  const p31Summary = summaryOf(p31);
  const p44Summary = summaryOf(p44);
  const p45Summary = summaryOf(p45);
  const p46Summary = summaryOf(p46);
  const p47Summary = summaryOf(p47);
  const p48Summary = summaryOf(p48);
  const p49Summary = summaryOf(p49);
  const p50Summary = summaryOf(p50);
  const masterSummary = summaryOf(master);
  const masterActionableBlockers = arr(master.findings)
    .filter((finding) => s(object(finding), 'severity') === 'blocker')
    .filter((finding) => {
      const code = s(object(finding), 'code');
      return !MASTER_SELF_CYCLE_BLOCKERS.has(code) && !code.startsWith('exact_approval_');
    })
    .length;
  const failedReadinessIds = arr(readiness.checks)
    .map(object)
    .filter((check) => s(check, 'status') === 'FAIL')
    .map((check) => s(check, 'id'))
    .filter((id) => id !== '');

  const input: EvaluationInput = {
    readinessDecision: s(readiness, 'decision'),
    readinessGenerationBlockers: n(readinessSummary, 'generationBlockers'),
    readinessApplyBlockers: n(readinessSummary, 'applyBlockers'),
    readinessFailedIds: failedReadinessIds,
    masterStatus: s(master, 'status'),
    masterBlockers: masterActionableBlockers,
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    p30Status: s(p30, 'status'),
    p30State: s(p30Summary, 'requestState'),
    p30ReadyForReceiptCreation: b(p30Summary, 'readyForExplicitApprovalReceiptCreationGateV2'),
    requiredApprovalSentence: s(p30, 'requiredApprovalSentence'),
    p31Status: s(p31, 'status'),
    p31State: s(p31Summary, 'receiptCreationState'),
    p31ActiveReceiptCreated: b(p31Summary, 'activeApprovalReceiptCreated'),
    p31ActiveHashCreated: b(p31Summary, 'activeHashLockCreated'),
    p31ProbesPassed: n(p31Summary, 'fixtureProbesPassed'),
    p31Probes: n(p31Summary, 'fixtureProbes'),
    p44Status: s(p44, 'status'),
    p44State: s(p44Summary, 'validationState'),
    p44P50Ready: b(p44Summary, 'p50Ready'),
    p44ReadyForProductionActivationSequencing: b(p44Summary, 'readyForProductionActivationSequencing'),
    p45Status: s(p45, 'status'),
    p45State: s(p45Summary, 'preflightState'),
    p46Status: s(p46, 'status'),
    p46State: s(p46Summary, 'transactionState'),
    p47Status: s(p47, 'status'),
    p47State: s(p47Summary, 'guardState'),
    p48Status: s(p48, 'status'),
    p48State: s(p48Summary, 'continuationState'),
    p49Status: s(p49, 'status'),
    p49State: s(p49Summary, 'completionState'),
    p49MissingRequirements: n(p49Summary, 'requirementsMissing'),
    p49ContradictedRequirements: n(p49Summary, 'requirementsContradicted'),
    p50Status: s(p50, 'status'),
    p50State: s(p50Summary, 'lockState'),
    p50FinalHashLocks: n(p50Summary, 'finalHashLocks'),
    p50MissingCriticalArtifacts: n(p50Summary, 'missingCriticalArtifacts'),
    p50P30IncludesFinalHashLock: b(p50Summary, 'p30IncludesFinalHashLock'),
    p50ReadyForReceiptCreation: b(p50Summary, 'readyForExplicitApprovalReceiptCreationGateV2'),
    mainHashLockDryRunPresent: fs.existsSync(mainHashLockDryRunPath),
    finalHashLockDryRunPresent: fs.existsSync(finalHashLockDryRunPath),
    activeApprovalReceiptExists: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExists: fs.existsSync(activeHashLockPath),
    activationApproved: b(p50Summary, 'activationApproved') || b(masterSummary, 'activationApproved'),
    readyForApply: b(p50Summary, 'readyForApply') || b(masterSummary, 'readyForApply'),
    mayModifyProductionAppFiles: b(p50Summary, 'mayModifyProductionAppFiles') || b(masterSummary, 'mayModifyProductionAppFiles'),
    productionWritesAllowed: b(p50Summary, 'productionWritesAllowed') || b(masterSummary, 'productionWritesAllowed'),
    serverUploadAllowed: b(p50Summary, 'serverUploadAllowed') || b(masterSummary, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(p50Summary, 'firebaseUploadAllowed') || b(masterSummary, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(p50Summary, 'runtimeDownloadsEnabled') || b(masterSummary, 'runtimeDownloadsEnabled'),
    storageMigrationAllowed: b(p50Summary, 'storageMigrationAllowed') || b(masterSummary, 'storageMigrationAllowed'),
    cloudSyncMigrationAllowed: b(p50Summary, 'cloudSyncMigrationAllowed') || b(masterSummary, 'cloudSyncMigrationAllowed'),
  };

  const result = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) addFinding(result.findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);

  const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = result.findings.filter((finding) => finding.severity === 'warning').length;
  const rehearsalState = blockers > 0 ? 'blocked_by_findings' : result.state;
  const status: Status = blockers > 0 ? 'BLOCK' : 'PASS';
  const nextRequiredActions = [
    'Do not create active approval receipt/hash-lock from plain continue prompts.',
    'When and only when the exact required approval sentence is present in an approval source, run P31 with the explicit create flag.',
    'After P31 creates both active artifacts, run P44 exact approval validation and require the active hash-lock to reference both main and final dry-run manifests.',
    'Only after P44 opens production activation sequencing may P45-P47 be evaluated for the production path.',
    'Keep app apply, server/Firebase upload, runtime downloads and storage/cloud migrations closed until the production sequence explicitly opens them.',
  ];

  const rehearsalDryRun = {
    schemaVersion: 'gustav-exact-approval-apply-rehearsal-dry-run-v2-v0',
    runId,
    generatedAt: new Date().toISOString(),
    dryRunOnly: true,
    targetLocale: 'fr',
    sourceLocales: ['ru', 'uk'],
    rehearsalState,
    requiredApprovalSentenceSha256Known: input.requiredApprovalSentence.trim() !== '',
    exactApprovalRequired: true,
    activeApprovalReceiptExists: input.activeApprovalReceiptExists,
    activeHashLockExists: input.activeHashLockExists,
    wouldCreateActiveArtifactsNow: false,
    productionWritesAllowed: false,
    activationApproved: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    mainHashLockDryRunPath: rel(repoRoot, mainHashLockDryRunPath),
    finalPreapprovalEvidenceHashLockDryRunPath: rel(repoRoot, finalHashLockDryRunPath),
    p31PacketPath: rel(repoRoot, p31Path),
    p44PacketPath: rel(repoRoot, p44Path),
    p50PacketPath: rel(repoRoot, p50Path),
    nextRequiredActions,
  };
  writeJson(rehearsalDryRunPath, rehearsalDryRun);

  const report: Report = {
    schemaVersion: 'gustav-exact-approval-apply-rehearsal-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      readinessGate: rel(repoRoot, readinessPath),
      masterManifest: rel(repoRoot, masterPath),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, p30Path),
      explicitApprovalReceiptCreationGateV2Packet: rel(repoRoot, p31Path),
      exactApprovalValidationGateV2Packet: rel(repoRoot, p44Path),
      productionActivationSequencePreflightV2Packet: rel(repoRoot, p45Path),
      productionApplyTransactionContractV2Packet: rel(repoRoot, p46Path),
      postApplyRollbackGuardContractV2Packet: rel(repoRoot, p47Path),
      approvalWaitSafeContinuationV2Packet: rel(repoRoot, p48Path),
      productionReadinessCompletionAuditV2Packet: rel(repoRoot, p49Path),
      finalPreapprovalEvidenceHashLockV2Packet: rel(repoRoot, p50Path),
      mainHashLockDryRun: rel(repoRoot, mainHashLockDryRunPath),
      finalPreapprovalEvidenceHashLockDryRun: rel(repoRoot, finalHashLockDryRunPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      rehearsalDryRun: rel(repoRoot, rehearsalDryRunPath),
    },
    summary: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      rehearsalState,
      readinessDecision: input.readinessDecision,
      readinessGenerationBlockers: input.readinessGenerationBlockers,
      readinessApplyBlockers: input.readinessApplyBlockers,
      readinessFailedIds: input.readinessFailedIds,
      exactApprovalRequired: true,
      requiredApprovalSentencePresent: input.requiredApprovalSentence.trim() !== '',
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      wouldCreateActiveArtifactsNow: false,
      wouldModifyProductionAppFilesNow: false,
      mainHashLockDryRunPresent: input.mainHashLockDryRunPresent,
      finalHashLockDryRunPresent: input.finalHashLockDryRunPresent,
      p31SafeHoldReady: input.p31Status === 'HOLD' && input.p31State === 'approval_receipt_creation_waiting_for_exact_sentence',
      p44WaitingForExactApproval: input.p44Status === 'HOLD' && input.p44State === 'waiting_for_exact_approval_artifacts',
      p45WaitingForP44: input.p45Status === 'HOLD' && input.p45State === 'waiting_for_exact_approval_validation',
      p46WaitingForP45: input.p46Status === 'HOLD' && input.p46State === 'waiting_for_activation_sequence_preflight',
      p47WaitingForP46: input.p47Status === 'HOLD' && input.p47State === 'waiting_for_apply_transaction_contract',
      p48SafeContinuationReady: input.p48Status === 'PASS' && input.p48State === 'approval_wait_safe_continuation_ready',
      p49CompletionReady: input.p49Status === 'HOLD' && input.p49State === 'closed_mode_evidence_complete_production_locked' && input.p49MissingRequirements === 0 && input.p49ContradictedRequirements === 0,
      p50FinalHashLockReady: input.p50Status === 'PASS' && input.p50State === 'final_preapproval_evidence_hash_lock_ready',
      finalHashLocks: input.p50FinalHashLocks,
      missingCriticalArtifacts: input.p50MissingCriticalArtifacts,
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

  console.log(`GUSTAV exact approval apply rehearsal V2 packet: ${status}`);
  console.log(`Rehearsal state: ${report.summary.rehearsalState}`);
  console.log(`Readiness generation/apply blockers: ${report.summary.readinessGenerationBlockers}/${report.summary.readinessApplyBlockers}`);
  console.log(`Active approval receipt/hash-lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (status === 'BLOCK') process.exitCode = 1;
}

main();
