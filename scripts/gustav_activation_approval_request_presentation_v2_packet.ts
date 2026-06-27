import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type RequestState =
  | 'blocked_by_findings'
  | 'closed_missing_explicit_approval_hash_lock_gate'
  | 'approval_request_presented';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  expectedState: RequestState;
  accepted: boolean;
  requestState: RequestState;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type ActivationBlocker = {
  blockerId: string;
  area: string;
  evidence: string;
  requiredFutureGate: string;
  rollbackRequirement: string;
  plannedTouches: Array<{
    path: string;
    touchType: string;
    futureGate: string;
    rollbackCheck: string;
    productionWriteAllowedNow?: boolean;
  }>;
};

type CriticalArtifact = {
  role: string;
  path: string;
  bytes: number;
  sha256: string;
  requiredForGate: boolean;
};

type EvaluationInput = {
  p28Ready: boolean;
  p28State: string;
  p28Blockers: number;
  p28ReadyForApply: boolean;
  p28MayModifyProductionAppFiles: boolean;
  p29Ready: boolean;
  p29State: string;
  p29Blockers: number;
  p29ReadyForApply: boolean;
  p29MayModifyProductionAppFiles: boolean;
  p29ActiveApprovalReceiptExists: boolean;
  p29ActiveHashLockExists: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
  approvalTemplatePresent: boolean;
  hashLockDryRunPresent: boolean;
  approvalRequestMarkdownWritten: boolean;
  exactApprovalSentenceIncluded: boolean;
  activationBlockerPlanItems: number;
  plannedTouches: number;
  plannedTouchesWithFutureGate: number;
  plannedTouchesWithRollbackCheck: number;
  rollbackRequirements: number;
  criticalHashLocks: number;
  dirtyFiles: number;
  dirtyProductionCandidateFiles: number;
  dirtyWorktreeEvidenceIncluded: boolean;
  readinessGenerationBlockers: number;
  readinessApplyBlockers: number;
  readinessMayModifyProductionAppFiles: boolean;
  targetManifestActivationApproved: boolean;
  targetManifestReadyForApply: boolean;
  targetManifestMayModifyProductionAppFiles: boolean;
  serverManifestEntries: number;
  serverUploadAllowed: boolean;
  firebaseUploadAllowed: boolean;
  runtimeDownloadsEnabled: boolean;
  serverManifestActivationApproved: boolean;
  serverManifestReadyForApply: boolean;
  serverManifestMayModifyProductionAppFiles: boolean;
  approvalRequestHashLinked: boolean;
};

type Evaluation = {
  targetLocale: 'fr';
  sourceLocales: ['ru', 'uk'];
  requestState: RequestState;
  approvalRequestMarkdownWritten: boolean;
  approvalRequestHashLinked: boolean;
  exactApprovalSentenceIncluded: boolean;
  p28Ready: boolean;
  p28State: string;
  p29Ready: boolean;
  p29State: string;
  activationBlockerPlanItems: number;
  plannedTouches: number;
  plannedTouchesWithFutureGate: number;
  plannedTouchesWithRollbackCheck: number;
  rollbackRequirements: number;
  criticalHashLocks: number;
  dirtyFiles: number;
  dirtyProductionCandidateFiles: number;
  dirtyWorktreeEvidenceIncluded: boolean;
  readinessGenerationBlockers: number;
  readinessApplyBlockers: number;
  serverManifestEntries: number;
  approvalTemplatePresent: boolean;
  hashLockDryRunPresent: boolean;
  activeApprovalReceiptExists: boolean;
  activeHashLockExists: boolean;
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
  readyForExplicitApprovalReceiptCreationGateV2: boolean;
  blockers: number;
  warnings: number;
};

