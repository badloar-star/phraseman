import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Status = 'PASS' | 'HOLD' | 'BLOCK';
type Severity = 'blocker' | 'warning' | 'info';

type Finding = {
  severity: Severity;
  code: string;
  message: string;
  path?: string;
  jsonPath?: string;
};

type TransformationType =
  | 'direct_equivalent_candidate'
  | 'adapted_expression'
  | 'grammar_rebuild'
  | 'anti_calque_rebuild'
  | 'register_adjustment'
  | 'quiz_rebuild'
  | 'resequence_candidate'
  | 'split_candidate'
  | 'merge_candidate'
  | 'needs_llm_pedagogy_design';

type CategoryPolicy = {
  sourceCategory: string;
  rows: number;
  primaryGrammarClusterId: string;
  secondaryGrammarClusterIds: string[];
  allowedTransformationTypes: TransformationType[];
  defaultTransformationType: TransformationType;
  directTranslationAllowed: false;
  targetOutputAllowed: false;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  evidenceSourceIds: string[];
  reviewerRequired: true;
};

type RowMapping = {
  blueprintNodeId: string;
  lessonId: number;
  phraseId: string;
  rowIndex: number;
  sourceGraphRef: string;
  sourceMeaningHash: string;
  sourceCategory: string;
  primaryGrammarClusterId: string;
  secondaryGrammarClusterIds: string[];
  allowedTransformationTypes: TransformationType[];
  defaultTransformationType: TransformationType;
  directTranslationAllowed: false;
  targetOutputAllowed: false;
  needsReviewerDecision: true;
  researchEvidenceIds: string[];
  requiredEvidence: string[];
  reviewerDecisionRequired: 'pedagogy_blueprint_accept_or_adjust';
  activationStatus: 'blocked';
  activationBlockReason: 'blocked_until_schema_v2_and_reviewer_accept';
};

type LessonBlueprint = {
  lessonId: number;
  rows: number;
  dominantGrammarClusterId: string;
  clusterBreakdown: Record<string, number>;
  sourceCategoryBreakdown: Record<string, number>;
  sequencePolicy: 'preserve_order_candidate' | 'resequence_candidate';
  reviewerRequired: true;
};

type AppDomainPolicy = {
  domainId: string;
  title: string;
  contentOwner: string;
  targetFields: string[];
  sourceLocaleFields: string[];
  uiLocaleFields: string[];
  grammarClusterIds: string[];
  requiresPedagogyBlueprint: true;
  requiresResearchEvidence: true;
  generationAllowedBeforeBlueprint: false;
  generationAllowedAfterBlueprint: false;
  activationRequiresReviewerDecision: true;
  cacheKeyPolicy: string;
  aiPromptContract: string;
};

type PedagogyBlueprint = {
  schemaVersion: 'gustav-fr-pedagogy-blueprint-v0';
  runId: string;
  generatedAt: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  sourceArtifacts: Record<string, string>;
  sourceGraphProtection: {
    storesTargetOutput: false;
    storesLegacyFrenchFields: false;
    storesSourceMeaningHashesOnly: true;
    productionAppWritesAllowed: false;
  };
  transformationTypes: Array<{
    id: TransformationType;
    description: string;
    reviewerRequired: true;
  }>;
  grammarClusterCatalog: Array<{
    id: string;
    title: string;
    requiredSourceIds: string[];
    mustDecide: string[];
  }>;
  categoryPolicies: CategoryPolicy[];
  lessonBlueprints: LessonBlueprint[];
  rowMappings: RowMapping[];
  appDomainPolicies: AppDomainPolicy[];
  activationPolicy: {
    directTranslationAllowedByDefault: false;
    targetOutputAllowedInBlueprint: false;
    generationAllowedFromBlueprintAlone: false;
    requiresGenerationSchemaV2: true;
    requiresReviewerDecisionImport: true;
    requiresExplicitApplyApproval: true;
  };
  unresolvedQuestions: Array<{
    id: string;
    severity: 'medium' | 'high';
    note: string;
    blocksGenerationSchemaV2: boolean;
  }>;
  readyForGenerationSchemaV2: boolean;
  readyForGenerationV2: false;
  readyForApply: false;
  mayModifyProductionAppFiles: false;
};

type Probe = {
  id: string;
  expectedAccept: boolean;
  accepted: boolean;
  blockers: number;
  passed: boolean;
};

type Metrics = {
  lessonLedgers: number;
  generatedRows: number;
  rowMappings: number;
  lessonBlueprints: number;
  categoryPolicies: number;
  sourceCategoriesCovered: number;
  categoriesTotal: number;
  appDomainPolicies: number;
  grammarClusters: number;
  rowsMappedToKnownCluster: number;
  rowsWithTwoOrMoreTransformationTypes: number;
  rowsDirectTranslationBlocked: number;
  rowsTargetOutputBlocked: number;
  lowConfidenceCategoryPolicies: number;
  resequenceCandidateLessons: number;
  forbiddenOutputKeys: number;
  forbiddenPermissionFlags: number;
  falseApprovalFlags: number;
};

