import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

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
  blockers: number;
  passed: boolean;
};

type QueueRow = {
  lessonId: number;
  phraseId: string;
  englishBase: string;
  russianMeaning: string;
  ukrainianMeaning: string;
  proposedFrench: string;
  quizBlank: string;
  quizCorrect: string;
  quizDistractors: string[];
  quizCategory: string;
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
  sourceMeanings: {
    ru: string;
    uk: string;
  };
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
  requiredRowIdentityFields: string[];
  requiredRowQualityFields: string[];
  requiredAiIdentityFields: string[];
  requiredAiQualityFields: string[];
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
  rowIdentityMismatchRows: number;
  rowContextMismatchRows: number;
  rowDuplicateDecisionRows: number;
  aiDuplicateDecisionRows: number;
  rowWrongTargetRows: number;
  aiWrongTargetRows: number;
  rowWrongSourceLocaleRows: number;
  aiWrongSourceLocaleRows: number;
  rowUnreviewedGateAcceptRows: number;
  aiUnreviewedGateAcceptRows: number;
  rowCorrectionPayloadRows: number;
  aiRejectedFreshReturnOpenRows: number;
  aiRejectedFreshCacheOpenRows: number;
  targetOutputBeforeQualityOpenRows: number;
  reviewerImportOpenFlags: number;
  productionApplyOpenFlags: number;
  activationApprovedFlags: number;
  generatedLedgerWrites: false;
  serverUploadStarted: false;
  firebaseUploadStarted: false;
  runtimeDownloadsEnabled: false;
  blockers: number;
  warnings: number;
  readyForDecisionImportV2: boolean;
  readyForReviewerDecisionImportV2DryRun: boolean;
  readyForPayloadShardMaterializationGate: boolean;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
};

type Report = {
  schemaVersion: 'gustav-reviewer-decision-import-v2-dry-run-packet-v0';
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
    workflowSchemaPresent: boolean;
    adminReviewerDeliverySurfaceReady: boolean;
    rowDecisionFileDefaultUsed: boolean;
    aiDecisionFileDefaultUsed: boolean;
    officialSourceContentCoverageV2Present: boolean;
    officialSourceContentCoverageV2Ready: boolean;
    officialSourceContentCoverageV2State: string;
    officialSourceContentCoverageV2AcceptedRows: number;
    officialSourceContentCoverageV2AcceptedAi: number;
    rowDecisionFilePromotedOfficialSourceUsed: boolean;
    aiDecisionFilePromotedOfficialSourceUsed: boolean;
    readyForOfficialSourceImportExecutionGateRefresh: boolean;
    allowedRowReviewerDecisions: number;
    allowedAiReviewerDecisions: number;
    rowFixtureProbesPassed: number;
    rowFixtureProbes: number;
    aiFixtureProbesPassed: number;
    aiFixtureProbes: number;
  };
  artifactHashes: Record<string, string>;
  probes: {
    row: Probe[];
    ai: Probe[];
  };
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    firebaseOrServerUploadStarted: false;
    runtimeDownloadsEnabled: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

let EXPECTED_AI_DECISIONS = 164;

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

const SOURCE_FILES = {
  adminReviewerDeliverySurfaceV2Packet: 'audits/admin_pack_delivery_surface_v2_packet.json',
  reviewerWorkflowV2Packet: 'audits/reviewer_workflow_v2_packet.json',
  officialSourceContentCoverageV2Packet: 'audits/french_official_source_content_coverage_v2_packet.json',
  workflowSchema: 'generated/fr/reviewer/reviewer_workflow_v2_decision_schema.json',
  rowDecisionTemplateV2: 'generated/fr/reviewer/reviewer_decision_template_v2.jsonl',
  aiDecisionTemplateV2: 'generated/fr/reviewer/reviewer_ai_decision_template_v2.jsonl',
  promotedOfficialSourceRowDecisionsV2: 'generated/fr/reviewer/llm_official_source_promoted_decisions_v2/row_decisions_reviewed_v2.jsonl',
  promotedOfficialSourceAiDecisionsV2: 'generated/fr/reviewer/llm_official_source_promoted_decisions_v2/ai_decisions_reviewed_v2.jsonl',
  reviewerQueue: 'generated/fr/reviewer/french_reviewer_queue.jsonl',
} as const;

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

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

function parseJsonl<T>(filePath: string): T[] {
  const text = readText(filePath).trim();
  if (!text) return [];
  return text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as T);
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(filePath: string): string {
  return fs.existsSync(filePath)
    ? crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
    : '';
}

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function b(value: JsonObject, key: string): boolean {
  const raw = value[key];
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
  return false;
}

function n(value: JsonObject, key: string): number {
  const raw = value[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) return Number(raw);
  return 0;
}

