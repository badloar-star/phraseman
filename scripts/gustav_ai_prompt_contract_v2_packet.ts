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

type AiEntrypointContract = {
  contractId: string;
  domainId: string;
  domainTitle: string;
  filePath: string;
  fileExists: boolean;
  featureRiskClass: string;
  riskLevel: RiskLevel;
  requiredLanguageDimensions: {
    targetLocale: true;
    targetStudyLanguage: true;
    sourceLocales: true;
    uiLocale: true;
    generationSchemaVersion: true;
    researchPackVersion: true;
    pedagogyBlueprintVersion: true;
  };
  promptContract: {
    originalDomainPromptContract: string;
    mustPassTargetLocale: true;
    mustPassSourceLocales: true;
    mustPassUiLocale: true;
    mustPassGenerationSchemaVersion: true;
    mustDeclareOutputFieldLanguages: true;
    mustSeparateTargetSourceAndUiText: true;
    requiredSystemRules: string[];
    disallowedBehaviors: string[];
  };
  cacheContract: {
    originalDomainCacheKeyPolicy: string;
    requiredKeyDimensions: string[];
    rejectedFreshOutputMayBeCached: false;
    targetMismatchCacheFallbackAllowed: false;
    sourceLocaleMismatchCacheFallbackAllowed: false;
    uiLocaleMismatchCacheFallbackAllowed: false;
  };
  outputContract: {
    allowedTargetLocale: 'fr';
    allowedSourceLocales: Array<'ru' | 'uk'>;
    uiLocaleSeparated: true;
    freshOutputLanguageGate: 'reject_before_return_and_cache';
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
  activationBlockReason: 'blocked_until_ai_prompt_contract_content_quality_reviewer_and_apply_gates';
};

type AiPromptContractV2 = {
  schemaVersion: 'gustav-fr-ai-prompt-contract-v2';
  runId: string;
  generatedAt: string;
  targetLocale: 'fr';
  targetStudyLanguage: 'fr';
  sourceLocales: Array<'ru' | 'uk'>;
  sourceArtifacts: Record<string, string>;
  entrypointContracts: AiEntrypointContract[];
  domainCoverage: Record<string, number>;
  globalPromptRules: string[];
  globalCacheRules: string[];
  rejectedOutputPolicy: {
    rejectedFreshOutputMayReturn: false;
    rejectedFreshOutputMayBeCached: false;
    wrongLanguageFallbackAllowed: false;
    safeFallbackMayContainTargetContent: false;
  };
  activationPolicy: {
    generationAllowedFromPromptContractAlone: false;
    requiresContentQualityGatesV2: true;
    requiresReviewerWorkflowV2: true;
    requiresExplicitApplyApproval: true;
  };
  readyForContentQualityGatesV2: boolean;
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
  aiPromptEntrypointsExpected: number;
  aiPromptEntrypointContracts: number;
  aiPromptEntrypointFilesExist: number;
  aiPromptDomainsExpected: number;
  aiPromptDomainsCovered: number;
  contractsWithTargetLocale: number;
  contractsWithSourceLocales: number;
  contractsWithUiLocale: number;
  contractsWithGenerationSchemaVersion: number;
  contractsWithCacheContract: number;
  contractsWithRejectBeforeReturn: number;
  contractsWithRejectBeforeCache: number;
  contractsWithLanguageSafeFallback: number;
  contractsGenerationBlocked: number;
  criticalRiskContracts: number;
  highRiskContracts: number;
  forbiddenOutputKeys: number;
  forbiddenPermissionFlags: number;
  falseApprovalFlags: number;
  activationOpenFlags: number;
};

type Report = {
  schemaVersion: 'gustav-ai-prompt-contract-v2-packet-v0';
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
    fixtureProbes: number;
    fixtureProbesPassed: number;
    readyForContentQualityGatesV2: boolean;
    readyForGenerationV2: boolean;
    readyForApply: boolean;
    mayModifyProductionAppFiles: boolean;
    blockers: number;
    warnings: number;
  };
  domainCoverage: Record<string, number>;
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

function featureRiskClass(domainId: string, filePath: string): string {
  const text = `${domainId} ${filePath}`.toLowerCase();
  if (text.includes('mistake')) return 'mistake_explanation';
  if (text.includes('weekly')) return 'weekly_review';
  if (text.includes('stats')) return 'stats_insights';
  if (text.includes('premium') || text.includes('paywall')) return 'premium_dialog_or_paywall';
  if (text.includes('dialog')) return 'ai_dialog';
  if (text.includes('quiz')) return 'quiz_explanation';
  if (text.includes('preposition') || text.includes('explain_prompts')) return 'grammar_explanation';
  if (text.includes('storage') || text.includes('cache') || text.includes('cloud')) return 'cache_or_storage';
  if (text.includes('gustav') || text.includes('gate')) return 'pipeline_gate';
  if (text.includes('diagnosis') || text.includes('personal')) return 'personal_plan';
  return 'ai_prompt_surface';
}

function riskLevel(domainId: string, filePath: string): RiskLevel {
  const cls = featureRiskClass(domainId, filePath);
  if (['mistake_explanation', 'weekly_review', 'stats_insights', 'premium_dialog_or_paywall', 'ai_dialog'].includes(cls)) return 'critical';
  if (['quiz_explanation', 'grammar_explanation', 'personal_plan'].includes(cls)) return 'high';
  return 'medium';
}

function contractId(domainId: string, filePath: string): string {
  return `ai-contract-fr-${domainId}-${filePath.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase()}`;
}

function requiredKeyDimensions(domainId: string): string[] {
  const base = [
    'targetLocale',
    'targetStudyLanguage',
    'sourceLocales',
    'uiLocale',
    'domainId',
    'entrypointFile',
    'generationSchemaVersion',
    'researchPackVersion',
    'pedagogyBlueprintVersion',
  ];
  if (domainId.includes('dialog')) base.push('scenarioId', 'conversationId');
  if (domainId.includes('mistake')) base.push('mistakeToken', 'grammarClusterId');
  if (domainId.includes('weekly') || domainId.includes('stats')) base.push('statsWindow', 'userIdHash');
  if (domainId.includes('quiz')) base.push('quizId', 'grammarClusterId');
  return Array.from(new Set(base));
}

function buildContract(repoRoot: string, domain: JsonObject, filePath: string): AiEntrypointContract {
  const domainId = s(domain, 'id');
  return {
    contractId: contractId(domainId, filePath),
    domainId,
    domainTitle: s(domain, 'title'),
    filePath,
    fileExists: fs.existsSync(path.resolve(repoRoot, filePath)),
    featureRiskClass: featureRiskClass(domainId, filePath),
    riskLevel: riskLevel(domainId, filePath),
    requiredLanguageDimensions: {
      targetLocale: true,
      targetStudyLanguage: true,
      sourceLocales: true,
      uiLocale: true,
      generationSchemaVersion: true,
      researchPackVersion: true,
      pedagogyBlueprintVersion: true,
    },
    promptContract: {
      originalDomainPromptContract: s(domain, 'aiPromptContract'),
      mustPassTargetLocale: true,
      mustPassSourceLocales: true,
      mustPassUiLocale: true,
      mustPassGenerationSchemaVersion: true,
      mustDeclareOutputFieldLanguages: true,
      mustSeparateTargetSourceAndUiText: true,
      requiredSystemRules: [
        'Declare targetLocale=fr, targetStudyLanguage=fr, sourceLocales=ru,uk and uiLocale before requesting AI output.',
        'Target fields may contain only target-locale content; source explanation fields may contain only declared source locales; UI chrome uses uiLocale only.',
        'Use Generation Schema V2 row fields and pedagogyBlueprintId when producing any row-scoped text.',
        'Reject fresh output before return and before cache if language, field shape, schema id or cache dimensions do not match.',
      ],
      disallowedBehaviors: [
        'Do not return rejected fresh AI text live.',
        'Do not cache rejected fresh AI text.',
        'Do not reuse cached AI output across targetLocale, sourceLocales or uiLocale.',
        'Do not use source-locale explanations as target fields.',
        'Do not use UI locale copy as target learning content.',
      ],
    },
    cacheContract: {
      originalDomainCacheKeyPolicy: s(domain, 'cacheKeyPolicy'),
      requiredKeyDimensions: requiredKeyDimensions(domainId),
      rejectedFreshOutputMayBeCached: false,
      targetMismatchCacheFallbackAllowed: false,
      sourceLocaleMismatchCacheFallbackAllowed: false,
      uiLocaleMismatchCacheFallbackAllowed: false,
    },
    outputContract: {
      allowedTargetLocale: 'fr',
      allowedSourceLocales: ['ru', 'uk'],
      uiLocaleSeparated: true,
      freshOutputLanguageGate: 'reject_before_return_and_cache',
      rejectedFreshOutputMayReturn: false,
      wrongLanguageFallbackAllowed: false,
      targetOutputAllowedBeforeContentQualityGate: false,
    },
    returnContract: {
      mayReturnCachedOnlyIfLanguageKeyMatches: true,
      mayReturnRejectedFreshText: false,
      mustReturnSafeFallbackOnReject: true,
      safeFallbackMayContainTargetContent: false,
    },
    activationStatus: 'blocked',
    activationBlockReason: 'blocked_until_ai_prompt_contract_content_quality_reviewer_and_apply_gates',
  };
}

function buildPromptContract(
  repoRoot: string,
  runId: string,
  domainRegistryPath: string,
  generationSchemaPath: string,
  generationSchemaPacketPath: string,
): AiPromptContractV2 {
  const registryReport = object(readJson<unknown>(domainRegistryPath));
  const registry = array<JsonObject>(registryReport.registry);
  const contracts: AiEntrypointContract[] = [];
  for (const domain of registry) {
    for (const filePath of stringArray(domain.aiPromptEntrypoints)) {
      contracts.push(buildContract(repoRoot, domain, filePath));
    }
  }
  const domainCoverage: Record<string, number> = {};
  for (const contract of contracts) domainCoverage[contract.domainId] = (domainCoverage[contract.domainId] ?? 0) + 1;

  return {
    schemaVersion: 'gustav-fr-ai-prompt-contract-v2',
    runId,
    generatedAt: new Date().toISOString(),
    targetLocale: 'fr',
    targetStudyLanguage: 'fr',
    sourceLocales: ['ru', 'uk'],
    sourceArtifacts: {
      algorithmDomainRegistryV2Packet: rel(repoRoot, domainRegistryPath),
      generationSchemaV2: rel(repoRoot, generationSchemaPath),
      generationSchemaV2Packet: rel(repoRoot, generationSchemaPacketPath),
    },
    entrypointContracts: contracts,
    domainCoverage,
    globalPromptRules: [
      'Every prompt must carry targetLocale, targetStudyLanguage, sourceLocales, uiLocale and generationSchemaVersion.',
      'Every AI output must declare field language before it can be returned or cached.',
      'Every row-scoped output must reference Generation Schema V2 and pedagogyBlueprintId.',
      'Every rejected fresh output is blocked before live return and before cache write.',
    ],
    globalCacheRules: [
      'Cache keys must include targetLocale, targetStudyLanguage, sourceLocales, uiLocale, domainId, entrypointFile and schema/research/blueprint versions.',
      'No cache fallback may cross targetLocale, sourceLocales or uiLocale.',
      'Rejected fresh output may never be cached.',
    ],
    rejectedOutputPolicy: {
      rejectedFreshOutputMayReturn: false,
      rejectedFreshOutputMayBeCached: false,
      wrongLanguageFallbackAllowed: false,
      safeFallbackMayContainTargetContent: false,
    },
    activationPolicy: {
      generationAllowedFromPromptContractAlone: false,
      requiresContentQualityGatesV2: true,
      requiresReviewerWorkflowV2: true,
      requiresExplicitApplyApproval: true,
    },
    readyForContentQualityGatesV2: true,
    readyForGenerationV2: false,
    readyForApply: false,
    mayModifyProductionAppFiles: false,
  };
}

function emptyMetrics(): Metrics {
  return {
    aiPromptEntrypointsExpected: 0,
    aiPromptEntrypointContracts: 0,
    aiPromptEntrypointFilesExist: 0,
    aiPromptDomainsExpected: 0,
    aiPromptDomainsCovered: 0,
    contractsWithTargetLocale: 0,
    contractsWithSourceLocales: 0,
    contractsWithUiLocale: 0,
    contractsWithGenerationSchemaVersion: 0,
    contractsWithCacheContract: 0,
    contractsWithRejectBeforeReturn: 0,
    contractsWithRejectBeforeCache: 0,
    contractsWithLanguageSafeFallback: 0,
    contractsGenerationBlocked: 0,
    criticalRiskContracts: 0,
    highRiskContracts: 0,
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
      addFinding(findings, 'blocker', 'forbidden_target_output_key_present', `AI Prompt Contract V2 must not contain target-output key ${key}.`, filePath, currentPath);
    }
    if (PERMISSION_FLAGS.has(key) && entry === true) {
      metrics.forbiddenPermissionFlags += 1;
      addFinding(findings, 'blocker', 'permission_flag_open', `AI Prompt Contract V2 must not open permission flag ${key}.`, filePath, currentPath);
    }
    if (APPROVAL_FLAGS.has(key) && entry === true) {
      metrics.falseApprovalFlags += 1;
      addFinding(findings, 'blocker', 'approval_flag_open', `AI Prompt Contract V2 must not set approval flag ${key}.`, filePath, currentPath);
    }
    if (key === 'activationStatus' && entry !== 'blocked') {
      metrics.activationOpenFlags += 1;
      addFinding(findings, 'blocker', 'activation_status_not_blocked', 'AI Prompt Contract V2 entrypoints must keep activationStatus=blocked.', filePath, currentPath);
    }
    inspectForbiddenKeys(entry, filePath, currentPath, findings, metrics);
  }
}

