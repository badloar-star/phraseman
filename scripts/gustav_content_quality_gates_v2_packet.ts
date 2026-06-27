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

type RowSchemaRequirement = {
  schemaRowId: string;
  lessonId: number;
  phraseId: string;
  sourceMeaningHash: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  researchEvidenceIds: string[];
  pedagogyBlueprintId: string;
  grammarClusterId: string;
  secondaryGrammarClusterIds: string[];
  allowedTransformationTypes: string[];
  requiredTransformationType: string;
  antiCalqueDecision: string;
  activationStatus: 'blocked';
};

type GenerationSchemaV2 = {
  schemaVersion: 'gustav-fr-generation-schema-v2';
  runId: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  rowSchemaRequirements: RowSchemaRequirement[];
  readyForAiPromptContractV2: boolean;
  readyForGenerationV2: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
};

type AiEntrypointContract = {
  contractId: string;
  domainId: string;
  domainTitle: string;
  filePath: string;
  featureRiskClass: string;
  riskLevel: RiskLevel;
  cacheContract: {
    requiredKeyDimensions: string[];
    rejectedFreshOutputMayBeCached: false;
    targetMismatchCacheFallbackAllowed: false;
    sourceLocaleMismatchCacheFallbackAllowed: false;
    uiLocaleMismatchCacheFallbackAllowed: false;
  };
  outputContract: {
    rejectedFreshOutputMayReturn: false;
    wrongLanguageFallbackAllowed: false;
    targetOutputAllowedBeforeContentQualityGate: false;
  };
  returnContract: {
    mayReturnCachedOnlyIfLanguageKeyMatches: true;
    mayReturnRejectedFreshText: false;
    mustReturnSafeFallbackOnReject: true;
    safeFallbackMayContainTargetContent: false;
  };
  activationStatus: 'blocked';
};

type AiPromptContractV2 = {
  schemaVersion: 'gustav-fr-ai-prompt-contract-v2';
  runId: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  entrypointContracts: AiEntrypointContract[];
  readyForContentQualityGatesV2: boolean;
  readyForGenerationV2: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
};

type ResearchPack = {
  schemaVersion: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  grammarClusters: string[];
  antiCalqueRules: Array<{
    id: string;
    appliesTo: string[];
    rule: string;
    sourceIds: string[];
  }>;
  falseFriendRules: Array<{
    id: string;
    appliesTo: string[];
    rule: string;
    sourceIds: string[];
  }>;
  registerRules: Array<{
    id: string;
    appliesTo: string[];
    rule: string;
    sourceIds: string[];
  }>;
  quizDesignRules: Array<{
    id: string;
    appliesTo: string[];
    rule: string;
    sourceIds: string[];
  }>;
  containsTargetContentOutput: false;
  mayStartFrenchGeneration: false;
  mayModifyProductionAppFiles: false;
};

type QualityGate = {
  gateId: string;
  title: string;
  appliesTo: string[];
  rejectsWhen: string[];
  requiredEvidence: string[];
  blocksBeforeReturn: boolean;
  blocksBeforeCache: boolean;
  blocksBeforeReviewerAccept: boolean;
  activationStatus: 'blocked';
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
  activationBlockReason: 'blocked_until_quality_reviewer_and_apply_gates';
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
  activationBlockReason: 'blocked_until_quality_reviewer_and_apply_gates';
};

type ContentQualityGatesV2 = {
  schemaVersion: 'gustav-fr-content-quality-gates-v2';
  runId: string;
  generatedAt: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  sourceArtifacts: Record<string, string>;
  qualityGateCatalog: QualityGate[];
  rowQualityGateRequirements: RowQualityGateRequirement[];
  aiQualityGateRequirements: AiQualityGateRequirement[];
  qualityActivationPolicy: {
    generationAllowedFromQualityGatesAlone: false;
    reviewerImportAllowedFromQualityGatesAlone: false;
    productionApplyAllowedFromQualityGatesAlone: false;
    requiresReviewerWorkflowV2: true;
    requiresBrainGateV2: true;
    requiresProductionActivationGateV2: true;
  };
  selfImprovementRules: string[];
  readyForReviewerWorkflowV2: boolean;
  readyForGenerationV2: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
};

type Metrics = {
  rowQualityGateRequirements: number;
  rowsWithRequiredGateSet: number;
  rowsWithLanguageIsolationGate: number;
  rowsWithResearchEvidenceGate: number;
  rowsWithPedagogyBlueprintGate: number;
  rowsWithGenerationSchemaGate: number;
  rowsWithAntiCalqueGate: number;
  rowsWithGrammarGate: number;
  rowsWithNaturalnessGate: number;
  rowsWithSourceMeaningParityGate: number;
  rowsWithQuizGate: number;
  rowsTargetOutputBlocked: number;
  rowsActivationBlocked: number;
  aiQualityGateRequirements: number;
  highRiskAiGateRequirements: number;
  aiWithWrongLanguageGate: number;
  aiWithCacheLanguageKeyGate: number;
  aiRejectBeforeReturn: number;
  aiRejectBeforeCache: number;
  aiTargetOutputBlocked: number;
  aiActivationBlocked: number;
  forbiddenOutputKeys: number;
  forbiddenPermissionFlags: number;
  falseApprovalFlags: number;
  activationOpenFlags: number;
};

