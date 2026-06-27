import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type OpeningState =
  | 'blocked_by_findings'
  | 'closed_no_reviewed_decisions'
  | 'closed_partial_review_coverage'
  | 'eligible_after_reviewed_decisions';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  scope?: 'row' | 'ai_prompt' | 'contract';
  identity?: string;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  openingEligible: boolean;
  openingState: OpeningState;
  blockers: number;
  passed: boolean;
};

type RowDecision = {
  reviewScope: 'row';
  sourceQueueIndex: number;
  batchId: string;
  lessonId: number;
  phraseId: string;
  schemaRowId: string;
  qualityRowId: string;
  studyTarget: string;
  sourceLocaleCoverage: string[];
  sourceGraphEnglishBase: string;
  sourceMeanings: { ru: string; uk: string };
  candidateTargetText: string;
  candidateQuiz: {
    blank: string;
    correct: string;
    distractors: string[];
    category: string;
  };
  sourceMeaningHash: string;
  grammarClusterId: string;
  secondaryGrammarClusterIds: string[];
  requiredTransformationType: string;
  researchEvidenceIds: string[];
  requiredGateIds: string[];
  gateReviewerDecisions: Record<string, string>;
  reviewerDecision: string;
  correctedTargetText: string;
  correctedQuizBlank: string;
  correctedQuizCorrect: string;
  correctedQuizDistractors: string;
  reviewerNotes: string;
  reviewerName: string;
  reviewedAt: string;
  currentReviewerStatus: string;
  currentActivationStatus: string;
  reviewerImportAllowed: boolean;
  productionApplyAllowed: boolean;
  activationApproved: boolean;
};

type AiDecision = {
  reviewScope: 'ai_prompt';
  aiTemplateIndex: number;
  aiQualityGateId: string;
  contractId: string;
  domainId: string;
  domainTitle: string;
  filePath: string;
  featureRiskClass: string;
  riskLevel: string;
  studyTarget: string;
  sourceLocaleCoverage: string[];
  requiredGateIds: string[];
  cacheKeyDimensionsRequired: string[];
  wrongLanguageGateDecision: string;
  cacheLanguageGateDecision: string;
  liveReturnGateDecision: string;
  reviewerDecision: string;
  reviewerNotes: string;
  reviewerName: string;
  reviewedAt: string;
  rejectedFreshOutputMayReturn: boolean;
  rejectedFreshOutputMayBeCached: boolean;
  targetOutputAllowedBeforeQualityPass: boolean;
  currentActivationStatus: string;
  reviewerImportAllowed: boolean;
  productionApplyAllowed: boolean;
  activationApproved: boolean;
};

type WorkflowSchema = {
  schemaVersion: string;
  targetLocale: string;
  targetStudyLanguage: string;
  sourceLocales: string[];
  allowedRowReviewerDecisions: string[];
  allowedAiReviewerDecisions: string[];
  activationPolicy: {
    reviewerWorkflowAloneMayImportDecisions: boolean;
    reviewerWorkflowAloneMayApplyProduction: boolean;
    reviewerWorkflowAloneMayStartGeneration: boolean;
    requiresFilledDecisionFile: boolean;
    requiresDecisionImportDryRunV2: boolean;
    requiresBrainGateV2: boolean;
    requiresProductionActivationGateV2: boolean;
  };
  activationApproved: boolean;
  readyForLlmOfficialSourceReviewV2: boolean;
  readyForDecisionImportV2: boolean;
  readyForGenerationV2: boolean;
  readyForApply: boolean;
  mayModifyProductionAppFiles: boolean;
};

type JsonObject = Record<string, unknown>;

type Prerequisites = {
  dryRunReady: boolean;
  runtimeCacheIntegrityReady: boolean;
  dryRunClosed: boolean;
  runtimeClosed: boolean;
};

type Evaluation = {
  rowDecisionRows: number;
  aiDecisionRows: number;
  reviewedRowDecisionRows: number;
  reviewedAiDecisionRows: number;
  acceptedRowDecisionRows: number;
  acceptedAiDecisionRows: number;
  nonAcceptedReviewedRowDecisionRows: number;
  nonAcceptedReviewedAiDecisionRows: number;
  blankRowDecisionRows: number;
  blankAiDecisionRows: number;
  rowImportCandidateRows: number;
  aiImportCandidateRows: number;
  rowNoOpRows: number;
  aiNoOpRows: number;
  rowWrongTargetRows: number;
  aiWrongTargetRows: number;
  rowWrongSourceLocaleRows: number;
  aiWrongSourceLocaleRows: number;
  rowDuplicateDecisionRows: number;
  aiDuplicateDecisionRows: number;
  rowAcceptedWithUnreviewedGates: number;
  aiAcceptedWithUnreviewedGates: number;
  rowCorrectionPayloadRows: number;
  aiRejectedFreshReturnOpenRows: number;
  aiRejectedFreshCacheOpenRows: number;
  targetOutputBeforeQualityOpenRows: number;
  reviewerImportOpenFlags: number;
  productionApplyOpenFlags: number;
  activationApprovedFlags: number;
  fullRowReviewCoverage: boolean;
  fullAiReviewCoverage: boolean;
  fullAcceptedRowReviewCoverage: boolean;
  fullAcceptedAiReviewCoverage: boolean;
  dryRunReady: boolean;
  runtimeCacheIntegrityReady: boolean;
  reviewerDecisionImportAllowedNow: false;
  generatedLedgerWrites: false;
  payloadCreationAllowed: false;
  serverUploadAllowed: false;
  firebaseUploadAllowed: false;
  runtimeDownloadsEnabled: false;
  activationApproved: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
  openingEligible: boolean;
  openingState: OpeningState;
  readyForReviewerDecisionImportOpeningPreflight: boolean;
  readyForReviewerDecisionImportExecutionGate: boolean;
  readyForPayloadCreationApprovalPreflight: boolean;
  blockers: number;
  warnings: number;
};