type Report = {
  schemaVersion: 'gustav-target-pedagogy-blueprint-packet-v0';
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
    researchPackVerified: boolean;
    targetOutputStored: boolean;
    directTranslationAllowedByDefault: boolean;
    fixtureProbes: number;
    fixtureProbesPassed: number;
    readyForGenerationSchemaV2: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  clusterCoverage: Record<string, number>;
  categoryCoverage: Record<string, string>;
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

const CLUSTER_SOURCE_FALLBACKS: Record<string, string[]> = {
  articles_gender_number: ['larousse_fr_dictionary', 'le_robert_dictionary'],
  present_tense_agreement: ['bescherelle_conjugation', 'tv5monde_grammar'],
  negation: ['academie_francaise_dire_ne_pas_dire', 'tv5monde_grammar'],
  questions_word_order: ['tv5monde_grammar', 'tex_french_grammar'],
  prepositions_articles: ['oqlf_vitrine_linguistique', 'larousse_fr_dictionary'],
  pronouns_order: ['tv5monde_grammar', 'tex_french_grammar'],
  past_tenses: ['bescherelle_conjugation', 'tv5monde_grammar'],
  future_conditionals: ['bescherelle_conjugation', 'tv5monde_grammar'],
  subjunctive_modality: ['academie_francaise_dire_ne_pas_dire', 'tex_french_grammar'],
  register_and_naturalness: ['oqlf_vitrine_linguistique', 'oxford_french_usage_guide'],
  personal_practice_mapping: ['council_of_europe_cefr', 'tv5monde_grammar'],
  quiz_distractors: ['tv5monde_grammar', 'cambridge_en_fr_dictionary'],
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

function rel(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
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

function stringArray(value: unknown): string[] {
  return array(value).filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
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

function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(fullPath));
    if (entry.isFile()) files.push(fullPath);
  }
  return files.sort((a, bValue) => a.localeCompare(bValue));
}

function sha256Text(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sourceMeaningHash(row: JsonObject): string {
  return sha256Text(JSON.stringify({
    englishBase: s(row, 'englishBase'),
    russianMeaning: s(row, 'russianMeaning'),
    ukrainianMeaning: s(row, 'ukrainianMeaning'),
  }));
}

function sourceCategory(row: JsonObject): string {
  const firstWord = object(array(row.wordsFr)[0]);
  const category = s(firstWord, 'category');
  if (category) return category;
  const evidence = stringArray(row.evidenceClaimIds).join('_').toLowerCase();
  return evidence || 'uncategorized';
}

function transformationTypes(): PedagogyBlueprint['transformationTypes'] {
  return [
    { id: 'direct_equivalent_candidate', description: 'Only a reviewer-visible candidate; never activation-ready without source evidence and anti-calque review.', reviewerRequired: true },
    { id: 'adapted_expression', description: 'Meaning preserved while wording is rebuilt for French naturalness.', reviewerRequired: true },
    { id: 'grammar_rebuild', description: 'Grammar structure must be rebuilt for French morphology, word order or tense/aspect.', reviewerRequired: true },
    { id: 'anti_calque_rebuild', description: 'English/RU/UK source structure is likely misleading and must be rebuilt from French rules.', reviewerRequired: true },
    { id: 'register_adjustment', description: 'Register, politeness or spoken/written form must be selected explicitly.', reviewerRequired: true },
    { id: 'quiz_rebuild', description: 'Blank, correct answer and distractors must be rebuilt with one-correct-answer proof.', reviewerRequired: true },
    { id: 'resequence_candidate', description: 'Lesson order may need to change for French pedagogy.', reviewerRequired: true },
    { id: 'split_candidate', description: 'One source row or lesson may need to be split into multiple French teaching decisions.', reviewerRequired: true },
    { id: 'merge_candidate', description: 'Multiple source rows may need to share a French teaching decision.', reviewerRequired: true },
    { id: 'needs_llm_pedagogy_design', description: 'The source intent is too language-specific for automatic generation without LLM official-source pedagogical design.', reviewerRequired: true },
  ];
}

function allowedForCluster(clusterId: string): TransformationType[] {
  const table: Record<string, TransformationType[]> = {
    articles_gender_number: ['grammar_rebuild', 'quiz_rebuild', 'direct_equivalent_candidate'],
    present_tense_agreement: ['grammar_rebuild', 'quiz_rebuild', 'direct_equivalent_candidate'],
    negation: ['grammar_rebuild', 'register_adjustment', 'quiz_rebuild'],
    questions_word_order: ['grammar_rebuild', 'register_adjustment', 'resequence_candidate', 'quiz_rebuild'],
    prepositions_articles: ['anti_calque_rebuild', 'grammar_rebuild', 'adapted_expression', 'quiz_rebuild'],
    pronouns_order: ['grammar_rebuild', 'resequence_candidate', 'split_candidate', 'quiz_rebuild'],
    past_tenses: ['grammar_rebuild', 'adapted_expression', 'resequence_candidate', 'quiz_rebuild'],
    future_conditionals: ['grammar_rebuild', 'adapted_expression', 'register_adjustment', 'quiz_rebuild'],
    subjunctive_modality: ['grammar_rebuild', 'split_candidate', 'needs_llm_pedagogy_design', 'quiz_rebuild'],
    register_and_naturalness: ['adapted_expression', 'register_adjustment', 'anti_calque_rebuild', 'needs_llm_pedagogy_design'],
    personal_practice_mapping: ['adapted_expression', 'grammar_rebuild', 'needs_llm_pedagogy_design'],
    quiz_distractors: ['quiz_rebuild', 'grammar_rebuild', 'needs_llm_pedagogy_design'],
  };
  return table[clusterId] ?? ['needs_llm_pedagogy_design'];
}

function defaultTransformation(clusterId: string): TransformationType {
  if (clusterId === 'register_and_naturalness') return 'adapted_expression';
  if (clusterId === 'prepositions_articles') return 'anti_calque_rebuild';
  if (clusterId === 'quiz_distractors') return 'quiz_rebuild';
  if (clusterId === 'subjunctive_modality') return 'grammar_rebuild';
  return 'grammar_rebuild';
}

function inferCluster(category: string): { primary: string; secondary: string[]; confidence: 'high' | 'medium' | 'low'; reason: string } {
  const c = category.toLowerCase();
  const secondary = new Set<string>(['quiz_distractors', 'personal_practice_mapping']);
  let primary = 'register_and_naturalness';
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  let reason = 'fallback naturalness policy';

  if (/(question|wh_question|where|what|when|why|how|how_much)/.test(c)) {
    primary = 'questions_word_order';
    confidence = 'high';
    reason = 'question/wh category requires French question form and register policy';
    secondary.add('register_and_naturalness');
  }
  if (/(negation|negative|jamais|pas_encore|personne|rien|not_yet)/.test(c)) {
    primary = 'negation';
    confidence = 'high';
    reason = 'negative category requires French negation placement and register policy';
    secondary.add('register_and_naturalness');
  }
  if (/(preposition|location|lieu|article|partitive|plural|adjective_agreement|elision|definite|indefinite)/.test(c)) {
    primary = /(preposition|location|lieu)/.test(c) ? 'prepositions_articles' : 'articles_gender_number';
    confidence = 'high';
    reason = 'article/preposition/category requires French article, gender, contraction or place rule';
    secondary.add('register_and_naturalness');
  }
  if (/(passe|imparfait|past|used_to|venir_de|deja|plus_que_parfait|recent_past)/.test(c)) {
    primary = 'past_tenses';
    confidence = 'high';
    reason = 'past/recent-past category requires French tense/aspect selection';
  }
  if (/(future|conditionnel|conditional|si_|third_conditional|zero_conditional)/.test(c)) {
    primary = 'future_conditionals';
    confidence = 'high';
    reason = 'future/conditional/si category requires French tense and sequence decision';
  }
  if (/(subjunctive|vouloir_que|preferer_que|need_que|want_que)/.test(c)) {
    primary = 'subjunctive_modality';
    confidence = 'high';
    reason = 'subjunctive/modality category requires French mood decision';
    secondary.add('register_and_naturalness');
  }
  if (/(pronoun|reflexive|pronominal|possessive|relative|emphatic|self)/.test(c)) {
    primary = 'pronouns_order';
    confidence = 'high';
    reason = 'pronoun/reflexive/relative category requires French pronoun order and agreement';
  }
  if (/(modal|imperative|request|hortative|devoir|pouvoir|savoir)/.test(c)) {
    primary = 'present_tense_agreement';
    confidence = 'medium';
    reason = 'modal/imperative category needs verb-form policy plus register check';
    secondary.add('register_and_naturalness');
  }
  if (/(comparative|superlative|idiom|phrasal|natural|passive|on_impersonal|causative|faire_|laisser_|perception|be_used_to)/.test(c)) {
    primary = 'register_and_naturalness';
    confidence = /(idiom|phrasal|be_used_to)/.test(c) ? 'low' : 'medium';
    reason = 'idiom/phrasal/passive/naturalness category requires anti-calque and expression adaptation';
    secondary.add('questions_word_order');
  }
  if (/(present|etre|avoir|c_est|il_y_a|verb_plus_infinitive|infinitive_subject)/.test(c) && primary === 'register_and_naturalness') {
    primary = 'present_tense_agreement';
    confidence = 'medium';
    reason = 'present/etre/avoir category requires French subject-verb and predicate policy';
  }
  if (/(time|month|season|day|clock|weekend)/.test(c)) {
    primary = 'prepositions_articles';
    confidence = 'medium';
    reason = 'time expression category often depends on French preposition/article policy';
    secondary.add('register_and_naturalness');
  }

  secondary.delete(primary);
  return { primary, secondary: Array.from(secondary).sort(), confidence, reason };
}

function evidenceForCluster(clusterId: string, packClusters: JsonObject[]): string[] {
  const found = packClusters.find((cluster) => s(cluster, 'id') === clusterId);
  const sourceIds = stringArray(found?.requiredSourceIds);
  return sourceIds.length > 0 ? sourceIds : CLUSTER_SOURCE_FALLBACKS[clusterId] ?? ['council_of_europe_cefr'];
}

function countBy<T extends string | number>(values: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[String(value)] = (counts[String(value)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, bValue) => bValue[1] - a[1] || a[0].localeCompare(bValue[0])));
}

function dominant(counts: Record<string, number>, fallback: string): string {
  const first = Object.entries(counts).sort((a, bValue) => bValue[1] - a[1] || a[0].localeCompare(bValue[0]))[0];
  return first ? first[0] : fallback;
}

function buildBlueprint(
  repoRoot: string,
  runDir: string,
  runId: string,
  researchPackPath: string,
  verifyPath: string,
  domainRegistryPath: string,
  lessonLedgers: string[],
): PedagogyBlueprint {
  const pack = object(readJson<unknown>(researchPackPath));
  const verifySummary = summaryOf(verifyPath);
  const domainRegistry = object(readJson<unknown>(domainRegistryPath));
  const registry = array<JsonObject>(domainRegistry.registry);
  const packClusters = array<JsonObject>(pack.grammarClusters);
  const sourceCategoryCounts = new Map<string, number>();
  const rowsByLesson = new Map<number, RowMapping[]>();
  const rowMappings: RowMapping[] = [];

  if (!b(verifySummary, 'readyForPedagogyBlueprint')) {
    throw new Error('Research pack verifier is not ready for pedagogy blueprint.');
  }

  for (const ledgerPath of lessonLedgers) {
    const ledger = object(readJson<unknown>(ledgerPath));
    const lessonId = Number(ledger.lessonId);
    const rows = array<JsonObject>(ledger.rows);
    const lessonRows: RowMapping[] = [];
    rows.forEach((row, index) => {
      const category = sourceCategory(row);
      sourceCategoryCounts.set(category, (sourceCategoryCounts.get(category) ?? 0) + 1);
      const inferred = inferCluster(category);
      const requiredEvidence = Array.from(new Set([
        ...stringArray(row.requiredEvidence),
        ...evidenceForCluster(inferred.primary, packClusters),
      ])).sort();
      const mapping: RowMapping = {
        blueprintNodeId: `bp-fr-l${lessonId}-r${index + 1}-${s(row, 'phraseId') || `row_${index + 1}`}`,
        lessonId,
        phraseId: s(row, 'phraseId') || `lesson${lessonId}_row_${index + 1}`,
        rowIndex: index + 1,
        sourceGraphRef: `generated/fr/lessons/${path.basename(ledgerPath)}#rows[${index}]`,
        sourceMeaningHash: sourceMeaningHash(row),
        sourceCategory: category,
        primaryGrammarClusterId: inferred.primary,
        secondaryGrammarClusterIds: inferred.secondary,
        allowedTransformationTypes: allowedForCluster(inferred.primary),
        defaultTransformationType: defaultTransformation(inferred.primary),
        directTranslationAllowed: false,
        targetOutputAllowed: false,
        needsReviewerDecision: true,
        researchEvidenceIds: evidenceForCluster(inferred.primary, packClusters),
        requiredEvidence,
        reviewerDecisionRequired: 'pedagogy_blueprint_accept_or_adjust',
        activationStatus: 'blocked',
        activationBlockReason: 'blocked_until_schema_v2_and_reviewer_accept',
      };
      lessonRows.push(mapping);
      rowMappings.push(mapping);
    });
    rowsByLesson.set(lessonId, lessonRows);
  }

  const categoryPolicies: CategoryPolicy[] = Array.from(sourceCategoryCounts.entries())
    .sort((a, bValue) => bValue[1] - a[1] || a[0].localeCompare(bValue[0]))
    .map(([category, rows]) => {
      const inferred = inferCluster(category);
      return {
        sourceCategory: category,
        rows,
        primaryGrammarClusterId: inferred.primary,
        secondaryGrammarClusterIds: inferred.secondary,
        allowedTransformationTypes: allowedForCluster(inferred.primary),
        defaultTransformationType: defaultTransformation(inferred.primary),
        directTranslationAllowed: false,
        targetOutputAllowed: false,
        confidence: inferred.confidence,
        reason: inferred.reason,
        evidenceSourceIds: evidenceForCluster(inferred.primary, packClusters),
        reviewerRequired: true,
      };
    });

  const lessonBlueprints: LessonBlueprint[] = Array.from(rowsByLesson.entries())
    .sort((a, bValue) => a[0] - bValue[0])
    .map(([lessonId, rows]) => {
      const clusterBreakdown = countBy(rows.map((row) => row.primaryGrammarClusterId));
      const sourceCategoryBreakdown = countBy(rows.map((row) => row.sourceCategory));
      const clusterCount = Object.keys(clusterBreakdown).length;
      return {
        lessonId,
        rows: rows.length,
        dominantGrammarClusterId: dominant(clusterBreakdown, 'register_and_naturalness'),
        clusterBreakdown,
        sourceCategoryBreakdown,
        sequencePolicy: clusterCount > 3 ? 'resequence_candidate' : 'preserve_order_candidate',
        reviewerRequired: true,
      };
    });

  const appDomainPolicies: AppDomainPolicy[] = registry.map((entry) => {
    const id = s(entry, 'id');
    const clusterIds = id === 'quizzes'
      ? ['quiz_distractors']
      : id === 'preposition_packs'
        ? ['prepositions_articles']
        : id === 'lesson_rows' || id === 'lesson_intro_screens'
          ? Array.from(new Set(rowMappings.map((row) => row.primaryGrammarClusterId))).sort()
          : id.includes('ai') || id.includes('explain') || id.includes('dialog')
            ? ['register_and_naturalness', 'personal_practice_mapping']
            : ['register_and_naturalness'];
    return {
      domainId: id,
      title: s(entry, 'title'),
      contentOwner: s(entry, 'contentOwner'),
      targetFields: stringArray(entry.targetFields),
      sourceLocaleFields: stringArray(entry.sourceLocaleFields),
      uiLocaleFields: stringArray(entry.uiLocaleFields),
      grammarClusterIds: clusterIds,
      requiresPedagogyBlueprint: true,
      requiresResearchEvidence: true,
      generationAllowedBeforeBlueprint: false,
      generationAllowedAfterBlueprint: false,
      activationRequiresReviewerDecision: true,
      cacheKeyPolicy: s(entry, 'cacheKeyPolicy'),
      aiPromptContract: s(entry, 'aiPromptContract'),
    };
  });

  return {
    schemaVersion: 'gustav-fr-pedagogy-blueprint-v0',
    runId,
    generatedAt: new Date().toISOString(),
    targetLocale: 'fr',
    targetStudyLanguage: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourceArtifacts: {
      researchPack: rel(repoRoot, researchPackPath),
      researchPackVerifyAudit: rel(repoRoot, verifyPath),
      domainRegistryV2Packet: rel(repoRoot, domainRegistryPath),
      lessonLedgersDir: rel(repoRoot, path.join(runDir, 'generated', 'fr', 'lessons')),
    },
    sourceGraphProtection: {
      storesTargetOutput: false,
      storesLegacyFrenchFields: false,
      storesSourceMeaningHashesOnly: true,
      productionAppWritesAllowed: false,
    },
    transformationTypes: transformationTypes(),
    grammarClusterCatalog: packClusters.map((cluster) => ({
      id: s(cluster, 'id'),
      title: s(cluster, 'title'),
      requiredSourceIds: stringArray(cluster.requiredSourceIds),
      mustDecide: stringArray(cluster.mustDecide),
    })),
    categoryPolicies,
    lessonBlueprints,
    rowMappings,
    appDomainPolicies,
    activationPolicy: {
      directTranslationAllowedByDefault: false,
      targetOutputAllowedInBlueprint: false,
      generationAllowedFromBlueprintAlone: false,
      requiresGenerationSchemaV2: true,
      requiresReviewerDecisionImport: true,
      requiresExplicitApplyApproval: true,
    },
    unresolvedQuestions: categoryPolicies
      .filter((policy) => policy.confidence === 'low')
      .map((policy) => ({
        id: `low_confidence_category_${policy.sourceCategory}`,
        severity: 'medium',
        note: `Category ${policy.sourceCategory} maps to ${policy.primaryGrammarClusterId} but needs LLM official-source review before generation.`,
        blocksGenerationSchemaV2: false,
      })),
    readyForGenerationSchemaV2: true,
    readyForGenerationV2: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
}

function emptyMetrics(): Metrics {
  return {
    lessonLedgers: 0,
    generatedRows: 0,
    rowMappings: 0,
    lessonBlueprints: 0,
    categoryPolicies: 0,
    sourceCategoriesCovered: 0,
    categoriesTotal: 0,
    appDomainPolicies: 0,
    grammarClusters: 0,
    rowsMappedToKnownCluster: 0,
    rowsWithTwoOrMoreTransformationTypes: 0,
    rowsDirectTranslationBlocked: 0,
    rowsTargetOutputBlocked: 0,
    lowConfidenceCategoryPolicies: 0,
    resequenceCandidateLessons: 0,
    forbiddenOutputKeys: 0,
    forbiddenPermissionFlags: 0,
    falseApprovalFlags: 0,
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
      addFinding(findings, 'blocker', 'forbidden_target_output_key_present', `Blueprint must not contain target-output key ${key}.`, filePath, currentPath);
    }
    if (PERMISSION_FLAGS.has(key) && entry === true) {
      metrics.forbiddenPermissionFlags += 1;
      addFinding(findings, 'blocker', 'permission_flag_open', `Blueprint must not open permission flag ${key}.`, filePath, currentPath);
    }
    if (APPROVAL_FLAGS.has(key) && entry === true) {
      metrics.falseApprovalFlags += 1;
      addFinding(findings, 'blocker', 'approval_flag_open', `Blueprint must not set approval flag ${key}.`, filePath, currentPath);
    }
    inspectForbiddenKeys(entry, filePath, currentPath, findings, metrics);
  }
}

function validateBlueprint(blueprint: PedagogyBlueprint, expectedRows: number, expectedDomains: number, filePath: string): { findings: Finding[]; metrics: Metrics } {
  const findings: Finding[] = [];
  const metrics = emptyMetrics();
  const clusterIds = new Set(blueprint.grammarClusterCatalog.map((cluster) => cluster.id));
  const categorySet = new Set(blueprint.categoryPolicies.map((policy) => policy.sourceCategory));

  metrics.generatedRows = expectedRows;
  metrics.rowMappings = blueprint.rowMappings.length;
  metrics.lessonBlueprints = blueprint.lessonBlueprints.length;
  metrics.categoryPolicies = blueprint.categoryPolicies.length;
  metrics.sourceCategoriesCovered = categorySet.size;
  metrics.categoriesTotal = new Set(blueprint.rowMappings.map((row) => row.sourceCategory)).size;
  metrics.appDomainPolicies = blueprint.appDomainPolicies.length;
  metrics.grammarClusters = blueprint.grammarClusterCatalog.length;
  metrics.rowsMappedToKnownCluster = blueprint.rowMappings.filter((row) => clusterIds.has(row.primaryGrammarClusterId)).length;
  metrics.rowsWithTwoOrMoreTransformationTypes = blueprint.rowMappings.filter((row) => row.allowedTransformationTypes.length >= 2).length;
  metrics.rowsDirectTranslationBlocked = blueprint.rowMappings.filter((row) => row.directTranslationAllowed === false).length;
  metrics.rowsTargetOutputBlocked = blueprint.rowMappings.filter((row) => row.targetOutputAllowed === false).length;
  metrics.lowConfidenceCategoryPolicies = blueprint.categoryPolicies.filter((policy) => policy.confidence === 'low').length;
  metrics.resequenceCandidateLessons = blueprint.lessonBlueprints.filter((lesson) => lesson.sequencePolicy === 'resequence_candidate').length;

  if (blueprint.schemaVersion !== 'gustav-fr-pedagogy-blueprint-v0') addFinding(findings, 'blocker', 'schema_version_invalid', 'Blueprint schemaVersion is invalid.', filePath, '$.schemaVersion');
  if (blueprint.targetLocale !== 'fr' || blueprint.targetStudyLanguage !== 'fr') addFinding(findings, 'blocker', 'target_locale_invalid', 'Blueprint target locale must be fr.', filePath);
  if (JSON.stringify(blueprint.sourceLocales) !== JSON.stringify(['ru', 'uk'])) addFinding(findings, 'blocker', 'source_locales_invalid', 'Blueprint sourceLocales must be ru,uk.', filePath, '$.sourceLocales');
  if (blueprint.sourceGraphProtection.storesTargetOutput !== false || blueprint.sourceGraphProtection.storesLegacyFrenchFields !== false) {
    addFinding(findings, 'blocker', 'source_graph_protection_open', 'Blueprint must not store target output or legacy French fields.', filePath, '$.sourceGraphProtection');
  }
  if (blueprint.rowMappings.length !== expectedRows) addFinding(findings, 'blocker', 'row_mapping_count_mismatch', `Blueprint must map every row: expected ${expectedRows}, got ${blueprint.rowMappings.length}.`, filePath, '$.rowMappings');
  if (blueprint.lessonBlueprints.length !== 32) addFinding(findings, 'blocker', 'lesson_blueprint_count_mismatch', 'Blueprint must cover all 32 lessons.', filePath, '$.lessonBlueprints');
  if (blueprint.appDomainPolicies.length !== expectedDomains) addFinding(findings, 'blocker', 'app_domain_policy_count_mismatch', `Blueprint must cover ${expectedDomains} app domains.`, filePath, '$.appDomainPolicies');
  if (metrics.sourceCategoriesCovered !== metrics.categoriesTotal) addFinding(findings, 'blocker', 'category_policy_missing', 'Every source category must have a category policy.', filePath, '$.categoryPolicies');
  if (metrics.rowsMappedToKnownCluster !== blueprint.rowMappings.length) addFinding(findings, 'blocker', 'unknown_cluster_mapping', 'Every row mapping must point to a known grammar cluster.', filePath, '$.rowMappings');
  if (metrics.rowsDirectTranslationBlocked !== blueprint.rowMappings.length) addFinding(findings, 'blocker', 'direct_translation_not_blocked', 'Every row must keep directTranslationAllowed=false.', filePath, '$.rowMappings');
  if (metrics.rowsTargetOutputBlocked !== blueprint.rowMappings.length) addFinding(findings, 'blocker', 'target_output_not_blocked', 'Every row must keep targetOutputAllowed=false.', filePath, '$.rowMappings');
  if (metrics.rowsWithTwoOrMoreTransformationTypes !== blueprint.rowMappings.length) addFinding(findings, 'blocker', 'transformation_type_policy_too_narrow', 'Every row must have at least two allowed transformation types.', filePath, '$.rowMappings');
  if (blueprint.activationPolicy.generationAllowedFromBlueprintAlone !== false || blueprint.activationPolicy.requiresGenerationSchemaV2 !== true) {
    addFinding(findings, 'blocker', 'activation_policy_invalid', 'Blueprint must not allow generation from blueprint alone.', filePath, '$.activationPolicy');
  }
  for (const [index, policy] of blueprint.appDomainPolicies.entries()) {
    if (policy.generationAllowedBeforeBlueprint !== false || policy.generationAllowedAfterBlueprint !== false) {
      addFinding(findings, 'blocker', 'app_domain_generation_open', `App domain policy ${policy.domainId} must keep generation closed after blueprint until schema/reviewer gates.`, filePath, `$.appDomainPolicies[${index}]`);
    }
  }
  inspectForbiddenKeys(blueprint, filePath, '$', findings, metrics);
  return { findings, metrics };
}

function cloneBlueprint(value: PedagogyBlueprint): PedagogyBlueprint {
  return JSON.parse(JSON.stringify(value)) as PedagogyBlueprint;
}

function runProbes(blueprint: PedagogyBlueprint, expectedRows: number, expectedDomains: number, filePath: string): Probe[] {
  const probes: Array<{ id: string; expectedAccept: boolean; blueprint: PedagogyBlueprint }> = [];
  probes.push({ id: 'canonical_blueprint_accepts', expectedAccept: true, blueprint: cloneBlueprint(blueprint) });

  const missingRow = cloneBlueprint(blueprint);
  missingRow.rowMappings = missingRow.rowMappings.slice(0, -1);
  probes.push({ id: 'missing_row_mapping_rejected', expectedAccept: false, blueprint: missingRow });

  const openTarget = cloneBlueprint(blueprint) as PedagogyBlueprint & { proposedFrench?: string };
  openTarget.rowMappings[0] = { ...openTarget.rowMappings[0], targetOutputAllowed: true as false };
  openTarget.proposedFrench = 'blocked fixture target output';
  probes.push({ id: 'target_output_shortcut_rejected', expectedAccept: false, blueprint: openTarget });

  const unknownCluster = cloneBlueprint(blueprint);
  unknownCluster.rowMappings[0] = { ...unknownCluster.rowMappings[0], primaryGrammarClusterId: 'unknown_cluster' };
  probes.push({ id: 'unknown_cluster_rejected', expectedAccept: false, blueprint: unknownCluster });

  const missingCategory = cloneBlueprint(blueprint);
  missingCategory.categoryPolicies = missingCategory.categoryPolicies.slice(1);
  probes.push({ id: 'missing_category_policy_rejected', expectedAccept: false, blueprint: missingCategory });

  const openDomain = cloneBlueprint(blueprint);
  openDomain.appDomainPolicies[0] = { ...openDomain.appDomainPolicies[0], generationAllowedAfterBlueprint: true as false };
  probes.push({ id: 'domain_generation_open_rejected', expectedAccept: false, blueprint: openDomain });

  return probes.map((probe) => {
    const result = validateBlueprint(probe.blueprint, expectedRows, expectedDomains, filePath);
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
    '# GUSTAV Target Pedagogy Blueprint Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Research pack verified: ${report.summary.researchPackVerified ? 'yes' : 'no'}`,
    `- Lesson ledgers: ${report.summary.lessonLedgers}`,
    `- Generated rows: ${report.summary.generatedRows}`,
    `- Row mappings: ${report.summary.rowMappings}`,
    `- Lesson blueprints: ${report.summary.lessonBlueprints}`,
    `- Category policies: ${report.summary.categoryPolicies}`,
    `- App domain policies: ${report.summary.appDomainPolicies}`,
    `- Grammar clusters: ${report.summary.grammarClusters}`,
    `- Rows mapped to known cluster: ${report.summary.rowsMappedToKnownCluster}`,
    `- Rows direct-translation blocked: ${report.summary.rowsDirectTranslationBlocked}`,
    `- Rows target-output blocked: ${report.summary.rowsTargetOutputBlocked}`,
    `- Low-confidence category policies: ${report.summary.lowConfidenceCategoryPolicies}`,
    `- Resequence candidate lessons: ${report.summary.resequenceCandidateLessons}`,
    `- Forbidden output keys: ${report.summary.forbiddenOutputKeys}`,
    `- Forbidden permission flags: ${report.summary.forbiddenPermissionFlags}`,
    `- Fixture probes passed: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for Generation Schema V2: ${report.summary.readyForGenerationSchemaV2 ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Cluster Coverage',
    '',
  ];
  for (const [clusterId, rows] of Object.entries(report.clusterCoverage)) lines.push(`- \`${clusterId}\`: ${rows}`);
  lines.push('', '## Probes', '');
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
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  const targetArg = argValue('--target') ?? 'fr';
  if (!runArg || targetArg !== 'fr') {
    throw new Error('Usage: npx tsx scripts/gustav_target_pedagogy_blueprint.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const lessonsDir = path.join(runDir, 'generated', 'fr', 'lessons');
  const researchDir = path.join(runDir, 'research');
  const researchPackPath = path.join(researchDir, 'fr_research_pack.json');
  const researchPackVerifyPath = path.join(auditsDir, 'target_research_pack_verify_audit.json');
  const generationHistoryPath = path.join(auditsDir, 'generation_history_reconciliation_audit.json');
  const domainRegistryPath = path.join(auditsDir, 'algorithm_domain_registry_v2_packet.json');
  const outBlueprint = path.join(researchDir, 'fr_pedagogy_blueprint.json');
  const outJson = path.join(auditsDir, 'target_pedagogy_blueprint_packet.json');
  const outMd = path.join(auditsDir, 'target_pedagogy_blueprint_packet.md');
  ensureDir(auditsDir);
  ensureDir(researchDir);

  const findings: Finding[] = [];
  for (const filePath of [researchPackPath, researchPackVerifyPath, generationHistoryPath, domainRegistryPath]) {
    if (!fs.existsSync(filePath)) addFinding(findings, 'blocker', 'required_input_missing', 'Pedagogy blueprint input is missing.', rel(repoRoot, filePath));
  }

  const lessonLedgers = walkFiles(lessonsDir)
    .filter((filePath) => /^lesson\d+_row_ledger\.json$/.test(path.basename(filePath)))
    .sort((a, bValue) => Number(path.basename(a).match(/\d+/)?.[0] ?? 0) - Number(path.basename(bValue).match(/\d+/)?.[0] ?? 0));
  if (lessonLedgers.length !== 32) addFinding(findings, 'blocker', 'lesson_ledger_count_mismatch', `Expected 32 lesson ledgers, got ${lessonLedgers.length}.`, rel(repoRoot, lessonsDir));

  const generationSummary = summaryOf(generationHistoryPath);
  const verifySummary = summaryOf(researchPackVerifyPath);
  const domainSummary = summaryOf(domainRegistryPath);
  const expectedRows = n(generationSummary, 'generatedRows') || 1600;
  const expectedDomains = n(domainSummary, 'registryDomains') || 19;
  const researchPackVerified = b(verifySummary, 'readyForPedagogyBlueprint') && n(verifySummary, 'blockers') === 0;

  let blueprint: PedagogyBlueprint | null = null;
  let validation = { findings: [] as Finding[], metrics: emptyMetrics() };
  let probes: Probe[] = [];
  if (findings.filter((finding) => finding.severity === 'blocker').length === 0) {
    blueprint = buildBlueprint(repoRoot, runDir, runId, researchPackPath, researchPackVerifyPath, domainRegistryPath, lessonLedgers);
    validation = validateBlueprint(blueprint, expectedRows, expectedDomains, rel(repoRoot, outBlueprint));
    probes = runProbes(blueprint, expectedRows, expectedDomains, rel(repoRoot, outBlueprint));
    findings.push(...validation.findings);
    for (const probe of probes) {
      if (!probe.passed) addFinding(findings, 'blocker', 'fixture_probe_failed', `Pedagogy blueprint fixture probe failed: ${probe.id}.`);
    }
  }

  const metrics = validation.metrics;
  metrics.lessonLedgers = lessonLedgers.length;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const fixtureProbesPassed = probes.filter((probe) => probe.passed).length;
  const readyForGenerationSchemaV2 =
    Boolean(blueprint) &&
    blockers === 0 &&
    researchPackVerified &&
    metrics.rowMappings === expectedRows &&
    metrics.rowsMappedToKnownCluster === expectedRows &&
    metrics.rowsDirectTranslationBlocked === expectedRows &&
    metrics.rowsTargetOutputBlocked === expectedRows &&
    fixtureProbesPassed === probes.length;

  if (blueprint) {
    blueprint.readyForGenerationSchemaV2 = readyForGenerationSchemaV2;
    fs.writeFileSync(outBlueprint, `${JSON.stringify(blueprint, null, 2)}\n`, 'utf8');
  }

  const clusterCoverage = blueprint ? countBy(blueprint.rowMappings.map((row) => row.primaryGrammarClusterId)) : {};
  const categoryCoverage = blueprint
    ? Object.fromEntries(blueprint.categoryPolicies.map((policy) => [policy.sourceCategory, policy.primaryGrammarClusterId]))
    : {};
  const report: Report = {
    schemaVersion: 'gustav-target-pedagogy-blueprint-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      researchPack: rel(repoRoot, researchPackPath),
      targetResearchPackVerifyAudit: rel(repoRoot, researchPackVerifyPath),
      generationHistoryReconciliationAudit: rel(repoRoot, generationHistoryPath),
      algorithmDomainRegistryV2Packet: rel(repoRoot, domainRegistryPath),
      lessonLedgersDir: rel(repoRoot, lessonsDir),
    },
    outputs: {
      pedagogyBlueprint: rel(repoRoot, outBlueprint),
      packetJson: rel(repoRoot, outJson),
      packetMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      researchPackVerified,
      targetOutputStored: false,
      directTranslationAllowedByDefault: false,
      fixtureProbes: probes.length,
      fixtureProbesPassed,
      readyForGenerationSchemaV2,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    clusterCoverage,
    categoryCoverage,
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

  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(outMd, renderMarkdown(report), 'utf8');

  console.log(`GUSTAV target pedagogy blueprint: ${report.status}`);
  console.log(`Row mappings: ${report.summary.rowMappings}/${report.summary.generatedRows}`);
  console.log(`Category policies: ${report.summary.categoryPolicies}`);
  console.log(`App domain policies: ${report.summary.appDomainPolicies}`);
  console.log(`Fixture probes passed: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for Generation Schema V2: ${report.summary.readyForGenerationSchemaV2 ? 'yes' : 'no'}`);
  console.log(`Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
