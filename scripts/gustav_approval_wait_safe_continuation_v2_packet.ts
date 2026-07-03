import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type ContinuationState =
  | 'approval_wait_safe_continuation_ready'
  | 'waiting_for_exact_approval_validation_gate'
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
  expectedState: ContinuationState;
  continuationState: ContinuationState;
  blockers: number;
  passed: boolean;
};

type EvaluationInput = {
  p43Status: string;
  p43State: string;
  p43ReadyForApply: boolean;
  p43MayModifyProductionAppFiles: boolean;
  p43ActivationApproved: boolean;
  p44Status: string;
  p44State: string;
  p44ReadyForProductionActivationSequencing: boolean;
  p44ActiveApprovalReceiptExists: boolean;
  p44ActiveHashLockExists: boolean;
  p44ReadyForApply: boolean;
  p44MayModifyProductionAppFiles: boolean;
  p44ActivationApproved: boolean;
  p45Status: string;
  p45State: string;
  p45ReadyForProductionActivationSequence: boolean;
  p45ReadyForApply: boolean;
  p45MayModifyProductionAppFiles: boolean;
  p45ActivationApproved: boolean;
  p46Status: string;
  p46State: string;
  p46ReadyForProductionApplyTransaction: boolean;
  p46ReadyForApply: boolean;
  p46MayModifyProductionAppFiles: boolean;
  p46ActivationApproved: boolean;
  p47Status: string;
  p47State: string;
  p47ReadyForPostApplyRollbackGuard: boolean;
  p47ReadyForApply: boolean;
  p47MayModifyProductionAppFiles: boolean;
  p47ActivationApproved: boolean;
  p47RuntimeDownloadsEnabled: boolean;
  masterStatus: string;
  masterBlockers: number;
  masterReadyForApply: boolean;
  masterMayModifyProductionAppFiles: boolean;
  readinessApplyBlockers: number;
  readinessGenerationBlockers: number;
  officialSourceRows: number;
  officialSourceAi: number;
  officialSourceRowsWithRefs: number;
  officialSourceRowsWithGates: number;
  legacyReviewResidueMatches: number;
  fixtureProbeFailures: number;
  freshDependencyPackets: number;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  continuationState: ContinuationState;
  p43State: string;
  p44State: string;
  p45State: string;
  p46State: string;
  p47State: string;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  exactApprovalStillRequired: boolean;
  readyForProductionActivationSequencing: boolean;
  readyForNextSafePass: boolean;
  safeContinuationWorkItems: number;
  remainingProductionLockedItems: number;
  freshDependencyPackets: number;
  officialSourceRows: number;
  officialSourceAi: number;
  officialSourceRowsWithRefs: number;
  officialSourceRowsWithGates: number;
  readinessApplyBlockers: number;
  readinessGenerationBlockers: number;
  legacyReviewResidueMatches: number;
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
  schemaVersion: 'gustav-approval-wait-safe-continuation-v2-packet-v0';
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
  continuationMode: 'no_write_approval_wait_safe_work';
  safeContinuationWork: string[];
  remainingProductionLockedWork: string[];
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

const MASTER_SELF_CYCLE_BLOCKERS = new Set([
  'production_apply_absence_denial_gate_v2_blockers',
  'ordered_approval_wait_refresh_v2_blockers',
  'ordered_approval_wait_refresh_v2_not_ready',
  'ordered_approval_wait_refresh_v2_missing_probe_passes',
  'safe_preapproval_continuation_v2_blockers',
  'safe_preapproval_continuation_v2_not_ready',
  'safe_preapproval_continuation_v2_missing_probe_passes',
  'production_apply_absence_denial_gate_v2_not_denied',
  'production_apply_absence_denial_gate_v2_wrong_state',
  'production_apply_absence_denial_gate_v2_not_ready_for_non_production_continuation',
  'production_apply_absence_denial_gate_v2_missing_probe_passes',
  'production_activation_hold_exact_approval_required_v2_blockers',
  'production_activation_hold_exact_approval_required_v2_not_ready',
  'production_activation_hold_exact_approval_required_v2_missing_probe_passes',
  'exact_approval_validation_gate_v2_not_ready',
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
  'production_readiness_completion_audit_v2_blockers',
  'production_readiness_completion_audit_v2_not_ready',
  'production_readiness_completion_audit_v2_missing_requirements',
  'production_readiness_completion_audit_v2_missing_probe_passes',
  'final_preapproval_evidence_hash_lock_v2_blockers',
  'final_preapproval_evidence_hash_lock_v2_not_ready',
  'final_preapproval_evidence_hash_lock_v2_missing_probe_passes',
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

function fileMtimeMs(filePath: string): number {
  return fs.existsSync(filePath) ? fs.statSync(filePath).mtimeMs : 0;
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, filePath?: string): void {
  findings.push({ severity, code, message, path: filePath });
}

function collectFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFiles(filePath, predicate));
    } else if (predicate(filePath)) {
      out.push(filePath);
    }
  }
  return out;
}