type Report = {
  schemaVersion: 'gustav-content-quality-gates-v2-packet-v0';
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
    generationSchemaV2Ready: boolean;
    aiPromptContractV2Ready: boolean;
    qualityGatesCatalog: number;
    fixtureProbes: number;
    fixtureProbesPassed: number;
    readyForReviewerWorkflowV2: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  gateIds: string[];
  probes: Probe[];
  findings: Finding[];
  safety: {
    researchOnlyArtifactWritten: true;
    productionAppFilesModifiedByThisScript: false;
    generatedFrenchLedgersModifiedByThisScript: false;
    reviewerDecisionsWrittenByThisScript: false;
    productionApplyApproved: false;
  };
};

type JsonObject = Record<string, unknown>;

const EXPECTED_ROW_COUNT = 1600;

const FORBIDDEN_OUTPUT_KEYS = new Set([
  'proposedFrench',
  'wordsFr',
  'french',
  'introExamples',
  'quizPrompts',
  'examRows',
]);

const PERMISSION_FLAGS = new Set([
  'mayWriteAppSeed',
  'mayWriteIntroExamples',
  'mayWriteQuizOrExam',
  'mayDraftTargetText',
  'mayStartTranslationNow',
  'mayStartFrenchGeneration',
  'mayModifyProductionAppFiles',
]);

const APPROVAL_FLAGS = new Set([
  'approvedForApply',
  'approvedByReviewer',
  'approvedForDrafting',
  'appSeedApproved',
  'introApproved',
  'appSeedRuntimeAllowed',
  'introRuntimeAllowed',
]);

const GATE_IDS = {
  language: 'language_field_isolation_gate',
  research: 'research_evidence_gate',
  blueprint: 'pedagogy_blueprint_gate',
  schema: 'generation_schema_v2_gate',
  antiCalque: 'anti_calque_gate',
  grammar: 'grammar_cluster_gate',
  naturalness: 'naturalness_register_gate',
  sourceParity: 'source_meaning_parity_gate',
  quiz: 'quiz_one_correct_answer_gate',
  falseFriend: 'false_friend_gate',
  aiWrongLanguage: 'ai_wrong_language_gate',
  aiCacheLanguage: 'ai_cache_language_key_gate',
  reviewerDecision: 'reviewer_decision_gate',
};

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

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function array<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
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
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
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

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim() !== ''))).sort((a, bValue) => a.localeCompare(bValue));
}