function validateContract(contract: AiPromptContractV2, expectedEntrypoints: number, expectedDomains: number, filePath: string): { findings: Finding[]; metrics: Metrics } {
  const findings: Finding[] = [];
  const metrics = emptyMetrics();
  const contracts = contract.entrypointContracts;
  const coveredDomains = new Set(contracts.map((entry) => entry.domainId));

  metrics.aiPromptEntrypointsExpected = expectedEntrypoints;
  metrics.aiPromptEntrypointContracts = contracts.length;
  metrics.aiPromptEntrypointFilesExist = contracts.filter((entry) => entry.fileExists).length;
  metrics.aiPromptDomainsExpected = expectedDomains;
  metrics.aiPromptDomainsCovered = coveredDomains.size;
  metrics.contractsWithTargetLocale = contracts.filter((entry) => entry.requiredLanguageDimensions.targetLocale === true && entry.promptContract.mustPassTargetLocale === true).length;
  metrics.contractsWithSourceLocales = contracts.filter((entry) => entry.requiredLanguageDimensions.sourceLocales === true && entry.promptContract.mustPassSourceLocales === true).length;
  metrics.contractsWithUiLocale = contracts.filter((entry) => entry.requiredLanguageDimensions.uiLocale === true && entry.promptContract.mustPassUiLocale === true).length;
  metrics.contractsWithGenerationSchemaVersion = contracts.filter((entry) => entry.requiredLanguageDimensions.generationSchemaVersion === true && entry.promptContract.mustPassGenerationSchemaVersion === true).length;
  metrics.contractsWithCacheContract = contracts.filter((entry) =>
    entry.cacheContract.requiredKeyDimensions.includes('targetLocale') &&
    entry.cacheContract.requiredKeyDimensions.includes('sourceLocales') &&
    entry.cacheContract.requiredKeyDimensions.includes('uiLocale') &&
    entry.cacheContract.requiredKeyDimensions.includes('generationSchemaVersion')
  ).length;
  metrics.contractsWithRejectBeforeReturn = contracts.filter((entry) => entry.outputContract.rejectedFreshOutputMayReturn === false && entry.returnContract.mayReturnRejectedFreshText === false).length;
  metrics.contractsWithRejectBeforeCache = contracts.filter((entry) => entry.cacheContract.rejectedFreshOutputMayBeCached === false).length;
  metrics.contractsWithLanguageSafeFallback = contracts.filter((entry) => entry.outputContract.wrongLanguageFallbackAllowed === false && entry.returnContract.safeFallbackMayContainTargetContent === false).length;
  metrics.contractsGenerationBlocked = contracts.filter((entry) => entry.outputContract.targetOutputAllowedBeforeContentQualityGate === false && entry.activationStatus === 'blocked').length;
  metrics.criticalRiskContracts = contracts.filter((entry) => entry.riskLevel === 'critical').length;
  metrics.highRiskContracts = contracts.filter((entry) => entry.riskLevel === 'high').length;

  if (contract.schemaVersion !== 'gustav-fr-ai-prompt-contract-v2') addFinding(findings, 'blocker', 'schema_version_invalid', 'AI Prompt Contract V2 schemaVersion is invalid.', filePath, '$.schemaVersion');
  if (contract.targetLocale !== 'fr' || contract.targetStudyLanguage !== 'fr') addFinding(findings, 'blocker', 'target_locale_invalid', 'AI Prompt Contract V2 target locale must be fr.', filePath);
  if (JSON.stringify(contract.sourceLocales) !== JSON.stringify(['ru', 'uk'])) addFinding(findings, 'blocker', 'source_locales_invalid', 'AI Prompt Contract V2 sourceLocales must be ru,uk.', filePath, '$.sourceLocales');
  if (contracts.length !== expectedEntrypoints) addFinding(findings, 'blocker', 'entrypoint_contract_count_mismatch', `Expected ${expectedEntrypoints} AI entrypoint contracts, got ${contracts.length}.`, filePath, '$.entrypointContracts');
  if (coveredDomains.size !== expectedDomains) addFinding(findings, 'blocker', 'ai_domain_coverage_mismatch', `Expected ${expectedDomains} AI domains, got ${coveredDomains.size}.`, filePath, '$.domainCoverage');
  if (metrics.aiPromptEntrypointFilesExist !== contracts.length) addFinding(findings, 'blocker', 'entrypoint_file_missing', 'Every AI entrypoint contract must point to an existing file.', filePath, '$.entrypointContracts');
  if (metrics.contractsWithTargetLocale !== contracts.length) addFinding(findings, 'blocker', 'target_locale_contract_missing', 'Every AI contract must require targetLocale.', filePath);
  if (metrics.contractsWithSourceLocales !== contracts.length) addFinding(findings, 'blocker', 'source_locales_contract_missing', 'Every AI contract must require sourceLocales.', filePath);
  if (metrics.contractsWithUiLocale !== contracts.length) addFinding(findings, 'blocker', 'ui_locale_contract_missing', 'Every AI contract must require uiLocale.', filePath);
  if (metrics.contractsWithGenerationSchemaVersion !== contracts.length) addFinding(findings, 'blocker', 'schema_version_contract_missing', 'Every AI contract must require Generation Schema V2 version.', filePath);
  if (metrics.contractsWithCacheContract !== contracts.length) addFinding(findings, 'blocker', 'cache_key_contract_missing', 'Every AI contract cache key must include language and schema dimensions.', filePath);
  if (metrics.contractsWithRejectBeforeReturn !== contracts.length) addFinding(findings, 'blocker', 'rejected_fresh_output_return_open', 'Every AI contract must block rejected fresh output before return.', filePath);
  if (metrics.contractsWithRejectBeforeCache !== contracts.length) addFinding(findings, 'blocker', 'rejected_fresh_output_cache_open', 'Every AI contract must block rejected fresh output before cache.', filePath);
  if (metrics.contractsWithLanguageSafeFallback !== contracts.length) addFinding(findings, 'blocker', 'wrong_language_fallback_open', 'Every AI contract must use a language-safe fallback.', filePath);
  if (metrics.contractsGenerationBlocked !== contracts.length) addFinding(findings, 'blocker', 'generation_open_before_quality_gate', 'Every AI contract must keep generation blocked until content quality gates.', filePath);
  if (contract.rejectedOutputPolicy.rejectedFreshOutputMayReturn !== false || contract.rejectedOutputPolicy.rejectedFreshOutputMayBeCached !== false) {
    addFinding(findings, 'blocker', 'global_rejected_output_policy_open', 'Global rejected-output policy must block return and cache.', filePath, '$.rejectedOutputPolicy');
  }
  if (contract.activationPolicy.generationAllowedFromPromptContractAlone !== false || contract.readyForGenerationV2 !== false || contract.readyForApply !== false) {
    addFinding(findings, 'blocker', 'activation_policy_opened_generation', 'AI Prompt Contract V2 must not open generation or apply by itself.', filePath, '$.activationPolicy');
  }
  inspectForbiddenKeys(contract, filePath, '$', findings, metrics);
  return { findings, metrics };
}

