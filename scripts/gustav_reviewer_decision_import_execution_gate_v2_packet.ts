import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type ExecutionState =
  | 'blocked_by_findings'
  | 'closed_pending_llm_official_source_decisions'
  | 'closed_partial_llm_official_source_review'
  | 'eligible_llm_official_source_review';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  scope?: 'contract' | 'row' | 'ai_prompt';
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  expectedState?: ExecutionState;
  expectedWouldRun?: boolean;
  accepted: boolean;
  executionState: ExecutionState;
  wouldRun: boolean;
  blockers: number;
  passed: boolean;
};

type JsonObject = Record<string, unknown>;

type UpstreamState = {
  p13Ready: boolean;
  p17Ready: boolean;
  llmIntakeReady: boolean;
  p13Blockers: number;
  p17Blockers: number;
  llmIntakeBlockers: number;
  p13ReviewedRows: number;
  p13ReviewedAi: number;
  p13BlankRows: number;
  p13BlankAi: number;
  p17ReviewedRows: number;
  p17ReviewedAi: number;
  p17BlankRows: number;
  p17BlankAi: number;
  llmReviewedRows: number;
  llmReviewedAi: number;
  llmAcceptedRows: number;
  llmAcceptedAi: number;
  llmRowDecisionRows: number;
  llmAiDecisionRows: number;
  llmRowReviewCoveragePct: number;
  llmAiReviewCoveragePct: number;
  llmIntakeState: string;
  llmReviewFunctionOwner: string;
  llmOfficialSourceVerificationRequired: boolean;
  llmTrustedSourceFamilies: string[];
  llmTrustedSourceFamilyCount: number;
  llmRequiredTrustedSourceFamiliesPresent: number;
  llmCambridgeSourceFamilyPresent: boolean;
  llmMayApproveWithoutOfficialSources: boolean;
  llmMayUseUnofficialSourcesForApproval: boolean;
  llmOfficialSourceReviewComplete: boolean;
  llmOfficialSourceAcceptedReviewComplete: boolean;
  llmDecisionImportExecutionGateReady: boolean;
  llmPayloadCreationApprovalPreflightReady: boolean;
  p13OpenFlags: number;
  p13OfficialSourceCoverageReady: boolean;
  p13PromotedOfficialSourceRowFileUsed: boolean;
  p13PromotedOfficialSourceAiFileUsed: boolean;
  p13ReadyForOfficialSourceImportExecutionGateRefresh: boolean;
  p17ImportAllowedNow: boolean;
  llmImportAllowedNow: boolean;
};

type Evaluation = {
  rowDecisionRows: number;
  aiDecisionRows: number;
  llmReviewedRowDecisionRows: number;
  llmReviewedAiDecisionRows: number;
  llmAcceptedRowDecisionRows: number;
  llmAcceptedAiDecisionRows: number;
  llmRowReviewCoveragePct: number;
  llmAiReviewCoveragePct: number;
  p13Ready: boolean;
  p13OfficialSourceCoverageReady: boolean;
  p13PromotedOfficialSourceRowFileUsed: boolean;
  p13PromotedOfficialSourceAiFileUsed: boolean;
  p13ReadyForOfficialSourceImportExecutionGateRefresh: boolean;
  p17Ready: boolean;
  llmIntakeReady: boolean;
  llmIntakeState: string;
  llmReviewFunctionOwner: string;
  llmOfficialSourceVerificationRequired: boolean;
  llmTrustedSourceFamilies: string[];
  llmTrustedSourceFamilyCount: number;
  llmOfficialSourceReviewComplete: boolean;
  llmOfficialSourceAcceptedReviewComplete: boolean;
  upstreamCountsConsistent: boolean;
  reviewerDecisionImportAllowedNow: false;
  reviewerDecisionImportWouldRun: boolean;
  generatedLedgerWritesAllowed: false;
  payloadCreationAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
  activationApproved: false;
  readyForPayloadCreationApprovalPreflight: boolean;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  executionState: ExecutionState;
  blockers: number;
  warnings: number;
};