function qualityGateCatalog(researchPack: ResearchPack): QualityGate[] {
  return [
    {
      gateId: GATE_IDS.language,
      title: 'Language field isolation',
      appliesTo: ['all_target_content', 'all_source_meaning', 'all_ui_copy'],
      rejectsWhen: [
        'target fields contain source-locale explanatory text',
        'source meaning fields contain target-locale lesson output',
        'ui copy is reused as target learning content',
      ],
      requiredEvidence: ['targetLocale', 'sourceLocales', 'uiLocale', 'fieldLanguageDeclaration'],
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.research,
      title: 'Trusted research evidence',
      appliesTo: ['all_row_scoped_target_content'],
      rejectsWhen: ['row has no researchEvidenceIds', 'evidence source does not appear in the target research pack'],
      requiredEvidence: ['researchEvidenceIds', 'targetResearchPackVersion'],
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.blueprint,
      title: 'Pedagogy blueprint mapping',
      appliesTo: ['all_row_scoped_target_content'],
      rejectsWhen: ['row has no pedagogyBlueprintId', 'direct translation is attempted without blueprint approval'],
      requiredEvidence: ['pedagogyBlueprintId', 'requiredTransformationType'],
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.schema,
      title: 'Generation Schema V2 contract',
      appliesTo: ['all_row_scoped_target_content'],
      rejectsWhen: ['schemaRowId is missing', 'Generation Schema V2 language fields are missing'],
      requiredEvidence: ['schemaRowId', 'generationSchemaVersion'],
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.antiCalque,
      title: 'Anti-calque rebuild',
      appliesTo: researchPack.antiCalqueRules.flatMap((rule) => rule.appliesTo),
      rejectsWhen: researchPack.antiCalqueRules.map((rule) => rule.rule),
      requiredEvidence: unique(researchPack.antiCalqueRules.flatMap((rule) => rule.sourceIds)),
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.grammar,
      title: 'Target grammar cluster',
      appliesTo: researchPack.grammarClusters,
      rejectsWhen: ['target row ignores its primary grammarClusterId', 'target row uses source grammar order as the default answer'],
      requiredEvidence: ['grammarClusterId', 'targetGrammarReference'],
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.naturalness,
      title: 'Naturalness and register',
      appliesTo: researchPack.registerRules.flatMap((rule) => rule.appliesTo),
      rejectsWhen: researchPack.registerRules.map((rule) => rule.rule),
      requiredEvidence: unique(researchPack.registerRules.flatMap((rule) => rule.sourceIds)),
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.sourceParity,
      title: 'Source meaning parity',
      appliesTo: ['ru', 'uk', 'source_graph_meaning_hash'],
      rejectsWhen: ['target content changes source intent', 'RU and UK source meaning disagree without reviewer note'],
      requiredEvidence: ['sourceMeaningHash', 'ruMeaningCheck', 'ukMeaningCheck'],
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.quiz,
      title: 'Quiz one-correct-answer',
      appliesTo: ['quiz_distractors', 'quiz_rebuild'],
      rejectsWhen: researchPack.quizDesignRules.map((rule) => rule.rule).concat([
        'more than one answer can be correct',
        'distractor reveals answer through grammar mismatch or language leakage',
      ]),
      requiredEvidence: unique(researchPack.quizDesignRules.flatMap((rule) => rule.sourceIds).concat(['distractorRationale'])),
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.falseFriend,
      title: 'False friend and dictionary pair',
      appliesTo: researchPack.falseFriendRules.flatMap((rule) => rule.appliesTo),
      rejectsWhen: researchPack.falseFriendRules.map((rule) => rule.rule),
      requiredEvidence: unique(researchPack.falseFriendRules.flatMap((rule) => rule.sourceIds)),
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.aiWrongLanguage,
      title: 'AI wrong-language rejection',
      appliesTo: ['all_ai_outputs'],
      rejectsWhen: [
        'fresh AI output does not match targetLocale/sourceLocales/uiLocale field declarations',
        'AI output mixes target lesson text with UI or source explanation text',
      ],
      requiredEvidence: ['fieldLanguageDeclaration', 'detectedLanguageByField', 'featureRiskClass'],
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.aiCacheLanguage,
      title: 'AI cache language key',
      appliesTo: ['all_ai_cache_reads', 'all_ai_cache_writes'],
      rejectsWhen: [
        'cache key omits targetLocale',
        'cache key omits sourceLocales',
        'cache key omits uiLocale',
        'cache fallback crosses language, schema, research or blueprint version',
      ],
      requiredEvidence: ['targetLocale', 'sourceLocales', 'uiLocale', 'generationSchemaVersion', 'researchPackVersion', 'pedagogyBlueprintVersion'],
      blocksBeforeReturn: true,
      blocksBeforeCache: true,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
    {
      gateId: GATE_IDS.reviewerDecision,
      title: 'Reviewer decision before activation',
      appliesTo: ['all_quality_passed_rows', 'all_high_risk_ai_outputs'],
      rejectsWhen: ['quality gates pass but reviewer workflow V2 decision is missing', 'decision evidence is not bound to schemaRowId or contractId'],
      requiredEvidence: ['reviewerWorkflowV2Decision', 'qualityGateTraceId'],
      blocksBeforeReturn: false,
      blocksBeforeCache: false,
      blocksBeforeReviewerAccept: true,
      activationStatus: 'blocked',
    },
  ];
}

function rowGateIds(row: RowSchemaRequirement): string[] {
  const gateIds = [
    GATE_IDS.language,
    GATE_IDS.research,
    GATE_IDS.blueprint,
    GATE_IDS.schema,
    GATE_IDS.antiCalque,
    GATE_IDS.grammar,
    GATE_IDS.naturalness,
    GATE_IDS.sourceParity,
    GATE_IDS.quiz,
    GATE_IDS.reviewerDecision,
  ];
  if (
    row.grammarClusterId === 'register_and_naturalness' ||
    row.secondaryGrammarClusterIds.includes('register_and_naturalness')
  ) {
    gateIds.push(GATE_IDS.falseFriend);
  }
  if (row.secondaryGrammarClusterIds.includes('quiz_distractors') || row.allowedTransformationTypes.includes('quiz_rebuild')) {
    gateIds.push(GATE_IDS.falseFriend);
  }
  return unique(gateIds);
}

function buildRowRequirement(row: RowSchemaRequirement): RowQualityGateRequirement {
  return {
    qualityRowId: `quality-v2-${row.schemaRowId}`,
    schemaRowId: row.schemaRowId,
    lessonId: row.lessonId,
    phraseId: row.phraseId,
    grammarClusterId: row.grammarClusterId,
    secondaryGrammarClusterIds: row.secondaryGrammarClusterIds,
    requiredTransformationType: row.requiredTransformationType,
    requiredGateIds: rowGateIds(row),
    evidenceSourceIds: row.researchEvidenceIds,
    sourceMeaningHash: row.sourceMeaningHash,
    mustRejectWrongLanguage: true,
    mustPassAntiCalqueReview: true,
    mustPassNaturalnessReview: true,
    mustPassGrammarReview: true,
    mustPassSourceMeaningParity: true,
    mustPassQuizOneCorrectAnswer: true,
    targetOutputAllowedBeforeQualityPass: false,
    reviewerDecisionRequired: 'quality_gates_accept_or_regenerate',
    activationStatus: 'blocked',
    activationBlockReason: 'blocked_until_quality_reviewer_and_apply_gates',
  };
}

function aiGateIds(contract: AiEntrypointContract): string[] {
  const text = `${contract.domainId} ${contract.featureRiskClass} ${contract.filePath}`.toLowerCase();
  const gateIds = [
    GATE_IDS.language,
    GATE_IDS.aiWrongLanguage,
    GATE_IDS.aiCacheLanguage,
    GATE_IDS.reviewerDecision,
  ];
  if (contract.riskLevel === 'critical' || text.includes('dialog') || text.includes('weekly') || text.includes('stats') || text.includes('premium')) {
    gateIds.push(GATE_IDS.naturalness, GATE_IDS.sourceParity);
  }
  if (text.includes('quiz')) gateIds.push(GATE_IDS.quiz, GATE_IDS.falseFriend);
  if (text.includes('grammar') || text.includes('mistake') || text.includes('preposition') || text.includes('personal')) {
    gateIds.push(GATE_IDS.grammar, GATE_IDS.antiCalque);
  }
  if (contract.riskLevel === 'high' || contract.riskLevel === 'critical') gateIds.push(GATE_IDS.research, GATE_IDS.schema);
  return unique(gateIds);
}

function buildAiRequirement(contract: AiEntrypointContract): AiQualityGateRequirement {
  return {
    aiQualityGateId: `ai-quality-v2-${contract.contractId}`,
    contractId: contract.contractId,
    domainId: contract.domainId,
    domainTitle: contract.domainTitle,
    filePath: contract.filePath,
    featureRiskClass: contract.featureRiskClass,
    riskLevel: contract.riskLevel,
    requiredGateIds: aiGateIds(contract),
    cacheKeyDimensionsRequired: contract.cacheContract.requiredKeyDimensions,
    mustRejectWrongLanguage: true,
    rejectedFreshOutputMayReturn: false,
    rejectedFreshOutputMayBeCached: false,
    targetOutputAllowedBeforeQualityPass: false,
    mustUseLanguageSafeFallback: true,
    activationStatus: 'blocked',
    activationBlockReason: 'blocked_until_quality_reviewer_and_apply_gates',
  };
}

function buildContentQualityGates(
  repoRoot: string,
  runId: string,
  generationSchemaPath: string,
  generationSchemaPacketPath: string,
  aiPromptContractPath: string,
  aiPromptContractPacketPath: string,
  researchPackPath: string,
  pedagogyBlueprintPath: string,
): ContentQualityGatesV2 {
  const schema = readJson<GenerationSchemaV2>(generationSchemaPath);
  const aiContract = readJson<AiPromptContractV2>(aiPromptContractPath);
  const researchPack = readJson<ResearchPack>(researchPackPath);

  return {
    schemaVersion: 'gustav-fr-content-quality-gates-v2',
    runId,
    generatedAt: new Date().toISOString(),
    targetLocale: 'fr',
    targetStudyLanguage: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourceArtifacts: {
      generationSchemaV2: rel(repoRoot, generationSchemaPath),
      generationSchemaV2Packet: rel(repoRoot, generationSchemaPacketPath),
      aiPromptContractV2: rel(repoRoot, aiPromptContractPath),
      aiPromptContractV2Packet: rel(repoRoot, aiPromptContractPacketPath),
      researchPack: rel(repoRoot, researchPackPath),
      pedagogyBlueprint: rel(repoRoot, pedagogyBlueprintPath),
    },
    qualityGateCatalog: qualityGateCatalog(researchPack),
    rowQualityGateRequirements: schema.rowSchemaRequirements.map(buildRowRequirement),
    aiQualityGateRequirements: aiContract.entrypointContracts.map(buildAiRequirement),
    qualityActivationPolicy: {
      generationAllowedFromQualityGatesAlone: false,
      reviewerImportAllowedFromQualityGatesAlone: false,
      productionApplyAllowedFromQualityGatesAlone: false,
      requiresReviewerWorkflowV2: true,
      requiresBrainGateV2: true,
      requiresProductionActivationGateV2: true,
    },
    selfImprovementRules: [
      'Every future generation run must compare failed rows by gateId and add recurring failures to the weakness ledger.',
      'Every new AI prompt entrypoint must receive an AiQualityGateRequirement before it can return or cache target-sensitive output.',
      'Every new app domain must map to row or AI quality gates before reviewer workflow V2 can accept it.',
      'If a gate rejects fresh output, the pipeline must regenerate or fall back to non-target safe copy; rejected target output cannot be cached or shown live.',
    ],
    readyForReviewerWorkflowV2: true,
    readyForGenerationV2: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
}

function emptyMetrics(): Metrics {
  return {
    rowQualityGateRequirements: 0,
    rowsWithRequiredGateSet: 0,
    rowsWithLanguageIsolationGate: 0,
    rowsWithResearchEvidenceGate: 0,
    rowsWithPedagogyBlueprintGate: 0,
    rowsWithGenerationSchemaGate: 0,
    rowsWithAntiCalqueGate: 0,
    rowsWithGrammarGate: 0,
    rowsWithNaturalnessGate: 0,
    rowsWithSourceMeaningParityGate: 0,
    rowsWithQuizGate: 0,
    rowsTargetOutputBlocked: 0,
    rowsActivationBlocked: 0,
    aiQualityGateRequirements: 0,
    highRiskAiGateRequirements: 0,
    aiWithWrongLanguageGate: 0,
    aiWithCacheLanguageKeyGate: 0,
    aiRejectBeforeReturn: 0,
    aiRejectBeforeCache: 0,
    aiTargetOutputBlocked: 0,
    aiActivationBlocked: 0,
    forbiddenOutputKeys: 0,
    forbiddenPermissionFlags: 0,
    falseApprovalFlags: 0,
    activationOpenFlags: 0,
  };
}

function jsonPathJoin(base: string, key: string | number): string {
  return typeof key === 'number' ? `${base}[${key}]` : `${base}.${key}`;
}

function inspectForbiddenKeys(value: unknown, filePath: string, jsonPath: string, findings: Finding[], metrics: Metrics): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectForbiddenKeys(entry, filePath, jsonPathJoin(jsonPath, index), findings, metrics));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value as JsonObject)) {
    const currentPath = jsonPathJoin(jsonPath, key);
    if (FORBIDDEN_OUTPUT_KEYS.has(key)) {
      metrics.forbiddenOutputKeys += 1;
      addFinding(findings, 'blocker', 'forbidden_target_output_key_present', `Content Quality Gates V2 must not contain target-output key ${key}.`, filePath, currentPath);
    }
    if (PERMISSION_FLAGS.has(key) && entry === true) {
      metrics.forbiddenPermissionFlags += 1;
      addFinding(findings, 'blocker', 'permission_flag_open', `Content Quality Gates V2 must not open permission flag ${key}.`, filePath, currentPath);
    }
    if (APPROVAL_FLAGS.has(key) && entry === true) {
      metrics.falseApprovalFlags += 1;
      addFinding(findings, 'blocker', 'approval_flag_open', `Content Quality Gates V2 must not set approval flag ${key}.`, filePath, currentPath);
    }
    if (key === 'activationStatus' && entry !== 'blocked') {
      metrics.activationOpenFlags += 1;
      addFinding(findings, 'blocker', 'activation_status_not_blocked', 'Content quality gate artifacts must keep activationStatus=blocked.', filePath, currentPath);
    }
    inspectForbiddenKeys(entry, filePath, currentPath, findings, metrics);
  }
}