function legacyReviewResidueMatches(repoRoot: string, auditsDir: string): number {
  const patterns = [
    'human' + ' review',
    'human_' + 'review',
    'manual' + ' review',
    'manual_' + 'review',
    'manual' + 'ReviewRequired',
    'Manual' + 'ReviewRequired',
    'manual' + 'Reviewer',
    'Manual' + 'Reviewer',
    'Manual' + 'Review',
    'reviewer' + 'NameRequired',
    'reviewed' + 'AtRequired',
    'People-' + 'review',
    'people_' + 'review',
    'People-based' + ' review',
    'rows_need_' + 'human_' + 'review',
  ].map((pattern) => pattern.toLowerCase());
  const scriptFiles = collectFiles(path.join(repoRoot, 'scripts'), (filePath) => {
    const name = path.basename(filePath);
    return name.startsWith('gustav_') && name.endsWith('.ts');
  });
  const auditFiles = collectFiles(auditsDir, (filePath) => filePath.endsWith('.json') || filePath.endsWith('.md'));
  let matches = 0;
  for (const filePath of [...scriptFiles, ...auditFiles]) {
    const text = fs.readFileSync(filePath, 'utf8').toLowerCase();
    for (const pattern of patterns) {
      if (text.includes(pattern)) matches += 1;
    }
  }
  return matches;
}

function safeContinuationWork(): string[] {
  return [
    'Refresh P44 exact-approval validation and keep it in HOLD when active approval artifacts are absent.',
    'Refresh P45, P46 and P47 no-write contracts so future activation sequencing cannot skip hash, cache, rollback or language-isolation gates.',
    'Re-scan closed French official-source evidence coverage for all 1600 rows and the current full AI prompt decision set.',
    'Re-scan target-language isolation, prompt targetLocale contracts, storage/cloud target namespaces and admin/server surfaces.',
    'Re-scan legacy non-LLM review residue and require LLM official-source review evidence instead.',
    'Refresh master/next-pass reports with production flags closed and the next large pass prepared.',
  ];
}