function s(value: JsonObject, key: string): string {
  const raw = value[key];
  return typeof raw === 'string' ? raw : '';
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

function rowKey(row: Pick<RowDecision, 'sourceQueueIndex' | 'schemaRowId' | 'phraseId'>): string {
  return `${row.sourceQueueIndex}:${row.schemaRowId}:${row.phraseId}`;
}

function aiKey(row: Pick<AiDecision, 'aiTemplateIndex' | 'contractId'>): string {
  return `${row.aiTemplateIndex}:${row.contractId}`;
}

function hasRowCorrection(row: RowDecision): boolean {
  return Boolean(
    row.correctedTargetText.trim() ||
    row.correctedQuizBlank.trim() ||
    row.correctedQuizCorrect.trim() ||
    row.correctedQuizDistractors.trim(),
  );
}

function hasReviewerMetadata(row: { reviewerName: string; reviewedAt: string }): boolean {
  return Boolean(row.reviewerName.trim() && row.reviewedAt.trim());
}

function gateMapCoversRequired(requiredGateIds: string[], gateReviewerDecisions: Record<string, string>): boolean {
  return requiredGateIds.every((gateId) => Object.prototype.hasOwnProperty.call(gateReviewerDecisions, gateId));
}

function gatesReviewed(requiredGateIds: string[], gateReviewerDecisions: Record<string, string>): boolean {
  return requiredGateIds.every((gateId) => {
    const value = gateReviewerDecisions[gateId];
    return typeof value === 'string' && value.trim() !== '' && value !== 'unreviewed';
  });
}

function aiCoreGatesReviewed(row: AiDecision): boolean {
  return [row.wrongLanguageGateDecision, row.cacheLanguageGateDecision, row.liveReturnGateDecision]
    .every((value) => value.trim() !== '' && value !== 'unreviewed');
}

function hasRowContextMismatch(queueRow: QueueRow, row: RowDecision): boolean {
  return (
    queueRow.lessonId !== row.lessonId ||
    queueRow.phraseId !== row.phraseId ||
    queueRow.englishBase !== row.sourceGraphEnglishBase ||
    queueRow.russianMeaning !== row.sourceMeanings.ru ||
    queueRow.ukrainianMeaning !== row.sourceMeanings.uk ||
    queueRow.proposedFrench !== row.candidateTargetText ||
    queueRow.quizBlank !== row.candidateQuiz.blank ||
    queueRow.quizCorrect !== row.candidateQuiz.correct ||
    queueRow.quizCategory !== row.candidateQuiz.category ||
    JSON.stringify(queueRow.quizDistractors) !== JSON.stringify(row.candidateQuiz.distractors)
  );
}

function makeEmptyEvaluation(): Evaluation {
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
    rowIdentityMismatchRows: 0,
    rowContextMismatchRows: 0,
    rowDuplicateDecisionRows: 0,
    aiDuplicateDecisionRows: 0,
    rowWrongTargetRows: 0,
    aiWrongTargetRows: 0,
    rowWrongSourceLocaleRows: 0,
    aiWrongSourceLocaleRows: 0,
    rowUnreviewedGateAcceptRows: 0,
    aiUnreviewedGateAcceptRows: 0,
    rowCorrectionPayloadRows: 0,
    aiRejectedFreshReturnOpenRows: 0,
    aiRejectedFreshCacheOpenRows: 0,
    targetOutputBeforeQualityOpenRows: 0,
    reviewerImportOpenFlags: 0,
    productionApplyOpenFlags: 0,
    activationApprovedFlags: 0,
    generatedLedgerWrites: false,
    serverUploadStarted: false,
    firebaseUploadStarted: false,
    runtimeDownloadsEnabled: false,
    blockers: 0,
    warnings: 0,
    readyForDecisionImportV2: false,
    readyForReviewerDecisionImportV2DryRun: false,
    readyForPayloadShardMaterializationGate: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
}

function evaluate(
  schema: WorkflowSchema,
  queueRows: QueueRow[],
  rowDecisions: RowDecision[],
  aiDecisions: AiDecision[],
): { metrics: Evaluation; findings: Finding[] } {
  const metrics = makeEmptyEvaluation();
  const findings: Finding[] = [];
  metrics.rowDecisionRows = rowDecisions.length;
  metrics.aiDecisionRows = aiDecisions.length;

  if (schema.schemaVersion !== 'gustav-reviewer-workflow-v2-decision-schema-v0') {
    addFinding(findings, 'blocker', 'schema_version_invalid', 'Reviewer Workflow V2 schemaVersion is invalid.');
  }
  if (schema.targetLocale !== 'fr' || schema.targetStudyLanguage !== 'fr') {
    addFinding(findings, 'blocker', 'schema_target_invalid', 'Reviewer Workflow V2 schema must be scoped to fr.');
  }
  if (!sameSourceLocales(schema.sourceLocales)) {
    addFinding(findings, 'blocker', 'schema_source_locales_invalid', 'Reviewer Workflow V2 schema must use sourceLocales ru,uk.');
  }
  if (JSON.stringify(schema.allowedRowReviewerDecisions) !== JSON.stringify(ROW_ALLOWED)) {
    addFinding(findings, 'blocker', 'row_allowed_decisions_mismatch', 'Row reviewer decisions do not match the V2 import dry-run contract.');
  }
  if (JSON.stringify(schema.allowedAiReviewerDecisions) !== JSON.stringify(AI_ALLOWED)) {
    addFinding(findings, 'blocker', 'ai_allowed_decisions_mismatch', 'AI reviewer decisions do not match the V2 import dry-run contract.');
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
    addFinding(findings, 'blocker', 'schema_dangerous_flag_open', 'Reviewer Workflow V2 schema must keep import/generation/apply/activation closed.');
  }

  if (rowDecisions.length !== 1600) {
    addFinding(findings, 'blocker', 'row_decision_count_invalid', `Expected 1600 row decisions, found ${rowDecisions.length}.`);
  }
  if (aiDecisions.length !== EXPECTED_AI_DECISIONS) {
    addFinding(findings, 'blocker', 'ai_decision_count_invalid', `Expected ${EXPECTED_AI_DECISIONS} AI decisions, found ${aiDecisions.length}.`);
  }

  const seenRowKeys = new Set<string>();
  for (const row of rowDecisions) {
    const identity = `${row.lessonId}:${row.phraseId}`;
    const decision = row.reviewerDecision.trim();
    const correction = hasRowCorrection(row);
    if (seenRowKeys.has(rowKey(row))) {
      metrics.rowDuplicateDecisionRows += 1;
      addFinding(findings, 'blocker', 'row_duplicate_decision', 'Duplicate V2 row decision identity.', 'row', identity);
    }
    seenRowKeys.add(rowKey(row));
    if (row.reviewScope !== 'row') {
      addFinding(findings, 'blocker', 'row_scope_invalid', 'Row decision must have reviewScope=row.', 'row', identity);
    }
    if (row.studyTarget !== 'fr') {
      metrics.rowWrongTargetRows += 1;
      addFinding(findings, 'blocker', 'row_wrong_study_target', 'Row decision studyTarget must be fr.', 'row', identity);
    }
    if (!sameSourceLocales(row.sourceLocaleCoverage)) {
      metrics.rowWrongSourceLocaleRows += 1;
      addFinding(findings, 'blocker', 'row_wrong_source_locale_coverage', 'Row decision sourceLocaleCoverage must be exactly ru,uk.', 'row', identity);
    }
    const queueRow = queueRows[row.sourceQueueIndex - 1];
    if (!queueRow || queueRow.lessonId !== row.lessonId || queueRow.phraseId !== row.phraseId) {
      metrics.rowIdentityMismatchRows += 1;
      addFinding(findings, 'blocker', 'row_identity_mismatch', 'Row decision sourceQueueIndex, lessonId and phraseId do not match source queue.', 'row', identity);
    } else if (hasRowContextMismatch(queueRow, row)) {
      metrics.rowContextMismatchRows += 1;
      addFinding(findings, 'blocker', 'row_context_mismatch', 'Row decision source context differs from reviewer queue.', 'row', identity);
    }
    if (!row.schemaRowId || !row.qualityRowId || !row.sourceMeaningHash || !row.grammarClusterId || !row.requiredTransformationType) {
      addFinding(findings, 'blocker', 'row_required_identity_or_quality_field_missing', 'Row decision is missing required identity/quality fields.', 'row', identity);
    }
    if (row.researchEvidenceIds.length < 1 || row.requiredGateIds.length < 1) {
      addFinding(findings, 'blocker', 'row_research_or_gates_missing', 'Row decision must bind researchEvidenceIds and requiredGateIds.', 'row', identity);
    }
    if (!gateMapCoversRequired(row.requiredGateIds, row.gateReviewerDecisions)) {
      addFinding(findings, 'blocker', 'row_gate_map_incomplete', 'Row gateReviewerDecisions must contain every requiredGateId.', 'row', identity);
    }
    if (row.reviewerImportAllowed) metrics.reviewerImportOpenFlags += 1;
    if (row.productionApplyAllowed) metrics.productionApplyOpenFlags += 1;
    if (row.activationApproved) metrics.activationApprovedFlags += 1;
    if (row.currentActivationStatus !== 'blocked' || row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved) {
      addFinding(findings, 'blocker', 'row_activation_or_apply_open', 'Row decision must keep activation/import/apply closed.', 'row', identity);
    }
    if (!decision) {
      metrics.blankRowDecisionRows += 1;
      if (correction || row.reviewerNotes.trim() || row.reviewerName.trim() || row.reviewedAt.trim()) {
        addFinding(findings, 'blocker', 'row_blank_decision_has_payload', 'Blank row decision must not include corrections or reviewer metadata.', 'row', identity);
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
      addFinding(findings, 'blocker', 'row_reviewer_metadata_missing', 'Reviewed row must include reviewerName and reviewedAt.', 'row', identity);
    }
    if (correction) metrics.rowCorrectionPayloadRows += 1;
    if (correction && !row.reviewerNotes.trim()) {
      addFinding(findings, 'blocker', 'row_correction_without_notes', 'Row corrections require reviewerNotes.', 'row', identity);
    }
    if (decision === 'accept_quality_gates') {
      if (correction) {
        addFinding(findings, 'blocker', 'row_accept_has_correction_payload', 'accept_quality_gates rows must not include corrected fields.', 'row', identity);
      }
      if (!gatesReviewed(row.requiredGateIds, row.gateReviewerDecisions)) {
        metrics.rowUnreviewedGateAcceptRows += 1;
        addFinding(findings, 'blocker', 'row_accept_has_unreviewed_gates', 'accept_quality_gates requires every required gate to be reviewed.', 'row', identity);
      }
    } else if (!row.reviewerNotes.trim()) {
      addFinding(findings, 'blocker', 'row_non_accept_notes_missing', `${decision} rows require reviewerNotes.`, 'row', identity);
    }
    if (decision !== 'needs_llm_regeneration_review' && correction) {
      addFinding(findings, 'blocker', 'row_correction_for_wrong_decision', 'Corrected row fields are only allowed for needs_llm_regeneration_review.', 'row', identity);
    }
    metrics.rowImportCandidateRows += 1;
  }

  const seenAiKeys = new Set<string>();
  for (const row of aiDecisions) {
    const identity = `${row.aiTemplateIndex}:${row.contractId}`;
    const decision = row.reviewerDecision.trim();
    if (seenAiKeys.has(aiKey(row))) {
      metrics.aiDuplicateDecisionRows += 1;
      addFinding(findings, 'blocker', 'ai_duplicate_decision', 'Duplicate V2 AI decision identity.', 'ai_prompt', identity);
    }
    seenAiKeys.add(aiKey(row));
    if (row.reviewScope !== 'ai_prompt') {
      addFinding(findings, 'blocker', 'ai_scope_invalid', 'AI decision must have reviewScope=ai_prompt.', 'ai_prompt', identity);
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
    for (const dimension of ['targetLocale', 'sourceLocales', 'uiLocale', 'domainId', 'entrypointFile']) {
      if (!row.cacheKeyDimensionsRequired.includes(dimension)) {
        addFinding(findings, 'blocker', 'ai_cache_key_dimension_missing', `AI cache key dimensions must include ${dimension}.`, 'ai_prompt', identity);
      }
    }
    if (row.reviewerImportAllowed) metrics.reviewerImportOpenFlags += 1;
    if (row.productionApplyAllowed) metrics.productionApplyOpenFlags += 1;
    if (row.activationApproved) metrics.activationApprovedFlags += 1;
    if (row.currentActivationStatus !== 'blocked' || row.reviewerImportAllowed || row.productionApplyAllowed || row.activationApproved) {
      addFinding(findings, 'blocker', 'ai_activation_or_apply_open', 'AI decision must keep activation/import/apply closed.', 'ai_prompt', identity);
    }
    if (row.rejectedFreshOutputMayReturn) {
      metrics.aiRejectedFreshReturnOpenRows += 1;
      addFinding(findings, 'blocker', 'ai_rejected_fresh_return_open', 'Rejected fresh AI output may not return live.', 'ai_prompt', identity);
    }
    if (row.rejectedFreshOutputMayBeCached) {
      metrics.aiRejectedFreshCacheOpenRows += 1;
      addFinding(findings, 'blocker', 'ai_rejected_fresh_cache_open', 'Rejected fresh AI output may not be cached.', 'ai_prompt', identity);
    }
    if (row.targetOutputAllowedBeforeQualityPass) {
      metrics.targetOutputBeforeQualityOpenRows += 1;
      addFinding(findings, 'blocker', 'ai_target_output_before_quality_open', 'AI target output must remain blocked before quality pass.', 'ai_prompt', identity);
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
        metrics.aiUnreviewedGateAcceptRows += 1;
        addFinding(findings, 'blocker', 'ai_accept_has_unreviewed_gates', 'accept_contract requires wrong-language, cache-language and live-return gates to be reviewed.', 'ai_prompt', identity);
      }
    } else if (!row.reviewerNotes.trim()) {
      addFinding(findings, 'blocker', 'ai_non_accept_notes_missing', `${decision} AI decisions require reviewerNotes.`, 'ai_prompt', identity);
    }
    metrics.aiImportCandidateRows += 1;
  }

  metrics.blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  metrics.warnings = findings.filter((finding) => finding.severity === 'warning').length;
  metrics.readyForDecisionImportV2 =
    metrics.blockers === 0 &&
    (metrics.reviewedRowDecisionRows + metrics.reviewedAiDecisionRows) > 0 &&
    metrics.rowImportCandidateRows === metrics.reviewedRowDecisionRows &&
    metrics.aiImportCandidateRows === metrics.reviewedAiDecisionRows;
  metrics.readyForReviewerDecisionImportV2DryRun = metrics.blockers === 0;
  metrics.readyForPayloadShardMaterializationGate = metrics.blockers === 0;
  return { metrics, findings };
}

function cloneRows<T>(rows: T[]): T[] {
  return JSON.parse(JSON.stringify(rows)) as T[];
}

function reviewAllRowGates(row: RowDecision): void {
  row.gateReviewerDecisions = Object.fromEntries(row.requiredGateIds.map((gateId) => [gateId, 'pass']));
}

function reviewedRow(row: RowDecision, decision: string): RowDecision {
  const clone = cloneRows([row])[0];
  clone.reviewerDecision = decision;
  clone.reviewerName = 'fixture_reviewer';
  clone.reviewedAt = '2026-06-26T00:00:00.000Z';
  if (decision !== 'accept_quality_gates') clone.reviewerNotes = 'Fixture reviewer note.';
  if (decision === 'accept_quality_gates') reviewAllRowGates(clone);
  return clone;
}

function reviewedAi(row: AiDecision, decision: string): AiDecision {
  const clone = cloneRows([row])[0];
  clone.reviewerDecision = decision;
  clone.reviewerName = 'fixture_reviewer';
  clone.reviewedAt = '2026-06-26T00:00:00.000Z';
  if (decision !== 'accept_contract') clone.reviewerNotes = 'Fixture reviewer note.';
  if (decision === 'accept_contract') {
    clone.wrongLanguageGateDecision = 'pass';
    clone.cacheLanguageGateDecision = 'pass';
    clone.liveReturnGateDecision = 'pass';
  }
  return clone;
}

function makeProbeResult(
  id: string,
  expectedAccept: boolean,
  schema: WorkflowSchema,
  queueRows: QueueRow[],
  rowDecisions: RowDecision[],
  aiDecisions: AiDecision[],
): Probe {
  const evaluation = evaluate(schema, queueRows, rowDecisions, aiDecisions);
  const accepted = evaluation.metrics.blockers === 0;
  return {
    id,
    expectedAccept,
    accepted,
    blockers: evaluation.metrics.blockers,
    passed: accepted === expectedAccept,
  };
}

function makeRowProbes(schema: WorkflowSchema, queueRows: QueueRow[], rowDecisions: RowDecision[], aiDecisions: AiDecision[]): Probe[] {
  const probes: Probe[] = [];
  probes.push(makeProbeResult('row_canonical_blank_noop_accepts', true, schema, queueRows, rowDecisions, aiDecisions));
  {
    const rows = cloneRows(rowDecisions);
    rows[0] = reviewedRow(rows[0], 'accept_quality_gates');
    probes.push(makeProbeResult('row_valid_accept_quality_gates_accepts', true, schema, queueRows, rows, aiDecisions));
  }
  {
    const rows = cloneRows(rowDecisions);
    rows[0].studyTarget = 'en';
    probes.push(makeProbeResult('row_wrong_target_rejected', false, schema, queueRows, rows, aiDecisions));
  }
  {
    const rows = cloneRows(rowDecisions);
    rows[0].sourceLocaleCoverage = ['ru', 'en'];
    probes.push(makeProbeResult('row_wrong_source_locale_rejected', false, schema, queueRows, rows, aiDecisions));
  }
  {
    const rows = cloneRows(rowDecisions);
    rows[0].sourceGraphEnglishBase = 'Fixture context drift';
    probes.push(makeProbeResult('row_context_drift_rejected', false, schema, queueRows, rows, aiDecisions));
  }
  {
    const rows = cloneRows(rowDecisions);
    rows[0] = reviewedRow(rows[0], 'accept_quality_gates');
    rows[0].gateReviewerDecisions[rows[0].requiredGateIds[0]] = 'unreviewed';
    probes.push(makeProbeResult('row_accept_with_unreviewed_gate_rejected', false, schema, queueRows, rows, aiDecisions));
  }
  {
    const rows = cloneRows(rowDecisions);
    rows[0] = reviewedRow(rows[0], 'accept_quality_gates');
    rows[0].correctedTargetText = 'Correction should not be accepted';
    probes.push(makeProbeResult('row_accept_with_correction_rejected', false, schema, queueRows, rows, aiDecisions));
  }
  {
    const rows = cloneRows(rowDecisions);
    rows[0] = reviewedRow(rows[0], 'needs_llm_regeneration_review');
    rows[0].reviewerNotes = '';
    rows[0].correctedTargetText = 'Correction without notes';
    probes.push(makeProbeResult('row_correction_without_notes_rejected', false, schema, queueRows, rows, aiDecisions));
  }
  {
    const rows = cloneRows(rowDecisions);
    rows[1] = cloneRows([rows[0]])[0];
    probes.push(makeProbeResult('row_duplicate_rejected', false, schema, queueRows, rows, aiDecisions));
  }
  {
    const rows = cloneRows(rowDecisions);
    rows[0].activationApproved = true;
    probes.push(makeProbeResult('row_activation_attempt_rejected', false, schema, queueRows, rows, aiDecisions));
  }
  return probes;
}

function makeAiProbes(schema: WorkflowSchema, queueRows: QueueRow[], rowDecisions: RowDecision[], aiDecisions: AiDecision[]): Probe[] {
  const probes: Probe[] = [];
  probes.push(makeProbeResult('ai_canonical_blank_noop_accepts', true, schema, queueRows, rowDecisions, aiDecisions));
  {
    const rows = cloneRows(aiDecisions);
    rows[0] = reviewedAi(rows[0], 'accept_contract');
    probes.push(makeProbeResult('ai_valid_accept_contract_accepts', true, schema, queueRows, rowDecisions, rows));
  }
  {
    const rows = cloneRows(aiDecisions);
    rows[0].studyTarget = 'en';
    probes.push(makeProbeResult('ai_wrong_target_rejected', false, schema, queueRows, rowDecisions, rows));
  }
  {
    const rows = cloneRows(aiDecisions);
    rows[0].sourceLocaleCoverage = ['ru', 'en'];
    probes.push(makeProbeResult('ai_wrong_source_locale_rejected', false, schema, queueRows, rowDecisions, rows));
  }
  {
    const rows = cloneRows(aiDecisions);
    rows[0] = reviewedAi(rows[0], 'accept_contract');
    rows[0].wrongLanguageGateDecision = 'unreviewed';
    probes.push(makeProbeResult('ai_accept_unreviewed_wrong_language_gate_rejected', false, schema, queueRows, rowDecisions, rows));
  }
  {
    const rows = cloneRows(aiDecisions);
    rows[0].rejectedFreshOutputMayReturn = true;
    probes.push(makeProbeResult('ai_rejected_fresh_return_open_rejected', false, schema, queueRows, rowDecisions, rows));
  }
  {
    const rows = cloneRows(aiDecisions);
    rows[0].rejectedFreshOutputMayBeCached = true;
    probes.push(makeProbeResult('ai_rejected_fresh_cache_open_rejected', false, schema, queueRows, rowDecisions, rows));
  }
  {
    const rows = cloneRows(aiDecisions);
    rows[0].targetOutputAllowedBeforeQualityPass = true;
    probes.push(makeProbeResult('ai_target_output_before_quality_open_rejected', false, schema, queueRows, rowDecisions, rows));
  }
  {
    const rows = cloneRows(aiDecisions);
    rows[0].activationApproved = true;
    probes.push(makeProbeResult('ai_activation_attempt_rejected', false, schema, queueRows, rowDecisions, rows));
  }
  {
    const rows = cloneRows(aiDecisions);
    rows[1] = cloneRows([rows[0]])[0];
    probes.push(makeProbeResult('ai_duplicate_rejected', false, schema, queueRows, rowDecisions, rows));
  }
  return probes;
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# Gustav Reviewer Decision Import V2 Dry Run Packet',
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
    `- Workflow schema present: ${report.summary.workflowSchemaPresent ? 'yes' : 'no'}`,
    `- Admin/reviewer delivery surface ready: ${report.summary.adminReviewerDeliverySurfaceReady ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 ready: ${report.summary.officialSourceContentCoverageV2Ready ? 'yes' : 'no'}`,
    `- Official-source content coverage V2 state: ${report.summary.officialSourceContentCoverageV2State}`,
    `- Official-source accepted rows/AI: ${report.summary.officialSourceContentCoverageV2AcceptedRows}/${report.summary.officialSourceContentCoverageV2AcceptedAi}`,
    `- Promoted official-source row/AI files used: ${report.summary.rowDecisionFilePromotedOfficialSourceUsed ? 'yes' : 'no'}/${report.summary.aiDecisionFilePromotedOfficialSourceUsed ? 'yes' : 'no'}`,
    `- Row decision rows: ${report.summary.rowDecisionRows}`,
    `- AI decision rows: ${report.summary.aiDecisionRows}`,
    `- Reviewed row decisions: ${report.summary.reviewedRowDecisionRows}`,
    `- Reviewed AI decisions: ${report.summary.reviewedAiDecisionRows}`,
    `- Accepted row decisions: ${report.summary.acceptedRowDecisionRows}`,
    `- Accepted AI decisions: ${report.summary.acceptedAiDecisionRows}`,
    `- Non-accepted reviewed row decisions: ${report.summary.nonAcceptedReviewedRowDecisionRows}`,
    `- Non-accepted reviewed AI decisions: ${report.summary.nonAcceptedReviewedAiDecisionRows}`,
    `- Row no-op rows: ${report.summary.rowNoOpRows}`,
    `- AI no-op rows: ${report.summary.aiNoOpRows}`,
    `- Row import candidates: ${report.summary.rowImportCandidateRows}`,
    `- AI import candidates: ${report.summary.aiImportCandidateRows}`,
    `- Reviewer import open flags: ${report.summary.reviewerImportOpenFlags}`,
    `- Production apply open flags: ${report.summary.productionApplyOpenFlags}`,
    `- Activation approved flags: ${report.summary.activationApprovedFlags}`,
    `- Generated ledger writes: ${report.summary.generatedLedgerWrites ? 'yes' : 'no'}`,
    `- Row probes: ${report.summary.rowFixtureProbesPassed}/${report.summary.rowFixtureProbes}`,
    `- AI probes: ${report.summary.aiFixtureProbesPassed}/${report.summary.aiFixtureProbes}`,
    `- Ready for Decision Import V2: ${report.summary.readyForDecisionImportV2 ? 'yes' : 'no'}`,
    `- Ready for Reviewer Decision Import V2 dry-run: ${report.summary.readyForReviewerDecisionImportV2DryRun ? 'yes' : 'no'}`,
    `- Ready for payload shard materialization gate: ${report.summary.readyForPayloadShardMaterializationGate ? 'yes' : 'no'}`,
    `- Ready for official-source import execution gate refresh: ${report.summary.readyForOfficialSourceImportExecutionGateRefresh ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Row Probes',
    '',
  ];
  for (const probe of report.probes.row) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (accepted=${probe.accepted}, blockers=${probe.blockers})`);
  }
  lines.push('', '## AI Probes', '');
  for (const probe of report.probes.ai) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (accepted=${probe.accepted}, blockers=${probe.blockers})`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.identity ? ` (${finding.identity})` : ''}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet is a dry-run only.',
    '- It does not write reviewer decisions into generated ledgers.',
    '- It does not upload packs or publish server manifests.',
    '- It does not enable runtime downloads.',
    '- It does not approve production apply.',
    '',
  );
  return `${lines.join('\n')}\n`;
}

function main(): void {
  const runArg = argValue('--run');
  const target = argValue('--target') ?? 'fr';
  if (!runArg) {
    throw new Error('Usage: npx tsx scripts/gustav_reviewer_decision_import_v2_dry_run_packet.ts --run <run-dir> --target fr [--row-decisions <path>] [--ai-decisions <path>]');
  }
  if (target !== 'fr') {
    throw new Error('P13 reviewer decision import V2 dry-run is currently scoped to --target fr.');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  ensureDir(auditsDir);

  const defaultRowDecisionPath = runPath(runDir, SOURCE_FILES.rowDecisionTemplateV2);
  const defaultAiDecisionPath = runPath(runDir, SOURCE_FILES.aiDecisionTemplateV2);
  const promotedOfficialSourceRowDecisionPath = runPath(runDir, SOURCE_FILES.promotedOfficialSourceRowDecisionsV2);
  const promotedOfficialSourceAiDecisionPath = runPath(runDir, SOURCE_FILES.promotedOfficialSourceAiDecisionsV2);
  const rowDecisionArg = argValue('--row-decisions');
  const aiDecisionArg = argValue('--ai-decisions');
  const defaultRowDecisionCandidatePath = fs.existsSync(promotedOfficialSourceRowDecisionPath)
    ? promotedOfficialSourceRowDecisionPath
    : defaultRowDecisionPath;
  const defaultAiDecisionCandidatePath = fs.existsSync(promotedOfficialSourceAiDecisionPath)
    ? promotedOfficialSourceAiDecisionPath
    : defaultAiDecisionPath;
  const rowDecisionPath = rowDecisionArg ? path.resolve(repoRoot, rowDecisionArg) : defaultRowDecisionCandidatePath;
  const aiDecisionPath = aiDecisionArg ? path.resolve(repoRoot, aiDecisionArg) : defaultAiDecisionCandidatePath;
  const schemaPath = runPath(runDir, SOURCE_FILES.workflowSchema);
  const queuePath = runPath(runDir, SOURCE_FILES.reviewerQueue);
  const adminPacketPath = runPath(runDir, SOURCE_FILES.adminReviewerDeliverySurfaceV2Packet);
  const reviewerWorkflowPacketPath = runPath(runDir, SOURCE_FILES.reviewerWorkflowV2Packet);
  const officialSourceContentCoverageV2Path = runPath(runDir, SOURCE_FILES.officialSourceContentCoverageV2Packet);
  const outJson = path.join(auditsDir, 'reviewer_decision_import_v2_dry_run.json');
  const outMd = path.join(auditsDir, 'reviewer_decision_import_v2_dry_run.md');

  const schema = readJson<WorkflowSchema>(schemaPath);
  const queueRows = parseJsonl<QueueRow>(queuePath);
  const rowDecisions = parseJsonl<RowDecision>(rowDecisionPath);
  const aiDecisions = parseJsonl<AiDecision>(aiDecisionPath);
  const adminPacket = object(readJson<unknown>(adminPacketPath));
  const adminSummary = object(adminPacket.summary);
  const workflowPacket = object(readJson<unknown>(reviewerWorkflowPacketPath));
  const workflowSummary = object(workflowPacket.summary);
  const officialSourceCoveragePacket = fs.existsSync(officialSourceContentCoverageV2Path)
    ? object(readJson<unknown>(officialSourceContentCoverageV2Path))
    : {};
  const officialSourceCoverageSummary = object(officialSourceCoveragePacket.summary);
  EXPECTED_AI_DECISIONS = Math.max(
    EXPECTED_AI_DECISIONS,
    n(workflowSummary, 'aiTemplateRows'),
    n(officialSourceCoverageSummary, 'acceptedAiOfficialSourceDecisionRows'),
    aiDecisions.length,
  );
  const officialSourceContentCoverageV2Present = fs.existsSync(officialSourceContentCoverageV2Path);
  const officialSourceContentCoverageV2Ready =
    officialSourceContentCoverageV2Present &&
    n(officialSourceCoverageSummary, 'blockers') === 0 &&
    s(officialSourceCoverageSummary, 'coverageState') === 'official_source_content_coverage_complete_no_import' &&
    n(officialSourceCoverageSummary, 'acceptedRowOfficialSourceDecisionRows') === 1600 &&
    n(officialSourceCoverageSummary, 'acceptedAiOfficialSourceDecisionRows') === EXPECTED_AI_DECISIONS &&
    b(officialSourceCoverageSummary, 'readyForReviewerDecisionImportDryRunRefresh') &&
    !b(officialSourceCoverageSummary, 'readyForApply') &&
    !b(officialSourceCoverageSummary, 'mayModifyProductionAppFiles');
  const rowDecisionFilePromotedOfficialSourceUsed =
    path.resolve(rowDecisionPath) === path.resolve(promotedOfficialSourceRowDecisionPath);
  const aiDecisionFilePromotedOfficialSourceUsed =
    path.resolve(aiDecisionPath) === path.resolve(promotedOfficialSourceAiDecisionPath);

  const evaluation = evaluate(schema, queueRows, rowDecisions, aiDecisions);
  const findings = [...evaluation.findings];
  if (!b(adminSummary, 'readyForReviewerDecisionImportV2DryRun')) {
    addFinding(findings, 'blocker', 'admin_reviewer_surface_not_ready', 'Admin/Reviewer Delivery Surface V2 must be ready before P13.');
  }
  if (!b(workflowSummary, 'readyForLlmOfficialSourceReviewV2')) {
    addFinding(findings, 'blocker', 'reviewer_workflow_v2_not_ready', 'Reviewer Workflow V2 must be ready before P13.');
  }
  if (!officialSourceContentCoverageV2Ready) {
    addFinding(findings, 'blocker', 'official_source_content_coverage_v2_not_ready', 'P40 import dry-run refresh requires P39 official-source content coverage to be PASS and no-import ready.');
  }
  if (!rowDecisionFilePromotedOfficialSourceUsed) {
    addFinding(findings, 'blocker', 'row_decision_file_not_promoted_official_source', 'P40 must use promoted official-source row_decisions_reviewed_v2.jsonl, not the blank/default row template.');
  }
  if (!aiDecisionFilePromotedOfficialSourceUsed) {
    addFinding(findings, 'blocker', 'ai_decision_file_not_promoted_official_source', 'P40 must use promoted official-source ai_decisions_reviewed_v2.jsonl, not the blank/default AI template.');
  }

  const rowProbes = makeRowProbes(schema, queueRows, rowDecisions, aiDecisions);
  const aiProbes = makeAiProbes(schema, queueRows, rowDecisions, aiDecisions);
  for (const probe of [...rowProbes, ...aiProbes]) {
    if (!probe.passed) {
      addFinding(findings, 'blocker', 'fixture_probe_failed', `Fixture probe failed: ${probe.id}.`);
    }
  }
  addFinding(
    findings,
    'info',
    'reviewer_import_v2_dry_run_only',
    'P13 validates V2 reviewer decision files but does not import decisions, mutate ledgers, upload packs, enable runtime downloads or approve activation.',
  );

  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const metrics: Evaluation = {
    ...evaluation.metrics,
    blockers,
    warnings,
    readyForDecisionImportV2: blockers === 0 && evaluation.metrics.readyForDecisionImportV2,
    readyForReviewerDecisionImportV2DryRun: blockers === 0,
    readyForPayloadShardMaterializationGate: blockers === 0,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };

  const report: Report = {
    schemaVersion: 'gustav-reviewer-decision-import-v2-dry-run-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      adminReviewerDeliverySurfaceV2Packet: rel(repoRoot, adminPacketPath),
      reviewerWorkflowV2Packet: rel(repoRoot, reviewerWorkflowPacketPath),
      officialSourceContentCoverageV2Packet: rel(repoRoot, officialSourceContentCoverageV2Path),
      workflowSchema: rel(repoRoot, schemaPath),
      reviewerQueue: rel(repoRoot, queuePath),
      promotedOfficialSourceRowDecisionFile: rel(repoRoot, promotedOfficialSourceRowDecisionPath),
      promotedOfficialSourceAiDecisionFile: rel(repoRoot, promotedOfficialSourceAiDecisionPath),
      rowDecisionFile: rel(repoRoot, rowDecisionPath),
      aiDecisionFile: rel(repoRoot, aiDecisionPath),
    },
    outputs: {
      reviewerDecisionImportV2DryRunJson: rel(repoRoot, outJson),
      reviewerDecisionImportV2DryRunMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: schema.sourceLocales.length,
      workflowSchemaPresent: fs.existsSync(schemaPath),
      adminReviewerDeliverySurfaceReady: b(adminSummary, 'readyForReviewerDecisionImportV2DryRun'),
      rowDecisionFileDefaultUsed: path.resolve(rowDecisionPath) === path.resolve(defaultRowDecisionPath),
      aiDecisionFileDefaultUsed: path.resolve(aiDecisionPath) === path.resolve(defaultAiDecisionPath),
      officialSourceContentCoverageV2Present,
      officialSourceContentCoverageV2Ready,
      officialSourceContentCoverageV2State: s(officialSourceCoverageSummary, 'coverageState'),
      officialSourceContentCoverageV2AcceptedRows: n(officialSourceCoverageSummary, 'acceptedRowOfficialSourceDecisionRows'),
      officialSourceContentCoverageV2AcceptedAi: n(officialSourceCoverageSummary, 'acceptedAiOfficialSourceDecisionRows'),
      rowDecisionFilePromotedOfficialSourceUsed,
      aiDecisionFilePromotedOfficialSourceUsed,
      readyForOfficialSourceImportExecutionGateRefresh: blockers === 0,
      allowedRowReviewerDecisions: schema.allowedRowReviewerDecisions.length,
      allowedAiReviewerDecisions: schema.allowedAiReviewerDecisions.length,
      rowFixtureProbesPassed: rowProbes.filter((probe) => probe.passed).length,
      rowFixtureProbes: rowProbes.length,
      aiFixtureProbesPassed: aiProbes.filter((probe) => probe.passed).length,
      aiFixtureProbes: aiProbes.length,
    },
    artifactHashes: {
      adminReviewerDeliverySurfaceV2Packet: sha256(adminPacketPath),
      reviewerWorkflowV2Packet: sha256(reviewerWorkflowPacketPath),
      officialSourceContentCoverageV2Packet: sha256(officialSourceContentCoverageV2Path),
      workflowSchema: sha256(schemaPath),
      reviewerQueue: sha256(queuePath),
      rowDecisionFile: sha256(rowDecisionPath),
      aiDecisionFile: sha256(aiDecisionPath),
    },
    probes: {
      row: rowProbes,
      ai: aiProbes,
    },
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      firebaseOrServerUploadStarted: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
    },
  };

  writeJson(outJson, report);
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV reviewer decision import V2 dry-run packet: ${report.status}`);
  console.log(`Row decision rows: ${report.summary.rowDecisionRows}`);
  console.log(`AI decision rows: ${report.summary.aiDecisionRows}`);
  console.log(`Reviewed row decisions: ${report.summary.reviewedRowDecisionRows}`);
  console.log(`Reviewed AI decisions: ${report.summary.reviewedAiDecisionRows}`);
  console.log(`Accepted row decisions: ${report.summary.acceptedRowDecisionRows}`);
  console.log(`Accepted AI decisions: ${report.summary.acceptedAiDecisionRows}`);
  console.log(`Official-source coverage ready: ${report.summary.officialSourceContentCoverageV2Ready ? 'yes' : 'no'}`);
  console.log(`Promoted official-source row/AI files used: ${report.summary.rowDecisionFilePromotedOfficialSourceUsed ? 'yes' : 'no'}/${report.summary.aiDecisionFilePromotedOfficialSourceUsed ? 'yes' : 'no'}`);
  console.log(`Row probes: ${report.summary.rowFixtureProbesPassed}/${report.summary.rowFixtureProbes}`);
  console.log(`AI probes: ${report.summary.aiFixtureProbesPassed}/${report.summary.aiFixtureProbes}`);
  console.log(`Ready for Decision Import V2: ${report.summary.readyForDecisionImportV2 ? 'yes' : 'no'}`);
  console.log(`Ready for official-source import execution gate refresh: ${report.summary.readyForOfficialSourceImportExecutionGateRefresh ? 'yes' : 'no'}`);
  console.log(`Ready for payload shard materialization gate: ${report.summary.readyForPayloadShardMaterializationGate ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