function validateGates(gates: ContentQualityGatesV2, expectedRows: number, expectedAiContracts: number, filePath: string): { findings: Finding[]; metrics: Metrics } {
  const findings: Finding[] = [];
  const metrics = emptyMetrics();
  const rows = gates.rowQualityGateRequirements;
  const aiRequirements = gates.aiQualityGateRequirements;
  const gateIds = new Set(gates.qualityGateCatalog.map((gate) => gate.gateId));
  const requiredCatalogGateIds = Object.values(GATE_IDS);

  metrics.rowQualityGateRequirements = rows.length;
  metrics.rowsWithRequiredGateSet = rows.filter((row) =>
    row.requiredGateIds.includes(GATE_IDS.language) &&
    row.requiredGateIds.includes(GATE_IDS.research) &&
    row.requiredGateIds.includes(GATE_IDS.blueprint) &&
    row.requiredGateIds.includes(GATE_IDS.schema) &&
    row.requiredGateIds.includes(GATE_IDS.antiCalque) &&
    row.requiredGateIds.includes(GATE_IDS.grammar) &&
    row.requiredGateIds.includes(GATE_IDS.naturalness) &&
    row.requiredGateIds.includes(GATE_IDS.sourceParity) &&
    row.requiredGateIds.includes(GATE_IDS.quiz) &&
    row.requiredGateIds.includes(GATE_IDS.reviewerDecision)
  ).length;
  metrics.rowsWithLanguageIsolationGate = rows.filter((row) => row.requiredGateIds.includes(GATE_IDS.language)).length;
  metrics.rowsWithResearchEvidenceGate = rows.filter((row) => row.requiredGateIds.includes(GATE_IDS.research) && row.evidenceSourceIds.length > 0).length;
  metrics.rowsWithPedagogyBlueprintGate = rows.filter((row) => row.requiredGateIds.includes(GATE_IDS.blueprint)).length;
  metrics.rowsWithGenerationSchemaGate = rows.filter((row) => row.requiredGateIds.includes(GATE_IDS.schema)).length;
  metrics.rowsWithAntiCalqueGate = rows.filter((row) => row.requiredGateIds.includes(GATE_IDS.antiCalque)).length;
  metrics.rowsWithGrammarGate = rows.filter((row) => row.requiredGateIds.includes(GATE_IDS.grammar)).length;
  metrics.rowsWithNaturalnessGate = rows.filter((row) => row.requiredGateIds.includes(GATE_IDS.naturalness)).length;
  metrics.rowsWithSourceMeaningParityGate = rows.filter((row) => row.requiredGateIds.includes(GATE_IDS.sourceParity)).length;
  metrics.rowsWithQuizGate = rows.filter((row) => row.requiredGateIds.includes(GATE_IDS.quiz) && row.mustPassQuizOneCorrectAnswer === true).length;
  metrics.rowsTargetOutputBlocked = rows.filter((row) => row.targetOutputAllowedBeforeQualityPass === false).length;
  metrics.rowsActivationBlocked = rows.filter((row) => row.activationStatus === 'blocked').length;
  metrics.aiQualityGateRequirements = aiRequirements.length;
  metrics.highRiskAiGateRequirements = aiRequirements.filter((entry) => entry.riskLevel === 'critical' || entry.riskLevel === 'high').length;
  metrics.aiWithWrongLanguageGate = aiRequirements.filter((entry) =>
    entry.requiredGateIds.includes(GATE_IDS.language) &&
    entry.requiredGateIds.includes(GATE_IDS.aiWrongLanguage) &&
    entry.mustRejectWrongLanguage === true
  ).length;
  metrics.aiWithCacheLanguageKeyGate = aiRequirements.filter((entry) =>
    entry.requiredGateIds.includes(GATE_IDS.aiCacheLanguage) &&
    entry.cacheKeyDimensionsRequired.includes('targetLocale') &&
    entry.cacheKeyDimensionsRequired.includes('sourceLocales') &&
    entry.cacheKeyDimensionsRequired.includes('uiLocale')
  ).length;
  metrics.aiRejectBeforeReturn = aiRequirements.filter((entry) => entry.rejectedFreshOutputMayReturn === false).length;
  metrics.aiRejectBeforeCache = aiRequirements.filter((entry) => entry.rejectedFreshOutputMayBeCached === false).length;
  metrics.aiTargetOutputBlocked = aiRequirements.filter((entry) => entry.targetOutputAllowedBeforeQualityPass === false).length;
  metrics.aiActivationBlocked = aiRequirements.filter((entry) => entry.activationStatus === 'blocked').length;

  if (gates.schemaVersion !== 'gustav-fr-content-quality-gates-v2') addFinding(findings, 'blocker', 'schema_version_invalid', 'Content Quality Gates V2 schemaVersion is invalid.', filePath, '$.schemaVersion');
  if (gates.targetLocale !== 'fr' || gates.targetStudyLanguage !== 'fr') addFinding(findings, 'blocker', 'target_locale_invalid', 'Content Quality Gates V2 target locale must be fr.', filePath);
  if (JSON.stringify(gates.sourceLocales) !== JSON.stringify(['ru', 'uk'])) addFinding(findings, 'blocker', 'source_locales_invalid', 'Content Quality Gates V2 sourceLocales must be ru,uk.', filePath, '$.sourceLocales');
  for (const gateId of requiredCatalogGateIds) {
    if (!gateIds.has(gateId)) addFinding(findings, 'blocker', 'quality_gate_missing', `Quality gate catalog is missing ${gateId}.`, filePath, '$.qualityGateCatalog');
  }
  if (rows.length !== expectedRows) addFinding(findings, 'blocker', 'row_quality_gate_count_mismatch', `Expected ${expectedRows} row quality requirements, got ${rows.length}.`, filePath, '$.rowQualityGateRequirements');
  if (metrics.rowsWithRequiredGateSet !== rows.length) addFinding(findings, 'blocker', 'row_required_gate_set_incomplete', 'Every row must include language, research, blueprint, schema, anti-calque, grammar, naturalness, source parity, quiz and reviewer gates.', filePath);
  if (metrics.rowsWithResearchEvidenceGate !== rows.length) addFinding(findings, 'blocker', 'row_research_evidence_gate_missing', 'Every row must bind research evidence to quality gates.', filePath);
  if (metrics.rowsTargetOutputBlocked !== rows.length) addFinding(findings, 'blocker', 'row_target_output_open_before_quality_pass', 'Every row must block target output before quality pass.', filePath);
  if (metrics.rowsActivationBlocked !== rows.length) addFinding(findings, 'blocker', 'row_activation_not_blocked', 'Every row quality gate must keep activationStatus=blocked.', filePath);
  if (aiRequirements.length !== expectedAiContracts) addFinding(findings, 'blocker', 'ai_quality_gate_count_mismatch', `Expected ${expectedAiContracts} AI quality requirements, got ${aiRequirements.length}.`, filePath, '$.aiQualityGateRequirements');
  if (metrics.aiWithWrongLanguageGate !== aiRequirements.length) addFinding(findings, 'blocker', 'ai_wrong_language_gate_missing', 'Every AI quality requirement must reject wrong-language output.', filePath);
  if (metrics.aiWithCacheLanguageKeyGate !== aiRequirements.length) addFinding(findings, 'blocker', 'ai_cache_language_key_gate_missing', 'Every AI quality requirement must require language cache key dimensions.', filePath);
  if (metrics.aiRejectBeforeReturn !== aiRequirements.length) addFinding(findings, 'blocker', 'ai_rejected_output_return_open', 'Every AI quality requirement must block rejected fresh output before return.', filePath);
  if (metrics.aiRejectBeforeCache !== aiRequirements.length) addFinding(findings, 'blocker', 'ai_rejected_output_cache_open', 'Every AI quality requirement must block rejected fresh output before cache.', filePath);
  if (metrics.aiTargetOutputBlocked !== aiRequirements.length) addFinding(findings, 'blocker', 'ai_target_output_open_before_quality_pass', 'Every AI quality requirement must block target output before quality pass.', filePath);
  if (metrics.aiActivationBlocked !== aiRequirements.length) addFinding(findings, 'blocker', 'ai_activation_not_blocked', 'Every AI quality requirement must keep activationStatus=blocked.', filePath);
  for (const [index, row] of rows.entries()) {
    const unknownGateIds = row.requiredGateIds.filter((gateId) => !gateIds.has(gateId));
    if (unknownGateIds.length > 0) {
      addFinding(findings, 'blocker', 'row_unknown_gate_id', `Row references unknown quality gates: ${unknownGateIds.join(', ')}.`, filePath, `$.rowQualityGateRequirements[${index}].requiredGateIds`);
    }
  }
  for (const [index, entry] of aiRequirements.entries()) {
    const unknownGateIds = entry.requiredGateIds.filter((gateId) => !gateIds.has(gateId));
    if (unknownGateIds.length > 0) {
      addFinding(findings, 'blocker', 'ai_unknown_gate_id', `AI requirement references unknown quality gates: ${unknownGateIds.join(', ')}.`, filePath, `$.aiQualityGateRequirements[${index}].requiredGateIds`);
    }
  }
  if (
    gates.qualityActivationPolicy.generationAllowedFromQualityGatesAlone !== false ||
    gates.qualityActivationPolicy.reviewerImportAllowedFromQualityGatesAlone !== false ||
    gates.qualityActivationPolicy.productionApplyAllowedFromQualityGatesAlone !== false ||
    gates.readyForGenerationV2 !== false ||
    gates.readyForApply !== false ||
    gates.mayModifyProductionAppFiles !== false
  ) {
    addFinding(findings, 'blocker', 'quality_activation_policy_opened_generation_or_apply', 'Content Quality Gates V2 must not open generation, reviewer import, app writes, or apply.', filePath, '$.qualityActivationPolicy');
  }

  inspectForbiddenKeys(gates, filePath, '$', findings, metrics);
  return { findings, metrics };
}