type OpeningPreflightContract = {
  schemaVersion: 'gustav-reviewer-decision-import-opening-preflight-v2';
  runId: string;
  targetLocale: 'fr';
  studyTarget: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  preflightMode: 'dry_run_only';
  openingPolicy: {
    requiresDecisionImportDryRunV2Ready: true;
    requiresRuntimeCacheIntegrityRollbackV2Ready: true;
    requiresFullRowDecisionCoverage: true;
    requiresFullAiDecisionCoverage: true;
    requiresZeroBlankDecisionRows: true;
    requiresNoOpenImportApplyActivationFlags: true;
    requiresRejectedFreshAiOutputBlocked: true;
  };
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
  nextRequiredGate: 'reviewer_decision_import_execution_gate_v2_or_llm_official_source_review_intake';
};

type Report = {
  schemaVersion: 'gustav-reviewer-decision-import-opening-preflight-v2-packet-v0';
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
    rowDecisionFileDefaultUsed: boolean;
    aiDecisionFileDefaultUsed: boolean;
    fixtureProbesPassed: number;
    fixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  contract: OpeningPreflightContract;
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

const ROW_ALLOWED = [
  'accept_quality_gates',
  'needs_regeneration',
  'needs_llm_regeneration_review',
  'reject_candidate',
  'skip_for_later',
] as const;

const AI_ALLOWED = [
  'accept_contract',
  'needs_prompt_rewrite',
  'needs_gate_fix',
  'reject_contract',
  'skip_for_later',
] as const;

const REQUIRED_ROW_DECISIONS = 1600;
const REQUIRED_AI_DECISIONS = 164;
const REQUIRED_AI_CACHE_DIMENSIONS = [
  'targetLocale',
  'targetStudyLanguage',
  'sourceLocales',
  'uiLocale',
  'domainId',
  'entrypointFile',
] as const;

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

function runPath(runDir: string, relativePath: string): string {
  return path.join(runDir, ...relativePath.split('/'));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function parseJsonl<T>(filePath: string): T[] {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
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

function addFinding(
  findings: Finding[],
  severity: Severity,
  code: string,
  message: string,
  scope: Finding['scope'] = 'contract',
  identity?: string,
): void {
  findings.push({ severity, code, message, scope, identity });
}

function sameSourceLocales(value: string[]): boolean {
  return JSON.stringify(value) === JSON.stringify(['ru', 'uk']);
}

function hasReviewerMetadata(row: { reviewerName: string; reviewedAt: string }): boolean {
  return Boolean(row.reviewerName.trim() && row.reviewedAt.trim());
}

function hasRowCorrection(row: RowDecision): boolean {
  return Boolean(
    row.correctedTargetText.trim() ||
    row.correctedQuizBlank.trim() ||
    row.correctedQuizCorrect.trim() ||
    row.correctedQuizDistractors.trim(),
  );
}

function gatesReviewed(requiredGateIds: string[], gateReviewerDecisions: Record<string, string>): boolean {
  return requiredGateIds.every((gateId) => {
    const value = gateReviewerDecisions[gateId];
    return typeof value === 'string' && value.trim() !== '' && value !== 'unreviewed';
  });
}

function gateMapCoversRequired(requiredGateIds: string[], gateReviewerDecisions: Record<string, string>): boolean {
  return requiredGateIds.every((gateId) => Object.prototype.hasOwnProperty.call(gateReviewerDecisions, gateId));
}

function aiCoreGatesReviewed(row: AiDecision): boolean {
  return [row.wrongLanguageGateDecision, row.cacheLanguageGateDecision, row.liveReturnGateDecision]
    .every((value) => value.trim() !== '' && value !== 'unreviewed');
}

function rowKey(row: RowDecision): string {
  return `${row.sourceQueueIndex}:${row.schemaRowId}:${row.phraseId}`;
}

function aiKey(row: AiDecision): string {
  return `${row.aiTemplateIndex}:${row.contractId}`;
}

function emptyEvaluation(prerequisites: Prerequisites): Evaluation {
  return {
    rowDecisionRows: 0,
    aiDecisionRows: 0,
    reviewedRowDecisionRows: 0,
    reviewedAiDecisionRows: 0,
    acceptedRowDecisionRows: 0,
    acceptedAiDecisionRows: 0,
    nonAcceptedReviewedRowDecisionRows: 0,
    nonAcceptedReviewedAiDecisionRows: 0,
    blankRowDecisionRows: 0,
    blankAiDecisionRows: 0,
    rowImportCandidateRows: 0,
    aiImportCandidateRows: 0,
    rowNoOpRows: 0,
    aiNoOpRows: 0,
    rowWrongTargetRows: 0,
    aiWrongTargetRows: 0,
    rowWrongSourceLocaleRows: 0,
    aiWrongSourceLocaleRows: 0,
    rowDuplicateDecisionRows: 0,
    aiDuplicateDecisionRows: 0,
    rowAcceptedWithUnreviewedGates: 0,
    aiAcceptedWithUnreviewedGates: 0,
    rowCorrectionPayloadRows: 0,
    aiRejectedFreshReturnOpenRows: 0,
    aiRejectedFreshCacheOpenRows: 0,
    targetOutputBeforeQualityOpenRows: 0,
    reviewerImportOpenFlags: 0,
    productionApplyOpenFlags: 0,
    activationApprovedFlags: 0,
    fullRowReviewCoverage: false,
    fullAiReviewCoverage: false,
    fullAcceptedRowReviewCoverage: false,
    fullAcceptedAiReviewCoverage: false,
    dryRunReady: prerequisites.dryRunReady,
    runtimeCacheIntegrityReady: prerequisites.runtimeCacheIntegrityReady,
    reviewerDecisionImportAllowedNow: false,
    generatedLedgerWrites: false,
    payloadCreationAllowed: false,
    serverUploadAllowed: false,
    firebaseUploadAllowed: false,
    runtimeDownloadsEnabled: false,
    activationApproved: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
    openingEligible: false,
    openingState: 'blocked_by_findings',
    readyForReviewerDecisionImportOpeningPreflight: false,
    readyForReviewerDecisionImportExecutionGate: false,
    readyForPayloadCreationApprovalPreflight: false,
    blockers: 0,
    warnings: 0,
  };
}

function evaluate(
  schema: WorkflowSchema,
  rowDecisions: RowDecision[],
  aiDecisions: AiDecision[],
  prerequisites: Prerequisites,
): { metrics: Evaluation; findings: Finding[] } {
  const metrics = emptyEvaluation(prerequisites);
  const findings: Finding[] = [];
  metrics.rowDecisionRows = rowDecisions.length;
  metrics.aiDecisionRows = aiDecisions.length;

  if (!prerequisites.dryRunReady || !prerequisites.dryRunClosed) {
    addFinding(findings, 'blocker', 'reviewer_decision_import_dry_run_not_ready', 'P13 dry-run must be ready and closed before P17 opening preflight.');
  }
  if (!prerequisites.runtimeCacheIntegrityReady || !prerequisites.runtimeClosed) {
    addFinding(findings, 'blocker', 'runtime_cache_integrity_not_ready', 'P16 runtime cache integrity/rollback must be ready and closed before P17 opening preflight.');
  }
  if (schema.schemaVersion !== 'gustav-reviewer-workflow-v2-decision-schema-v0') {
    addFinding(findings, 'blocker', 'schema_version_invalid', 'Reviewer Workflow V2 schemaVersion is invalid.');
  }
  if (schema.targetLocale !== 'fr' || schema.targetStudyLanguage !== 'fr') {
    addFinding(findings, 'blocker', 'schema_target_invalid', 'Reviewer Workflow V2 schema must be scoped to target French only.');
  }
  if (!sameSourceLocales(schema.sourceLocales)) {
    addFinding(findings, 'blocker', 'schema_source_locales_invalid', 'Reviewer Workflow V2 schema must keep sourceLocaleCoverage exactly ru,uk.');
  }
  if (JSON.stringify(schema.allowedRowReviewerDecisions) !== JSON.stringify(ROW_ALLOWED)) {
    addFinding(findings, 'blocker', 'row_allowed_decisions_mismatch', 'Row reviewer decisions do not match the V2 opening preflight contract.');
  }
  if (JSON.stringify(schema.allowedAiReviewerDecisions) !== JSON.stringify(AI_ALLOWED)) {
    addFinding(findings, 'blocker', 'ai_allowed_decisions_mismatch', 'AI reviewer decisions do not match the V2 opening preflight contract.');
  }
  if (
    schema.activationPolicy.reviewerWorkflowAloneMayImportDecisions ||
    schema.activationPolicy.reviewerWorkflowAloneMayApplyProduction ||
    schema.activationPolicy.reviewerWorkflowAloneMayStartGeneration ||
    schema.activationApproved ||
    schema.readyForDecisionImportV2 ||
    schema.readyForGenerationV2 ||
    schema.readyForApply ||
    schema.mayModifyProductionAppFiles
  ) {
    addFinding(findings, 'blocker', 'schema_dangerous_flag_open', 'Reviewer schema alone must not open import, generation, activation or apply.');
  }
  if (rowDecisions.length !== REQUIRED_ROW_DECISIONS) {
    addFinding(findings, 'blocker', 'row_decision_count_invalid', `Expected ${REQUIRED_ROW_DECISIONS} row decisions, found ${rowDecisions.length}.`);
  }
  if (aiDecisions.length !== REQUIRED_AI_DECISIONS) {
    addFinding(findings, 'blocker', 'ai_decision_count_invalid', `Expected ${REQUIRED_AI_DECISIONS} AI decisions, found ${aiDecisions.length}.`);
  }

  const seenRows = new Set<string>();
  for (const row of rowDecisions) {
    const identity = `${row.lessonId}:${row.phraseId}`;
    const decision = row.reviewerDecision.trim();
    const correction = hasRowCorrection(row);
    const key = rowKey(row);
    if (seenRows.has(key)) {
      metrics.rowDuplicateDecisionRows += 1;
      addFinding(findings, 'blocker', 'row_duplicate_decision', 'Duplicate row decision identity.', 'row', identity);
    }
    seenRows.add(key);
    if (row.reviewScope !== 'row') {
      addFinding(findings, 'blocker', 'row_scope_invalid', 'Row decision must use reviewScope=row.', 'row', identity);
    }
    if (row.studyTarget !== 'fr') {
      metrics.rowWrongTargetRows += 1;
      addFinding(findings, 'blocker', 'row_wrong_study_target', 'Row decision studyTarget must be fr.', 'row', identity);
    }
    if (!sameSourceLocales(row.sourceLocaleCoverage)) {
      metrics.rowWrongSourceLocaleRows += 1;
      addFinding(findings, 'blocker', 'row_wrong_source_locale_coverage', 'Row decision sourceLocaleCoverage must be exactly ru,uk.', 'row', identity);
    }
    if (!row.schemaRowId || !row.qualityRowId || !row.sourceMeaningHash || !row.grammarClusterId || !row.requiredTransformationType) {
      addFinding(findings, 'blocker', 'row_required_identity_or_quality_field_missing', 'Row decision is missing required identity/quality fields.', 'row', identity);
    }
    if (row.researchEvidenceIds.length < 1 || row.requiredGateIds.length < 1) {
      addFinding(findings, 'blocker', 'row_research_or_gate_refs_missing', 'Row decision must bind researchEvidenceIds and requiredGateIds.', 'row', identity);
    }
    if (!gateMapCoversRequired(row.requiredGateIds, row.gateReviewerDecisions)) {
      addFinding(findings, 'blocker', 'row_gate_map_incomplete', 'Row gateReviewerDecisions must contain every requiredGateId.', 'row', identity);
    }
    if (row.reviewerImportAllowed) metrics.reviewerImportOpenFlags += 1;
    if (row.productionApplyAllowed) metrics.productionApplyOpenFlags += 1;
    if (row.activationApproved) metrics.activationApprovedFlags += 1;
    if (row.currentActivationStatus !== 'blocked' || row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved) {
      addFinding(findings, 'blocker', 'row_import_apply_activation_open', 'Row decision must keep import/apply/activation closed.', 'row', identity);
    }
    if (!decision) {
      metrics.blankRowDecisionRows += 1;
      if (correction || row.reviewerNotes.trim() || row.reviewerName.trim() || row.reviewedAt.trim()) {
        addFinding(findings, 'blocker', 'row_blank_decision_has_payload', 'Blank row decision must not contain corrections or reviewer metadata.', 'row', identity);
      } else {
        metrics.rowNoOpRows += 1;
      }
      continue;
    }
    metrics.reviewedRowDecisionRows += 1;
    if (!ROW_ALLOWED.includes(decision as typeof ROW_ALLOWED[number])) {
      addFinding(findings, 'blocker', 'row_decision_invalid', `Row reviewerDecision is not allowed: ${decision}.`, 'row', identity);
      continue;
    }
    if (decision === 'accept_quality_gates') metrics.acceptedRowDecisionRows += 1;
    else metrics.nonAcceptedReviewedRowDecisionRows += 1;
    if (!hasReviewerMetadata(row)) {
      addFinding(findings, 'blocker', 'row_reviewer_metadata_missing', 'Reviewed row decision must include reviewerName and reviewedAt.', 'row', identity);
    }
    if (correction) metrics.rowCorrectionPayloadRows += 1;
    if (decision === 'accept_quality_gates') {
      if (correction) {
        addFinding(findings, 'blocker', 'row_accept_has_correction_payload', 'accept_quality_gates cannot include corrected fields.', 'row', identity);
      }
      if (!gatesReviewed(row.requiredGateIds, row.gateReviewerDecisions)) {
        metrics.rowAcceptedWithUnreviewedGates += 1;
        addFinding(findings, 'blocker', 'row_accept_has_unreviewed_gates', 'accept_quality_gates requires all row gates reviewed.', 'row', identity);
      }
    } else if (!row.reviewerNotes.trim()) {
      addFinding(findings, 'blocker', 'row_non_accept_notes_missing', `${decision} row decisions require reviewerNotes.`, 'row', identity);
    }
    if (correction && decision !== 'needs_llm_regeneration_review') {
      addFinding(findings, 'blocker', 'row_correction_for_wrong_decision', 'Corrected row fields are only allowed for needs_llm_regeneration_review.', 'row', identity);
    }
    if (correction && !row.reviewerNotes.trim()) {
      addFinding(findings, 'blocker', 'row_correction_notes_missing', 'Corrected row fields require reviewerNotes.', 'row', identity);
    }
    metrics.rowImportCandidateRows += 1;
  }

  const seenAi = new Set<string>();
  for (const row of aiDecisions) {
    const identity = `${row.aiTemplateIndex}:${row.contractId}`;
    const decision = row.reviewerDecision.trim();
    const key = aiKey(row);
    if (seenAi.has(key)) {
      metrics.aiDuplicateDecisionRows += 1;
      addFinding(findings, 'blocker', 'ai_duplicate_decision', 'Duplicate AI decision identity.', 'ai_prompt', identity);
    }
    seenAi.add(key);
    if (row.reviewScope !== 'ai_prompt') {
      addFinding(findings, 'blocker', 'ai_scope_invalid', 'AI decision must use reviewScope=ai_prompt.', 'ai_prompt', identity);
    }
    if (row.studyTarget !== 'fr') {
      metrics.aiWrongTargetRows += 1;
      addFinding(findings, 'blocker', 'ai_wrong_study_target', 'AI decision studyTarget must be fr.', 'ai_prompt', identity);
    }
    if (!sameSourceLocales(row.sourceLocaleCoverage)) {
      metrics.aiWrongSourceLocaleRows += 1;
      addFinding(findings, 'blocker', 'ai_wrong_source_locale_coverage', 'AI decision sourceLocaleCoverage must be exactly ru,uk.', 'ai_prompt', identity);
    }
    if (!row.aiQualityGateId || !row.contractId || !row.domainId || !row.filePath || row.requiredGateIds.length < 1) {
      addFinding(findings, 'blocker', 'ai_required_identity_or_quality_field_missing', 'AI decision is missing required identity/quality fields.', 'ai_prompt', identity);
    }
    for (const dimension of REQUIRED_AI_CACHE_DIMENSIONS) {
      if (!row.cacheKeyDimensionsRequired.includes(dimension)) {
        addFinding(findings, 'blocker', 'ai_cache_key_dimension_missing', `AI cache key dimensions must include ${dimension}.`, 'ai_prompt', identity);
      }
    }
    if (row.reviewerImportAllowed) metrics.reviewerImportOpenFlags += 1;
    if (row.productionApplyAllowed) metrics.productionApplyOpenFlags += 1;
    if (row.activationApproved) metrics.activationApprovedFlags += 1;
    if (row.currentActivationStatus !== 'blocked' || row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved) {
      addFinding(findings, 'blocker', 'ai_import_apply_activation_open', 'AI decision must keep import/apply/activation closed.', 'ai_prompt', identity);
    }
    if (row.rejectedFreshOutputMayReturn) {
      metrics.aiRejectedFreshReturnOpenRows += 1;
      addFinding(findings, 'blocker', 'ai_rejected_fresh_return_open', 'Rejected fresh AI output must not return live.', 'ai_prompt', identity);
    }
    if (row.rejectedFreshOutputMayBeCached) {
      metrics.aiRejectedFreshCacheOpenRows += 1;
      addFinding(findings, 'blocker', 'ai_rejected_fresh_cache_open', 'Rejected fresh AI output must not be cached.', 'ai_prompt', identity);
    }
    if (row.targetOutputAllowedBeforeQualityPass) {
      metrics.targetOutputBeforeQualityOpenRows += 1;
      addFinding(findings, 'blocker', 'ai_target_output_before_quality_open', 'AI target output must remain blocked before quality gates pass.', 'ai_prompt', identity);
    }
    if (!decision) {
      metrics.blankAiDecisionRows += 1;
      if (
        row.reviewerNotes.trim() ||
        row.reviewerName.trim() ||
        row.reviewedAt.trim() ||
        row.wrongLanguageGateDecision !== 'unreviewed' ||
        row.cacheLanguageGateDecision !== 'unreviewed' ||
        row.liveReturnGateDecision !== 'unreviewed'
      ) {
        addFinding(findings, 'blocker', 'ai_blank_decision_has_payload', 'Blank AI decision must not include gate decisions or reviewer metadata.', 'ai_prompt', identity);
      } else {
        metrics.aiNoOpRows += 1;
      }
      continue;
    }
    metrics.reviewedAiDecisionRows += 1;
    if (!AI_ALLOWED.includes(decision as typeof AI_ALLOWED[number])) {
      addFinding(findings, 'blocker', 'ai_decision_invalid', `AI reviewerDecision is not allowed: ${decision}.`, 'ai_prompt', identity);
      continue;
    }
    if (decision === 'accept_contract') metrics.acceptedAiDecisionRows += 1;
    else metrics.nonAcceptedReviewedAiDecisionRows += 1;
    if (!hasReviewerMetadata(row)) {
      addFinding(findings, 'blocker', 'ai_reviewer_metadata_missing', 'Reviewed AI decision must include reviewerName and reviewedAt.', 'ai_prompt', identity);
    }
    if (decision === 'accept_contract') {
      if (!aiCoreGatesReviewed(row)) {
        metrics.aiAcceptedWithUnreviewedGates += 1;
        addFinding(findings, 'blocker', 'ai_accept_has_unreviewed_gates', 'accept_contract requires wrong-language, cache-language and live-return gates reviewed.', 'ai_prompt', identity);
      }
    } else if (!row.reviewerNotes.trim()) {
      addFinding(findings, 'blocker', 'ai_non_accept_notes_missing', `${decision} AI decisions require reviewerNotes.`, 'ai_prompt', identity);
    }
    metrics.aiImportCandidateRows += 1;
  }

  metrics.fullRowReviewCoverage =
    metrics.rowDecisionRows === REQUIRED_ROW_DECISIONS &&
    metrics.reviewedRowDecisionRows === metrics.rowDecisionRows &&
    metrics.blankRowDecisionRows === 0 &&
    metrics.rowImportCandidateRows === metrics.rowDecisionRows;
  metrics.fullAiReviewCoverage =
    metrics.aiDecisionRows === REQUIRED_AI_DECISIONS &&
    metrics.reviewedAiDecisionRows === metrics.aiDecisionRows &&
    metrics.blankAiDecisionRows === 0 &&
    metrics.aiImportCandidateRows === metrics.aiDecisionRows;
  metrics.fullAcceptedRowReviewCoverage =
    metrics.fullRowReviewCoverage &&
    metrics.acceptedRowDecisionRows === metrics.rowDecisionRows &&
    metrics.nonAcceptedReviewedRowDecisionRows === 0;
  metrics.fullAcceptedAiReviewCoverage =
    metrics.fullAiReviewCoverage &&
    metrics.acceptedAiDecisionRows === metrics.aiDecisionRows &&
    metrics.nonAcceptedReviewedAiDecisionRows === 0;
  metrics.blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  metrics.warnings = findings.filter((finding) => finding.severity === 'warning').length;
  metrics.openingEligible =
    metrics.blockers === 0 &&
    metrics.dryRunReady &&
    metrics.runtimeCacheIntegrityReady &&
    metrics.fullRowReviewCoverage &&
    metrics.fullAiReviewCoverage;
  if (metrics.blockers > 0) {
    metrics.openingState = 'blocked_by_findings';
  } else if (metrics.openingEligible) {
    metrics.openingState = 'eligible_after_reviewed_decisions';
  } else if (metrics.reviewedRowDecisionRows + metrics.reviewedAiDecisionRows === 0) {
    metrics.openingState = 'closed_no_reviewed_decisions';
  } else {
    metrics.openingState = 'closed_partial_review_coverage';
  }
  metrics.readyForReviewerDecisionImportOpeningPreflight = metrics.blockers === 0;
  metrics.readyForReviewerDecisionImportExecutionGate = metrics.openingEligible;
  metrics.readyForPayloadCreationApprovalPreflight =
    metrics.openingEligible &&
    metrics.fullAcceptedRowReviewCoverage &&
    metrics.fullAcceptedAiReviewCoverage;
  return { metrics, findings };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function reviewRow(row: RowDecision, decision: typeof ROW_ALLOWED[number] = 'accept_quality_gates'): RowDecision {
  const draft = clone(row);
  draft.reviewerDecision = decision;
  draft.reviewerName = 'fixture_reviewer';
  draft.reviewedAt = '2026-06-26T00:00:00.000Z';
  if (decision === 'accept_quality_gates') {
    draft.gateReviewerDecisions = Object.fromEntries(draft.requiredGateIds.map((gateId) => [gateId, 'pass']));
    draft.reviewerNotes = '';
  } else {
    draft.reviewerNotes = 'Fixture reviewer note.';
  }
  return draft;
}

function reviewAi(row: AiDecision, decision: typeof AI_ALLOWED[number] = 'accept_contract'): AiDecision {
  const draft = clone(row);
  draft.reviewerDecision = decision;
  draft.reviewerName = 'fixture_reviewer';
  draft.reviewedAt = '2026-06-26T00:00:00.000Z';
  if (decision === 'accept_contract') {
    draft.wrongLanguageGateDecision = 'pass';
    draft.cacheLanguageGateDecision = 'pass';
    draft.liveReturnGateDecision = 'pass';
    draft.reviewerNotes = '';
  } else {
    draft.reviewerNotes = 'Fixture reviewer note.';
  }
  return draft;
}

function makeProbe(
  id: string,
  expectedAccept: boolean,
  schema: WorkflowSchema,
  rowDecisions: RowDecision[],
  aiDecisions: AiDecision[],
  prerequisites: Prerequisites,
  mutate?: (fixture: { schema: WorkflowSchema; rows: RowDecision[]; ai: AiDecision[]; prerequisites: Prerequisites }) => void,
): Probe {
  const fixture = {
    schema: clone(schema),
    rows: clone(rowDecisions),
    ai: clone(aiDecisions),
    prerequisites: clone(prerequisites),
  };
  mutate?.(fixture);
  const evaluation = evaluate(fixture.schema, fixture.rows, fixture.ai, fixture.prerequisites).metrics;
  const accepted = evaluation.blockers === 0;
  return {
    id,
    expectedAccept,
    accepted,
    openingEligible: evaluation.openingEligible,
    openingState: evaluation.openingState,
    blockers: evaluation.blockers,
    passed: accepted === expectedAccept,
  };
}

function makeProbes(schema: WorkflowSchema, rows: RowDecision[], ai: AiDecision[], prerequisites: Prerequisites): Probe[] {
  const probes: Probe[] = [
    makeProbe('canonical_blank_noop_preflight_accepts_closed_state', true, schema, rows, ai, prerequisites),
    makeProbe('all_reviewed_opening_eligible_accepts', true, schema, rows, ai, prerequisites, (fixture) => {
      fixture.rows = fixture.rows.map((row) => reviewRow(row));
      fixture.ai = fixture.ai.map((row) => reviewAi(row));
    }),
    makeProbe('wrong_row_target_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.rows[0].studyTarget = 'en'; }),
    makeProbe('wrong_ai_target_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.ai[0].studyTarget = 'en'; }),
    makeProbe('wrong_source_locale_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.rows[0].sourceLocaleCoverage = ['ru']; }),
    makeProbe('row_accept_missing_gate_reviews_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.rows[0] = reviewRow(fixture.rows[0]); fixture.rows[0].gateReviewerDecisions[fixture.rows[0].requiredGateIds[0]] = 'unreviewed'; }),
    makeProbe('row_accept_with_correction_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.rows[0] = reviewRow(fixture.rows[0]); fixture.rows[0].correctedTargetText = 'Fixture correction'; }),
    makeProbe('ai_accept_missing_core_gate_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.ai[0] = reviewAi(fixture.ai[0]); fixture.ai[0].wrongLanguageGateDecision = 'unreviewed'; }),
    makeProbe('ai_rejected_fresh_return_open_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.ai[0].rejectedFreshOutputMayReturn = true; }),
    makeProbe('ai_rejected_fresh_cache_open_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.ai[0].rejectedFreshOutputMayBeCached = true; }),
    makeProbe('ai_target_output_before_quality_open_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.ai[0].targetOutputAllowedBeforeQualityPass = true; }),
    makeProbe('reviewer_import_open_flag_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.rows[0].reviewerImportAllowed = true; }),
    makeProbe('production_apply_open_flag_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.ai[0].productionApplyAllowed = true; }),
    makeProbe('activation_open_flag_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.rows[0].activationApproved = true; }),
    makeProbe('dry_run_not_ready_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.prerequisites.dryRunReady = false; }),
    makeProbe('runtime_cache_gate_not_ready_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.prerequisites.runtimeCacheIntegrityReady = false; }),
    makeProbe('duplicate_row_decision_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.rows.push(clone(fixture.rows[0])); }),
    makeProbe('duplicate_ai_decision_rejected', false, schema, rows, ai, prerequisites, (fixture) => { fixture.ai.push(clone(fixture.ai[0])); }),
  ];
  return probes;
}

function buildContract(runId: string): OpeningPreflightContract {
  return {
    schemaVersion: 'gustav-reviewer-decision-import-opening-preflight-v2',
    runId,
    targetLocale: 'fr',
    studyTarget: 'fr',
    sourceLocales: ['ru', 'uk'],
    preflightMode: 'dry_run_only',
    openingPolicy: {
      requiresDecisionImportDryRunV2Ready: true,
      requiresRuntimeCacheIntegrityRollbackV2Ready: true,
      requiresFullRowDecisionCoverage: true,
      requiresFullAiDecisionCoverage: true,
      requiresZeroBlankDecisionRows: true,
      requiresNoOpenImportApplyActivationFlags: true,
      requiresRejectedFreshAiOutputBlocked: true,
    },
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
    nextRequiredGate: 'reviewer_decision_import_execution_gate_v2_or_llm_official_source_review_intake',
  };
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Reviewer Decision Import Opening Preflight V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Target locale: ${report.summary.targetLocale}`,
    `- Source locales: ${report.summary.sourceLocales}`,
    `- Opening state: ${report.summary.openingState}`,
    `- Opening eligible: ${report.summary.openingEligible ? 'yes' : 'no'}`,
    `- Row decisions: ${report.summary.rowDecisionRows}`,
    `- AI decisions: ${report.summary.aiDecisionRows}`,
    `- Reviewed row decisions: ${report.summary.reviewedRowDecisionRows}`,
    `- Reviewed AI decisions: ${report.summary.reviewedAiDecisionRows}`,
    `- Accepted row decisions: ${report.summary.acceptedRowDecisionRows}`,
    `- Accepted AI decisions: ${report.summary.acceptedAiDecisionRows}`,
    `- Non-accepted reviewed row decisions: ${report.summary.nonAcceptedReviewedRowDecisionRows}`,
    `- Non-accepted reviewed AI decisions: ${report.summary.nonAcceptedReviewedAiDecisionRows}`,
    `- Blank row decisions: ${report.summary.blankRowDecisionRows}`,
    `- Blank AI decisions: ${report.summary.blankAiDecisionRows}`,
    `- Full row review coverage: ${report.summary.fullRowReviewCoverage ? 'yes' : 'no'}`,
    `- Full AI review coverage: ${report.summary.fullAiReviewCoverage ? 'yes' : 'no'}`,
    `- Full accepted row review coverage: ${report.summary.fullAcceptedRowReviewCoverage ? 'yes' : 'no'}`,
    `- Full accepted AI review coverage: ${report.summary.fullAcceptedAiReviewCoverage ? 'yes' : 'no'}`,
    `- P13 dry-run ready: ${report.summary.dryRunReady ? 'yes' : 'no'}`,
    `- P16 runtime cache integrity ready: ${report.summary.runtimeCacheIntegrityReady ? 'yes' : 'no'}`,
    `- Reviewer decision import allowed now: ${report.summary.reviewerDecisionImportAllowedNow ? 'yes' : 'no'}`,
    `- Generated ledger writes: ${report.summary.generatedLedgerWrites ? 'yes' : 'no'}`,
    `- Payload creation allowed: ${report.summary.payloadCreationAllowed ? 'yes' : 'no'}`,
    `- Server upload allowed: ${report.summary.serverUploadAllowed ? 'yes' : 'no'}`,
    `- Runtime downloads enabled: ${report.summary.runtimeDownloadsEnabled ? 'yes' : 'no'}`,
    `- Activation approved flags: ${report.summary.activationApprovedFlags}`,
    `- Ready for opening preflight: ${report.summary.readyForReviewerDecisionImportOpeningPreflight ? 'yes' : 'no'}`,
    `- Ready for import execution gate: ${report.summary.readyForReviewerDecisionImportExecutionGate ? 'yes' : 'no'}`,
    `- Ready for payload creation approval preflight: ${report.summary.readyForPayloadCreationApprovalPreflight ? 'yes' : 'no'}`,
    `- Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Probes',
    '',
  ];
  for (const probe of report.probes) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (accepted=${probe.accepted}, opening=${probe.openingState}, blockers=${probe.blockers})`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      const suffix = finding.identity ? ` [${finding.scope ?? 'contract'}:${finding.identity}]` : '';
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${suffix}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet is a dry-run preflight only.',
    '- It does not import reviewer decisions.',
    '- It does not mutate generated ledgers.',
    '- It does not create payload shards.',
    '- It does not upload to Firebase/server.',
    '- It does not enable runtime downloads or approve production apply.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_reviewer_decision_import_opening_preflight_v2_packet.ts --run <run-dir> --target fr');
  }
  if (target !== 'fr') {
    throw new Error('P17 reviewer decision import opening preflight is scoped to --target fr.');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  ensureDir(auditsDir);

  const workflowSchemaPath = path.join(reviewerDir, 'reviewer_workflow_v2_decision_schema.json');
  const defaultRowDecisionPath = path.join(reviewerDir, 'reviewer_decision_template_v2.jsonl');
  const defaultAiDecisionPath = path.join(reviewerDir, 'reviewer_ai_decision_template_v2.jsonl');
  const rowDecisionArg = argValue('--row-decisions');
  const aiDecisionArg = argValue('--ai-decisions');
  const rowDecisionPath = rowDecisionArg ? path.resolve(repoRoot, rowDecisionArg) : defaultRowDecisionPath;
  const aiDecisionPath = aiDecisionArg ? path.resolve(repoRoot, aiDecisionArg) : defaultAiDecisionPath;
  const dryRunPath = path.join(auditsDir, 'reviewer_decision_import_v2_dry_run.json');
  const runtimeCachePath = path.join(auditsDir, 'runtime_cache_integrity_rollback_v2_packet.json');
  const outJson = path.join(auditsDir, 'reviewer_decision_import_opening_preflight_v2_packet.json');
  const outMd = path.join(auditsDir, 'reviewer_decision_import_opening_preflight_v2_packet.md');

  for (const filePath of [workflowSchemaPath, rowDecisionPath, aiDecisionPath, dryRunPath, runtimeCachePath]) {
    if (!fs.existsSync(filePath)) throw new Error(`Required P17 input is missing: ${rel(repoRoot, filePath)}`);
  }

  const schema = readJson<WorkflowSchema>(workflowSchemaPath);
  const rowDecisions = parseJsonl<RowDecision>(rowDecisionPath);
  const aiDecisions = parseJsonl<AiDecision>(aiDecisionPath);
  const dryRun = readJson<JsonObject>(dryRunPath);
  const dryRunSummary = object(dryRun.summary);
  const runtimeCache = readJson<JsonObject>(runtimeCachePath);
  const runtimeSummary = object(runtimeCache.summary);
  const prerequisites: Prerequisites = {
    dryRunReady: n(dryRunSummary, 'blockers') === 0 && b(dryRunSummary, 'readyForReviewerDecisionImportV2DryRun'),
    runtimeCacheIntegrityReady: n(runtimeSummary, 'blockers') === 0 && b(runtimeSummary, 'readyForReviewerDecisionImportOpeningGate'),
    dryRunClosed:
      n(dryRunSummary, 'reviewerImportOpenFlags') === 0 &&
      n(dryRunSummary, 'productionApplyOpenFlags') === 0 &&
      n(dryRunSummary, 'activationApprovedFlags') === 0 &&
      !b(dryRunSummary, 'generatedLedgerWrites') &&
      !b(dryRunSummary, 'serverUploadStarted') &&
      !b(dryRunSummary, 'firebaseUploadStarted') &&
      !b(dryRunSummary, 'runtimeDownloadsEnabled'),
    runtimeClosed:
      !b(runtimeSummary, 'runtimeDownloadsEnabled') &&
      !b(runtimeSummary, 'cacheWritesOpened') &&
      !b(runtimeSummary, 'readyCacheStateOpened') &&
      !b(runtimeSummary, 'serverUploadAllowed') &&
      n(runtimeSummary, 'activationApprovedFlags') === 0,
  };

  const contract = buildContract(runId);
  const evaluation = evaluate(schema, rowDecisions, aiDecisions, prerequisites);
  const probes = makeProbes(schema, rowDecisions, aiDecisions, prerequisites);
  const failedProbes = probes.filter((probe) => !probe.passed);
  const findings = [...evaluation.findings];
  for (const probe of failedProbes) {
    addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
  }
  addFinding(
    findings,
    'info',
    'opening_preflight_dry_run_only',
    'P17 classifies whether reviewer decision import could open after real reviewed decisions; it does not import decisions or open production transitions.',
  );

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const metrics: Evaluation = {
    ...evaluation.metrics,
    blockers,
    warnings,
    openingState: blockers > 0 ? 'blocked_by_findings' : evaluation.metrics.openingState,
    openingEligible: blockers === 0 && evaluation.metrics.openingEligible,
    readyForReviewerDecisionImportOpeningPreflight: blockers === 0,
    readyForReviewerDecisionImportExecutionGate: blockers === 0 && evaluation.metrics.openingEligible,
    readyForPayloadCreationApprovalPreflight: blockers === 0 && evaluation.metrics.readyForPayloadCreationApprovalPreflight,
  };

  const report: Report = {
    schemaVersion: 'gustav-reviewer-decision-import-opening-preflight-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      workflowSchema: rel(repoRoot, workflowSchemaPath),
      rowDecisionFile: rel(repoRoot, rowDecisionPath),
      aiDecisionFile: rel(repoRoot, aiDecisionPath),
      reviewerDecisionImportV2DryRun: rel(repoRoot, dryRunPath),
      runtimeCacheIntegrityRollbackV2Packet: rel(repoRoot, runtimeCachePath),
    },
    outputs: {
      reviewerDecisionImportOpeningPreflightV2PacketJson: rel(repoRoot, outJson),
      reviewerDecisionImportOpeningPreflightV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      rowDecisionFileDefaultUsed: path.resolve(rowDecisionPath) === path.resolve(defaultRowDecisionPath),
      aiDecisionFileDefaultUsed: path.resolve(aiDecisionPath) === path.resolve(defaultAiDecisionPath),
      fixtureProbesPassed: probes.filter((probe) => probe.passed).length,
      fixtureProbes: probes.length,
    },
    artifactHashes: {
      workflowSchema: sha256(workflowSchemaPath),
      rowDecisionFile: sha256(rowDecisionPath),
      aiDecisionFile: sha256(aiDecisionPath),
      reviewerDecisionImportV2DryRun: sha256(dryRunPath),
      runtimeCacheIntegrityRollbackV2Packet: sha256(runtimeCachePath),
    },
    contract,
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

  console.log(`GUSTAV reviewer decision import opening preflight V2 packet: ${report.status}`);
  console.log(`Opening state: ${report.summary.openingState}`);
  console.log(`Opening eligible: ${report.summary.openingEligible ? 'yes' : 'no'}`);
  console.log(`Reviewed row decisions: ${report.summary.reviewedRowDecisionRows}/${report.summary.rowDecisionRows}`);
  console.log(`Reviewed AI decisions: ${report.summary.reviewedAiDecisionRows}/${report.summary.aiDecisionRows}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for import execution gate: ${report.summary.readyForReviewerDecisionImportExecutionGate ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
