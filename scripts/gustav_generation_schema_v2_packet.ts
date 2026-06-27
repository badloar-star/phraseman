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

type AntiCalqueDecision = 'required_before_generation' | 'must_rebuild' | 'reviewer_required';

type RowSchemaRequirement = {
  schemaRowId: string;
  lessonId: number;
  phraseId: string;
  sourceGraphRef: string;
  blueprintNodeId: string;
  sourceMeaningHash: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  uiLocalePolicy: 'ui_locale_separate_from_target_and_source';
  researchEvidenceIds: string[];
  pedagogyBlueprintId: string;
  grammarClusterId: string;
  secondaryGrammarClusterIds: string[];
  allowedTransformationTypes: TransformationType[];
  requiredTransformationType: TransformationType;
  antiCalqueDecision: AntiCalqueDecision;
  languageFieldDeclarations: {
    targetFields: 'target_locale_only';
    sourceMeaningFields: 'source_locales_only';
    uiFields: 'ui_locale_only';
    aiExplanationFields: 'declared_per_feature_contract';
  };
  reviewerDecisionRequired: 'schema_v2_accept_or_regenerate';
  legacyRowStatus: 'legacy_v1_missing_schema_fields';
  backfillAction: 'regenerate_or_backfill_after_prompt_and_quality_gates';
  activationStatus: 'blocked';
  activationBlockReason: 'blocked_until_schema_v2_prompt_quality_reviewer_and_apply_gates';
};

type DomainSchemaContract = {
  domainId: string;
  targetFields: string[];
  sourceLocaleFields: string[];
  uiLocaleFields: string[];
  requiredRowFields: string[];
  storageNamespacePolicy: string;
  cacheKeyPolicy: string;
  aiPromptContract: string;
  generationAllowedBeforePromptGate: false;
  generationAllowedBeforeContentQualityGate: false;
  importAllowedWithoutSchemaV2: false;
  applyAllowedWithoutApproval: false;
};

type GenerationSchemaV2 = {
  schemaVersion: 'gustav-fr-generation-schema-v2';
  runId: string;
  generatedAt: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  sourceArtifacts: Record<string, string>;
  requiredRowFields: string[];
  forbiddenRowFieldsInSchemaArtifact: string[];
  rowSchemaRequirements: RowSchemaRequirement[];
  domainSchemaContracts: DomainSchemaContract[];
  legacyEvidenceBackfillPlan: {
    generatedRows: number;
    legacyRowsNeedingBackfill: number;
    updateGeneratedLedgersNow: false;
    reviewerImportAllowedNow: false;
    productionApplyAllowedNow: false;
    requiredNextGates: string[];
  };
  activationPolicy: {
    generationAllowedFromSchemaAlone: false;
    requiresAiPromptContractV2: true;
    requiresContentQualityGatesV2: true;
    requiresReviewerDecisionImport: true;
    requiresExplicitApplyApproval: true;
  };
  readyForAiPromptContractV2: boolean;
  readyForContentQualityGatesV2: false;
  readyForGenerationV2: false;
  readyForReviewerDecisionImportV2: false;
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
  generatedRows: number;
  rowSchemaRequirements: number;
  domainSchemaContracts: number;
  legacyRowsNeedingBackfill: number;
  rowsWithTargetLocale: number;
  rowsWithSourceLocales: number;
  rowsWithResearchEvidenceIds: number;
  rowsWithPedagogyBlueprintId: number;
  rowsWithGrammarClusterId: number;
  rowsWithTransformationType: number;
  rowsWithAntiCalqueDecision: number;
  rowsWithLanguageFieldDeclarations: number;
  rowsActivationBlocked: number;
  forbiddenOutputKeys: number;
  forbiddenPermissionFlags: number;
  falseApprovalFlags: number;
  importOpenFlags: number;
};