function cloneContract(contract: AiPromptContractV2): AiPromptContractV2 {
  return JSON.parse(JSON.stringify(contract)) as AiPromptContractV2;
}

function runProbes(contract: AiPromptContractV2, expectedEntrypoints: number, expectedDomains: number, filePath: string): Probe[] {
  const probes: Array<{ id: string; expectedAccept: boolean; contract: AiPromptContractV2 }> = [];
  probes.push({ id: 'canonical_ai_prompt_contract_accepts', expectedAccept: true, contract: cloneContract(contract) });

  const missingEntrypoint = cloneContract(contract);
  missingEntrypoint.entrypointContracts = missingEntrypoint.entrypointContracts.slice(0, -1);
  probes.push({ id: 'missing_entrypoint_rejected', expectedAccept: false, contract: missingEntrypoint });

  const missingTargetLocale = cloneContract(contract);
  missingTargetLocale.entrypointContracts[0].promptContract.mustPassTargetLocale = false as true;
  probes.push({ id: 'missing_target_locale_rejected', expectedAccept: false, contract: missingTargetLocale });

  const cacheKeyMissingTarget = cloneContract(contract);
  cacheKeyMissingTarget.entrypointContracts[0].cacheContract.requiredKeyDimensions =
    cacheKeyMissingTarget.entrypointContracts[0].cacheContract.requiredKeyDimensions.filter((key) => key !== 'targetLocale');
  probes.push({ id: 'cache_key_missing_target_locale_rejected', expectedAccept: false, contract: cacheKeyMissingTarget });

  const rejectedReturnOpen = cloneContract(contract);
  rejectedReturnOpen.entrypointContracts[0].outputContract.rejectedFreshOutputMayReturn = true as false;
  probes.push({ id: 'rejected_fresh_return_rejected', expectedAccept: false, contract: rejectedReturnOpen });

  const rejectedCacheOpen = cloneContract(contract);
  rejectedCacheOpen.entrypointContracts[0].cacheContract.rejectedFreshOutputMayBeCached = true as false;
  probes.push({ id: 'rejected_fresh_cache_rejected', expectedAccept: false, contract: rejectedCacheOpen });

  const generationOpen = cloneContract(contract);
  generationOpen.activationPolicy.generationAllowedFromPromptContractAlone = true as false;
  probes.push({ id: 'prompt_contract_generation_open_rejected', expectedAccept: false, contract: generationOpen });

  return probes.map((probe) => {
    const result = validateContract(probe.contract, expectedEntrypoints, expectedDomains, filePath);
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
    '# GUSTAV AI Prompt Contract V2 Packet',
    '',
    `Run: \`${report.runId}\``,
    '',
    `Status: \`${report.status}\``,
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- AI prompt entrypoints expected: ${report.summary.aiPromptEntrypointsExpected}`,
    `- AI prompt entrypoint contracts: ${report.summary.aiPromptEntrypointContracts}`,
    `- AI prompt entrypoint files exist: ${report.summary.aiPromptEntrypointFilesExist}`,
    `- AI prompt domains covered: ${report.summary.aiPromptDomainsCovered}/${report.summary.aiPromptDomainsExpected}`,
    `- Contracts with targetLocale: ${report.summary.contractsWithTargetLocale}`,
    `- Contracts with sourceLocales: ${report.summary.contractsWithSourceLocales}`,
    `- Contracts with uiLocale: ${report.summary.contractsWithUiLocale}`,
    `- Contracts with cache contract: ${report.summary.contractsWithCacheContract}`,
    `- Contracts reject before return: ${report.summary.contractsWithRejectBeforeReturn}`,
    `- Contracts reject before cache: ${report.summary.contractsWithRejectBeforeCache}`,
    `- Contracts with language-safe fallback: ${report.summary.contractsWithLanguageSafeFallback}`,
    `- Contracts generation blocked: ${report.summary.contractsGenerationBlocked}`,
    `- Critical risk contracts: ${report.summary.criticalRiskContracts}`,
    `- High risk contracts: ${report.summary.highRiskContracts}`,
    `- Fixture probes passed: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`,
    `- Ready for Content Quality Gates V2: ${report.summary.readyForContentQualityGatesV2 ? 'yes' : 'no'}`,
    `- Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`,
    `- Ready for apply: ${report.summary.readyForApply ? 'yes' : 'no'}`,
    `- Blockers: ${report.summary.blockers}`,
    `- Warnings: ${report.summary.warnings}`,
    '',
    '## Domain Coverage',
    '',
  ];
  for (const [domainId, count] of Object.entries(report.domainCoverage).sort((a, bValue) => bValue[1] - a[1] || a[0].localeCompare(bValue[0]))) {
    lines.push(`- \`${domainId}\`: ${count}`);
  }
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
    throw new Error('Usage: npx tsx scripts/gustav_ai_prompt_contract_v2_packet.ts --run <run-dir> --target fr');
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const auditsDir = path.join(runDir, 'audits');
  const researchDir = path.join(runDir, 'research');
  const domainRegistryPath = path.join(auditsDir, 'algorithm_domain_registry_v2_packet.json');
  const generationSchemaPath = path.join(researchDir, 'fr_generation_schema_v2.json');
  const generationSchemaPacketPath = path.join(auditsDir, 'generation_schema_v2_packet.json');
  const outContract = path.join(researchDir, 'fr_ai_prompt_contract_v2.json');
  const outJson = path.join(auditsDir, 'ai_prompt_contract_v2_packet.json');
  const outMd = path.join(auditsDir, 'ai_prompt_contract_v2_packet.md');
  ensureDir(auditsDir);
  ensureDir(researchDir);

  const findings: Finding[] = [];
  for (const filePath of [domainRegistryPath, generationSchemaPath, generationSchemaPacketPath]) {
    if (!fs.existsSync(filePath)) addFinding(findings, 'blocker', 'required_input_missing', 'AI Prompt Contract V2 input is missing.', rel(repoRoot, filePath));
  }

  const domainSummary = summaryOf(domainRegistryPath);
  const generationSchemaSummary = summaryOf(generationSchemaPacketPath);
  const generationSchemaV2Ready = b(generationSchemaSummary, 'readyForAiPromptContractV2') && n(generationSchemaSummary, 'blockers') === 0;
  if (!generationSchemaV2Ready) {
    addFinding(findings, 'blocker', 'generation_schema_v2_not_ready', 'P6 requires Generation Schema V2 to be ready for AI Prompt Contract V2.', rel(repoRoot, generationSchemaPacketPath));
  }

  const expectedEntrypoints = n(domainSummary, 'aiPromptEntrypoints');
  let expectedDomains = 0;
  if (fs.existsSync(domainRegistryPath)) {
    const registry = array<JsonObject>(object(readJson<unknown>(domainRegistryPath)).registry);
    expectedDomains = registry.filter((domain) => stringArray(domain.aiPromptEntrypoints).length > 0).length;
  }

  let contract: AiPromptContractV2 | null = null;
  let validation = { findings: [] as Finding[], metrics: emptyMetrics() };
  let probes: Probe[] = [];
  if (findings.filter((finding) => finding.severity === 'blocker').length === 0) {
    contract = buildPromptContract(repoRoot, runId, domainRegistryPath, generationSchemaPath, generationSchemaPacketPath);
    validation = validateContract(contract, expectedEntrypoints, expectedDomains, rel(repoRoot, outContract));
    probes = runProbes(contract, expectedEntrypoints, expectedDomains, rel(repoRoot, outContract));
    findings.push(...validation.findings);
    for (const probe of probes) {
      if (!probe.passed) addFinding(findings, 'blocker', 'fixture_probe_failed', `AI Prompt Contract V2 fixture probe failed: ${probe.id}.`);
    }
  }

  const metrics = validation.metrics;
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const fixtureProbesPassed = probes.filter((probe) => probe.passed).length;
  const readyForContentQualityGatesV2 =
    Boolean(contract) &&
    blockers === 0 &&
    generationSchemaV2Ready &&
    metrics.aiPromptEntrypointContracts === expectedEntrypoints &&
    metrics.aiPromptEntrypointFilesExist === expectedEntrypoints &&
    metrics.contractsWithTargetLocale === expectedEntrypoints &&
    metrics.contractsWithSourceLocales === expectedEntrypoints &&
    metrics.contractsWithUiLocale === expectedEntrypoints &&
    metrics.contractsWithRejectBeforeReturn === expectedEntrypoints &&
    metrics.contractsWithRejectBeforeCache === expectedEntrypoints &&
    fixtureProbesPassed === probes.length;

  if (contract) {
    contract.readyForContentQualityGatesV2 = readyForContentQualityGatesV2;
    fs.writeFileSync(outContract, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
  }

  const report: Report = {
    schemaVersion: 'gustav-ai-prompt-contract-v2-packet-v0',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 ? 'BLOCK' : warnings > 0 ? 'HOLD' : 'PASS',
    command: {
      argv: process.argv.slice(2),
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    inputs: {
      algorithmDomainRegistryV2Packet: rel(repoRoot, domainRegistryPath),
      generationSchemaV2: rel(repoRoot, generationSchemaPath),
      generationSchemaV2Packet: rel(repoRoot, generationSchemaPacketPath),
    },
    outputs: {
      aiPromptContractV2: rel(repoRoot, outContract),
      packetJson: rel(repoRoot, outJson),
      packetMd: rel(repoRoot, outMd),
    },
    summary: {
      ...metrics,
      targetLocale: 'fr',
      sourceLocales: 2,
      generationSchemaV2Ready,
      fixtureProbes: probes.length,
      fixtureProbesPassed,
      readyForContentQualityGatesV2,
      readyForGenerationV2: false,
      readyForApply: false,
      mayModifyProductionAppFiles: false,
      blockers,
      warnings,
    },
    domainCoverage: contract?.domainCoverage ?? {},
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

  console.log(`GUSTAV AI Prompt Contract V2 packet: ${report.status}`);
  console.log(`AI prompt entrypoint contracts: ${report.summary.aiPromptEntrypointContracts}/${report.summary.aiPromptEntrypointsExpected}`);
  console.log(`AI prompt domains covered: ${report.summary.aiPromptDomainsCovered}/${report.summary.aiPromptDomainsExpected}`);
  console.log(`Reject before return/cache: ${report.summary.contractsWithRejectBeforeReturn}/${report.summary.contractsWithRejectBeforeCache}`);
  console.log(`Fixture probes passed: ${report.summary.fixtureProbesPassed}/${report.summary.fixtureProbes}`);
  console.log(`Ready for Content Quality Gates V2: ${report.summary.readyForContentQualityGatesV2 ? 'yes' : 'no'}`);
  console.log(`Ready for Generation V2: ${report.summary.readyForGenerationV2 ? 'yes' : 'no'}`);
  console.log(`Report: ${rel(repoRoot, outJson)}`);

  if (blockers > 0) process.exitCode = 1;
}

main();