type ExecutionContract = {
  schemaVersion: 'gustav-reviewer-decision-import-execution-gate-v2';
  runId: string;
  targetLocale: 'fr';
  studyTarget: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  mode: 'dry_run_only';
  requiredInputs: [
    'reviewer_decision_import_v2_dry_run',
    'reviewer_decision_import_opening_preflight_v2',
    'llm_official_source_review_intake_v2',
    'french_official_source_content_coverage_v2',
  ];
  closedTransitions: {
    reviewerDecisionImportAllowedNow: false;
    generatedLedgerWritesAllowed: false;
    payloadCreationAllowed: false;
    serverUploadAllowed: false;
    firebaseUploadAllowed: false;
    runtimeDownloadsEnabled: false;
    activationApproved: false;
    readyForApply: false;
    mayModifyProductionAppFiles: false;
  };
  nextRequiredGate: 'payload_creation_approval_preflight_v2_after_llm_official_source_review';
};

type Report = {
  schemaVersion: 'gustav-reviewer-decision-import-execution-gate-v2-packet-v1';
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
    targetLocale: 'fr';
    sourceLocales: number;
    rowDecisionTemplateLines: number;
    aiDecisionTemplateLines: number;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  contract: ExecutionContract;
  probes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    payloadShardsCreatedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

const REQUIRED_ROW_DECISIONS = 1600;
const REQUIRED_AI_DECISIONS = 164;

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
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function lineCount(filePath: string): number {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  return text ? text.split(/\r?\n/).filter(Boolean).length : 0;
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
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

function stringArray(value: JsonObject, key: string): string[] {
  const raw = value[key];
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

function addFinding(findings: Finding[], severity: Severity, code: string, message: string, scope: Finding['scope'] = 'contract'): void {
  findings.push({ severity, code, message, scope });
}

function buildUpstream(p13: JsonObject, p17: JsonObject, llm: JsonObject): UpstreamState {
  return {
    p13Ready: n(p13, 'blockers') === 0 && b(p13, 'readyForReviewerDecisionImportV2DryRun'),
    p17Ready: n(p17, 'blockers') === 0 && b(p17, 'readyForReviewerDecisionImportOpeningPreflight'),
    llmIntakeReady: n(llm, 'blockers') === 0 && b(llm, 'readyForDecisionImportExecutionGate') && s(llm, 'intakeState') !== 'blocked_by_findings',
    p13Blockers: n(p13, 'blockers'),
    p17Blockers: n(p17, 'blockers'),
    llmIntakeBlockers: n(llm, 'blockers'),
    p13ReviewedRows: n(p13, 'reviewedRowDecisionRows'),
    p13ReviewedAi: n(p13, 'reviewedAiDecisionRows'),
    p13BlankRows: n(p13, 'blankRowDecisionRows'),
    p13BlankAi: n(p13, 'blankAiDecisionRows'),
    p17ReviewedRows: n(p17, 'reviewedRowDecisionRows'),
    p17ReviewedAi: n(p17, 'reviewedAiDecisionRows'),
    p17BlankRows: n(p17, 'blankRowDecisionRows'),
    p17BlankAi: n(p17, 'blankAiDecisionRows'),
    llmReviewedRows: n(llm, 'llmReviewedRowDecisionRows'),
    llmReviewedAi: n(llm, 'llmReviewedAiDecisionRows'),
    llmAcceptedRows: n(llm, 'llmAcceptedRowDecisionRows'),
    llmAcceptedAi: n(llm, 'llmAcceptedAiDecisionRows'),
    llmRowDecisionRows: n(llm, 'rowDecisionRows'),
    llmAiDecisionRows: n(llm, 'aiDecisionRows'),
    llmRowReviewCoveragePct: n(llm, 'rowLlmReviewCoveragePct'),
    llmAiReviewCoveragePct: n(llm, 'aiLlmReviewCoveragePct'),
    llmIntakeState: s(llm, 'intakeState'),
    llmReviewFunctionOwner: s(llm, 'reviewFunctionOwner'),
    llmOfficialSourceVerificationRequired: b(llm, 'officialSourceVerificationRequired'),
    llmTrustedSourceFamilies: stringArray(llm, 'trustedSourceFamilies'),
    llmTrustedSourceFamilyCount: n(llm, 'trustedSourceFamilyCount'),
    llmRequiredTrustedSourceFamiliesPresent: n(llm, 'requiredTrustedSourceFamiliesPresent'),
    llmCambridgeSourceFamilyPresent: b(llm, 'cambridgeSourceFamilyPresent'),
    llmMayApproveWithoutOfficialSources: b(llm, 'llmMayApproveWithoutOfficialSources'),
    llmMayUseUnofficialSourcesForApproval: b(llm, 'llmMayUseUnofficialSourcesForApproval'),
    llmOfficialSourceReviewComplete: b(llm, 'llmOfficialSourceReviewComplete'),
    llmOfficialSourceAcceptedReviewComplete: b(llm, 'llmOfficialSourceAcceptedReviewComplete'),
    llmDecisionImportExecutionGateReady: b(llm, 'readyForDecisionImportExecutionGate'),
    llmPayloadCreationApprovalPreflightReady: b(llm, 'readyForPayloadCreationApprovalPreflight'),
    p13OpenFlags:
      n(p13, 'reviewerImportOpenFlags') +
      n(p13, 'productionApplyOpenFlags') +
      n(p13, 'activationApprovedFlags') +
      (b(p13, 'generatedLedgerWrites') ? 1 : 0) +
      (b(p13, 'serverUploadStarted') ? 1 : 0) +
      (b(p13, 'firebaseUploadStarted') ? 1 : 0) +
      (b(p13, 'runtimeDownloadsEnabled') ? 1 : 0),
    p13OfficialSourceCoverageReady: b(p13, 'officialSourceContentCoverageV2Ready'),
    p13PromotedOfficialSourceRowFileUsed: b(p13, 'rowDecisionFilePromotedOfficialSourceUsed'),
    p13PromotedOfficialSourceAiFileUsed: b(p13, 'aiDecisionFilePromotedOfficialSourceUsed'),
    p13ReadyForOfficialSourceImportExecutionGateRefresh: b(p13, 'readyForOfficialSourceImportExecutionGateRefresh'),
    p17ImportAllowedNow: b(p17, 'reviewerDecisionImportAllowedNow'),
    llmImportAllowedNow: b(llm, 'reviewerDecisionImportAllowedNow'),
  };
}

function evaluate(upstream: UpstreamState, rowLines: number, aiLines: number): { metrics: Evaluation; findings: Finding[] } {
  const findings: Finding[] = [];
  const countsConsistent =
    upstream.p13ReviewedRows === upstream.p17ReviewedRows &&
    upstream.p17ReviewedRows === upstream.llmReviewedRows &&
    upstream.p13ReviewedAi === upstream.p17ReviewedAi &&
    upstream.p17ReviewedAi === upstream.llmReviewedAi &&
    upstream.p13BlankRows === upstream.p17BlankRows &&
    upstream.p13BlankAi === upstream.p17BlankAi;
  const fullLlmReview =
    upstream.llmOfficialSourceAcceptedReviewComplete &&
    upstream.llmAcceptedRows === REQUIRED_ROW_DECISIONS &&
    upstream.llmAcceptedAi === REQUIRED_AI_DECISIONS;

  if (!upstream.p13Ready || upstream.p13Blockers !== 0) addFinding(findings, 'blocker', 'p13_dry_run_not_ready', 'P13 decision import dry-run must be ready and blocker-free.');
  if (!upstream.p13OfficialSourceCoverageReady) addFinding(findings, 'blocker', 'p13_official_source_coverage_not_ready', 'P40 execution gate requires P13 dry-run to depend on PASS official-source content coverage.');
  if (!upstream.p13PromotedOfficialSourceRowFileUsed || !upstream.p13PromotedOfficialSourceAiFileUsed) {
    addFinding(findings, 'blocker', 'p13_not_using_promoted_official_source_decisions', 'P40 execution gate requires P13 dry-run to use promoted official-source row and AI decision files.');
  }
  if (!upstream.p13ReadyForOfficialSourceImportExecutionGateRefresh) {
    addFinding(findings, 'blocker', 'p13_not_ready_for_official_source_execution_refresh', 'P13 dry-run must explicitly report readiness for official-source import execution gate refresh.');
  }
  if (!upstream.p17Ready || upstream.p17Blockers !== 0) addFinding(findings, 'blocker', 'p17_opening_preflight_not_ready', 'P17 opening preflight must be ready and blocker-free.');
  if (!upstream.llmIntakeReady || upstream.llmIntakeBlockers !== 0) addFinding(findings, 'blocker', 'llm_official_source_intake_not_ready', 'LLM official-source review intake must be ready and blocker-free.');
  if (upstream.llmReviewFunctionOwner !== 'llm_official_source_reviewer') addFinding(findings, 'blocker', 'llm_review_owner_invalid', 'Decision import execution may only depend on llm_official_source_reviewer.');
  if (!upstream.llmOfficialSourceVerificationRequired) addFinding(findings, 'blocker', 'official_source_verification_missing', 'LLM intake must require official/trusted source verification.');
  if (upstream.llmTrustedSourceFamilyCount < 5 || upstream.llmRequiredTrustedSourceFamiliesPresent < 5) {
    addFinding(findings, 'blocker', 'official_source_family_coverage_incomplete', 'LLM intake must expose at least five required trusted source families.');
  }
  if (!upstream.llmCambridgeSourceFamilyPresent) addFinding(findings, 'blocker', 'cambridge_source_family_missing', 'LLM intake must keep Cambridge lexical evidence available.');
  if (upstream.llmMayApproveWithoutOfficialSources || upstream.llmMayUseUnofficialSourcesForApproval) {
    addFinding(findings, 'blocker', 'llm_source_policy_open', 'LLM may not approve with missing official evidence or unofficial sources.');
  }
  if (rowLines !== REQUIRED_ROW_DECISIONS) addFinding(findings, 'blocker', 'row_template_line_count_invalid', `Expected ${REQUIRED_ROW_DECISIONS} row template lines, found ${rowLines}.`);
  if (aiLines !== REQUIRED_AI_DECISIONS) addFinding(findings, 'blocker', 'ai_template_line_count_invalid', `Expected ${REQUIRED_AI_DECISIONS} AI template lines, found ${aiLines}.`);
  if (upstream.llmRowDecisionRows !== rowLines || upstream.llmAiDecisionRows !== aiLines) {
    addFinding(findings, 'blocker', 'llm_template_counts_stale', 'LLM intake row/AI counts must match current reviewer template line counts.');
  }
  if (!countsConsistent) addFinding(findings, 'blocker', 'upstream_llm_counts_mismatch', 'P13/P17/LLM reviewed counts must match before execution can run.');
  if (upstream.p13OpenFlags > 0) addFinding(findings, 'blocker', 'p13_open_transition_flags', 'P13 dry-run reports open import/apply/upload/activation flags.');
  if (upstream.p17ImportAllowedNow) addFinding(findings, 'blocker', 'p17_import_allowed_now', 'P17 must not set reviewerDecisionImportAllowedNow.');
  if (upstream.llmImportAllowedNow) addFinding(findings, 'blocker', 'llm_import_allowed_now', 'LLM intake must not set reviewerDecisionImportAllowedNow.');
  if (upstream.llmPayloadCreationApprovalPreflightReady && !fullLlmReview) {
    addFinding(findings, 'blocker', 'payload_ready_without_full_llm_review', 'LLM intake cannot set payload approval readiness without full official-source row and AI review coverage.');
  }

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  let executionState: ExecutionState = 'blocked_by_findings';
  let wouldRun = false;
  if (blockers === 0) {
    if (fullLlmReview && upstream.llmPayloadCreationApprovalPreflightReady) {
      executionState = 'eligible_llm_official_source_review';
      wouldRun = true;
    } else if (upstream.llmReviewedRows > 0 || upstream.llmReviewedAi > 0) {
      executionState = 'closed_partial_llm_official_source_review';
    } else {
      executionState = 'closed_pending_llm_official_source_decisions';
    }
  }

  return {
    metrics: {
      rowDecisionRows: rowLines,
      aiDecisionRows: aiLines,
      llmReviewedRowDecisionRows: upstream.llmReviewedRows,
      llmReviewedAiDecisionRows: upstream.llmReviewedAi,
      llmAcceptedRowDecisionRows: upstream.llmAcceptedRows,
      llmAcceptedAiDecisionRows: upstream.llmAcceptedAi,
      llmRowReviewCoveragePct: upstream.llmRowReviewCoveragePct,
      llmAiReviewCoveragePct: upstream.llmAiReviewCoveragePct,
      p13Ready: upstream.p13Ready,
      p13OfficialSourceCoverageReady: upstream.p13OfficialSourceCoverageReady,
      p13PromotedOfficialSourceRowFileUsed: upstream.p13PromotedOfficialSourceRowFileUsed,
      p13PromotedOfficialSourceAiFileUsed: upstream.p13PromotedOfficialSourceAiFileUsed,
      p13ReadyForOfficialSourceImportExecutionGateRefresh: upstream.p13ReadyForOfficialSourceImportExecutionGateRefresh,
      p17Ready: upstream.p17Ready,
      llmIntakeReady: upstream.llmIntakeReady,
      llmIntakeState: upstream.llmIntakeState,
      llmReviewFunctionOwner: upstream.llmReviewFunctionOwner,
      llmOfficialSourceVerificationRequired: upstream.llmOfficialSourceVerificationRequired,
      llmTrustedSourceFamilies: upstream.llmTrustedSourceFamilies,
      llmTrustedSourceFamilyCount: upstream.llmTrustedSourceFamilyCount,
      llmOfficialSourceReviewComplete: upstream.llmOfficialSourceReviewComplete,
      llmOfficialSourceAcceptedReviewComplete: upstream.llmOfficialSourceAcceptedReviewComplete,
      upstreamCountsConsistent: countsConsistent,
      reviewerDecisionImportAllowedNow: false,
      reviewerDecisionImportWouldRun: wouldRun,
      generatedLedgerWritesAllowed: false,
      payloadCreationAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForPayloadCreationApprovalPreflight: wouldRun,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      executionState,
      blockers,
      warnings: findings.filter((finding) => finding.severity === 'warning').length,
    },
    findings,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeFullLlmReviewState(upstream: UpstreamState): UpstreamState {
  const draft = clone(upstream);
  draft.p13ReviewedRows = REQUIRED_ROW_DECISIONS;
  draft.p17ReviewedRows = REQUIRED_ROW_DECISIONS;
  draft.llmReviewedRows = REQUIRED_ROW_DECISIONS;
  draft.p13ReviewedAi = REQUIRED_AI_DECISIONS;
  draft.p17ReviewedAi = REQUIRED_AI_DECISIONS;
  draft.llmReviewedAi = REQUIRED_AI_DECISIONS;
  draft.llmAcceptedRows = REQUIRED_ROW_DECISIONS;
  draft.llmAcceptedAi = REQUIRED_AI_DECISIONS;
  draft.p13BlankRows = 0;
  draft.p17BlankRows = 0;
  draft.p13BlankAi = 0;
  draft.p17BlankAi = 0;
  draft.llmRowReviewCoveragePct = 100;
  draft.llmAiReviewCoveragePct = 100;
  draft.llmOfficialSourceReviewComplete = true;
  draft.llmOfficialSourceAcceptedReviewComplete = true;
  draft.llmPayloadCreationApprovalPreflightReady = true;
  return draft;
}

function makePendingLlmReviewState(upstream: UpstreamState): UpstreamState {
  const draft = clone(upstream);
  draft.p13ReviewedRows = 0;
  draft.p17ReviewedRows = 0;
  draft.llmReviewedRows = 0;
  draft.p13ReviewedAi = 0;
  draft.p17ReviewedAi = 0;
  draft.llmReviewedAi = 0;
  draft.llmAcceptedRows = 0;
  draft.llmAcceptedAi = 0;
  draft.p13BlankRows = REQUIRED_ROW_DECISIONS;
  draft.p17BlankRows = REQUIRED_ROW_DECISIONS;
  draft.p13BlankAi = REQUIRED_AI_DECISIONS;
  draft.p17BlankAi = REQUIRED_AI_DECISIONS;
  draft.llmRowReviewCoveragePct = 0;
  draft.llmAiReviewCoveragePct = 0;
  draft.llmOfficialSourceReviewComplete = false;
  draft.llmOfficialSourceAcceptedReviewComplete = false;
  draft.llmPayloadCreationApprovalPreflightReady = false;
  return draft;
}

function makePartialLlmReviewState(upstream: UpstreamState): UpstreamState {
  const draft = makePendingLlmReviewState(upstream);
  draft.p13ReviewedRows = 1;
  draft.p17ReviewedRows = 1;
  draft.llmReviewedRows = 1;
  draft.p13BlankRows = REQUIRED_ROW_DECISIONS - 1;
  draft.p17BlankRows = REQUIRED_ROW_DECISIONS - 1;
  draft.llmRowReviewCoveragePct = 0.06;
  draft.llmOfficialSourceReviewComplete = false;
  draft.llmOfficialSourceAcceptedReviewComplete = false;
  draft.llmPayloadCreationApprovalPreflightReady = false;
  return draft;
}

function makeProbe(
  id: string,
  expectedAccept: boolean,
  expectedState: ExecutionState | undefined,
  expectedWouldRun: boolean | undefined,
  upstream: UpstreamState,
  rowLines: number,
  aiLines: number,
  mutate?: (state: UpstreamState) => void,
): Probe {
  const draft = clone(upstream);
  mutate?.(draft);
  const metrics = evaluate(draft, rowLines, aiLines).metrics;
  const accepted = metrics.blockers === 0;
  const stateOk = expectedState ? metrics.executionState === expectedState : true;
  const runOk = typeof expectedWouldRun === 'boolean' ? metrics.reviewerDecisionImportWouldRun === expectedWouldRun : true;
  return {
    id,
    expectedAccept,
    expectedState,
    expectedWouldRun,
    accepted,
    executionState: metrics.executionState,
    wouldRun: metrics.reviewerDecisionImportWouldRun,
    blockers: metrics.blockers,
    passed: accepted === expectedAccept && stateOk && runOk,
  };
}

function makeProbes(upstream: UpstreamState, rowLines: number, aiLines: number): Probe[] {
  return [
    makeProbe('canonical_full_llm_official_source_review_execution_eligible', true, 'eligible_llm_official_source_review', true, upstream, rowLines, aiLines),
    makeProbe('pending_llm_decisions_execution_closed', true, 'closed_pending_llm_official_source_decisions', false, upstream, rowLines, aiLines, (state) => Object.assign(state, makePendingLlmReviewState(state))),
    makeProbe('partial_llm_review_execution_closed', true, 'closed_partial_llm_official_source_review', false, upstream, rowLines, aiLines, (state) => {
      Object.assign(state, makePartialLlmReviewState(state));
    }),
    makeProbe('full_llm_official_source_review_execution_eligible', true, 'eligible_llm_official_source_review', true, upstream, rowLines, aiLines, (state) => Object.assign(state, makeFullLlmReviewState(state))),
    makeProbe('p13_not_ready_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => { state.p13Ready = false; }),
    makeProbe('p13_official_source_coverage_not_ready_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => { state.p13OfficialSourceCoverageReady = false; }),
    makeProbe('p13_promoted_official_source_files_missing_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => {
      state.p13PromotedOfficialSourceRowFileUsed = false;
      state.p13PromotedOfficialSourceAiFileUsed = false;
    }),
    makeProbe('p17_not_ready_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => { state.p17Ready = false; }),
    makeProbe('llm_intake_not_ready_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => { state.llmIntakeReady = false; state.llmIntakeBlockers = 1; }),
    makeProbe('missing_official_source_verification_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => { state.llmOfficialSourceVerificationRequired = false; }),
    makeProbe('missing_cambridge_source_family_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => { state.llmCambridgeSourceFamilyPresent = false; }),
    makeProbe('unofficial_source_approval_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => { state.llmMayUseUnofficialSourcesForApproval = true; }),
    makeProbe('upstream_count_mismatch_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => { state.p17ReviewedRows = 1; }),
    makeProbe('p13_open_flags_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => { state.p13OpenFlags = 1; }),
    makeProbe('p17_import_allowed_now_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => { state.p17ImportAllowedNow = true; }),
    makeProbe('payload_ready_without_full_llm_review_rejected', false, undefined, undefined, upstream, rowLines, aiLines, (state) => {
      Object.assign(state, makePartialLlmReviewState(state));
      state.llmPayloadCreationApprovalPreflightReady = true;
    }),
  ];
}

function buildContract(runId: string): ExecutionContract {
  return {
    schemaVersion: 'gustav-reviewer-decision-import-execution-gate-v2',
    runId,
    targetLocale: 'fr',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    mode: 'dry_run_only',
    requiredInputs: [
      'reviewer_decision_import_v2_dry_run',
      'reviewer_decision_import_opening_preflight_v2',
      'llm_official_source_review_intake_v2',
      'french_official_source_content_coverage_v2',
    ],
    closedTransitions: {
      reviewerDecisionImportAllowedNow: false,
      generatedLedgerWritesAllowed: false,
      payloadCreationAllowed: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      activationApproved: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
    },
    nextRequiredGate: 'payload_creation_approval_preflight_v2_after_llm_official_source_review',
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Reviewer Decision Import Execution Gate V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Execution state: ${report.summary.executionState}`,
    `- Reviewer import would run: ${report.summary.reviewerDecisionImportWouldRun ? 'yes' : 'no'}`,
    `- LLM intake state: ${report.summary.llmIntakeState}`,
    `- LLM review function owner: ${report.summary.llmReviewFunctionOwner}`,
    `- Official/trusted source verification: ${report.summary.llmOfficialSourceVerificationRequired ? 'yes' : 'no'}`,
    `- Trusted source families: ${report.summary.llmTrustedSourceFamilies.join(', ')}`,
    `- LLM reviewed rows: ${report.summary.llmReviewedRowDecisionRows}/${report.summary.rowDecisionRows}`,
    `- LLM reviewed AI: ${report.summary.llmReviewedAiDecisionRows}/${report.summary.aiDecisionRows}`,
    `- LLM accepted rows: ${report.summary.llmAcceptedRowDecisionRows}/${report.summary.rowDecisionRows}`,
    `- LLM accepted AI: ${report.summary.llmAcceptedAiDecisionRows}/${report.summary.aiDecisionRows}`,
    `- Upstream counts consistent: ${report.summary.upstreamCountsConsistent ? 'yes' : 'no'}`,
    `- P13 official-source coverage ready: ${report.summary.p13OfficialSourceCoverageReady ? 'yes' : 'no'}`,
    `- P13 promoted official-source row/AI files used: ${report.summary.p13PromotedOfficialSourceRowFileUsed ? 'yes' : 'no'}/${report.summary.p13PromotedOfficialSourceAiFileUsed ? 'yes' : 'no'}`,
    `- P13 ready for official-source execution refresh: ${report.summary.p13ReadyForOfficialSourceImportExecutionGateRefresh ? 'yes' : 'no'}`,
    `- P13/P17/LLM ready: ${report.summary.p13Ready ? 'yes' : 'no'}/${report.summary.p17Ready ? 'yes' : 'no'}/${report.summary.llmIntakeReady ? 'yes' : 'no'}`,
    `- Reviewer import allowed now: ${report.summary.reviewerDecisionImportAllowedNow ? 'yes' : 'no'}`,
    `- Payload creation allowed: ${report.summary.payloadCreationAllowed ? 'yes' : 'no'}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Ready for payload creation approval preflight: ${report.summary.readyForPayloadCreationApprovalPreflight ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Probes',
    '',
  ];
  for (const probe of report.probes) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (accepted=${probe.accepted}, state=${probe.executionState}, wouldRun=${probe.wouldRun}, blockers=${probe.blockers})`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This execution gate is dry-run only.',
    '- It does not import reviewer decisions.',
    '- It does not write generated ledgers or app files.',
    '- It does not create payloads, upload packs, enable downloads, or approve apply.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_reviewer_decision_import_execution_gate_v2_packet.ts --run <run-dir> --target fr');
  }
  if (target !== 'fr') {
    throw new Error('P19 reviewer decision import execution gate is scoped to --target fr.');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  ensureDir(auditsDir);

  const p13Path = path.join(auditsDir, 'reviewer_decision_import_v2_dry_run.json');
  const p17Path = path.join(auditsDir, 'reviewer_decision_import_opening_preflight_v2_packet.json');
  const llmIntakePath = path.join(auditsDir, 'llm_official_source_review_intake_v2_packet.json');
  const officialSourceCoveragePath = path.join(auditsDir, 'french_official_source_content_coverage_v2_packet.json');
  const rowTemplatePath = path.join(reviewerDir, 'reviewer_decision_template_v2.jsonl');
  const aiTemplatePath = path.join(reviewerDir, 'reviewer_ai_decision_template_v2.jsonl');
  const outJson = path.join(auditsDir, 'reviewer_decision_import_execution_gate_v2_packet.json');
  const outMd = path.join(auditsDir, 'reviewer_decision_import_execution_gate_v2_packet.md');

  for (const filePath of [p13Path, p17Path, llmIntakePath, officialSourceCoveragePath, rowTemplatePath, aiTemplatePath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Required P19 input is missing: ${rel(repoRoot, filePath)}`);
  }

  const p13 = object(readJson<JsonObject>(p13Path).summary);
  const p17 = object(readJson<JsonObject>(p17Path).summary);
  const llm = object(readJson<JsonObject>(llmIntakePath).summary);
  const rowLines = lineCount(rowTemplatePath);
  const aiLines = lineCount(aiTemplatePath);
  const upstream = buildUpstream(p13, p17, llm);
  const evaluation = evaluate(upstream, rowLines, aiLines);
  const probes = makeProbes(upstream, rowLines, aiLines);
  const findings = [...evaluation.findings];
  for (const probe of probes.filter((probe) => !probe.passed)) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(findings, 'info', 'execution_gate_dry_run_only', 'P19 classifies whether LLM official-source review decisions would allow import; it never imports decisions or opens production transitions.');

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const metrics: Evaluation = {
    ...evaluation.metrics,
    blockers,
    warnings,
    executionState: blockers > 0 ? 'blocked_by_findings' : evaluation.metrics.executionState,
    reviewerDecisionImportWouldRun: blockers === 0 && evaluation.metrics.reviewerDecisionImportWouldRun,
    readyForPayloadCreationApprovalPreflight: blockers === 0 && evaluation.metrics.readyForPayloadCreationApprovalPreflight,
  };

  const report: Report = {
    schemaVersion: 'gustav-reviewer-decision-import-execution-gate-v2-packet-v1',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      reviewerDecisionImportV2DryRun: rel(repoRoot, p13Path),
      reviewerDecisionImportOpeningPreflightV2Packet: rel(repoRoot, p17Path),
      llmOfficialSourceReviewIntakeV2Packet: rel(repoRoot, llmIntakePath),
      officialSourceContentCoverageV2Packet: rel(repoRoot, officialSourceCoveragePath),
      rowDecisionTemplateV2: rel(repoRoot, rowTemplatePath),
      aiDecisionTemplateV2: rel(repoRoot, aiTemplatePath),
    },
    outputs: {
      reviewerDecisionImportExecutionGateV2PacketJson: rel(repoRoot, outJson),
      reviewerDecisionImportExecutionGateV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      rowDecisionTemplateLines: rowLines,
      aiDecisionTemplateLines: aiLines,
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      reviewerDecisionImportV2DryRun: sha256(p13Path),
      reviewerDecisionImportOpeningPreflightV2Packet: sha256(p17Path),
      llmOfficialSourceReviewIntakeV2Packet: sha256(llmIntakePath),
      officialSourceContentCoverageV2Packet: sha256(officialSourceCoveragePath),
      rowDecisionTemplateV2: sha256(rowTemplatePath),
      aiDecisionTemplateV2: sha256(aiTemplatePath),
    },
    contract: buildContract(runId),
    probes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      payloadShardsCreatedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV reviewer decision import execution gate V2 packet: ${report.status}`);
  console.log(`Execution state: ${report.summary.executionState}`);
  console.log(`Reviewer import would run: ${report.summary.reviewerDecisionImportWouldRun ? 'yes' : 'no'}`);
  console.log(`LLM reviewed rows: ${report.summary.llmReviewedRowDecisionRows}/${report.summary.rowDecisionRows}`);
  console.log(`LLM reviewed AI: ${report.summary.llmReviewedAiDecisionRows}/${report.summary.aiDecisionRows}`);
  console.log(`LLM accepted rows: ${report.summary.llmAcceptedRowDecisionRows}/${report.summary.rowDecisionRows}`);
  console.log(`LLM accepted AI: ${report.summary.llmAcceptedAiDecisionRows}/${report.summary.aiDecisionRows}`);
  console.log(`P13 official-source coverage ready: ${report.summary.p13OfficialSourceCoverageReady ? 'yes' : 'no'}`);
  console.log(`P13 promoted official-source row/AI files used: ${report.summary.p13PromotedOfficialSourceRowFileUsed ? 'yes' : 'no'}/${report.summary.p13PromotedOfficialSourceAiFileUsed ? 'yes' : 'no'}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
