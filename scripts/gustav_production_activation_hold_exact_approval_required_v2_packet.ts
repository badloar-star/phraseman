import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type HoldState =
  | 'production_activation_hold_exact_approval_required'
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
  expectedSafe: boolean;
  safe: boolean;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  nextPassP43: boolean;
  nextPassBlockers: number;
  masterBlockers: number;
  masterReadyForApply: boolean;
  masterMayModifyProductionAppFiles: boolean;
  officialSourceCoverageReady: boolean;
  contentRowsAccepted: number;
  aiDecisionsAccepted: number;
  languageIsolationReady: boolean;
  promptContractsWithTargetLocale: number;
  promptEntrypointsExpected: number;
  closedPayloadReady: boolean;
  payloadSlices: number;
  payloadEntries: number;
  serverPreflightReady: boolean;
  serverManifestEntries: number;
  adminRuntimePreflightReady: boolean;
  runtimePlanReady: boolean;
  approvalRequestPresented: boolean;
  plainContinueRejected: boolean;
  exactApprovalSentencePresent: boolean;
  approvalReceiptCreatedByP31: boolean;
  activeHashLockCreatedByP31: boolean;
  productionApplyDenied: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
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
  holdState: HoldState;
  productionActivationHold: true;
  exactApprovalRequired: true;
  nextPassP43: boolean;
  closedEvidenceReady: boolean;
  officialSourceCoverageReady: boolean;
  contentRowsAccepted: number;
  aiDecisionsAccepted: number;
  languageIsolationReady: boolean;
  promptContractsWithTargetLocale: number;
  promptEntrypointsExpected: number;
  closedPayloadReady: boolean;
  payloadSlices: number;
  payloadEntries: number;
  serverPreflightReady: boolean;
  serverManifestEntries: number;
  adminRuntimePreflightReady: boolean;
  runtimePlanReady: boolean;
  approvalRequestPresented: boolean;
  plainContinueRejected: boolean;
  exactApprovalSentencePresent: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  productionApplyDenied: boolean;
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
  readyForProductionActivationApply: false;
  readyForExactApprovalValidation: false;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-production-activation-hold-exact-approval-required-v2-packet-v0';
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