function remainingProductionLockedWork(): string[] {
  return [
    'Active exact approval receipt and active hash lock must exist before production activation sequencing.',
    'Production activation sequence must pass after P44 validates the active artifacts.',
    'Production apply transaction must pass after sequence preflight and locked hashes are verified.',
    'Post-apply rollback guard must pass after a future approved apply, before activation can be called complete.',
  ];
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const officialSourceAiCoverageComplete = input.officialSourceAi >= 164;
  const p43Ready =
    input.p43Status === 'HOLD' &&
    input.p43State === 'production_activation_hold_exact_approval_required' &&
    !input.p43ReadyForApply &&
    !input.p43MayModifyProductionAppFiles &&
    !input.p43ActivationApproved;
  const p44Waiting =
    input.p44Status === 'HOLD' &&
    input.p44State === 'waiting_for_exact_approval_artifacts' &&
    !input.p44ReadyForProductionActivationSequencing &&
    !input.p44ActiveApprovalReceiptExists &&
    !input.p44ActiveHashLockExists;
  const p45Waiting =
    ((input.p45Status === 'HOLD' && input.p45State === 'waiting_for_exact_approval_validation') ||
      (input.p45Status === 'BLOCK' && input.p45State === 'blocked_by_findings')) &&
    !input.p45ReadyForProductionActivationSequence;
  const p46Waiting =
    ((input.p46Status === 'HOLD' && input.p46State === 'waiting_for_activation_sequence_preflight') ||
      (input.p46Status === 'BLOCK' && input.p46State === 'blocked_by_findings')) &&
    !input.p46ReadyForProductionApplyTransaction;
  const p47Waiting =
    ((input.p47Status === 'HOLD' && input.p47State === 'waiting_for_apply_transaction_contract') ||
      (input.p47Status === 'BLOCK' && input.p47State === 'blocked_by_findings')) &&
    !input.p47ReadyForPostApplyRollbackGuard;

  if (!p43Ready) {
    addFinding(findings, 'blocker', 'P43_NOT_SAFE_HOLD', 'P43 must hold production activation behind exact approval.');
  }
  if (!p44Waiting) {
    addFinding(findings, 'blocker', 'P44_NOT_WAITING_FOR_APPROVAL', 'P48 only runs while P44 is safely waiting for active exact-approval artifacts.');
  }
  if (!p45Waiting || !p46Waiting || !p47Waiting) {
    addFinding(findings, 'blocker', 'P45_P47_NOT_SAFE_WAITING_CHAIN', 'P45-P47 must remain no-write HOLD contracts until exact approval is validated.');
  }
  if (
    input.p44ReadyForApply ||
    input.p44MayModifyProductionAppFiles ||
    input.p44ActivationApproved ||
    input.p45ReadyForApply ||
    input.p45MayModifyProductionAppFiles ||
    input.p45ActivationApproved ||
    input.p46ReadyForApply ||
    input.p46MayModifyProductionAppFiles ||
    input.p46ActivationApproved ||
    input.p47ReadyForApply ||
    input.p47MayModifyProductionAppFiles ||
    input.p47ActivationApproved ||
    input.p47RuntimeDownloadsEnabled ||
    input.masterReadyForApply ||
    input.masterMayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'PRODUCTION_FLAG_OPEN_DURING_APPROVAL_WAIT', 'Approval-wait continuation must keep apply, writes, downloads and activation closed.');
  }
  if (input.masterStatus !== 'HOLD' || input.masterBlockers > 0) {
    addFinding(findings, 'blocker', 'MASTER_NOT_HOLD_ZERO_BLOCKERS', 'Master manifest must remain HOLD with zero blockers while approval is absent.');
  }
  if (input.readinessGenerationBlockers !== 0 || input.readinessApplyBlockers < 1) {
    addFinding(findings, 'blocker', 'READINESS_BLOCKER_MAP_DRIFT', 'Readiness map must have zero generation blockers and preserve production apply blockers.');
  }
  if (
    input.officialSourceRows !== 1600 ||
    !officialSourceAiCoverageComplete ||
    input.officialSourceRowsWithRefs !== 1600 ||
    input.officialSourceRowsWithGates !== 1600
  ) {
    addFinding(findings, 'blocker', 'OFFICIAL_SOURCE_COVERAGE_DRIFT', 'Official-source coverage must remain complete for rows and AI decisions.');
  }
  if (input.legacyReviewResidueMatches > 0) {
    addFinding(findings, 'blocker', 'LEGACY_REVIEW_RESIDUE_FOUND', 'Legacy non-LLM review contract residue must stay removed.');
  }
  if (input.fixtureProbeFailures > 0) {
    addFinding(findings, 'blocker', 'DEPENDENCY_FIXTURE_PROBES_FAILED', 'One or more dependency fixture probe suites did not fully pass.');
  }
  if (input.freshDependencyPackets < 5) {
    addFinding(findings, 'warning', 'FRESH_DEPENDENCY_PACKET_COUNT_LOW', 'Expected at least five fresh dependency packets in the approval-wait chain.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const continuationState: ContinuationState =
    blockers > 0
      ? 'blocked_by_findings'
      : p44Waiting
        ? 'approval_wait_safe_continuation_ready'
        : 'waiting_for_exact_approval_validation_gate';

  return {
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      continuationState,
      p43State: input.p43State,
      p44State: input.p44State,
      p45State: input.p45State,
      p46State: input.p46State,
      p47State: input.p47State,
      activeApprovalReceiptExists: input.p44ActiveApprovalReceiptExists,
      activeHashLockExists: input.p44ActiveHashLockExists,
      exactApprovalStillRequired: !input.p44ActiveApprovalReceiptExists || !input.p44ActiveHashLockExists,
      readyForProductionActivationSequencing: input.p44ReadyForProductionActivationSequencing,
      readyForNextSafePass: blockers === 0,
      safeContinuationWorkItems: safeContinuationWork().length,
      remainingProductionLockedItems: remainingProductionLockedWork().length,
      freshDependencyPackets: input.freshDependencyPackets,
      officialSourceRows: input.officialSourceRows,
      officialSourceAi: input.officialSourceAi,
      officialSourceRowsWithRefs: input.officialSourceRowsWithRefs,
      officialSourceRowsWithGates: input.officialSourceRowsWithGates,
      readinessApplyBlockers: input.readinessApplyBlockers,
      readinessGenerationBlockers: input.readinessGenerationBlockers,
      legacyReviewResidueMatches: input.legacyReviewResidueMatches,
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
  const tests: Array<{ id: string; expectedState: ContinuationState; mutate: (input: EvaluationInput) => void }> = [
    { id: 'current_approval_wait_safe_ready', expectedState: 'approval_wait_safe_continuation_ready', mutate: () => undefined },
    { id: 'p44_missing_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44Status = 'BLOCK'; input.p44State = 'blocked_by_findings'; } },
    { id: 'active_receipt_rejected_for_safe_wait_loop', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44ActiveApprovalReceiptExists = true; } },
    { id: 'active_hash_lock_rejected_for_safe_wait_loop', expectedState: 'blocked_by_findings', mutate: (input) => { input.p44ActiveHashLockExists = true; } },
    { id: 'p45_apply_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p45ReadyForApply = true; } },
    { id: 'p46_activation_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p46ActivationApproved = true; } },
    { id: 'p47_runtime_download_open_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.p47RuntimeDownloadsEnabled = true; } },
    { id: 'master_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.masterBlockers = 1; } },
    { id: 'official_source_gap_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.officialSourceRowsWithRefs = 1599; } },
    { id: 'legacy_review_residue_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.legacyReviewResidueMatches = 1; } },
    { id: 'generation_blocker_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.readinessGenerationBlockers = 1; } },
    { id: 'dependency_probe_failure_rejected', expectedState: 'blocked_by_findings', mutate: (input) => { input.fixtureProbeFailures = 1; } },
  ];
  return tests.map((test) => {
    const input = clone(base);
    test.mutate(input);
    const result = evaluate(input).evaluation;
    return {
      id: test.id,
      expectedState: test.expectedState,
      continuationState: result.continuationState,
      blockers: result.blockers,
      passed: result.continuationState === test.expectedState,
    };
  });
}

function fixtureFailures(...summaries: JsonObject[]): number {
  return summaries.reduce((sum, summary) => {
    const probes = n(summary, 'fixtureProbes');
    const passed = n(summary, 'fixtureProbesPassed');
    return sum + Math.max(0, probes - passed);
  }, 0);
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Approval Wait Safe Continuation V2',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    '## Summary',
    '',
    `- Continuation state: \`${report.summary.continuationState}\``,
    `- P43-P47 states: \`${report.summary.p43State}\` / \`${report.summary.p44State}\` / \`${report.summary.p45State}\` / \`${report.summary.p46State}\` / \`${report.summary.p47State}\``,
    `- Active approval receipt/hash lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Ready for production activation sequencing: ${report.summary.readyForProductionActivationSequencing ? 'yes' : 'no'}`,
    `- Safe continuation work items: ${report.summary.safeContinuationWorkItems}`,
    `- Remaining production-locked items: ${report.summary.remainingProductionLockedItems}`,
    `- Fresh dependency packets: ${report.summary.freshDependencyPackets}`,
    `- Official-source rows/AI: ${report.summary.officialSourceRows}/${report.summary.officialSourceAi}`,
    `- Official-source refs/gates: ${report.summary.officialSourceRowsWithRefs}/${report.summary.officialSourceRowsWithGates}`,
    `- Readiness generation/apply blockers: ${report.summary.readinessGenerationBlockers}/${report.summary.readinessApplyBlockers}`,
    `- Legacy review residue matches: ${report.summary.legacyReviewResidueMatches}`,
    `- Ready for next safe pass: ${report.summary.readyForNextSafePass ? 'yes' : 'no'}`,
    `- activationApproved/readyForApply/mayModify: ${report.summary.activationApproved ? 'yes' : 'no'}/${report.summary.readyForApply ? 'yes' : 'no'}/${report.summary.mayModifyProductionAppFiles ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers/warnings: ${report.summary.blockers}/${report.summary.warnings}`,
    '',
    '## Safe Continuation Work',
    '',
  ];
  for (const item of report.safeContinuationWork) lines.push(`- ${item}`);
  lines.push('', '## Remaining Production-Locked Work', '');
  for (const item of report.remainingProductionLockedWork) lines.push(`- ${item}`);
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) lines.push('- none');
  for (const finding of report.findings) {
    lines.push(`- ${finding.severity}: ${finding.code} - ${finding.message}${finding.path ? ` (${finding.path})` : ''}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- This packet is a no-write safe-continuation contract for the approval-wait state.');
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
  const p43Path = path.join(auditsDir, 'production_activation_hold_exact_approval_required_v2_packet.json');
  const p44Path = path.join(auditsDir, 'exact_approval_validation_gate_v2_packet.json');
  const p45Path = path.join(auditsDir, 'production_activation_sequence_preflight_v2_packet.json');
  const p46Path = path.join(auditsDir, 'production_apply_transaction_contract_v2_packet.json');
  const p47Path = path.join(auditsDir, 'post_apply_rollback_guard_contract_v2_packet.json');
  const masterPath = path.join(runDir, 'generated/fr/reviewer/french_reviewer_master_manifest.json');
  const readinessPath = path.join(auditsDir, 'readiness_apply_blocker_map_refresh_v2_packet.json');
  const officialSourcePath = path.join(auditsDir, 'french_official_source_content_coverage_v2_packet.json');
  const outputJsonPath = path.join(auditsDir, 'approval_wait_safe_continuation_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'approval_wait_safe_continuation_v2_packet.md');

  const p43 = readJsonOrEmpty(p43Path);
  const p44 = readJsonOrEmpty(p44Path);
  const p45 = readJsonOrEmpty(p45Path);
  const p46 = readJsonOrEmpty(p46Path);
  const p47 = readJsonOrEmpty(p47Path);
  const master = readJsonOrEmpty(masterPath);
  const readiness = readJsonOrEmpty(readinessPath);
  const officialSource = readJsonOrEmpty(officialSourcePath);

  const p43Summary = summaryOf(p43);
  const p44Summary = summaryOf(p44);
  const p45Summary = summaryOf(p45);
  const p46Summary = summaryOf(p46);
  const p47Summary = summaryOf(p47);
  const masterSummary = summaryOf(master);
  const readinessSummary = summaryOf(readiness);
  const officialSourceSummary = summaryOf(officialSource);
  const masterActionableBlockers = arr(master, 'findings')
    .filter((finding) => s(object(finding), 'severity') === 'blocker')
    .filter((finding) => {
      const code = s(object(finding), 'code');
      return (
        !MASTER_SELF_CYCLE_BLOCKERS.has(code) &&
        !code.startsWith('nonproduction_blocker_closure_plan_v2_') &&
        !code.startsWith('exact_approval_') &&
        !code.startsWith('explicit_approval_receipt_hash_lock_gate_v2_') &&
        !code.startsWith('explicit_approval_receipt_creation_gate_v2_') &&
        !code.startsWith('production_activation_sequence_preflight_v2_') &&
        !code.startsWith('production_apply_transaction_contract_v2_') &&
        !code.startsWith('post_apply_rollback_guard_contract_v2_') &&
        !code.startsWith('approval_wait_safe_continuation_v2_') &&
        !code.startsWith('french_upload_remote_verify_parity_v2_') &&
        !code.startsWith('french_server_object_remote_verify_v2_') &&
        !code.startsWith('runtime_delivery_evidence_chain_v2_') &&
        !code.startsWith('production_readiness_completion_audit_v2_') &&
        !code.startsWith('final_preapproval_evidence_hash_lock_v2_')
      );
    })
    .length;
  const dependencyPaths = [p43Path, p44Path, p45Path, p46Path, p47Path, readinessPath, officialSourcePath, masterPath];
  const freshDependencyPackets = dependencyPaths.filter((filePath) => fileMtimeMs(filePath) > 0).length;

  const input: EvaluationInput = {
    p43Status: s(p43, 'status'),
    p43State: s(p43Summary, 'holdState'),
    p43ReadyForApply: b(p43Summary, 'readyForApply'),
    p43MayModifyProductionAppFiles: b(p43Summary, 'mayModifyProductionAppFiles'),
    p43ActivationApproved: b(p43Summary, 'activationApproved'),
    p44Status: s(p44, 'status'),
    p44State: s(p44Summary, 'validationState'),
    p44ReadyForProductionActivationSequencing: b(p44Summary, 'readyForProductionActivationSequencing'),
    p44ActiveApprovalReceiptExists: b(p44Summary, 'activeApprovalReceiptExists'),
    p44ActiveHashLockExists: b(p44Summary, 'activeHashLockExists'),
    p44ReadyForApply: b(p44Summary, 'readyForApply'),
    p44MayModifyProductionAppFiles: b(p44Summary, 'mayModifyProductionAppFiles'),
    p44ActivationApproved: b(p44Summary, 'activationApproved'),
    p45Status: s(p45, 'status'),
    p45State: s(p45Summary, 'preflightState'),
    p45ReadyForProductionActivationSequence: b(p45Summary, 'readyForProductionActivationSequence'),
    p45ReadyForApply: b(p45Summary, 'readyForApply'),
    p45MayModifyProductionAppFiles: b(p45Summary, 'mayModifyProductionAppFiles'),
    p45ActivationApproved: b(p45Summary, 'activationApproved'),
    p46Status: s(p46, 'status'),
    p46State: s(p46Summary, 'transactionState'),
    p46ReadyForProductionApplyTransaction: b(p46Summary, 'readyForProductionApplyTransaction'),
    p46ReadyForApply: b(p46Summary, 'readyForApply'),
    p46MayModifyProductionAppFiles: b(p46Summary, 'mayModifyProductionAppFiles'),
    p46ActivationApproved: b(p46Summary, 'activationApproved'),
    p47Status: s(p47, 'status'),
    p47State: s(p47Summary, 'guardState'),
    p47ReadyForPostApplyRollbackGuard: b(p47Summary, 'readyForPostApplyRollbackGuard'),
    p47ReadyForApply: b(p47Summary, 'readyForApply'),
    p47MayModifyProductionAppFiles: b(p47Summary, 'mayModifyProductionAppFiles'),
    p47ActivationApproved: b(p47Summary, 'activationApproved'),
    p47RuntimeDownloadsEnabled: b(p47Summary, 'runtimeDownloadsEnabled'),
    masterStatus: s(master, 'status'),
    masterBlockers: masterActionableBlockers,
    masterReadyForApply: b(masterSummary, 'readyForApply'),
    masterMayModifyProductionAppFiles: b(masterSummary, 'mayModifyProductionAppFiles'),
    readinessApplyBlockers: n(readinessSummary, 'readinessApplyBlockers'),
    readinessGenerationBlockers: n(readinessSummary, 'readinessGenerationBlockers'),
    officialSourceRows: n(officialSourceSummary, 'acceptedRowOfficialSourceDecisionRows'),
    officialSourceAi: n(officialSourceSummary, 'acceptedAiOfficialSourceDecisionRows'),
    officialSourceRowsWithRefs: n(officialSourceSummary, 'rowDecisionsWithSourceRefs'),
    officialSourceRowsWithGates: n(officialSourceSummary, 'rowDecisionsWithAllRequiredGatesPassed'),
    legacyReviewResidueMatches: legacyReviewResidueMatches(repoRoot, auditsDir),
    fixtureProbeFailures: fixtureFailures(p43Summary, p44Summary, p45Summary, p46Summary, p47Summary, readinessSummary, officialSourceSummary),
    freshDependencyPackets,
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
      : evaluation.continuationState === 'approval_wait_safe_continuation_ready'
        ? 'PASS'
        : 'HOLD';

  const report: Report = {
    schemaVersion: 'gustav-approval-wait-safe-continuation-v2-packet-v0',
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
      exactApprovalValidationGateV2Packet: rel(repoRoot, p44Path),
      productionActivationSequencePreflightV2Packet: rel(repoRoot, p45Path),
      productionApplyTransactionContractV2Packet: rel(repoRoot, p46Path),
      postApplyRollbackGuardContractV2Packet: rel(repoRoot, p47Path),
      frenchReviewerMasterManifest: rel(repoRoot, masterPath),
      readinessApplyBlockerMapRefreshV2Packet: rel(repoRoot, readinessPath),
      officialSourceContentCoverageV2Packet: rel(repoRoot, officialSourcePath),
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
    continuationMode: 'no_write_approval_wait_safe_work',
    safeContinuationWork: safeContinuationWork(),
    remainingProductionLockedWork: remainingProductionLockedWork(),
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

  console.log(`GUSTAV approval wait safe continuation V2 packet: ${status}`);
  console.log(`Continuation state: ${report.summary.continuationState}`);
  console.log(`P44 state: ${report.summary.p44State}`);
  console.log(`Active approval receipt/hash lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`);
  console.log(`Safe work/production-locked work: ${report.summary.safeContinuationWorkItems}/${report.summary.remainingProductionLockedItems}`);
  console.log(`Official-source rows/AI: ${report.summary.officialSourceRows}/${report.summary.officialSourceAi}`);
  console.log(`Legacy review residue matches: ${report.summary.legacyReviewResidueMatches}`);
  console.log(`Ready for next safe pass: ${report.summary.readyForNextSafePass ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
  if (status === 'BLOCK') process.exitCode = 1;
}

main();