function cloneGates(gates: ContentQualityGatesV2): ContentQualityGatesV2 {
  return JSON.parse(JSON.stringify(gates)) as ContentQualityGatesV2;
}

function runProbes(gates: ContentQualityGatesV2, expectedRows: number, expectedAiContracts: number, filePath: string): Probe[] {
  const probes: Array<{ id: string; expectedAccept: boolean; gates: ContentQualityGatesV2 }> = [];
  probes.push({ id: 'canonical_content_quality_gates_accepts', expectedAccept: true, gates: cloneGates(gates) });

  const missingRowGate = cloneGates(gates);
  missingRowGate.rowQualityGateRequirements[0].requiredGateIds = missingRowGate.rowQualityGateRequirements[0].requiredGateIds.filter((gateId) => gateId !== GATE_IDS.antiCalque);
  probes.push({ id: 'missing_row_anti_calque_gate_rejected', expectedAccept: false, gates: missingRowGate });

  const missingAiGate = cloneGates(gates);
  missingAiGate.aiQualityGateRequirements[0].requiredGateIds = missingAiGate.aiQualityGateRequirements[0].requiredGateIds.filter((gateId) => gateId !== GATE_IDS.aiWrongLanguage);
  probes.push({ id: 'missing_ai_wrong_language_gate_rejected', expectedAccept: false, gates: missingAiGate });

  const rowOutputOpen = cloneGates(gates);
  rowOutputOpen.rowQualityGateRequirements[0].targetOutputAllowedBeforeQualityPass = true as false;
  probes.push({ id: 'row_target_output_open_rejected', expectedAccept: false, gates: rowOutputOpen });

  const aiReturnOpen = cloneGates(gates);
  aiReturnOpen.aiQualityGateRequirements[0].rejectedFreshOutputMayReturn = true as false;
  probes.push({ id: 'ai_rejected_fresh_return_open_rejected', expectedAccept: false, gates: aiReturnOpen });

  const aiCacheOpen = cloneGates(gates);
  aiCacheOpen.aiQualityGateRequirements[0].rejectedFreshOutputMayBeCached = true as false;
  probes.push({ id: 'ai_rejected_fresh_cache_open_rejected', expectedAccept: false, gates: aiCacheOpen });

  const openGeneration = cloneGates(gates);
  openGeneration.qualityActivationPolicy.generationAllowedFromQualityGatesAlone = true as false;
  probes.push({ id: 'quality_gate_generation_open_rejected', expectedAccept: false, gates: openGeneration });

  const targetKey = cloneGates(gates) as ContentQualityGatesV2 & { proposedFrench?: string };
  targetKey.proposedFrench = 'blocked fixture target output';
  probes.push({ id: 'target_output_key_rejected', expectedAccept: false, gates: targetKey });

  return probes.map((probe) => {
    const result = validateGates(probe.gates, expectedRows, expectedAiContracts, filePath);
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
    '# GUSTAV Content Quality Gates V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Generation Schema V2 ready: ${report.summary.generationSchemaV2Ready ? 'yes' : 'no'}`,
    `- AI Prompt Contract V2 ready: ${report.summary.aiPromptContractV2Ready ? 'yes' : 'no'}`,
    `- Quality gates in catalog: ${report.summary.qualityGatesCatalog}`,
    `- Row quality requirements: ${report.summary.rowQualityGateRequirements}`,
    `- Rows with full required gate set: ${report.summary.rowsWithRequiredGateSet}`,
    `- Rows with language isolation gate: ${report.summary.rowsWithLanguageIsolationGate}`,
    `- Rows with research evidence gate: ${report.summary.rowsWithResearchEvidenceGate}`,
    `- Rows with anti-calque gate: ${report.summary.rowsWithAntiCalqueGate}`,
    `- Rows with grammar gate: ${report.summary.rowsWithGrammarGate}`,
    `- Rows with naturalness gate: ${report.summary.rowsWithNaturalnessGate}`,
    `- Rows with source meaning parity gate: ${report.summary.rowsWithSourceMeaningParityGate}`,
    `- Rows with quiz gate: ${report.summary.rowsWithQuizGate}`,
    `- Rows target output blocked: ${report.summary.rowsTargetOutputBlocked}`,
    `- Rows activation blocked: ${report.summary.rowsActivationBlocked}`,
    `- AI quality requirements: ${report.summary.aiQualityGateRequirements}`,
    `- Critical/high AI quality requirements: ${report.summary.highRiskAiGateRequirements}`,
    `- AI with wrong-language gate: ${report.summary.aiWithWrongLanguageGate}`,
    `- AI with cache-language gate: ${report.summary.aiWithCacheLanguageKeyGate}`,
    `- AI reject before return/cache: ${report.summary.aiRejectBeforeReturn}/${report.summary.aiRejectBeforeCache}`,
    `- Fixture probes passed: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for Reviewer Workflow V2: ${report.summary.readyForReviewerWorkflowV2 ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Gate Catalog',
    '',
    ...report.gateIds.map((gateId) => `- \`${gateId}\``),
    '',
    '## Probes',
    '',
  ];
  for (const probe of report.probes) {
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
    '- This packet writes only Gustav run artifacts.',
    '- It does not generate target content.',
    '- It does not modify generated French ledgers.',
    '- It does not write reviewer decisions.',
    '- It does not create production apply approval.',
    '',
  );
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  const targetArg = argValue('--target') ?? 'fr';
  if (!runArg || targetArg !== 'fr') {
    throw new Error('Usage: npx tsx scripts/gustav_content_quality_gates_v2_packet.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const researchDir = path.join(runDir, 'research');
  const generationSchemaPath = path.join(researchDir, 'fr_generation_schema_v2.json');
  const generationSchemaPacketPath = path.join(auditsDir, 'generation_schema_v2_packet.json');
  const aiPromptContractPath = path.join(researchDir, 'fr_ai_prompt_contract_v2.json');
  const aiPromptContractPacketPath = path.join(auditsDir, 'ai_prompt_contract_v2_packet.json');
  const researchPackPath = path.join(researchDir, 'fr_research_pack.json');
  const pedagogyBlueprintPath = path.join(researchDir, 'fr_pedagogy_blueprint.json');
  const outGates = path.join(researchDir, 'fr_content_quality_gates_v2.json');
  const outJson = path.join(auditsDir, 'content_quality_gates_v2_packet.json');
  const outMd = path.join(auditsDir, 'content_quality_gates_v2_packet.md');
  ensureDir(auditsDir);
  ensureDir(researchDir);

  const findings: Finding[] = [];
  for (const filePath of [generationSchemaPath, generationSchemaPacketPath, aiPromptContractPath, aiPromptContractPacketPath, researchPackPath, pedagogyBlueprintPath]) {
    if (!fs.existsSync(filePath)) addFinding(findings, 'blocker', 'required_input_missing', 'Content Quality Gates V2 input is missing.', rel(repoRoot, filePath));
  }

  const generationSchemaSummary = summaryOf(generationSchemaPacketPath);
  const aiPromptSummary = summaryOf(aiPromptContractPacketPath);
  const generationSchemaV2Ready = b(generationSchemaSummary, 'readyForAiPromptContractV2') && n(generationSchemaSummary, 'blockers') === 0;
  const aiPromptContractV2Ready = b(aiPromptSummary, 'readyForContentQualityGatesV2') && n(aiPromptSummary, 'blockers') === 0;
  if (!generationSchemaV2Ready) {
    addFinding(findings, 'blocker', 'generation_schema_v2_not_ready', 'P7 requires Generation Schema V2 to be ready.', rel(repoRoot, generationSchemaPacketPath));
  }
  if (!aiPromptContractV2Ready) {
    addFinding(findings, 'blocker', 'ai_prompt_contract_v2_not_ready', 'P7 requires AI Prompt Contract V2 to be ready for content quality gates.', rel(repoRoot, aiPromptContractPacketPath));
  }

  const expectedRows = n(generationSchemaSummary, 'rowSchemaRequirements') || EXPECTED_ROW_COUNT;
  const expectedAiContracts = n(aiPromptSummary, 'aiPromptEntrypointContracts');

  let gates: ContentQualityGatesV2 | null = null;
  let validation = { findings: [] as Finding[], metrics: emptyMetrics() };
  let probes: Probe[] = [];
  if (findings.filter((finding) => finding.severity === 'blocker').length === 0) {
    gates = buildContentQualityGates(
      repoRoot,
      runId,
      generationSchemaPath,
      generationSchemaPacketPath,
      aiPromptContractPath,
      aiPromptContractPacketPath,
      researchPackPath,
      pedagogyBlueprintPath,
    );
    validation = validateGates(gates, expectedRows, expectedAiContracts, rel(repoRoot, outGates));
    probes = runProbes(gates, expectedRows, expectedAiContracts, rel(repoRoot, outGates));
    findings.push(...validation.findings);
    for (const probe of probes) {
      if (!probe.passed) addFinding(findings, 'blocker', 'fixture_probe_failed', `Content Quality Gates V2 fixture probe failed: ${probe.id}.`);
    }
  }

  const metrics = validation.metrics;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const fixtureProbesPassed = probes.filter((probe) => probe.passed).length;
  const readyForReviewerWorkflowV2 =
    Boolean(gates) &&
    blockers === 0 &&
    generationSchemaV2Ready &&
    aiPromptContractV2Ready &&
    metrics.rowQualityGateRequirements === expectedRows &&
    metrics.rowsWithRequiredGateSet === expectedRows &&
    metrics.rowsTargetOutputBlocked === expectedRows &&
    metrics.rowsActivationBlocked === expectedRows &&
    metrics.aiQualityGateRequirements === expectedAiContracts &&
    metrics.aiWithWrongLanguageGate === expectedAiContracts &&
    metrics.aiWithCacheLanguageKeyGate === expectedAiContracts &&
    metrics.aiRejectBeforeReturn === expectedAiContracts &&
    metrics.aiRejectBeforeCache === expectedAiContracts &&
    fixtureProbesPassed === probes.length;

  const report: Report = {
    schemaVersion: 'gustav-content-quality-gates-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      generationSchemaV2: rel(repoRoot, generationSchemaPath),
      generationSchemaV2Packet: rel(repoRoot, generationSchemaPacketPath),
      aiPromptContractV2: rel(repoRoot, aiPromptContractPath),
      aiPromptContractV2Packet: rel(repoRoot, aiPromptContractPacketPath),
      researchPack: rel(repoRoot, researchPackPath),
      pedagogyBlueprint: rel(repoRoot, pedagogyBlueprintPath),
    },
    outputs: {
      contentQualityGatesV2: rel(repoRoot, outGates),
      contentQualityGatesV2PacketJson: rel(repoRoot, outJson),
      contentQualityGatesV2PacketMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      generationSchemaV2Ready,
      aiPromptContractV2Ready,
      qualityGatesCatalog: gates ? gates.qualityGateCatalog.length : 0,
      fixtureProbes: probes.length,
      fixtureProbesPassed,
      readyForReviewerWorkflowV2,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    gateIds: gates ? gates.qualityGateCatalog.map((gate) => gate.gateId) : [],
    probes,
    findings,
    safety: {
      researchOnlyArtifactWritten: true,
      productionAppFilesModifiedByThisScript: false,
      generatedFrenchLedgersModifiedByThisScript: false,
      reviewerDecisionsWrittenByThisScript: false,
      productionApplyApproved: false,
    },
  };

  if (gates && blockers === 0) {
    fs.writeFileSync(outGates, `${JSON.stringify(gates, null, 2)}\n`, 'utf8');
  }
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV Content Quality Gates V2 packet: ${report.status}`);
  console.log(`Row quality requirements: ${report.summary.rowQualityGateRequirements}`);
  console.log(`AI quality requirements: ${report.summary.aiQualityGateRequirements}`);
  console.log(`Fixture probes: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for Reviewer Workflow V2: ${report.summary.readyForReviewerWorkflowV2 ? 'yes' : 'no'}`);
  console.log(`Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
