import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';
type RiskLevel = 'critical' | 'high' | 'medium';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
  jsonPath?: string;
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
  currentReviewerStatus: string;
  currentActivationStatus: string;
};

type ReviewBatch = {
  batchId: string;
  lessonId: number;
  queueStartIndex: number;
  queueEndIndex: number;
  phraseIds: string[];
};

type RowQualityGateRequirement = {
  qualityRowId: string;
  schemaRowId: string;
  lessonId: number;
  phraseId: string;
  grammarClusterId: string;
  secondaryGrammarClusterIds: string[];
  requiredTransformationType: string;
  requiredGateIds: string[];
  evidenceSourceIds: string[];
  sourceMeaningHash: string;
  mustRejectWrongLanguage: true;
  mustPassAntiCalqueReview: true;
  mustPassNaturalnessReview: true;
  mustPassGrammarReview: true;
  mustPassSourceMeaningParity: true;
  mustPassQuizOneCorrectAnswer: true;
  targetOutputAllowedBeforeQualityPass: false;
  reviewerDecisionRequired: 'quality_gates_accept_or_regenerate';
  activationStatus: 'blocked';
};

type AiQualityGateRequirement = {
  aiQualityGateId: string;
  contractId: string;
  domainId: string;
  domainTitle: string;
  filePath: string;
  featureRiskClass: string;
  riskLevel: RiskLevel;
  requiredGateIds: string[];
  cacheKeyDimensionsRequired: string[];
  mustRejectWrongLanguage: true;
  rejectedFreshOutputMayReturn: false;
  rejectedFreshOutputMayBeCached: false;
  targetOutputAllowedBeforeQualityPass: false;
  mustUseLanguageSafeFallback: true;
  activationStatus: 'blocked';
};

type ContentQualityGatesV2 = {
  schemaVersion: 'gustav-fr-content-quality-gates-v2';
  runId: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  rowQualityGateRequirements: RowQualityGateRequirement[];
  aiQualityGateRequirements: AiQualityGateRequirement[];
  readyForReviewerWorkflowV2: boolean;
  readyForGenerationV2: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
};

type RowReviewerDecisionTemplateV2 = {
  reviewScope: 'row';
  sourceQueueIndex: number;
  batchId: string;
  lessonId: number;
  phraseId: string;
  schemaRowId: string;
  qualityRowId: string;
  studyTarget: 'fr';
  sourceLocaleCoverage: Array<'ru' | 'uk'>;
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
  gateReviewerDecisions: Record<string, 'unreviewed'>;
  reviewerDecision: '';
  correctedTargetText: '';
  correctedQuizBlank: '';
  correctedQuizCorrect: '';
  correctedQuizDistractors: '';
  reviewerNotes: '';
  reviewerName: '';
  reviewedAt: '';
  currentReviewerStatus: 'needs_quality_review';
  currentActivationStatus: 'blocked';
  reviewerImportAllowed: false;
  productionApplyAllowed: false;
  activationApproved: false;
};

type AiReviewerDecisionTemplateV2 = {
  reviewScope: 'ai_prompt';
  aiTemplateIndex: number;
  aiQualityGateId: string;
  contractId: string;
  domainId: string;
  domainTitle: string;
  filePath: string;
  featureRiskClass: string;
  riskLevel: RiskLevel;
  studyTarget: 'fr';
  sourceLocaleCoverage: Array<'ru' | 'uk'>;
  requiredGateIds: string[];
  cacheKeyDimensionsRequired: string[];
  wrongLanguageGateDecision: 'unreviewed';
  cacheLanguageGateDecision: 'unreviewed';
  liveReturnGateDecision: 'unreviewed';
  reviewerDecision: '';
  reviewerNotes: '';
  reviewerName: '';
  reviewedAt: '';
  rejectedFreshOutputMayReturn: false;
  rejectedFreshOutputMayBeCached: false;
  targetOutputAllowedBeforeQualityPass: false;
  currentActivationStatus: 'blocked';
  reviewerImportAllowed: false;
  productionApplyAllowed: false;
  activationApproved: false;
};

type ReviewerWorkflowV2 = {
  schemaVersion: 'gustav-reviewer-workflow-v2-decision-schema-v0';
  runId: string;
  generatedAt: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  purpose: string;
  allowedRowReviewerDecisions: string[];
  allowedAiReviewerDecisions: string[];
  requiredRowIdentityFields: string[];
  requiredRowQualityFields: string[];
  requiredAiIdentityFields: string[];
  requiredAiQualityFields: string[];
  writableReviewerFields: string[];
  rules: string[];
  activationPolicy: {
    reviewerWorkflowAloneMayImportDecisions: false;
    reviewerWorkflowAloneMayApplyProduction: false;
    reviewerWorkflowAloneMayStartGeneration: false;
    requiresFilledDecisionFile: true;
    requiresDecisionImportDryRunV2: true;
    requiresBrainGateV2: true;
    requiresProductionActivationGateV2: true;
  };
  activationApproved: false;
  readyForLlmOfficialSourceReviewV2: true;
  readyForDecisionImportV2: false;
  readyForGenerationV2: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
};

type Metrics = {
  rowQualityRequirements: number;
  rowTemplateRows: number;
  rowTemplatesWithSchemaRowId: number;
  rowTemplatesWithQualityRowId: number;
  rowTemplatesWithRequiredGates: number;
  rowTemplatesWithResearchEvidence: number;
  rowTemplatesWithBlankReviewerDecision: number;
  rowTemplatesActivationBlocked: number;
  rowTemplatesImportBlocked: number;
  rowTemplatesApplyBlocked: number;
  rowTemplatesActivationNotApproved: number;
  rowTemplatesMatchedExistingQueue: number;
  aiQualityRequirements: number;
  aiTemplateRows: number;
  highRiskAiTemplateRows: number;
  aiTemplatesWithContractId: number;
  aiTemplatesWithWrongLanguageGate: number;
  aiTemplatesWithCacheGate: number;
  aiTemplatesWithBlankReviewerDecision: number;
  aiTemplatesActivationBlocked: number;
  aiTemplatesImportBlocked: number;
  aiTemplatesApplyBlocked: number;
  aiTemplatesActivationNotApproved: number;
  activationApprovedFlags: number;
  reviewerImportOpenFlags: number;
  productionApplyOpenFlags: number;
  generationOpenFlags: number;
};