type Report = {
  schemaVersion: 'gustav-generation-schema-v2-packet-v0';
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
    pedagogyBlueprintReady: boolean;
    generationHistoryRows: number;
    legacyGeneratedWithoutResearchPackRows: number;
    generatedRowsMissingResearchEvidenceIds: number;
    fixtureProbes: number;
    fixtureProbesPassed: number;
    readyForAiPromptContractV2: boolean;
    readyForContentQualityGatesV2: boolean;
    readyForGenerationV2: boolean;
    readyForReviewerDecisionImportV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  requiredRowFields: string[];
  domainIds: string[];
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

const REQUIRED_ROW_FIELDS = [
  'targetLocale',
  'targetStudyLanguage',
  'sourceLocales',
  'uiLocalePolicy',
  'researchEvidenceIds',
  'pedagogyBlueprintId',
  'grammarClusterId',
  'secondaryGrammarClusterIds',
  'allowedTransformationTypes',
  'requiredTransformationType',
  'antiCalqueDecision',
  'languageFieldDeclarations',
  'reviewerDecisionRequired',
  'activationStatus',
  'activationBlockReason',
];

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

function stringArray(value: unknown): string[] {
  return array(value).filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
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

function buildRowRequirement(mapping: JsonObject): RowSchemaRequirement {
  const lessonId = Number(mapping.lessonId);
  const phraseId = s(mapping, 'phraseId');
  const defaultTransformation = s(mapping, 'defaultTransformationType') as TransformationType;
  const allowedTransformationTypes = stringArray(mapping.allowedTransformationTypes) as TransformationType[];
  const transformationType = allowedTransformationTypes.includes(defaultTransformation)
    ? defaultTransformation
    : allowedTransformationTypes[0] ?? 'needs_llm_pedagogy_design';
  const researchEvidenceIds = stringArray(mapping.researchEvidenceIds);
  return {
    schemaRowId: `schema-v2-fr-l${lessonId}-${phraseId}`,
    lessonId,
    phraseId,
    sourceGraphRef: s(mapping, 'sourceGraphRef'),
    blueprintNodeId: s(mapping, 'blueprintNodeId'),
    sourceMeaningHash: s(mapping, 'sourceMeaningHash'),
    targetLocale: 'fr',
    targetStudyLanguage: 'fr',
    sourceLocales: ['ru', 'uk'],
    uiLocalePolicy: 'ui_locale_separate_from_target_and_source',
    researchEvidenceIds,
    pedagogyBlueprintId: s(mapping, 'blueprintNodeId'),
    grammarClusterId: s(mapping, 'primaryGrammarClusterId'),
    secondaryGrammarClusterIds: stringArray(mapping.secondaryGrammarClusterIds),
    allowedTransformationTypes,
    requiredTransformationType: transformationType,
    antiCalqueDecision: transformationType === 'anti_calque_rebuild' ? 'must_rebuild' : 'required_before_generation',
    languageFieldDeclarations: {
      targetFields: 'target_locale_only',
      sourceMeaningFields: 'source_locales_only',
      uiFields: 'ui_locale_only',
      aiExplanationFields: 'declared_per_feature_contract',
    },
    reviewerDecisionRequired: 'schema_v2_accept_or_regenerate',
    legacyRowStatus: 'legacy_v1_missing_schema_fields',
    backfillAction: 'regenerate_or_backfill_after_prompt_and_quality_gates',
    activationStatus: 'blocked',
    activationBlockReason: 'blocked_until_schema_v2_prompt_quality_reviewer_and_apply_gates',
  };
}

function buildDomainContract(entry: JsonObject): DomainSchemaContract {
  return {
    domainId: s(entry, 'domainId'),
    targetFields: stringArray(entry.targetFields),
    sourceLocaleFields: stringArray(entry.sourceLocaleFields),
    uiLocaleFields: stringArray(entry.uiLocaleFields),
    requiredRowFields: REQUIRED_ROW_FIELDS,
    storageNamespacePolicy: 'targetLocale + sourceLocale + domainId + schemaVersion + researchPackVersion + pedagogyBlueprintVersion',
    cacheKeyPolicy: s(entry, 'cacheKeyPolicy'),
    aiPromptContract: s(entry, 'aiPromptContract'),
    generationAllowedBeforePromptGate: false,
    generationAllowedBeforeContentQualityGate: false,
    importAllowedWithoutSchemaV2: false,
    applyAllowedWithoutApproval: false,
  };
}

function buildSchema(
  repoRoot: string,
  runId: string,
  pedagogyBlueprintPath: string,
  pedagogyBlueprintPacketPath: string,
  generationHistoryPath: string,
  domainRegistryPath: string,
): GenerationSchemaV2 {
  const blueprint = object(readJson<unknown>(pedagogyBlueprintPath));
  const generationHistorySummary = summaryOf(generationHistoryPath);
  const rowMappings = array<JsonObject>(blueprint.rowMappings);
  const appDomainPolicies = array<JsonObject>(blueprint.appDomainPolicies);
  const generatedRows = n(generationHistorySummary, 'generatedRows');
  const legacyRows = n(generationHistorySummary, 'legacyGeneratedWithoutResearchPackRows');

  return {
    schemaVersion: 'gustav-fr-generation-schema-v2',
    runId,
    generatedAt: new Date().toISOString(),
    targetLocale: 'fr',
    targetStudyLanguage: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourceArtifacts: {
      pedagogyBlueprint: rel(repoRoot, pedagogyBlueprintPath),
      targetPedagogyBlueprintPacket: rel(repoRoot, pedagogyBlueprintPacketPath),
      generationHistoryReconciliationAudit: rel(repoRoot, generationHistoryPath),
      algorithmDomainRegistryV2Packet: rel(repoRoot, domainRegistryPath),
    },
    requiredRowFields: REQUIRED_ROW_FIELDS,
    forbiddenRowFieldsInSchemaArtifact: Array.from(FORBIDDEN_OUTPUT_KEYS),
    rowSchemaRequirements: rowMappings.map(buildRowRequirement),
    domainSchemaContracts: appDomainPolicies.map(buildDomainContract),
    legacyEvidenceBackfillPlan: {
      generatedRows,
      legacyRowsNeedingBackfill: legacyRows,
      updateGeneratedLedgersNow: false,
      reviewerImportAllowedNow: false,
      productionApplyAllowedNow: false,
      requiredNextGates: [
        'P6 AI Prompt Contract V2',
        'P7 Content Quality Gates V2',
        'P8 Reviewer Workflow V2',
        'P10 Brain Gate V2',
        'P11 Production Activation Gate V2',
      ],
    },
    activationPolicy: {
      generationAllowedFromSchemaAlone: false,
      requiresAiPromptContractV2: true,
      requiresContentQualityGatesV2: true,
      requiresReviewerDecisionImport: true,
      requiresExplicitApplyApproval: true,
    },
    readyForAiPromptContractV2: true,
    readyForContentQualityGatesV2: false,
    readyForGenerationV2: false,
    readyForReviewerDecisionImportV2: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
}

function emptyMetrics(): Metrics {
  return {
    generatedRows: 0,
    rowSchemaRequirements: 0,
    domainSchemaContracts: 0,
    legacyRowsNeedingBackfill: 0,
    rowsWithTargetLocale: 0,
    rowsWithSourceLocales: 0,
    rowsWithResearchEvidenceIds: 0,
    rowsWithPedagogyBlueprintId: 0,
    rowsWithGrammarClusterId: 0,
    rowsWithTransformationType: 0,
    rowsWithAntiCalqueDecision: 0,
    rowsWithLanguageFieldDeclarations: 0,
    rowsActivationBlocked: 0,
    forbiddenOutputKeys: 0,
    forbiddenPermissionFlags: 0,
    falseApprovalFlags: 0,
    importOpenFlags: 0,
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
      addFinding(findings, 'blocker', 'forbidden_target_output_key_present', `Generation Schema V2 must not contain target-output key ${key}.`, filePath, currentPath);
    }
    if (PERMISSION_FLAGS.has(key) && entry === true) {
      metrics.forbiddenPermissionFlags += 1;
      addFinding(findings, 'blocker', 'permission_flag_open', `Generation Schema V2 must not open permission flag ${key}.`, filePath, currentPath);
    }
    if (APPROVAL_FLAGS.has(key) && entry === true) {
      metrics.falseApprovalFlags += 1;
      addFinding(findings, 'blocker', 'approval_flag_open', `Generation Schema V2 must not set approval flag ${key}.`, filePath, currentPath);
    }
    if (key === 'activationStatus' && entry !== 'blocked') {
      metrics.importOpenFlags += 1;
      addFinding(findings, 'blocker', 'activation_status_not_blocked', 'Generation Schema V2 rows must keep activationStatus=blocked.', filePath, currentPath);
    }
    inspectForbiddenKeys(entry, filePath, currentPath, findings, metrics);
  }
}

function validateSchema(schema: GenerationSchemaV2, expectedRows: number, expectedDomains: number, filePath: string): { findings: Finding[]; metrics: Metrics } {
  const findings: Finding[] = [];
  const metrics = emptyMetrics();
  const rows = schema.rowSchemaRequirements;
  metrics.generatedRows = expectedRows;
  metrics.rowSchemaRequirements = rows.length;
  metrics.domainSchemaContracts = schema.domainSchemaContracts.length;
  metrics.legacyRowsNeedingBackfill = schema.legacyEvidenceBackfillPlan.legacyRowsNeedingBackfill;
  metrics.rowsWithTargetLocale = rows.filter((row) => row.targetLocale === 'fr' && row.targetStudyLanguage === 'fr').length;
  metrics.rowsWithSourceLocales = rows.filter((row) => JSON.stringify(row.sourceLocales) === JSON.stringify(['ru', 'uk'])).length;
  metrics.rowsWithResearchEvidenceIds = rows.filter((row) => row.researchEvidenceIds.length > 0).length;
  metrics.rowsWithPedagogyBlueprintId = rows.filter((row) => row.pedagogyBlueprintId.trim() !== '').length;
  metrics.rowsWithGrammarClusterId = rows.filter((row) => row.grammarClusterId.trim() !== '').length;
  metrics.rowsWithTransformationType = rows.filter((row) => row.requiredTransformationType && row.allowedTransformationTypes.includes(row.requiredTransformationType)).length;
  metrics.rowsWithAntiCalqueDecision = rows.filter((row) => row.antiCalqueDecision === 'required_before_generation' || row.antiCalqueDecision === 'must_rebuild' || row.antiCalqueDecision === 'reviewer_required').length;
  metrics.rowsWithLanguageFieldDeclarations = rows.filter((row) =>
    row.languageFieldDeclarations.targetFields === 'target_locale_only' &&
    row.languageFieldDeclarations.sourceMeaningFields === 'source_locales_only' &&
    row.languageFieldDeclarations.uiFields === 'ui_locale_only'
  ).length;
  metrics.rowsActivationBlocked = rows.filter((row) => row.activationStatus === 'blocked').length;

  if (schema.schemaVersion !== 'gustav-fr-generation-schema-v2') addFinding(findings, 'blocker', 'schema_version_invalid', 'Generation Schema V2 schemaVersion is invalid.', filePath, '$.schemaVersion');
  if (schema.targetLocale !== 'fr' || schema.targetStudyLanguage !== 'fr') addFinding(findings, 'blocker', 'target_locale_invalid', 'Generation Schema V2 target locale must be fr.', filePath);
  if (JSON.stringify(schema.sourceLocales) !== JSON.stringify(['ru', 'uk'])) addFinding(findings, 'blocker', 'source_locales_invalid', 'Generation Schema V2 sourceLocales must be ru,uk.', filePath, '$.sourceLocales');
  for (const field of REQUIRED_ROW_FIELDS) {
    if (!schema.requiredRowFields.includes(field)) addFinding(findings, 'blocker', 'required_row_field_missing', `Required row field missing from schema: ${field}.`, filePath, '$.requiredRowFields');
  }
  if (rows.length !== expectedRows) addFinding(findings, 'blocker', 'row_schema_requirement_count_mismatch', `Expected ${expectedRows} row schema requirements, got ${rows.length}.`, filePath, '$.rowSchemaRequirements');
  if (schema.domainSchemaContracts.length !== expectedDomains) addFinding(findings, 'blocker', 'domain_schema_contract_count_mismatch', `Expected ${expectedDomains} domain schema contracts, got ${schema.domainSchemaContracts.length}.`, filePath, '$.domainSchemaContracts');
  if (metrics.rowsWithTargetLocale !== rows.length) addFinding(findings, 'blocker', 'row_target_locale_missing', 'Every schema row must declare targetLocale and targetStudyLanguage.', filePath);
  if (metrics.rowsWithSourceLocales !== rows.length) addFinding(findings, 'blocker', 'row_source_locales_missing', 'Every schema row must declare sourceLocales ru,uk.', filePath);
  if (metrics.rowsWithResearchEvidenceIds !== rows.length) addFinding(findings, 'blocker', 'row_research_evidence_missing', 'Every schema row must require researchEvidenceIds.', filePath);
  if (metrics.rowsWithPedagogyBlueprintId !== rows.length) addFinding(findings, 'blocker', 'row_pedagogy_blueprint_missing', 'Every schema row must require pedagogyBlueprintId.', filePath);
  if (metrics.rowsWithGrammarClusterId !== rows.length) addFinding(findings, 'blocker', 'row_grammar_cluster_missing', 'Every schema row must require grammarClusterId.', filePath);
  if (metrics.rowsWithTransformationType !== rows.length) addFinding(findings, 'blocker', 'row_transformation_type_missing', 'Every schema row must require a valid transformation type.', filePath);
  if (metrics.rowsWithAntiCalqueDecision !== rows.length) addFinding(findings, 'blocker', 'row_anti_calque_decision_missing', 'Every schema row must require antiCalqueDecision.', filePath);
  if (metrics.rowsWithLanguageFieldDeclarations !== rows.length) addFinding(findings, 'blocker', 'row_language_field_declarations_missing', 'Every schema row must declare target/source/ui language fields.', filePath);
  if (metrics.rowsActivationBlocked !== rows.length) addFinding(findings, 'blocker', 'row_activation_not_blocked', 'Every schema row must keep activationStatus=blocked.', filePath);
  if (schema.legacyEvidenceBackfillPlan.updateGeneratedLedgersNow !== false || schema.legacyEvidenceBackfillPlan.reviewerImportAllowedNow !== false || schema.legacyEvidenceBackfillPlan.productionApplyAllowedNow !== false) {
    addFinding(findings, 'blocker', 'backfill_plan_opened_write_or_import', 'Backfill plan must not write ledgers, import, or apply now.', filePath, '$.legacyEvidenceBackfillPlan');
  }
  if (schema.activationPolicy.generationAllowedFromSchemaAlone !== false || schema.readyForGenerationV2 !== false || schema.readyForApply !== false) {
    addFinding(findings, 'blocker', 'activation_policy_opened_generation', 'Generation Schema V2 must not open generation or apply by itself.', filePath, '$.activationPolicy');
  }
  for (const [index, contract] of schema.domainSchemaContracts.entries()) {
    if (contract.generationAllowedBeforePromptGate !== false || contract.generationAllowedBeforeContentQualityGate !== false || contract.importAllowedWithoutSchemaV2 !== false || contract.applyAllowedWithoutApproval !== false) {
      addFinding(findings, 'blocker', 'domain_schema_contract_open', `Domain schema contract ${contract.domainId} opens generation/import/apply too early.`, filePath, `$.domainSchemaContracts[${index}]`);
    }
  }
  inspectForbiddenKeys(schema, filePath, '$', findings, metrics);
  return { findings, metrics };
}

function cloneSchema(schema: GenerationSchemaV2): GenerationSchemaV2 {
  return JSON.parse(JSON.stringify(schema)) as GenerationSchemaV2;
}

function runProbes(schema: GenerationSchemaV2, expectedRows: number, expectedDomains: number, filePath: string): Probe[] {
  const probes: Array<{ id: string; expectedAccept: boolean; schema: GenerationSchemaV2 }> = [];
  probes.push({ id: 'canonical_schema_accepts', expectedAccept: true, schema: cloneSchema(schema) });

  const missingRow = cloneSchema(schema);
  missingRow.rowSchemaRequirements = missingRow.rowSchemaRequirements.slice(0, -1);
  probes.push({ id: 'missing_row_requirement_rejected', expectedAccept: false, schema: missingRow });

  const missingEvidence = cloneSchema(schema);
  missingEvidence.rowSchemaRequirements[0] = { ...missingEvidence.rowSchemaRequirements[0], researchEvidenceIds: [] };
  probes.push({ id: 'missing_research_evidence_rejected', expectedAccept: false, schema: missingEvidence });

  const openGeneration = cloneSchema(schema);
  openGeneration.activationPolicy = { ...openGeneration.activationPolicy, generationAllowedFromSchemaAlone: true as false };
  probes.push({ id: 'generation_from_schema_alone_rejected', expectedAccept: false, schema: openGeneration });

  const openDomain = cloneSchema(schema);
  openDomain.domainSchemaContracts[0] = { ...openDomain.domainSchemaContracts[0], generationAllowedBeforePromptGate: true as false };
  probes.push({ id: 'domain_prompt_gate_bypass_rejected', expectedAccept: false, schema: openDomain });

  const targetOutput = cloneSchema(schema) as GenerationSchemaV2 & { proposedFrench?: string };
  targetOutput.proposedFrench = 'blocked fixture target output';
  probes.push({ id: 'target_output_key_rejected', expectedAccept: false, schema: targetOutput });

  return probes.map((probe) => {
    const result = validateSchema(probe.schema, expectedRows, expectedDomains, filePath);
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
    '# GUSTAV Generation Schema V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Pedagogy blueprint ready: ${report.summary.pedagogyBlueprintReady ? 'yes' : 'no'}`,
    `- Generated rows: ${report.summary.generatedRows}`,
    `- Row schema requirements: ${report.summary.rowSchemaRequirements}`,
    `- Domain schema contracts: ${report.summary.domainSchemaContracts}`,
    `- Legacy rows needing backfill: ${report.summary.legacyRowsNeedingBackfill}`,
    `- Rows with researchEvidenceIds: ${report.summary.rowsWithResearchEvidenceIds}`,
    `- Rows with pedagogyBlueprintId: ${report.summary.rowsWithPedagogyBlueprintId}`,
    `- Rows with grammarClusterId: ${report.summary.rowsWithGrammarClusterId}`,
    `- Rows with transformation type: ${report.summary.rowsWithTransformationType}`,
    `- Rows with anti-calque decision: ${report.summary.rowsWithAntiCalqueDecision}`,
    `- Rows with language field declarations: ${report.summary.rowsWithLanguageFieldDeclarations}`,
    `- Rows activation blocked: ${report.summary.rowsActivationBlocked}`,
    `- Forbidden output keys: ${report.summary.forbiddenOutputKeys}`,
    `- Forbidden permission flags: ${report.summary.forbiddenPermissionFlags}`,
    `- Fixture probes passed: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for AI Prompt Contract V2: ${report.summary.readyForAiPromptContractV2 ? 'yes' : 'no'}`,
    `- Ready for Content Quality Gates V2: ${report.summary.readyForContentQualityGatesV2 ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for reviewer decision import V2: ${report.summary.readyForReviewerDecisionImportV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Required Row Fields',
    '',
    ...report.requiredRowFields.map((field) => `- \`${field}\``),
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
  lines.push('');
  return lines.join('\n');
}

function main(): void {
  const runArg = argValue('--run');
  const targetArg = argValue('--target') ?? 'fr';
  if (!runArg || targetArg !== 'fr') {
    throw new Error('Usage: npx tsx scripts/gustav_generation_schema_v2_packet.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const researchDir = path.join(runDir, 'research');
  const pedagogyBlueprintPath = path.join(researchDir, 'fr_pedagogy_blueprint.json');
  const pedagogyBlueprintPacketPath = path.join(auditsDir, 'target_pedagogy_blueprint_packet.json');
  const generationHistoryPath = path.join(auditsDir, 'generation_history_reconciliation_audit.json');
  const domainRegistryPath = path.join(auditsDir, 'algorithm_domain_registry_v2_packet.json');
  const outSchema = path.join(researchDir, 'fr_generation_schema_v2.json');
  const outJson = path.join(auditsDir, 'generation_schema_v2_packet.json');
  const outMd = path.join(auditsDir, 'generation_schema_v2_packet.md');
  ensureDir(auditsDir);
  ensureDir(researchDir);

  const findings: Finding[] = [];
  for (const filePath of [pedagogyBlueprintPath, pedagogyBlueprintPacketPath, generationHistoryPath, domainRegistryPath]) {
    if (!fs.existsSync(filePath)) addFinding(findings, 'blocker', 'required_input_missing', 'Generation Schema V2 input is missing.', rel(repoRoot, filePath));
  }

  const pedagogySummary = summaryOf(pedagogyBlueprintPacketPath);
  const generationSummary = summaryOf(generationHistoryPath);
  const domainSummary = summaryOf(domainRegistryPath);
  const expectedRows = n(generationSummary, 'generatedRows') || n(pedagogySummary, 'rowMappings') || 1600;
  const expectedDomains = n(domainSummary, 'registryDomains') || n(pedagogySummary, 'appDomainPolicies') || 19;
  const pedagogyBlueprintReady = b(pedagogySummary, 'readyForGenerationSchemaV2') && n(pedagogySummary, 'blockers') === 0;
  if (!pedagogyBlueprintReady) {
    addFinding(findings, 'blocker', 'pedagogy_blueprint_not_ready', 'P5 requires P4 pedagogy blueprint to be ready for Generation Schema V2.', rel(repoRoot, pedagogyBlueprintPacketPath));
  }

  let schema: GenerationSchemaV2 | null = null;
  let validation = { findings: [] as Finding[], metrics: emptyMetrics() };
  let probes: Probe[] = [];
  if (findings.filter((finding) => finding.severity === 'blocker').length === 0) {
    schema = buildSchema(repoRoot, runId, pedagogyBlueprintPath, pedagogyBlueprintPacketPath, generationHistoryPath, domainRegistryPath);
    validation = validateSchema(schema, expectedRows, expectedDomains, rel(repoRoot, outSchema));
    probes = runProbes(schema, expectedRows, expectedDomains, rel(repoRoot, outSchema));
    findings.push(...validation.findings);
    for (const probe of probes) {
      if (!probe.passed) addFinding(findings, 'blocker', 'fixture_probe_failed', `Generation Schema V2 fixture probe failed: ${probe.id}.`);
    }
  }

  const metrics = validation.metrics;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const fixtureProbesPassed = probes.filter((probe) => probe.passed).length;
  const readyForAiPromptContractV2 =
    Boolean(schema) &&
    blockers === 0 &&
    pedagogyBlueprintReady &&
    metrics.rowSchemaRequirements === expectedRows &&
    metrics.rowsWithResearchEvidenceIds === expectedRows &&
    metrics.rowsWithPedagogyBlueprintId === expectedRows &&
    metrics.rowsWithGrammarClusterId === expectedRows &&
    metrics.rowsWithLanguageFieldDeclarations === expectedRows &&
    fixtureProbesPassed === probes.length;

  if (schema) {
    schema.readyForAiPromptContractV2 = readyForAiPromptContractV2;
    fs.writeFileSync(outSchema, `${JSON.stringify(schema, null, 2)}\n`, 'utf8');
  }

  const domainIds = schema ? schema.domainSchemaContracts.map((contract) => contract.domainId) : [];
  const report: Report = {
    schemaVersion: 'gustav-generation-schema-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      pedagogyBlueprint: rel(repoRoot, pedagogyBlueprintPath),
      targetPedagogyBlueprintPacket: rel(repoRoot, pedagogyBlueprintPacketPath),
      generationHistoryReconciliationAudit: rel(repoRoot, generationHistoryPath),
      algorithmDomainRegistryV2Packet: rel(repoRoot, domainRegistryPath),
    },
    outputs: {
      generationSchemaV2: rel(repoRoot, outSchema),
      packetJson: rel(repoRoot, outJson),
      packetMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      pedagogyBlueprintReady,
      generationHistoryRows: n(generationSummary, 'generatedRows'),
      legacyGeneratedWithoutResearchPackRows: n(generationSummary, 'legacyGeneratedWithoutResearchPackRows'),
      generatedRowsMissingResearchEvidenceIds: n(generationSummary, 'generatedRowsMissingResearchEvidenceIds'),
      fixtureProbes: probes.length,
      fixtureProbesPassed,
      readyForAiPromptContractV2,
      readyForContentQualityGatesV2: false,
      readyForGenerationV2: false,
      readyForReviewerDecisionImportV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    requiredRowFields: REQUIRED_ROW_FIELDS,
    domainIds,
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

  console.log(`GUSTAV Generation Schema V2 packet: ${report.status}`);
  console.log(`Row schema requirements: ${report.summary.rowSchemaRequirements}/${report.summary.generatedRows}`);
  console.log(`Domain schema contracts: ${report.summary.domainSchemaContracts}`);
  console.log(`Legacy rows needing backfill: ${report.summary.legacyRowsNeedingBackfill}`);
  console.log(`Fixture probes passed: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for AI Prompt Contract V2: ${report.summary.readyForAiPromptContractV2 ? 'yes' : 'no'}`);
  console.log(`Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