const ACTIVATION_HOLD_REPLAY_SAFE_GOALS = new Set([
  'NEXT-PASS-REMOTE-SERVER-OBJECT-VERIFY-V2',
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
  'NEXT-PASS-P37-READINESS-APPLY-BLOCKER-MAP-REFRESH-V2',
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

const MASTER_SELF_CYCLE_BLOCKERS = new Set([
  'official_source_content_coverage_v2_not_ready_for_import_dry_run_refresh',
  'nonproduction_blocker_closure_plan_v2_blockers',
  'nonproduction_blocker_closure_plan_v2_not_ready_for_next_pass',
  'nonproduction_blocker_closure_plan_v2_missing_probe_passes',
  'nonproduction_evidence_refresh_v2_blockers',
  'nonproduction_evidence_refresh_v2_not_ready_for_manifest_recheck',
  'nonproduction_evidence_refresh_v2_missing_probe_passes',
  'ordered_approval_wait_refresh_v2_blockers',
  'ordered_approval_wait_refresh_v2_not_ready',
  'ordered_approval_wait_refresh_v2_missing_probe_passes',
  'production_apply_absence_denial_gate_v2_blockers',
  'production_apply_absence_denial_gate_v2_not_denied',
  'production_apply_absence_denial_gate_v2_wrong_state',
  'production_apply_absence_denial_gate_v2_not_ready_for_non_production_continuation',
  'production_apply_absence_denial_gate_v2_missing_probe_passes',
  'production_activation_hold_exact_approval_required_v2_blockers',
  'production_activation_hold_exact_approval_required_v2_not_ready',
  'production_activation_hold_exact_approval_required_v2_missing_probe_passes',
  'exact_approval_validation_gate_v2_not_ready',
  'production_readiness_completion_audit_v2_blockers',
  'production_readiness_completion_audit_v2_not_ready',
  'production_readiness_completion_audit_v2_missing_requirements',
  'production_readiness_completion_audit_v2_missing_probe_passes',
  'final_preapproval_evidence_hash_lock_v2_blockers',
  'final_preapproval_evidence_hash_lock_v2_not_ready',
  'final_preapproval_evidence_hash_lock_v2_missing_probe_passes',
  'exact_approval_apply_rehearsal_v2_blockers',
  'exact_approval_apply_rehearsal_v2_not_ready',
  'exact_approval_apply_rehearsal_v2_missing_probe_passes',
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
  'exact_approval_wait_state_v2_blockers',
  'exact_approval_wait_state_v2_not_ready',
  'exact_approval_wait_state_v2_missing_probe_passes',
  'safe_preapproval_continuation_v2_blockers',
  'safe_preapproval_continuation_v2_not_ready',
  'safe_preapproval_continuation_v2_missing_probe_passes',
  'final_production_readiness_gap_v2_blockers',
  'final_production_readiness_gap_v2_not_ready',
  'final_production_readiness_gap_v2_missing_probe_passes',
  'exact_approval_source_handoff_firewall_v2_blockers',
  'exact_approval_source_handoff_firewall_v2_not_ready',
  'exact_approval_source_handoff_firewall_v2_missing_probe_passes',
  'exact_approval_source_wait_terminal_state_v2_blockers',
  'exact_approval_source_wait_terminal_state_v2_not_ready',
  'exact_approval_source_wait_terminal_state_v2_missing_probe_passes',
]);

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

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  if (!input.nextPassP43) addFinding(findings, 'blocker', 'NEXT_PASS_NOT_ACTIVATION_HOLD_SAFE_CHAIN', 'Next pass must stay inside the safe regeneration or activation-hold chain.');
  if (input.nextPassBlockers > 0) addFinding(findings, 'blocker', 'NEXT_PASS_BLOCKERS_PRESENT', 'Next pass contract must have zero blockers.');
  if (input.masterBlockers > 0) addFinding(findings, 'blocker', 'MASTER_BLOCKERS_PRESENT', 'Master manifest must have zero blockers before final activation hold can be trusted.');
  if (input.masterReadyForApply || input.masterMayModifyProductionAppFiles) addFinding(findings, 'blocker', 'MASTER_APPLY_OPEN', 'Master must keep readyForApply and production file writes closed.');
  if (!input.officialSourceCoverageReady || input.contentRowsAccepted !== 1600 || input.aiDecisionsAccepted < 164) addFinding(findings, 'blocker', 'OFFICIAL_SOURCE_COVERAGE_NOT_READY', 'All 1600 rows and the current full AI decision set must be accepted with official-source evidence.');
  if (!input.languageIsolationReady || input.promptContractsWithTargetLocale !== input.promptEntrypointsExpected || input.promptEntrypointsExpected <= 0) addFinding(findings, 'blocker', 'LANGUAGE_ISOLATION_NOT_READY', 'Language isolation and prompt target/source/UI contracts must be complete.');
  if (!input.closedPayloadReady || input.payloadSlices !== 12 || input.payloadEntries <= 0) addFinding(findings, 'blocker', 'CLOSED_PAYLOAD_NOT_READY', 'Closed local payload materialization must include all 12 target/source/surface slices.');
  if (!input.serverPreflightReady || input.serverManifestEntries !== 12) addFinding(findings, 'blocker', 'SERVER_PREFLIGHT_NOT_READY', 'Server delivery preflight must have all 12 manifest draft entries ready.');
  if (!input.adminRuntimePreflightReady) addFinding(findings, 'blocker', 'ADMIN_RUNTIME_PREFLIGHT_NOT_READY', 'Admin/server/runtime/storage preflight must be ready.');
  if (!input.runtimePlanReady) addFinding(findings, 'blocker', 'RUNTIME_PLAN_NOT_READY', 'Runtime activation blocker plan must be ready.');
  if (!input.approvalRequestPresented) addFinding(findings, 'blocker', 'APPROVAL_REQUEST_NOT_PRESENTED', 'P30 approval request must be present before P43 can hold on exact approval.');
  if (!input.plainContinueRejected) addFinding(findings, 'blocker', 'PLAIN_CONTINUE_NOT_REJECTED', 'P31 must prove a plain continue prompt is not approval.');
  if (input.exactApprovalSentencePresent) addFinding(findings, 'blocker', 'EXACT_APPROVAL_SENTENCE_PRESENT_IN_HOLD', 'P43 hold should yield to a separate exact-approval validation pass when the exact sentence is present.');
  if (input.approvalReceiptCreatedByP31 || input.activeHashLockCreatedByP31) addFinding(findings, 'blocker', 'P31_CREATED_ACTIVE_APPROVAL_ARTIFACT', 'P31 must not create active approval/hash-lock artifacts in hold mode.');
  if (!input.productionApplyDenied) addFinding(findings, 'blocker', 'PRODUCTION_APPLY_NOT_DENIED', 'P32 must explicitly deny production apply while active approval artifacts are absent.');
  if (input.activeApprovalReceiptExists || input.activeHashLockExists) addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_ARTIFACT_PRESENT', 'P43 hold requires active approval receipt/hash-lock to be absent; active artifacts need a separate validation gate.');
  if (
    input.targetManifestActivationApproved ||
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
    addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'Activation/apply/upload/download/publication/production-write flags must remain closed in P43 hold.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const closedEvidenceReady = blockers === 0;

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      holdState: closedEvidenceReady ? 'production_activation_hold_exact_approval_required' : 'blocked_by_findings',
      productionActivationHold: true,
      exactApprovalRequired: true,
      nextPassP43: input.nextPassP43,
      closedEvidenceReady,
      officialSourceCoverageReady: input.officialSourceCoverageReady,
      contentRowsAccepted: input.contentRowsAccepted,
      aiDecisionsAccepted: input.aiDecisionsAccepted,
      languageIsolationReady: input.languageIsolationReady,
      promptContractsWithTargetLocale: input.promptContractsWithTargetLocale,
      promptEntrypointsExpected: input.promptEntrypointsExpected,
      closedPayloadReady: input.closedPayloadReady,
      payloadSlices: input.payloadSlices,
      payloadEntries: input.payloadEntries,
      serverPreflightReady: input.serverPreflightReady,
      serverManifestEntries: input.serverManifestEntries,
      adminRuntimePreflightReady: input.adminRuntimePreflightReady,
      runtimePlanReady: input.runtimePlanReady,
      approvalRequestPresented: input.approvalRequestPresented,
      plainContinueRejected: input.plainContinueRejected,
      exactApprovalSentencePresent: input.exactApprovalSentencePresent,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists,
      productionApplyDenied: input.productionApplyDenied,
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
      readyForProductionActivationApply: false,
      readyForExactApprovalValidation: false,
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
  const tests: Array<{ id: string; expectedSafe: boolean; mutate: (input: EvaluationInput) => void }> = [
    { id: 'current_hold_is_safe', expectedSafe: true, mutate: () => undefined },
    { id: 'missing_p43_or_p44_next_is_rejected', expectedSafe: false, mutate: (input) => { input.nextPassP43 = false; } },
    { id: 'active_approval_receipt_is_rejected', expectedSafe: false, mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'exact_approval_sentence_in_hold_is_rejected', expectedSafe: false, mutate: (input) => { input.exactApprovalSentencePresent = true; } },
    { id: 'ready_for_apply_is_rejected', expectedSafe: false, mutate: (input) => { input.targetManifestReadyForApply = true; } },
    { id: 'server_upload_is_rejected', expectedSafe: false, mutate: (input) => { input.serverUploadAllowed = true; } },
    { id: 'runtime_downloads_are_rejected', expectedSafe: false, mutate: (input) => { input.runtimeDownloadsEnabled = true; } },
    { id: 'missing_language_isolation_is_rejected', expectedSafe: false, mutate: (input) => { input.languageIsolationReady = false; } },
    { id: 'missing_payload_slice_is_rejected', expectedSafe: false, mutate: (input) => { input.payloadSlices = 11; } },
  ];
  return tests.map((test) => {
    const input = clone(base);
    test.mutate(input);
    const result = evaluate(input).evaluation;
    const safe = result.blockers === 0 && result.holdState === 'production_activation_hold_exact_approval_required';
    return {
      id: test.id,
      expectedSafe: test.expectedSafe,
      safe,
      blockers: result.blockers,
      passed: safe === test.expectedSafe,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Production Activation Hold Exact Approval Required V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Hold state: \`${report.summary.holdState}\``,
    `- Closed evidence ready: ${report.summary.closedEvidenceReady ? 'yes' : 'no'}`,
    `- Next pass activation-hold safe chain: ${report.summary.nextPassP43 ? 'yes' : 'no'}`,
    `- Official-source rows/AI: ${report.summary.contentRowsAccepted}/1600, ${report.summary.aiDecisionsAccepted}/current-full-set`,
    `- Language prompt contracts: ${report.summary.promptContractsWithTargetLocale}/${report.summary.promptEntrypointsExpected}`,
    `- Payload slices/entries: ${report.summary.payloadSlices}/12, ${report.summary.payloadEntries}`,
    `- Server manifest entries: ${report.summary.serverManifestEntries}/12`,
    `- Approval request presented: ${report.summary.approvalRequestPresented ? 'yes' : 'no'}`,
    `- Plain continue rejected: ${report.summary.plainContinueRejected ? 'yes' : 'no'}`,
    `- Exact approval sentence present: ${report.summary.exactApprovalSentencePresent ? 'yes' : 'no'}`,
    `- Active approval receipt/hash lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Production apply denied: ${report.summary.productionApplyDenied ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Active Approval Paths',
    '',
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
  lines.push('- This packet does not modify production app files.');
  lines.push('- It does not import reviewer decisions, create approval receipts, create active hash locks, publish server manifests, upload to Firebase/server, enable runtime downloads, start storage/cloud migration or approve production apply.');
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
  const reviewerDir = path.join(runDir, 'generated/fr/reviewer');
  const packDir = path.join(runDir, 'pack_candidates/fr');
  const applyPlanDir = path.join(runDir, 'apply_plan');

  const nextPath = path.join(auditsDir, 'next_pass_goal_contract_packet.json');
  const masterPath = path.join(reviewerDir, 'french_reviewer_master_manifest.json');
  const coveragePath = path.join(auditsDir, 'french_official_source_content_coverage_v2_packet.json');
  const languagePath = path.join(auditsDir, 'language_isolation_regression_recheck_v2_packet.json');
  const payloadPath = path.join(auditsDir, 'closed_local_payload_materialization_v2_packet.json');
  const serverPreflightPath = path.join(auditsDir, 'server_delivery_publish_preflight_v2_packet.json');
  const adminRuntimePath = path.join(auditsDir, 'admin_server_delivery_runtime_preflight_v2_packet.json');
  const runtimePlanPath = path.join(auditsDir, 'runtime_activation_blocker_plan_v2_packet.json');
  const approvalRequestPath = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const receiptCreationPath = path.join(auditsDir, 'explicit_approval_receipt_creation_gate_v2_packet.json');
  const applyDenialPath = path.join(auditsDir, 'production_apply_absence_denial_gate_v2_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const outputJsonPath = path.join(auditsDir, 'production_activation_hold_exact_approval_required_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'production_activation_hold_exact_approval_required_v2_packet.md');

  const next = readJsonOrEmpty(nextPath);
  const master = readJsonOrEmpty(masterPath);
  const coverage = readJsonOrEmpty(coveragePath);
  const language = readJsonOrEmpty(languagePath);
  const payload = readJsonOrEmpty(payloadPath);
  const serverPreflight = readJsonOrEmpty(serverPreflightPath);
  const adminRuntime = readJsonOrEmpty(adminRuntimePath);
  const runtimePlan = readJsonOrEmpty(runtimePlanPath);
  const approvalRequest = readJsonOrEmpty(approvalRequestPath);
  const receiptCreation = readJsonOrEmpty(receiptCreationPath);
  const applyDenial = readJsonOrEmpty(applyDenialPath);
  const targetManifest = readJsonOrEmpty(targetManifestPath);
  const serverManifest = readJsonOrEmpty(serverManifestPath);

  const nextSummary = summaryOf(next);
  const masterSummary = summaryOf(master);
  const coverageSummary = summaryOf(coverage);
  const languageSummary = summaryOf(language);
  const payloadSummary = summaryOf(payload);
  const serverPreflightSummary = summaryOf(serverPreflight);
  const adminRuntimeSummary = summaryOf(adminRuntime);
  const runtimePlanSummary = summaryOf(runtimePlan);
  const approvalRequestSummary = summaryOf(approvalRequest);
  const receiptCreationSummary = summaryOf(receiptCreation);
  const applyDenialSummary = summaryOf(applyDenial);
  const targetActivation = object(targetManifest.activation);
  const nextGoalId = s(object(arr(next, 'nextPassGoals')[0]), 'id');
  const masterActionableBlockers = arr(master, 'findings')
    .filter((finding) => s(object(finding), 'severity') === 'blocker')
    .filter((finding) => {
      const code = s(object(finding), 'code');
      return (
        !MASTER_SELF_CYCLE_BLOCKERS.has(code) &&
        !code.startsWith('nonproduction_blocker_closure_plan_v2_') &&
        !code.startsWith('exact_approval_') &&
        !code.startsWith('french_server_object_remote_verify_v2_') &&
        !code.startsWith('runtime_delivery_evidence_chain_v2_') &&
        !code.startsWith('activation_approval_request_presentation_v2_') &&
        !code.startsWith('explicit_approval_receipt_hash_lock_gate_v2_') &&
        !code.startsWith('explicit_approval_receipt_creation_gate_v2_') &&
        !code.startsWith('production_readiness_completion_audit_v2_') &&
        !code.startsWith('final_preapproval_evidence_hash_lock_v2_') &&
        !code.startsWith('production_activation_sequence_preflight_v2_') &&
        !code.startsWith('production_apply_transaction_contract_v2_') &&
        !code.startsWith('post_apply_rollback_guard_contract_v2_')
      );
    })
    .length;

  const input: EvaluationInput = {
    nextPassP43: ACTIVATION_HOLD_REPLAY_SAFE_GOALS.has(nextGoalId),
    nextPassBlockers: n(nextSummary, 'blockers'),
    masterBlockers: masterActionableBlockers,
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    officialSourceCoverageReady:
      s(coverage, 'status') === 'PASS' &&
      s(coverageSummary, 'coverageState') === 'official_source_content_coverage_complete_no_import' &&
      b(coverageSummary, 'readyForReviewerDecisionImportDryRunRefresh') &&
      n(coverageSummary, 'blockers') === 0,
    contentRowsAccepted: n(coverageSummary, 'acceptedRowOfficialSourceDecisionRows'),
    aiDecisionsAccepted: n(coverageSummary, 'acceptedAiOfficialSourceDecisionRows'),
    languageIsolationReady:
      s(language, 'status') === 'PASS' &&
      s(languageSummary, 'languageIsolationRegressionRecheckState') === 'language_isolation_regression_recheck_ready' &&
      n(languageSummary, 'blockers') === 0,
    promptContractsWithTargetLocale: n(languageSummary, 'promptContractsWithTargetLocale'),
    promptEntrypointsExpected: n(languageSummary, 'promptEntrypointsExpected'),
    closedPayloadReady:
      s(payload, 'status') === 'PASS' &&
      s(payloadSummary, 'materializationState') === 'local_payload_artifacts_materialized' &&
      b(payloadSummary, 'readyForServerDeliveryPublishPreflightV2') &&
      n(payloadSummary, 'blockers') === 0,
    payloadSlices: n(payloadSummary, 'localSlicePayloadsCreated'),
    payloadEntries: n(payloadSummary, 'payloadEntriesTotal'),
    serverPreflightReady:
      s(serverPreflight, 'status') === 'PASS' &&
      (s(serverPreflightSummary, 'publishPreflightState') === 'local_server_manifest_draft_ready' ||
        s(serverPreflightSummary, 'publishPreflightState') === 'safe_production_manifest_promoted') &&
      b(serverPreflightSummary, 'readyForAdminServerDeliveryReviewV2') &&
      n(serverPreflightSummary, 'blockers') === 0,
    serverManifestEntries: n(serverPreflightSummary, 'manifestEntries'),
    adminRuntimePreflightReady:
      s(adminRuntime, 'status') === 'PASS' &&
      s(adminRuntimeSummary, 'preflightState') === 'admin_server_runtime_preflight_ready' &&
      b(adminRuntimeSummary, 'readyForRuntimeActivationBlockerPlanningV2') &&
      n(adminRuntimeSummary, 'blockers') === 0,
    runtimePlanReady:
      s(runtimePlan, 'status') === 'PASS' &&
      s(runtimePlanSummary, 'planState') === 'runtime_activation_blocker_plan_ready' &&
      b(runtimePlanSummary, 'readyForExplicitApprovalReceiptGateV2') &&
      n(runtimePlanSummary, 'blockers') === 0,
    approvalRequestPresented:
      s(approvalRequest, 'status') === 'PASS' &&
      s(approvalRequestSummary, 'requestState') === 'approval_request_presented' &&
      b(approvalRequestSummary, 'readyForExplicitApprovalReceiptCreationGateV2'),
    plainContinueRejected: b(receiptCreationSummary, 'plainContinueRejected'),
    exactApprovalSentencePresent: b(receiptCreationSummary, 'exactApprovalSentencePresent'),
    approvalReceiptCreatedByP31: b(receiptCreationSummary, 'activeApprovalReceiptCreated'),
    activeHashLockCreatedByP31: b(receiptCreationSummary, 'activeHashLockCreated'),
    productionApplyDenied: b(applyDenialSummary, 'productionApplyDenied'),
    activeApprovalReceiptExists: fs.existsSync(activeApprovalReceiptPath),
    activeHashLockExists: fs.existsSync(activeHashLockPath),
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
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
  }
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-production-activation-hold-exact-approval-required-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      nextPassGoalContractPacket: rel(repoRoot, nextPath),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
      officialSourceContentCoverageV2Packet: rel(repoRoot, coveragePath),
      languageIsolationRegressionRecheckV2Packet: rel(repoRoot, languagePath),
      closedLocalPayloadMaterializationV2Packet: rel(repoRoot, payloadPath),
      serverDeliveryPublishPreflightV2Packet: rel(repoRoot, serverPreflightPath),
      adminServerDeliveryRuntimePreflightV2Packet: rel(repoRoot, adminRuntimePath),
      runtimeActivationBlockerPlanV2Packet: rel(repoRoot, runtimePlanPath),
      activationApprovalRequestPresentationV2Packet: rel(repoRoot, approvalRequestPath),
      explicitApprovalReceiptCreationGateV2Packet: rel(repoRoot, receiptCreationPath),
      productionApplyAbsenceDenialGateV2Packet: rel(repoRoot, applyDenialPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
    },
    summary: {
      ...evaluation,
      holdState: blockers > 0 ? 'blocked_by_findings' : evaluation.holdState,
      closedEvidenceReady: blockers === 0 && evaluation.closedEvidenceReady,
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

  console.log(`GUSTAV production activation hold exact approval required V2 packet: ${report.status}`);
  console.log(`Hold state: ${report.summary.holdState}`);
  console.log(`Closed evidence ready: ${report.summary.closedEvidenceReady ? 'yes' : 'no'}`);
  console.log(`Exact approval required: ${report.summary.exactApprovalRequired ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