type Report = {
  schemaVersion: 'gustav-reviewer-workflow-v2-packet-v0';
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
  summary: Metrics & {
    targetLocale: 'fr';
    sourceLocales: number;
    contentQualityGatesReady: boolean;
    rowFixtureProbes: number;
    rowFixtureProbesPassed: number;
    aiFixtureProbes: number;
    aiFixtureProbesPassed: number;
    readyForLlmOfficialSourceReviewV2: boolean;
    readyForDecisionImportV2: boolean;
    readyForBrainGateV2: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  hashes: {
    decisionSchemaSha256: string;
    rowDecisionTemplateJsonlSha256: string;
    rowDecisionTemplateTsvSha256: string;
    aiDecisionTemplateJsonlSha256: string;
    aiDecisionTemplateTsvSha256: string;
  };
  rowProbes: Probe[];
  aiProbes: Probe[];
  findings: Finding[];
  safety: {
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsImportedByThisScript: false;
    productionApplyApproved: false;
    firebaseOrServerUploadStarted: false;
  };
};

type JsonObject = Record<string, unknown>;

const EXPECTED_ROW_COUNT = 1600;
const ROW_ALLOWED_DECISIONS = ['accept_quality_gates', 'needs_regeneration', 'needs_llm_regeneration_review', 'reject_candidate', 'skip_for_later'];
const AI_ALLOWED_DECISIONS = ['accept_contract', 'needs_prompt_rewrite', 'needs_gate_fix', 'reject_contract', 'skip_for_later'];

const ROW_TSV_HEADERS = [
  'sourceQueueIndex',
  'batchId',
  'lessonId',
  'phraseId',
  'schemaRowId',
  'qualityRowId',
  'studyTarget',
  'sourceLocaleCoverage',
  'sourceGraphEnglishBase',
  'sourceMeaningRu',
  'sourceMeaningUk',
  'candidateTargetText',
  'candidateQuizBlank',
  'candidateQuizCorrect',
  'candidateQuizDistractors',
  'candidateQuizCategory',
  'grammarClusterId',
  'requiredTransformationType',
  'researchEvidenceIds',
  'requiredGateIds',
  'reviewerDecision',
  'correctedTargetText',
  'correctedQuizBlank',
  'correctedQuizCorrect',
  'correctedQuizDistractors',
  'reviewerNotes',
  'reviewerName',
  'reviewedAt',
  'currentActivationStatus',
  'activationApproved',
];

const AI_TSV_HEADERS = [
  'aiTemplateIndex',
  'aiQualityGateId',
  'contractId',
  'domainId',
  'domainTitle',
  'filePath',
  'featureRiskClass',
  'riskLevel',
  'studyTarget',
  'sourceLocaleCoverage',
  'requiredGateIds',
  'cacheKeyDimensionsRequired',
  'wrongLanguageGateDecision',
  'cacheLanguageGateDecision',
  'liveReturnGateDecision',
  'reviewerDecision',
  'reviewerNotes',
  'reviewerName',
  'reviewedAt',
  'currentActivationStatus',
  'activationApproved',
];

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function parseJsonl<T>(filePath: string): T[] {
  const body = fs.readFileSync(filePath, 'utf8').trim();
  if (!body) return [];
  return body.split(/\r?\n/).map((line) => JSON.parse(line) as T);
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

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function sha256(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function summaryOf(filePath: string): JsonObject {
  if (!fs.existsSync(filePath)) return {};
  return object(readJson<JsonObject>(filePath).summary);
}

function addFinding(
  findings: Finding[],
  severity: Severity,
  code: string,
  message: string,
  filePath?: string,
  jsonPath?: string,
): void {
  findings.push({ severity, code, message, path: filePath, jsonPath });
}

function queueKey(lessonId: number, phraseId: string): string {
  return `${lessonId}:${phraseId}`;
}

function tsvCell(value: unknown): string {
  if (Array.isArray(value)) return value.join(' | ').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  if (value && typeof value === 'object') return JSON.stringify(value).replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
  return String(value ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

function buildBatchByPhraseId(batches: ReviewBatch[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const batch of batches) {
    for (const phraseId of batch.phraseIds) result.set(`${batch.lessonId}:${phraseId}`, batch.batchId);
  }
  return result;
}

function buildWorkflowSchema(runId: string): ReviewerWorkflowV2 {
  return {
    schemaVersion: 'gustav-reviewer-workflow-v2-decision-schema-v0',
    runId,
    generatedAt: new Date().toISOString(),
    targetLocale: 'fr',
    targetStudyLanguage: 'fr',
    sourceLocales: ['ru', 'uk'],
    purpose: 'Reviewer Workflow V2 binds every French row and AI prompt contract to Content Quality Gates V2. This schema does not import decisions, generate content, upload packs, or approve production apply.',
    allowedRowReviewerDecisions: ROW_ALLOWED_DECISIONS,
    allowedAiReviewerDecisions: AI_ALLOWED_DECISIONS,
    requiredRowIdentityFields: ['sourceQueueIndex', 'batchId', 'lessonId', 'phraseId', 'schemaRowId', 'qualityRowId', 'studyTarget', 'sourceLocaleCoverage'],
    requiredRowQualityFields: [
      'requiredGateIds',
      'gateReviewerDecisions',
      'researchEvidenceIds',
      'grammarClusterId',
      'requiredTransformationType',
      'sourceMeaningHash',
    ],
    requiredAiIdentityFields: ['aiTemplateIndex', 'aiQualityGateId', 'contractId', 'domainId', 'filePath', 'studyTarget', 'sourceLocaleCoverage'],
    requiredAiQualityFields: [
      'requiredGateIds',
      'cacheKeyDimensionsRequired',
      'wrongLanguageGateDecision',
      'cacheLanguageGateDecision',
      'liveReturnGateDecision',
      'rejectedFreshOutputMayReturn',
      'rejectedFreshOutputMayBeCached',
    ],
    writableReviewerFields: [
      'reviewerDecision',
      'correctedTargetText',
      'correctedQuizBlank',
      'correctedQuizCorrect',
      'correctedQuizDistractors',
      'reviewerNotes',
      'reviewerName',
      'reviewedAt',
      'gateReviewerDecisions',
      'wrongLanguageGateDecision',
      'cacheLanguageGateDecision',
      'liveReturnGateDecision',
    ],
    rules: [
      'Every row decision must keep studyTarget=fr and sourceLocaleCoverage=ru,uk.',
      'A row cannot be accepted unless every required gate has reviewer evidence and no gate is unreviewed.',
      'A direct-equivalent row cannot be accepted without anti-calque pass evidence.',
      'A quiz row cannot be accepted unless quiz_one_correct_answer_gate is reviewed.',
      'Every AI prompt decision must keep wrong-language, cache-language and live-return gates reviewed before acceptance.',
      'Rejected fresh AI output may not be returned live or cached.',
      'This workflow never mutates generated ledgers, imports decisions, uploads packs, writes server files, or approves production apply.',
      'Production activation requires a separate brain gate, pack manifest gate, server/runtime delivery gate, storage/cloud gate, rollback plan and explicit approval.',
    ],
    activationPolicy: {
      reviewerWorkflowAloneMayImportDecisions: false,
      reviewerWorkflowAloneMayApplyProduction: false,
      reviewerWorkflowAloneMayStartGeneration: false,
      requiresFilledDecisionFile: true,
      requiresDecisionImportDryRunV2: true,
      requiresBrainGateV2: true,
      requiresProductionActivationGateV2: true,
    },
    activationApproved: false,
    readyForLlmOfficialSourceReviewV2: true,
    readyForDecisionImportV2: false,
    readyForGenerationV2: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
}

function buildRowTemplates(
  rowRequirements: RowQualityGateRequirement[],
  queueRows: QueueRow[],
  batches: ReviewBatch[],
): { rows: RowReviewerDecisionTemplateV2[]; missingQueueRows: number } {
  const queueByKey = new Map(queueRows.map((row, index) => [queueKey(row.lessonId, row.phraseId), { row, sourceQueueIndex: index + 1 }]));
  const batchByPhrase = buildBatchByPhraseId(batches);
  let missingQueueRows = 0;

  const rows = rowRequirements.map((requirement, index) => {
    const key = queueKey(requirement.lessonId, requirement.phraseId);
    const queue = queueByKey.get(key);
    if (!queue) missingQueueRows += 1;
    const gateReviewerDecisions = Object.fromEntries(requirement.requiredGateIds.map((gateId) => [gateId, 'unreviewed' as const]));
    const template: RowReviewerDecisionTemplateV2 = {
      reviewScope: 'row' as const,
      sourceQueueIndex: queue?.sourceQueueIndex ?? index + 1,
      batchId: batchByPhrase.get(key) ?? `missing_batch_${requirement.lessonId}`,
      lessonId: requirement.lessonId,
      phraseId: requirement.phraseId,
      schemaRowId: requirement.schemaRowId,
      qualityRowId: requirement.qualityRowId,
      studyTarget: 'fr' as const,
      sourceLocaleCoverage: ['ru', 'uk'] as Array<'ru' | 'uk'>,
      sourceGraphEnglishBase: queue?.row.englishBase ?? '',
      sourceMeanings: {
        ru: queue?.row.russianMeaning ?? '',
        uk: queue?.row.ukrainianMeaning ?? '',
      },
      candidateTargetText: queue?.row.proposedFrench ?? '',
      candidateQuiz: {
        blank: queue?.row.quizBlank ?? '',
        correct: queue?.row.quizCorrect ?? '',
        distractors: queue?.row.quizDistractors ?? [],
        category: queue?.row.quizCategory ?? '',
      },
      sourceMeaningHash: requirement.sourceMeaningHash,
      grammarClusterId: requirement.grammarClusterId,
      secondaryGrammarClusterIds: requirement.secondaryGrammarClusterIds,
      requiredTransformationType: requirement.requiredTransformationType,
      researchEvidenceIds: requirement.evidenceSourceIds,
      requiredGateIds: requirement.requiredGateIds,
      gateReviewerDecisions,
      reviewerDecision: '',
      correctedTargetText: '',
      correctedQuizBlank: '',
      correctedQuizCorrect: '',
      correctedQuizDistractors: '',
      reviewerNotes: '',
      reviewerName: '',
      reviewedAt: '',
      currentReviewerStatus: 'needs_quality_review',
      currentActivationStatus: 'blocked',
      reviewerImportAllowed: false,
      productionApplyAllowed: false,
      activationApproved: false,
    };
    return template;
  });

  return { rows, missingQueueRows };
}

function buildAiTemplates(aiRequirements: AiQualityGateRequirement[]): AiReviewerDecisionTemplateV2[] {
  return aiRequirements.map((requirement, index) => ({
    reviewScope: 'ai_prompt',
    aiTemplateIndex: index + 1,
    aiQualityGateId: requirement.aiQualityGateId,
    contractId: requirement.contractId,
    domainId: requirement.domainId,
    domainTitle: requirement.domainTitle,
    filePath: requirement.filePath,
    featureRiskClass: requirement.featureRiskClass,
    riskLevel: requirement.riskLevel,
    studyTarget: 'fr',
    sourceLocaleCoverage: ['ru', 'uk'],
    requiredGateIds: requirement.requiredGateIds,
    cacheKeyDimensionsRequired: requirement.cacheKeyDimensionsRequired,
    wrongLanguageGateDecision: 'unreviewed',
    cacheLanguageGateDecision: 'unreviewed',
    liveReturnGateDecision: 'unreviewed',
    reviewerDecision: '',
    reviewerNotes: '',
    reviewerName: '',
    reviewedAt: '',
    rejectedFreshOutputMayReturn: false,
    rejectedFreshOutputMayBeCached: false,
    targetOutputAllowedBeforeQualityPass: false,
    currentActivationStatus: 'blocked',
    reviewerImportAllowed: false,
    productionApplyAllowed: false,
    activationApproved: false,
  }));
}

function renderRowTsv(rows: RowReviewerDecisionTemplateV2[]): string {
  const lines = [ROW_TSV_HEADERS.join('\t')];
  for (const row of rows) {
    lines.push([
      row.sourceQueueIndex,
      row.batchId,
      row.lessonId,
      row.phraseId,
      row.schemaRowId,
      row.qualityRowId,
      row.studyTarget,
      row.sourceLocaleCoverage,
      row.sourceGraphEnglishBase,
      row.sourceMeanings.ru,
      row.sourceMeanings.uk,
      row.candidateTargetText,
      row.candidateQuiz.blank,
      row.candidateQuiz.correct,
      row.candidateQuiz.distractors,
      row.candidateQuiz.category,
      row.grammarClusterId,
      row.requiredTransformationType,
      row.researchEvidenceIds,
      row.requiredGateIds,
      row.reviewerDecision,
      row.correctedTargetText,
      row.correctedQuizBlank,
      row.correctedQuizCorrect,
      row.correctedQuizDistractors,
      row.reviewerNotes,
      row.reviewerName,
      row.reviewedAt,
      row.currentActivationStatus,
      row.activationApproved,
    ].map(tsvCell).join('\t'));
  }
  lines.push('');
  return lines.join('\n');
}

function renderAiTsv(rows: AiReviewerDecisionTemplateV2[]): string {
  const lines = [AI_TSV_HEADERS.join('\t')];
  for (const row of rows) {
    lines.push([
      row.aiTemplateIndex,
      row.aiQualityGateId,
      row.contractId,
      row.domainId,
      row.domainTitle,
      row.filePath,
      row.featureRiskClass,
      row.riskLevel,
      row.studyTarget,
      row.sourceLocaleCoverage,
      row.requiredGateIds,
      row.cacheKeyDimensionsRequired,
      row.wrongLanguageGateDecision,
      row.cacheLanguageGateDecision,
      row.liveReturnGateDecision,
      row.reviewerDecision,
      row.reviewerNotes,
      row.reviewerName,
      row.reviewedAt,
      row.currentActivationStatus,
      row.activationApproved,
    ].map(tsvCell).join('\t'));
  }
  lines.push('');
  return lines.join('\n');
}

function writeJsonl(filePath: string, rows: Array<RowReviewerDecisionTemplateV2 | AiReviewerDecisionTemplateV2>): void {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
}

function emptyMetrics(): Metrics {
  return {
    rowQualityRequirements: 0,
    rowTemplateRows: 0,
    rowTemplatesWithSchemaRowId: 0,
    rowTemplatesWithQualityRowId: 0,
    rowTemplatesWithRequiredGates: 0,
    rowTemplatesWithResearchEvidence: 0,
    rowTemplatesWithBlankReviewerDecision: 0,
    rowTemplatesActivationBlocked: 0,
    rowTemplatesImportBlocked: 0,
    rowTemplatesApplyBlocked: 0,
    rowTemplatesActivationNotApproved: 0,
    rowTemplatesMatchedExistingQueue: 0,
    aiQualityRequirements: 0,
    aiTemplateRows: 0,
    highRiskAiTemplateRows: 0,
    aiTemplatesWithContractId: 0,
    aiTemplatesWithWrongLanguageGate: 0,
    aiTemplatesWithCacheGate: 0,
    aiTemplatesWithBlankReviewerDecision: 0,
    aiTemplatesActivationBlocked: 0,
    aiTemplatesImportBlocked: 0,
    aiTemplatesApplyBlocked: 0,
    aiTemplatesActivationNotApproved: 0,
    activationApprovedFlags: 0,
    reviewerImportOpenFlags: 0,
    productionApplyOpenFlags: 0,
    generationOpenFlags: 0,
  };
}

function jsonPathJoin(base: string, key: string | number): string {
  return typeof key === 'number' ? `${base}[${key}]` : `${base}.${key}`;
}

function inspectSafetyFlags(value: unknown, filePath: string, jsonPath: string, findings: Finding[], metrics: Metrics): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectSafetyFlags(entry, filePath, jsonPathJoin(jsonPath, index), findings, metrics));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value as JsonObject)) {
    const currentPath = jsonPathJoin(jsonPath, key);
    if (key === 'activationApproved' && entry !== false) {
      metrics.activationApprovedFlags += 1;
      addFinding(findings, 'blocker', 'activation_approved_open', 'Reviewer Workflow V2 must keep activationApproved=false.', filePath, currentPath);
    }
    if (key === 'reviewerImportAllowed' && entry !== false) {
      metrics.reviewerImportOpenFlags += 1;
      addFinding(findings, 'blocker', 'reviewer_import_open', 'Reviewer Workflow V2 must not open reviewer import.', filePath, currentPath);
    }
    if (key === 'productionApplyAllowed' && entry !== false) {
      metrics.productionApplyOpenFlags += 1;
      addFinding(findings, 'blocker', 'production_apply_open', 'Reviewer Workflow V2 must not open production apply.', filePath, currentPath);
    }
    if (key === 'readyForGenerationV2' && entry !== false) {
      metrics.generationOpenFlags += 1;
      addFinding(findings, 'blocker', 'generation_v2_open', 'Reviewer Workflow V2 must not open Generation V2.', filePath, currentPath);
    }
    inspectSafetyFlags(entry, filePath, currentPath, findings, metrics);
  }
}

function validateWorkflow(
  schema: ReviewerWorkflowV2,
  rowTemplates: RowReviewerDecisionTemplateV2[],
  aiTemplates: AiReviewerDecisionTemplateV2[],
  expectedRows: number,
  expectedAiRequirements: number,
  matchedExistingQueueRows: number,
  filePath: string,
): { findings: Finding[]; metrics: Metrics } {
  const findings: Finding[] = [];
  const metrics = emptyMetrics();

  metrics.rowQualityRequirements = expectedRows;
  metrics.rowTemplateRows = rowTemplates.length;
  metrics.rowTemplatesWithSchemaRowId = rowTemplates.filter((row) => row.schemaRowId.trim() !== '').length;
  metrics.rowTemplatesWithQualityRowId = rowTemplates.filter((row) => row.qualityRowId.trim() !== '').length;
  metrics.rowTemplatesWithRequiredGates = rowTemplates.filter((row) =>
    row.requiredGateIds.includes('language_field_isolation_gate') &&
    row.requiredGateIds.includes('anti_calque_gate') &&
    row.requiredGateIds.includes('grammar_cluster_gate') &&
    row.requiredGateIds.includes('naturalness_register_gate') &&
    row.requiredGateIds.includes('source_meaning_parity_gate') &&
    row.requiredGateIds.includes('quiz_one_correct_answer_gate') &&
    Object.keys(row.gateReviewerDecisions).length === row.requiredGateIds.length
  ).length;
  metrics.rowTemplatesWithResearchEvidence = rowTemplates.filter((row) => row.researchEvidenceIds.length > 0).length;
  metrics.rowTemplatesWithBlankReviewerDecision = rowTemplates.filter((row) => row.reviewerDecision === '').length;
  metrics.rowTemplatesActivationBlocked = rowTemplates.filter((row) => row.currentActivationStatus === 'blocked').length;
  metrics.rowTemplatesImportBlocked = rowTemplates.filter((row) => row.reviewerImportAllowed === false).length;
  metrics.rowTemplatesApplyBlocked = rowTemplates.filter((row) => row.productionApplyAllowed === false).length;
  metrics.rowTemplatesActivationNotApproved = rowTemplates.filter((row) => row.activationApproved === false).length;
  metrics.rowTemplatesMatchedExistingQueue = matchedExistingQueueRows;
  metrics.aiQualityRequirements = expectedAiRequirements;
  metrics.aiTemplateRows = aiTemplates.length;
  metrics.highRiskAiTemplateRows = aiTemplates.filter((row) => row.riskLevel === 'critical' || row.riskLevel === 'high').length;
  metrics.aiTemplatesWithContractId = aiTemplates.filter((row) => row.contractId.trim() !== '').length;
  metrics.aiTemplatesWithWrongLanguageGate = aiTemplates.filter((row) =>
    row.requiredGateIds.includes('ai_wrong_language_gate') &&
    row.wrongLanguageGateDecision === 'unreviewed'
  ).length;
  metrics.aiTemplatesWithCacheGate = aiTemplates.filter((row) =>
    row.requiredGateIds.includes('ai_cache_language_key_gate') &&
    row.cacheKeyDimensionsRequired.includes('targetLocale') &&
    row.cacheKeyDimensionsRequired.includes('sourceLocales') &&
    row.cacheKeyDimensionsRequired.includes('uiLocale')
  ).length;
  metrics.aiTemplatesWithBlankReviewerDecision = aiTemplates.filter((row) => row.reviewerDecision === '').length;
  metrics.aiTemplatesActivationBlocked = aiTemplates.filter((row) => row.currentActivationStatus === 'blocked').length;
  metrics.aiTemplatesImportBlocked = aiTemplates.filter((row) => row.reviewerImportAllowed === false).length;
  metrics.aiTemplatesApplyBlocked = aiTemplates.filter((row) => row.productionApplyAllowed === false).length;
  metrics.aiTemplatesActivationNotApproved = aiTemplates.filter((row) => row.activationApproved === false).length;

  if (schema.schemaVersion !== 'gustav-reviewer-workflow-v2-decision-schema-v0') addFinding(findings, 'blocker', 'schema_version_invalid', 'Reviewer Workflow V2 schemaVersion is invalid.', filePath, '$.schemaVersion');
  if (schema.targetLocale !== 'fr' || schema.targetStudyLanguage !== 'fr') addFinding(findings, 'blocker', 'target_locale_invalid', 'Reviewer Workflow V2 target locale must be fr.', filePath);
  if (JSON.stringify(schema.sourceLocales) !== JSON.stringify(['ru', 'uk'])) addFinding(findings, 'blocker', 'source_locales_invalid', 'Reviewer Workflow V2 sourceLocales must be ru,uk.', filePath, '$.sourceLocales');
  if (rowTemplates.length !== expectedRows) addFinding(findings, 'blocker', 'row_template_count_mismatch', `Expected ${expectedRows} V2 row decision rows, got ${rowTemplates.length}.`, filePath);
  if (metrics.rowTemplatesWithSchemaRowId !== rowTemplates.length) addFinding(findings, 'blocker', 'row_schema_id_missing', 'Every V2 row decision must bind schemaRowId.', filePath);
  if (metrics.rowTemplatesWithQualityRowId !== rowTemplates.length) addFinding(findings, 'blocker', 'row_quality_id_missing', 'Every V2 row decision must bind qualityRowId.', filePath);
  if (metrics.rowTemplatesWithRequiredGates !== rowTemplates.length) addFinding(findings, 'blocker', 'row_gate_decisions_incomplete', 'Every V2 row decision must include all required quality gate placeholders.', filePath);
  if (metrics.rowTemplatesWithResearchEvidence !== rowTemplates.length) addFinding(findings, 'blocker', 'row_research_evidence_missing', 'Every V2 row decision must include researchEvidenceIds.', filePath);
  if (metrics.rowTemplatesWithBlankReviewerDecision !== rowTemplates.length) addFinding(findings, 'blocker', 'row_reviewer_decision_not_blank', 'V2 decision template must start with blank reviewer decisions.', filePath);
  if (metrics.rowTemplatesActivationBlocked !== rowTemplates.length || metrics.rowTemplatesImportBlocked !== rowTemplates.length || metrics.rowTemplatesApplyBlocked !== rowTemplates.length || metrics.rowTemplatesActivationNotApproved !== rowTemplates.length) {
    addFinding(findings, 'blocker', 'row_activation_or_import_open', 'Every V2 row decision must keep activation/import/apply closed.', filePath);
  }
  if (metrics.rowTemplatesMatchedExistingQueue !== rowTemplates.length) addFinding(findings, 'blocker', 'row_template_missing_existing_queue_context', 'Every V2 row decision must be matched to an existing reviewer queue row for context.', filePath);
  if (aiTemplates.length !== expectedAiRequirements) addFinding(findings, 'blocker', 'ai_template_count_mismatch', `Expected ${expectedAiRequirements} V2 AI decision rows, got ${aiTemplates.length}.`, filePath);
  if (metrics.aiTemplatesWithContractId !== aiTemplates.length) addFinding(findings, 'blocker', 'ai_contract_id_missing', 'Every V2 AI decision must bind contractId.', filePath);
  if (metrics.aiTemplatesWithWrongLanguageGate !== aiTemplates.length) addFinding(findings, 'blocker', 'ai_wrong_language_gate_missing', 'Every V2 AI decision must include wrong-language gate placeholder.', filePath);
  if (metrics.aiTemplatesWithCacheGate !== aiTemplates.length) addFinding(findings, 'blocker', 'ai_cache_gate_missing', 'Every V2 AI decision must include cache-language gate dimensions.', filePath);
  if (metrics.aiTemplatesWithBlankReviewerDecision !== aiTemplates.length) addFinding(findings, 'blocker', 'ai_reviewer_decision_not_blank', 'V2 AI decision template must start with blank reviewer decisions.', filePath);
  if (aiTemplates.some((row) => row.rejectedFreshOutputMayReturn !== false)) {
    addFinding(findings, 'blocker', 'ai_rejected_fresh_return_open', 'Every V2 AI decision must block rejected fresh output before live return.', filePath);
  }
  if (aiTemplates.some((row) => row.rejectedFreshOutputMayBeCached !== false)) {
    addFinding(findings, 'blocker', 'ai_rejected_fresh_cache_open', 'Every V2 AI decision must block rejected fresh output before cache.', filePath);
  }
  if (aiTemplates.some((row) => row.targetOutputAllowedBeforeQualityPass !== false)) {
    addFinding(findings, 'blocker', 'ai_target_output_open_before_quality_pass', 'Every V2 AI decision must block target output before quality pass.', filePath);
  }
  if (metrics.aiTemplatesActivationBlocked !== aiTemplates.length || metrics.aiTemplatesImportBlocked !== aiTemplates.length || metrics.aiTemplatesApplyBlocked !== aiTemplates.length || metrics.aiTemplatesActivationNotApproved !== aiTemplates.length) {
    addFinding(findings, 'blocker', 'ai_activation_or_import_open', 'Every V2 AI decision must keep activation/import/apply closed.', filePath);
  }
  if (
    schema.activationPolicy.reviewerWorkflowAloneMayImportDecisions !== false ||
    schema.activationPolicy.reviewerWorkflowAloneMayApplyProduction !== false ||
    schema.activationPolicy.reviewerWorkflowAloneMayStartGeneration !== false ||
    schema.readyForDecisionImportV2 !== false ||
    schema.readyForGenerationV2 !== false ||
    schema.readyForApply !== false ||
    schema.mayModifyProductionAppFiles !== false ||
    schema.activationApproved !== false
  ) {
    addFinding(findings, 'blocker', 'workflow_activation_policy_open', 'Reviewer Workflow V2 must not open decision import, generation, app writes, or apply.', filePath, '$.activationPolicy');
  }

  inspectSafetyFlags(schema, filePath, '$.schema', findings, metrics);
  inspectSafetyFlags(rowTemplates, filePath, '$.rowTemplates', findings, metrics);
  inspectSafetyFlags(aiTemplates, filePath, '$.aiTemplates', findings, metrics);
  return { findings, metrics };
}

function cloneRows(rows: RowReviewerDecisionTemplateV2[]): RowReviewerDecisionTemplateV2[] {
  return JSON.parse(JSON.stringify(rows)) as RowReviewerDecisionTemplateV2[];
}

function cloneAi(rows: AiReviewerDecisionTemplateV2[]): AiReviewerDecisionTemplateV2[] {
  return JSON.parse(JSON.stringify(rows)) as AiReviewerDecisionTemplateV2[];
}

function cloneSchema(schema: ReviewerWorkflowV2): ReviewerWorkflowV2 {
  return JSON.parse(JSON.stringify(schema)) as ReviewerWorkflowV2;
}

function runRowProbes(
  schema: ReviewerWorkflowV2,
  rows: RowReviewerDecisionTemplateV2[],
  aiRows: AiReviewerDecisionTemplateV2[],
  expectedRows: number,
  expectedAiRows: number,
  matchedExistingQueueRows: number,
  filePath: string,
): Probe[] {
  const probes: Array<{ id: string; expectedAccept: boolean; schema: ReviewerWorkflowV2; rows: RowReviewerDecisionTemplateV2[]; aiRows: AiReviewerDecisionTemplateV2[]; matched: number }> = [];
  probes.push({ id: 'canonical_reviewer_workflow_v2_accepts', expectedAccept: true, schema: cloneSchema(schema), rows: cloneRows(rows), aiRows: cloneAi(aiRows), matched: matchedExistingQueueRows });

  const missingRow = cloneRows(rows);
  missingRow.pop();
  probes.push({ id: 'missing_row_decision_slot_rejected', expectedAccept: false, schema: cloneSchema(schema), rows: missingRow, aiRows: cloneAi(aiRows), matched: matchedExistingQueueRows - 1 });

  const missingGate = cloneRows(rows);
  delete missingGate[0].gateReviewerDecisions[missingGate[0].requiredGateIds[0]];
  probes.push({ id: 'missing_row_gate_placeholder_rejected', expectedAccept: false, schema: cloneSchema(schema), rows: missingGate, aiRows: cloneAi(aiRows), matched: matchedExistingQueueRows });

  const importOpen = cloneRows(rows);
  importOpen[0].reviewerImportAllowed = true as false;
  probes.push({ id: 'row_reviewer_import_open_rejected', expectedAccept: false, schema: cloneSchema(schema), rows: importOpen, aiRows: cloneAi(aiRows), matched: matchedExistingQueueRows });

  const activationOpen = cloneRows(rows);
  activationOpen[0].activationApproved = true as false;
  probes.push({ id: 'row_activation_approval_rejected', expectedAccept: false, schema: cloneSchema(schema), rows: activationOpen, aiRows: cloneAi(aiRows), matched: matchedExistingQueueRows });

  return probes.map((probe) => {
    const result = validateWorkflow(probe.schema, probe.rows, probe.aiRows, expectedRows, expectedAiRows, probe.matched, filePath);
    const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return {
      id: probe.id,
      expectedAccept: probe.expectedAccept,
      accepted,
      blockers,
      passed: accepted === probe.expectedAccept,
    };
  });
}

function runAiProbes(
  schema: ReviewerWorkflowV2,
  rows: RowReviewerDecisionTemplateV2[],
  aiRows: AiReviewerDecisionTemplateV2[],
  expectedRows: number,
  expectedAiRows: number,
  matchedExistingQueueRows: number,
  filePath: string,
): Probe[] {
  const probes: Array<{ id: string; expectedAccept: boolean; schema: ReviewerWorkflowV2; rows: RowReviewerDecisionTemplateV2[]; aiRows: AiReviewerDecisionTemplateV2[] }> = [];

  const missingAi = cloneAi(aiRows);
  missingAi.pop();
  probes.push({ id: 'missing_ai_decision_slot_rejected', expectedAccept: false, schema: cloneSchema(schema), rows: cloneRows(rows), aiRows: missingAi });

  const missingWrongLanguage = cloneAi(aiRows);
  missingWrongLanguage[0].requiredGateIds = missingWrongLanguage[0].requiredGateIds.filter((gateId) => gateId !== 'ai_wrong_language_gate');
  probes.push({ id: 'missing_ai_wrong_language_gate_rejected', expectedAccept: false, schema: cloneSchema(schema), rows: cloneRows(rows), aiRows: missingWrongLanguage });

  const cacheGateBroken = cloneAi(aiRows);
  cacheGateBroken[0].cacheKeyDimensionsRequired = cacheGateBroken[0].cacheKeyDimensionsRequired.filter((dimension) => dimension !== 'targetLocale');
  probes.push({ id: 'missing_ai_cache_dimension_rejected', expectedAccept: false, schema: cloneSchema(schema), rows: cloneRows(rows), aiRows: cacheGateBroken });

  const aiReturnOpen = cloneAi(aiRows);
  aiReturnOpen[0].rejectedFreshOutputMayReturn = true as false;
  probes.push({ id: 'ai_rejected_return_open_rejected', expectedAccept: false, schema: cloneSchema(schema), rows: cloneRows(rows), aiRows: aiReturnOpen });

  const workflowApplyOpen = cloneSchema(schema);
  workflowApplyOpen.activationPolicy.reviewerWorkflowAloneMayApplyProduction = true as false;
  probes.push({ id: 'workflow_apply_open_rejected', expectedAccept: false, schema: workflowApplyOpen, rows: cloneRows(rows), aiRows: cloneAi(aiRows) });

  return probes.map((probe) => {
    const result = validateWorkflow(probe.schema, probe.rows, probe.aiRows, expectedRows, expectedAiRows, matchedExistingQueueRows, filePath);
    const blockers = result.findings.filter((finding) => finding.severity === 'blocker').length;
    const accepted = blockers === 0;
    return {
      id: probe.id,
      expectedAccept: probe.expectedAccept,
      accepted,
      blockers,
      passed: accepted === probe.expectedAccept,
    };
  });
}

function renderMarkdown(report: Report): string {
  const lines = [
    '# GUSTAV Reviewer Workflow V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Content Quality Gates ready: ${report.summary.contentQualityGatesReady ? 'yes' : 'no'}`,
    `- Row quality requirements: ${report.summary.rowQualityRequirements}`,
    `- Row V2 decision template rows: ${report.summary.rowTemplateRows}`,
    `- Row templates with required gates: ${report.summary.rowTemplatesWithRequiredGates}`,
    `- Row templates with research evidence: ${report.summary.rowTemplatesWithResearchEvidence}`,
    `- Row templates matched existing queue: ${report.summary.rowTemplatesMatchedExistingQueue}`,
    `- Row decisions blank: ${report.summary.rowTemplatesWithBlankReviewerDecision}`,
    `- Row import/apply blocked: ${report.summary.rowTemplatesImportBlocked}/${report.summary.rowTemplatesApplyBlocked}`,
    `- AI quality requirements: ${report.summary.aiQualityRequirements}`,
    `- AI V2 decision template rows: ${report.summary.aiTemplateRows}`,
    `- High/critical AI template rows: ${report.summary.highRiskAiTemplateRows}`,
    `- AI wrong-language/cache gates: ${report.summary.aiTemplatesWithWrongLanguageGate}/${report.summary.aiTemplatesWithCacheGate}`,
    `- AI decisions blank: ${report.summary.aiTemplatesWithBlankReviewerDecision}`,
    `- Row fixture probes passed: ${report.summary.rowFixtureProbesPassed}/${report.summary.rowFixtureProbes}`,
    `- AI fixture probes passed: ${report.summary.aiFixtureProbesPassed}/${report.summary.aiFixtureProbes}`,
    `- Ready for LLM official-source review V2: ${report.summary.readyForLlmOfficialSourceReviewV2 ? 'yes' : 'no'}`,
    `- Ready for decision import V2: ${report.summary.readyForDecisionImportV2 ? 'yes' : 'no'}`,
    `- Ready for Brain Gate V2: ${report.summary.readyForBrainGateV2 ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Output Artifacts',
    '',
  ];
  for (const [key, value] of Object.entries(report.outputs)) lines.push(`- ${key}: \`${value}\``);
  lines.push('', '## Row Probes', '');
  for (const probe of report.rowProbes) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (expected accept=${probe.expectedAccept ? 'yes' : 'no'}, actual accept=${probe.accepted ? 'yes' : 'no'}, blockers=${probe.blockers})`);
  }
  lines.push('', '## AI Probes', '');
  for (const probe of report.aiProbes) {
    lines.push(`- \`${probe.id}\`: ${probe.passed ? 'pass' : 'fail'} (expected accept=${probe.expectedAccept ? 'yes' : 'no'}, actual accept=${probe.accepted ? 'yes' : 'no'}, blockers=${probe.blockers})`);
  }
  lines.push('', '## Findings', '');
  if (report.findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of report.findings) {
      lines.push(`- \`${finding.severity}\` \`${finding.code}\`: ${finding.message}${finding.path ? ` (${finding.path}${finding.jsonPath ? ` ${finding.jsonPath}` : ''})` : ''}`);
    }
  }
  lines.push(
    '',
    '## Safety',
    '',
    '- This packet creates reviewer workflow artifacts only.',
    '- It does not import reviewer decisions.',
    '- It does not modify generated lesson ledgers.',
    '- It does not write production app files.',
    '- It does not upload Firebase/server packs.',
    '- It does not approve activation.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  const targetArg = argValue('--target') ?? 'fr';
  if (!runArg || targetArg !== 'fr') {
    throw new Error('Usage: npx tsx scripts/gustav_reviewer_workflow_v2_packet.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const reviewerDir = path.join(runDir, 'generated', 'fr', 'reviewer');
  const researchDir = path.join(runDir, 'research');
  const contentQualityGatesPath = path.join(researchDir, 'fr_content_quality_gates_v2.json');
  const contentQualityGatesPacketPath = path.join(auditsDir, 'content_quality_gates_v2_packet.json');
  const reviewerQueuePath = path.join(reviewerDir, 'french_reviewer_queue.jsonl');
  const reviewBatchesPath = path.join(reviewerDir, 'french_review_batches.json');
  const outSchema = path.join(reviewerDir, 'reviewer_workflow_v2_decision_schema.json');
  const outRowJsonl = path.join(reviewerDir, 'reviewer_decision_template_v2.jsonl');
  const outRowTsv = path.join(reviewerDir, 'reviewer_decision_template_v2.tsv');
  const outAiJsonl = path.join(reviewerDir, 'reviewer_ai_decision_template_v2.jsonl');
  const outAiTsv = path.join(reviewerDir, 'reviewer_ai_decision_template_v2.tsv');
  const outJson = path.join(auditsDir, 'reviewer_workflow_v2_packet.json');
  const outMd = path.join(auditsDir, 'reviewer_workflow_v2_packet.md');
  ensureDir(auditsDir);
  ensureDir(reviewerDir);

  const findings: Finding[] = [];
  for (const filePath of [contentQualityGatesPath, contentQualityGatesPacketPath, reviewerQueuePath, reviewBatchesPath]) {
    if (!fs.existsSync(filePath)) addFinding(findings, 'blocker', 'required_input_missing', 'Reviewer Workflow V2 input is missing.', rel(repoRoot, filePath));
  }

  const contentQualitySummary = summaryOf(contentQualityGatesPacketPath);
  const contentQualityGatesReady = b(contentQualitySummary, 'readyForReviewerWorkflowV2') && n(contentQualitySummary, 'blockers') === 0;
  if (!contentQualityGatesReady) {
    addFinding(findings, 'blocker', 'content_quality_gates_v2_not_ready', 'P8 requires Content Quality Gates V2 to be ready for Reviewer Workflow V2.', rel(repoRoot, contentQualityGatesPacketPath));
  }

  let workflowSchema: ReviewerWorkflowV2 | null = null;
  let rowTemplates: RowReviewerDecisionTemplateV2[] = [];
  let aiTemplates: AiReviewerDecisionTemplateV2[] = [];
  let validation = { findings: [] as Finding[], metrics: emptyMetrics() };
  let rowProbes: Probe[] = [];
  let aiProbes: Probe[] = [];

  if (findings.filter((finding) => finding.severity === 'blocker').length === 0) {
    const contentQualityGates = readJson<ContentQualityGatesV2>(contentQualityGatesPath);
    const queueRows = parseJsonl<QueueRow>(reviewerQueuePath);
    const batchReport = readJson<{ batches: ReviewBatch[] }>(reviewBatchesPath);
    workflowSchema = buildWorkflowSchema(runId);
    const rowTemplateBuild = buildRowTemplates(contentQualityGates.rowQualityGateRequirements, queueRows, batchReport.batches);
    rowTemplates = rowTemplateBuild.rows;
    aiTemplates = buildAiTemplates(contentQualityGates.aiQualityGateRequirements);
    const matchedExistingQueueRows = rowTemplates.length - rowTemplateBuild.missingQueueRows;
    validation = validateWorkflow(
      workflowSchema,
      rowTemplates,
      aiTemplates,
      contentQualityGates.rowQualityGateRequirements.length,
      contentQualityGates.aiQualityGateRequirements.length,
      matchedExistingQueueRows,
      rel(repoRoot, outJson),
    );
    rowProbes = runRowProbes(
      workflowSchema,
      rowTemplates,
      aiTemplates,
      contentQualityGates.rowQualityGateRequirements.length,
      contentQualityGates.aiQualityGateRequirements.length,
      matchedExistingQueueRows,
      rel(repoRoot, outJson),
    );
    aiProbes = runAiProbes(
      workflowSchema,
      rowTemplates,
      aiTemplates,
      contentQualityGates.rowQualityGateRequirements.length,
      contentQualityGates.aiQualityGateRequirements.length,
      matchedExistingQueueRows,
      rel(repoRoot, outJson),
    );
    findings.push(...validation.findings);
    for (const probe of [...rowProbes, ...aiProbes]) {
      if (!probe.passed) addFinding(findings, 'blocker', 'fixture_probe_failed', `Reviewer Workflow V2 fixture probe failed: ${probe.id}.`);
    }
  }

  const metrics = validation.metrics;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const rowFixtureProbesPassed = rowProbes.filter((probe) => probe.passed).length;
  const aiFixtureProbesPassed = aiProbes.filter((probe) => probe.passed).length;
  const readyForLlmOfficialSourceReviewV2 =
    Boolean(workflowSchema) &&
    blockers === 0 &&
    contentQualityGatesReady &&
    metrics.rowTemplateRows === metrics.rowQualityRequirements &&
    metrics.rowTemplatesWithRequiredGates === metrics.rowTemplateRows &&
    metrics.rowTemplatesWithResearchEvidence === metrics.rowTemplateRows &&
    metrics.rowTemplatesMatchedExistingQueue === metrics.rowTemplateRows &&
    metrics.aiTemplateRows === metrics.aiQualityRequirements &&
    metrics.aiTemplatesWithWrongLanguageGate === metrics.aiTemplateRows &&
    metrics.aiTemplatesWithCacheGate === metrics.aiTemplateRows &&
    rowFixtureProbesPassed === rowProbes.length &&
    aiFixtureProbesPassed === aiProbes.length;
  const readyForBrainGateV2 = readyForLlmOfficialSourceReviewV2;

  if (workflowSchema && blockers === 0) {
    fs.writeFileSync(outSchema, `${JSON.stringify(workflowSchema, null, 2)}\n`, 'utf8');
    writeJsonl(outRowJsonl, rowTemplates);
    fs.writeFileSync(outRowTsv, renderRowTsv(rowTemplates), 'utf8');
    writeJsonl(outAiJsonl, aiTemplates);
    fs.writeFileSync(outAiTsv, renderAiTsv(aiTemplates), 'utf8');
  }

  const hashes = {
    decisionSchemaSha256: fs.existsSync(outSchema) ? sha256(outSchema) : '',
    rowDecisionTemplateJsonlSha256: fs.existsSync(outRowJsonl) ? sha256(outRowJsonl) : '',
    rowDecisionTemplateTsvSha256: fs.existsSync(outRowTsv) ? sha256(outRowTsv) : '',
    aiDecisionTemplateJsonlSha256: fs.existsSync(outAiJsonl) ? sha256(outAiJsonl) : '',
    aiDecisionTemplateTsvSha256: fs.existsSync(outAiTsv) ? sha256(outAiTsv) : '',
  };

  const report: Report = {
    schemaVersion: 'gustav-reviewer-workflow-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      contentQualityGatesV2: rel(repoRoot, contentQualityGatesPath),
      contentQualityGatesV2Packet: rel(repoRoot, contentQualityGatesPacketPath),
      reviewerQueueJsonl: rel(repoRoot, reviewerQueuePath),
      reviewBatchesJson: rel(repoRoot, reviewBatchesPath),
    },
    outputs: {
      reviewerWorkflowV2DecisionSchema: rel(repoRoot, outSchema),
      reviewerDecisionTemplateV2Jsonl: rel(repoRoot, outRowJsonl),
      reviewerDecisionTemplateV2Tsv: rel(repoRoot, outRowTsv),
      reviewerAiDecisionTemplateV2Jsonl: rel(repoRoot, outAiJsonl),
      reviewerAiDecisionTemplateV2Tsv: rel(repoRoot, outAiTsv),
      reviewerWorkflowV2PacketJson: rel(repoRoot, outJson),
      reviewerWorkflowV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      contentQualityGatesReady,
      rowFixtureProbes: rowProbes.length,
      rowFixtureProbesPassed,
      aiFixtureProbes: aiProbes.length,
      aiFixtureProbesPassed,
      readyForLlmOfficialSourceReviewV2,
      readyForDecisionImportV2: false,
      readyForBrainGateV2,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    hashes,
    rowProbes,
    aiProbes,
    findings,
    safety: {
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsImportedByThisScript: false,
      productionApplyApproved: false,
      firebaseOrServerUploadStarted: false,
    },
  };

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV Reviewer Workflow V2 packet: ${report.status}`);
  console.log(`Row V2 decision template rows: ${report.summary.rowTemplateRows}`);
  console.log(`AI V2 decision template rows: ${report.summary.aiTemplateRows}`);
  console.log(`Row probes: ${report.summary.rowFixtureProbesPassed}/${report.summary.rowFixtureProbes}`);
  console.log(`AI probes: ${report.summary.aiFixtureProbesPassed}/${report.summary.aiFixtureProbes}`);
  console.log(`Ready for LLM official-source review V2: ${report.summary.readyForLlmOfficialSourceReviewV2 ? 'yes' : 'no'}`);
  console.log(`Ready for decision import V2: ${report.summary.readyForDecisionImportV2 ? 'yes' : 'no'}`);
  console.log(`Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