type Report = {
  schemaVersion: 'gustav-activation-approval-request-presentation-v2-packet-v0';
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
  approvalRequestEvidence: {
    activationBlockers: ActivationBlocker[];
    criticalArtifacts: CriticalArtifact[];
    dirtyWorktree: {
      dirtyFiles: number;
      dirtyProductionCandidateFiles: number;
    };
    closedProductionFlags: Record<string, false>;
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

function extractBlockerPlan(p28: JsonObject): ActivationBlocker[] {
  const raw = Array.isArray(p28.blockerPlan) ? p28.blockerPlan : [];
  return raw.map((item) => {
    const record = object(item);
    const plannedTouches = Array.isArray(record.plannedTouches) ? record.plannedTouches : [];
    return {
      blockerId: s(record, 'blockerId'),
      area: s(record, 'area'),
      evidence: s(record, 'evidence'),
      requiredFutureGate: s(record, 'requiredFutureGate'),
      rollbackRequirement: s(record, 'rollbackRequirement'),
      plannedTouches: plannedTouches.map((touch) => {
        const touchRecord = object(touch);
        return {
          path: s(touchRecord, 'path'),
          touchType: s(touchRecord, 'touchType'),
          futureGate: s(touchRecord, 'futureGate'),
          rollbackCheck: s(touchRecord, 'rollbackCheck'),
          productionWriteAllowedNow: b(touchRecord, 'productionWriteAllowedNow'),
        };
      }),
    };
  });
}

function extractCriticalArtifacts(p29: JsonObject): CriticalArtifact[] {
  const raw = Array.isArray(p29.criticalArtifacts) ? p29.criticalArtifacts : [];
  return raw.map((item) => {
    const record = object(item);
    return {
      role: s(record, 'role'),
      path: s(record, 'path'),
      bytes: n(record, 'bytes'),
      sha256: s(record, 'sha256'),
      requiredForGate: b(record, 'requiredForGate'),
    };
  });
}

function buildRequiredApprovalSentence(runId: string, repoRelativeHashLockPath: string, repoRelativeP28Path: string): string {
  return `I approve PhraseMan French activation apply for run ${runId} after reviewing ${repoRelativeHashLockPath} and ${repoRelativeP28Path}. I understand this permits only the listed future-gated production changes, keeps studyTarget=fr isolated from sourceLocale/uiLocale/cloud/cache/prompts, and does not allow unlisted writes, uploads, runtime downloads, migrations or activation flags.`;
}

function renderApprovalRequestMarkdown(input: {
  runId: string;
  generatedAt: string;
  requiredApprovalSentence: string;
  p28Path: string;
  p29Path: string;
  hashLockPath: string;
  approvalTemplatePath: string;
  activationBlockers: ActivationBlocker[];
  criticalHashLocks: number;
  dirtyFiles: number;
  dirtyProductionCandidateFiles: number;
  readinessApplyBlockers: number;
}): string {
  const lines = [
    '# French Activation Approval Request V2',
    '',
    'REQUEST PRESENTATION ONLY - NOT APPROVAL.',
    '',
    `Run: ${input.runId}`,
    `Generated at: ${input.generatedAt}`,
    'Target locale: fr',
    'Source locales: ru, uk',
    '',
    'This document presents the exact future approval request. It does not create an active approval receipt, does not create an active hash lock, does not publish server packs, does not enable runtime downloads and does not modify production app files.',
    '',
    '## Required Approval Sentence',
    '',
    'A later active approval receipt must include this exact sentence:',
    '',
    '```text',
    input.requiredApprovalSentence,
    '```',
    '',
    '## Evidence Reviewed By This Request',
    '',
    `- Runtime activation blocker plan: ${input.p28Path}`,
    `- Explicit approval/hash-lock gate: ${input.p29Path}`,
    `- Hash-lock dry run: ${input.hashLockPath}`,
    `- Approval receipt template: ${input.approvalTemplatePath}`,
    `- Critical hash locks: ${input.criticalHashLocks}`,
    `- Dirty worktree files captured: ${input.dirtyFiles}`,
    `- Dirty production-candidate files captured: ${input.dirtyProductionCandidateFiles}`,
    `- Apply blockers still present: ${input.readinessApplyBlockers}`,
    '',
    '## Activation Blockers',
    '',
  ];
  for (const item of input.activationBlockers) {
    lines.push(`- ${item.blockerId}: gate=${item.requiredFutureGate}; rollback=${item.rollbackRequirement}`);
  }
  lines.push(
    '',
    '## Closed Production Flags',
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
    '## Next Gate',
    '',
    'Only a later explicit approval-receipt creation gate may create active approval/hash-lock artifacts, and only if the exact approval sentence above is present. A plain continue/dalshe request is not approval.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function evaluate(input: EvaluationInput): { evaluation: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  if (!input.p28Ready) addFinding(findings, 'blocker', 'P28_NOT_READY', `P28 must be ready, got state=${input.p28State}.`);
  if (input.p28Blockers > 0) addFinding(findings, 'blocker', 'P28_BLOCKERS', `P28 has ${input.p28Blockers} blocker(s).`);
  if (!input.p29Ready) addFinding(findings, 'blocker', 'P29_NOT_READY', `P29 must be ready, got state=${input.p29State}.`);
  if (input.p29Blockers > 0) addFinding(findings, 'blocker', 'P29_BLOCKERS', `P29 has ${input.p29Blockers} blocker(s).`);
  if (!input.approvalTemplatePresent) addFinding(findings, 'blocker', 'APPROVAL_TEMPLATE_MISSING', 'P29 approval template is required.');
  if (!input.hashLockDryRunPresent) addFinding(findings, 'blocker', 'HASH_LOCK_DRY_RUN_MISSING', 'P29 hash-lock dry run is required.');
  if (!input.approvalRequestMarkdownWritten) addFinding(findings, 'blocker', 'APPROVAL_REQUEST_MARKDOWN_MISSING', 'P30 approval request markdown was not written.');
  if (!input.exactApprovalSentenceIncluded) addFinding(findings, 'blocker', 'EXACT_APPROVAL_SENTENCE_MISSING', 'Approval request must include the exact future approval sentence.');
  if (!input.approvalRequestHashLinked) addFinding(findings, 'blocker', 'APPROVAL_REQUEST_HASH_LINK_MISSING', 'Approval request must be hash-linked to P28/P29/hash-lock evidence.');

  if (input.activationBlockerPlanItems < 9) addFinding(findings, 'blocker', 'ACTIVATION_BLOCKER_PLAN_INCOMPLETE', `Expected at least 9 activation blockers, got ${input.activationBlockerPlanItems}.`);
  if (input.plannedTouches < 18) addFinding(findings, 'blocker', 'PLANNED_TOUCHES_INCOMPLETE', `Expected at least 18 planned touches, got ${input.plannedTouches}.`);
  if (input.plannedTouchesWithFutureGate !== input.plannedTouches) addFinding(findings, 'blocker', 'PLANNED_TOUCH_GATE_MISSING', 'Every planned touch must include a future gate.');
  if (input.plannedTouchesWithRollbackCheck !== input.plannedTouches) addFinding(findings, 'blocker', 'PLANNED_TOUCH_ROLLBACK_MISSING', 'Every planned touch must include a rollback check.');
  if (input.rollbackRequirements < input.activationBlockerPlanItems) addFinding(findings, 'blocker', 'ROLLBACK_REQUIREMENTS_INCOMPLETE', 'Every activation blocker must include rollback evidence.');
  if (input.criticalHashLocks < 12) addFinding(findings, 'blocker', 'CRITICAL_HASH_LOCKS_INSUFFICIENT', `Expected at least 12 critical hash locks, got ${input.criticalHashLocks}.`);
  if (!input.dirtyWorktreeEvidenceIncluded) addFinding(findings, 'blocker', 'DIRTY_WORKTREE_EVIDENCE_MISSING', 'Approval request must include dirty-worktree evidence.');
  if (input.serverManifestEntries !== 12) addFinding(findings, 'blocker', 'SERVER_MANIFEST_ENTRY_COUNT_INVALID', `Expected 12 server manifest draft entries, got ${input.serverManifestEntries}.`);

  const forbiddenOpen =
    input.p28ReadyForApply ||
    input.p28MayModifyProductionAppFiles ||
    input.p29ReadyForApply ||
    input.p29MayModifyProductionAppFiles ||
    input.readinessMayModifyProductionAppFiles ||
    input.targetManifestActivationApproved ||
    input.targetManifestReadyForApply ||
    input.targetManifestMayModifyProductionAppFiles ||
    input.serverUploadAllowed ||
    input.firebaseUploadAllowed ||
    input.runtimeDownloadsEnabled ||
    input.serverManifestActivationApproved ||
    input.serverManifestReadyForApply ||
    input.serverManifestMayModifyProductionAppFiles;
  if (forbiddenOpen) addFinding(findings, 'blocker', 'FORBIDDEN_PRODUCTION_FLAG_OPEN', 'At least one production activation/upload/download/apply flag is open.');
  if (input.p29ActiveApprovalReceiptExists || input.activeApprovalReceiptExists) addFinding(findings, 'blocker', 'ACTIVE_APPROVAL_RECEIPT_EXISTS', 'P30 is presentation-only and must not see an active approval receipt.');
  if (input.p29ActiveHashLockExists || input.activeHashLockExists) addFinding(findings, 'blocker', 'ACTIVE_HASH_LOCK_EXISTS', 'P30 is presentation-only and must not see an active hash lock.');
  if (input.readinessGenerationBlockers > 0) addFinding(findings, 'warning', 'GENERATION_BLOCKERS_PRESENT', `${input.readinessGenerationBlockers} generation blocker(s) remain.`);
  if (input.readinessApplyBlockers > 0) addFinding(findings, 'info', 'APPLY_BLOCKERS_REMAIN', `${input.readinessApplyBlockers} apply blocker(s) remain; production apply stays closed.`);

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const accepted = blockers === 0;
  return {
    findings,
    evaluation: {
      targetLocale: 'fr',
      sourceLocales: ['ru', 'uk'],
      requestState: blockers > 0 ? 'blocked_by_findings' : input.p29Ready ? 'approval_request_presented' : 'closed_missing_explicit_approval_hash_lock_gate',
      approvalRequestMarkdownWritten: input.approvalRequestMarkdownWritten,
      approvalRequestHashLinked: input.approvalRequestHashLinked,
      exactApprovalSentenceIncluded: input.exactApprovalSentenceIncluded,
      p28Ready: input.p28Ready,
      p28State: input.p28State,
      p29Ready: input.p29Ready,
      p29State: input.p29State,
      activationBlockerPlanItems: input.activationBlockerPlanItems,
      plannedTouches: input.plannedTouches,
      plannedTouchesWithFutureGate: input.plannedTouchesWithFutureGate,
      plannedTouchesWithRollbackCheck: input.plannedTouchesWithRollbackCheck,
      rollbackRequirements: input.rollbackRequirements,
      criticalHashLocks: input.criticalHashLocks,
      dirtyFiles: input.dirtyFiles,
      dirtyProductionCandidateFiles: input.dirtyProductionCandidateFiles,
      dirtyWorktreeEvidenceIncluded: input.dirtyWorktreeEvidenceIncluded,
      readinessGenerationBlockers: input.readinessGenerationBlockers,
      readinessApplyBlockers: input.readinessApplyBlockers,
      serverManifestEntries: input.serverManifestEntries,
      approvalTemplatePresent: input.approvalTemplatePresent,
      hashLockDryRunPresent: input.hashLockDryRunPresent,
      activeApprovalReceiptExists: input.activeApprovalReceiptExists || input.p29ActiveApprovalReceiptExists,
      activeHashLockExists: input.activeHashLockExists || input.p29ActiveHashLockExists,
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
      readyForExplicitApprovalReceiptCreationGateV2: accepted,
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
    expectedState: RequestState;
    mutate: (input: EvaluationInput) => void;
  }> = [
    { id: 'canonical_approval_request_presentation_accepts', expectedAccept: true, expectedState: 'approval_request_presented', mutate: () => undefined },
    { id: 'missing_p29_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.p29Ready = false; input.p29State = 'blocked_by_findings'; } },
    { id: 'missing_exact_sentence_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.exactApprovalSentenceIncluded = false; } },
    { id: 'active_approval_receipt_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.activeApprovalReceiptExists = true; } },
    { id: 'active_hash_lock_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.activeHashLockExists = true; } },
    { id: 'ready_for_apply_open_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.targetManifestReadyForApply = true; } },
    { id: 'server_upload_open_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.serverUploadAllowed = true; } },
    { id: 'missing_rollback_evidence_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.rollbackRequirements = 0; } },
    { id: 'missing_dirty_evidence_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.dirtyWorktreeEvidenceIncluded = false; } },
    { id: 'missing_hash_links_rejected', expectedAccept: false, expectedState: 'blocked_by_findings', mutate: (input) => { input.criticalHashLocks = 0; } },
  ];
  return cases.map((testCase) => {
    const fixture = clone(base);
    testCase.mutate(fixture);
    const result = evaluate(fixture).evaluation;
    const accepted = result.readyForExplicitApprovalReceiptCreationGateV2;
    return {
      id: testCase.id,
      expectedAccept: testCase.expectedAccept,
      expectedState: testCase.expectedState,
      accepted,
      requestState: result.requestState,
      blockers: result.blockers,
      passed: accepted === testCase.expectedAccept && result.requestState === testCase.expectedState,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Activation Approval Request Presentation V2 Packet',
    '',
    `- Status: ${report.status}`,
    `- Request state: ${report.summary.requestState}`,
    `- Approval request markdown written: ${report.summary.approvalRequestMarkdownWritten ? 'yes' : 'no'}`,
    `- Exact approval sentence included: ${report.summary.exactApprovalSentenceIncluded ? 'yes' : 'no'}`,
    `- P28/P29 ready: ${report.summary.p28Ready ? 'yes' : 'no'}/${report.summary.p29Ready ? 'yes' : 'no'}`,
    `- Activation blockers: ${report.summary.activationBlockerPlanItems}`,
    `- Planned touches: ${report.summary.plannedTouches}`,
    `- Rollback requirements: ${report.summary.rollbackRequirements}`,
    `- Critical hash locks: ${report.summary.criticalHashLocks}`,
    `- Dirty files: ${report.summary.dirtyFiles}`,
    `- Dirty production-candidate files: ${report.summary.dirtyProductionCandidateFiles}`,
    `- Readiness generation/apply blockers: ${report.summary.readinessGenerationBlockers}/${report.summary.readinessApplyBlockers}`,
    `- Active approval receipt/hash lock: ${report.summary.activeApprovalReceiptExists ? 'yes' : 'no'}/${report.summary.activeHashLockExists ? 'yes' : 'no'}`,
    `- Ready for explicit approval receipt creation gate V2: ${report.summary.readyForExplicitApprovalReceiptCreationGateV2 ? 'yes' : 'no'}`,
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
  const generatedAt = new Date().toISOString();

  const p28Path = path.join(auditsDir, 'runtime_activation_blocker_plan_v2_packet.json');
  const p29Path = path.join(auditsDir, 'explicit_approval_receipt_hash_lock_gate_v2_packet.json');
  const readinessPath = path.join(auditsDir, 'readiness_blocker_reduction_packet.json');
  const targetManifestPath = path.join(packDir, 'target_pack_manifest_v2_draft.json');
  const serverManifestDraftPath = path.join(packDir, 'server_delivery_manifest_v2_draft.json');
  const approvalTemplatePath = path.join(applyPlanDir, 'explicit_approval_receipt_template_v2.md');
  const hashLockDryRunPath = path.join(applyPlanDir, 'hash_lock_manifest_dry_run_v2.json');
  const activeApprovalReceiptPath = path.join(applyPlanDir, 'explicit_approval_receipt_v2.json');
  const activeHashLockPath = path.join(applyPlanDir, 'hash_lock_manifest_v2.json');
  const approvalRequestPath = path.join(applyPlanDir, 'activation_approval_request_v2.md');
  const outputJsonPath = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.json');
  const outputMdPath = path.join(auditsDir, 'activation_approval_request_presentation_v2_packet.md');

  const p28 = readJson<JsonObject>(p28Path);
  const p29 = readJson<JsonObject>(p29Path);
  const readiness = readJson<JsonObject>(readinessPath);
  const targetManifest = readJson<JsonObject>(targetManifestPath);
  const serverManifestDraft = readJson<JsonObject>(serverManifestDraftPath);
  const p28Summary = summaryOf(p28);
  const p29Summary = summaryOf(p29);
  const readinessSummary = summaryOf(readiness);
  const activation = object(targetManifest.activation);
  const activeApprovalPaths = object(p29.activeApprovalPaths);
  const activationBlockers = extractBlockerPlan(p28);
  const plannedTouches = activationBlockers.flatMap((blocker) => blocker.plannedTouches);
  const criticalArtifacts = extractCriticalArtifacts(p29);
  const serverEntries = Array.isArray(serverManifestDraft.entries) ? serverManifestDraft.entries.length : 0;
  const requiredApprovalSentence = buildRequiredApprovalSentence(runId, rel(repoRoot, hashLockDryRunPath), rel(repoRoot, p28Path));

  ensureDir(applyPlanDir);
  fs.writeFileSync(approvalRequestPath, renderApprovalRequestMarkdown({
    runId,
    generatedAt,
    requiredApprovalSentence,
    p28Path: rel(repoRoot, p28Path),
    p29Path: rel(repoRoot, p29Path),
    hashLockPath: rel(repoRoot, hashLockDryRunPath),
    approvalTemplatePath: rel(repoRoot, approvalTemplatePath),
    activationBlockers,
    criticalHashLocks: n(p29Summary, 'criticalHashLocks'),
    dirtyFiles: n(p29Summary, 'dirtyFiles'),
    dirtyProductionCandidateFiles: n(p29Summary, 'dirtyProductionCandidateFiles'),
    readinessApplyBlockers: n(readinessSummary, 'applyBlockers'),
  }), 'utf8');

  const approvalRequestContent = fs.readFileSync(approvalRequestPath, 'utf8');
  const input: EvaluationInput = {
    p28Ready:
      n(p28Summary, 'blockers') === 0 &&
      b(p28Summary, 'readyForExplicitApprovalReceiptGateV2') &&
      s(p28Summary, 'planState') === 'runtime_activation_blocker_plan_ready',
    p28State: s(p28Summary, 'planState'),
    p28Blockers: n(p28Summary, 'blockers'),
    p28ReadyForApply: b(p28Summary, 'readyForApply'),
    p28MayModifyProductionAppFiles: b(p28Summary, 'mayModifyProductionAppFiles'),
    p29Ready:
      n(p29Summary, 'blockers') === 0 &&
      b(p29Summary, 'readyForApprovalRequestPresentationV2') &&
      s(p29Summary, 'gateState') === 'approval_request_package_ready',
    p29State: s(p29Summary, 'gateState'),
    p29Blockers: n(p29Summary, 'blockers'),
    p29ReadyForApply: b(p29Summary, 'readyForApply'),
    p29MayModifyProductionAppFiles: b(p29Summary, 'mayModifyProductionAppFiles'),
    p29ActiveApprovalReceiptExists: b(p29Summary, 'activeApprovalReceiptExists'),
    p29ActiveHashLockExists: b(p29Summary, 'activeHashLockExists'),
    activeApprovalReceiptExists: fs.existsSync(path.resolve(repoRoot, s(activeApprovalPaths, 'approvalReceipt') || rel(repoRoot, activeApprovalReceiptPath))),
    activeHashLockExists: fs.existsSync(path.resolve(repoRoot, s(activeApprovalPaths, 'hashLockManifest') || rel(repoRoot, activeHashLockPath))),
    approvalTemplatePresent: fs.existsSync(approvalTemplatePath),
    hashLockDryRunPresent: fs.existsSync(hashLockDryRunPath),
    approvalRequestMarkdownWritten: fs.existsSync(approvalRequestPath),
    exactApprovalSentenceIncluded: approvalRequestContent.includes(requiredApprovalSentence),
    activationBlockerPlanItems: activationBlockers.length,
    plannedTouches: plannedTouches.length,
    plannedTouchesWithFutureGate: plannedTouches.filter((touch) => touch.futureGate.trim() !== '').length,
    plannedTouchesWithRollbackCheck: plannedTouches.filter((touch) => touch.rollbackCheck.trim() !== '').length,
    rollbackRequirements: activationBlockers.filter((blocker) => blocker.rollbackRequirement.trim() !== '').length,
    criticalHashLocks: n(p29Summary, 'criticalHashLocks'),
    dirtyFiles: n(p29Summary, 'dirtyFiles'),
    dirtyProductionCandidateFiles: n(p29Summary, 'dirtyProductionCandidateFiles'),
    dirtyWorktreeEvidenceIncluded: approvalRequestContent.includes('Dirty worktree files captured') && n(p29Summary, 'dirtyFiles') >= 0,
    readinessGenerationBlockers: n(readinessSummary, 'generationBlockers'),
    readinessApplyBlockers: n(readinessSummary, 'applyBlockers'),
    readinessMayModifyProductionAppFiles: b(readinessSummary, 'mayModifyProductionAppFiles'),
    targetManifestActivationApproved: b(activation, 'activationApproved'),
    targetManifestReadyForApply: b(activation, 'readyForApply'),
    targetManifestMayModifyProductionAppFiles: b(activation, 'mayModifyProductionAppFiles'),
    serverManifestEntries: serverEntries,
    serverUploadAllowed: b(serverManifestDraft, 'serverUploadAllowed'),
    firebaseUploadAllowed: b(serverManifestDraft, 'firebaseUploadAllowed'),
    runtimeDownloadsEnabled: b(serverManifestDraft, 'runtimeDownloadsEnabled'),
    serverManifestActivationApproved: b(serverManifestDraft, 'activationApproved'),
    serverManifestReadyForApply: b(serverManifestDraft, 'readyForApply'),
    serverManifestMayModifyProductionAppFiles: b(serverManifestDraft, 'mayModifyProductionAppFiles'),
    approvalRequestHashLinked:
      approvalRequestContent.includes(rel(repoRoot, p28Path)) &&
      approvalRequestContent.includes(rel(repoRoot, p29Path)) &&
      approvalRequestContent.includes(rel(repoRoot, hashLockDryRunPath)),
  };

  const { evaluation, findings } = evaluate(input);
  const probes = runProbes(input);
  const probeFailures = probes.filter((probe) => !probe.passed).length;
  if (probeFailures > 0) {
    addFinding(findings, 'blocker', 'FIXTURE_PROBES_FAILED', `${probeFailures} fixture probe(s) failed.`);
    evaluation.blockers += 1;
    evaluation.requestState = 'blocked_by_findings';
    evaluation.readyForExplicitApprovalReceiptCreationGateV2 = false;
  }
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const status: Status = blockers > 0 ? 'BLOCK' : evaluation.readyForExplicitApprovalReceiptCreationGateV2 ? 'PASS' : 'HOLD';

  const artifactHashes = {
    runtimeActivationBlockerPlanV2Packet: sha256(p28Path),
    explicitApprovalReceiptHashLockGateV2Packet: sha256(p29Path),
    readinessBlockerReductionPacket: sha256(readinessPath),
    targetPackManifestV2Draft: sha256(targetManifestPath),
    serverDeliveryManifestV2Draft: sha256(serverManifestDraftPath),
    approvalReceiptTemplate: sha256(approvalTemplatePath),
    hashLockManifestDryRun: sha256(hashLockDryRunPath),
    activationApprovalRequest: sha256(approvalRequestPath),
  };
  const artifactHashEntries: CriticalArtifact[] = Object.entries(artifactHashes).map(([role, hash]) => {
    const filePathByRole: Record<string, string> = {
      runtimeActivationBlockerPlanV2Packet: p28Path,
      explicitApprovalReceiptHashLockGateV2Packet: p29Path,
      readinessBlockerReductionPacket: readinessPath,
      targetPackManifestV2Draft: targetManifestPath,
      serverDeliveryManifestV2Draft: serverManifestDraftPath,
      approvalReceiptTemplate: approvalTemplatePath,
      hashLockManifestDryRun: hashLockDryRunPath,
      activationApprovalRequest: approvalRequestPath,
    };
    const filePath = filePathByRole[role];
    return {
      role,
      path: rel(repoRoot, filePath),
      bytes: fs.statSync(filePath).size,
      sha256: hash,
      requiredForGate: true,
    };
  });

  const report: Report = {
    schemaVersion: 'gustav-activation-approval-request-presentation-v2-packet-v0',
    runId,
    generatedAt,
    status,
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      runtimeActivationBlockerPlanV2Packet: rel(repoRoot, p28Path),
      explicitApprovalReceiptHashLockGateV2Packet: rel(repoRoot, p29Path),
      readinessBlockerReductionPacket: rel(repoRoot, readinessPath),
      targetPackManifestV2Draft: rel(repoRoot, targetManifestPath),
      serverDeliveryManifestV2Draft: rel(repoRoot, serverManifestDraftPath),
      approvalReceiptTemplate: rel(repoRoot, approvalTemplatePath),
      hashLockManifestDryRun: rel(repoRoot, hashLockDryRunPath),
    },
    outputs: {
      packet: rel(repoRoot, outputJsonPath),
      markdown: rel(repoRoot, outputMdPath),
      activationApprovalRequest: rel(repoRoot, approvalRequestPath),
    },
    summary: {
      ...evaluation,
      blockers,
      warnings,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    requiredApprovalSentence,
    approvalRequestEvidence: {
      activationBlockers,
      criticalArtifacts: [...artifactHashEntries, ...criticalArtifacts],
      dirtyWorktree: {
        dirtyFiles: input.dirtyFiles,
        dirtyProductionCandidateFiles: input.dirtyProductionCandidateFiles,
      },
      closedProductionFlags: {
        activationApproved: false,
        readyForApply: false,
        mayModifyProductionAppFiles: false,
        productionWritesAllowed: false,
        serverUploadAllowed: false,
        firebaseUploadAllowed: false,
        runtimeDownloadsEnabled: false,
        storageMigrationAllowed: false,
        cloudSyncMigrationAllowed: false,
      },
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

  console.log(`GUSTAV activation approval request presentation V2 packet: ${report.status}`);
  console.log(`Request state: ${report.summary.requestState}`);
  console.log(`Approval request written: ${report.summary.approvalRequestMarkdownWritten ? 'yes' : 'no'}`);
  console.log(`Ready for explicit approval receipt creation gate V2: ${report.summary.readyForExplicitApprovalReceiptCreationGateV2 ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outputJsonPath)}`);
}

main();
